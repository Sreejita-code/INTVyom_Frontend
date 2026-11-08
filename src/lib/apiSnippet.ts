/**
 * Renders a backend request as a copyable snippet in cURL, Python, or Node.
 *
 * Pure by design: the base URL and the key are passed in, never read from `import.meta.env` or
 * storage here, so the caller decides whether the real key or `$VOICEKIT_API_KEY` is printed.
 */

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | undefined;

export interface RequestSpec {
  /** Stable id, used as a React key and for the Developer page index. */
  id: string;
  title: string;
  method: HttpMethod;
  /** Path below the backend origin, e.g. `/api/call/outbound`. */
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * A multipart upload. Replaces `body`: each defined field becomes a form part, and `file` names a
   * local file the snippet reads from disk (`curl -F`, `files=` in Python, `FormData` in Node).
   */
  form?: {
    fields: Record<string, string | undefined>;
    file?: { field: string; filename: string };
  };
  /**
   * How the response is consumed: `json` (default), `stream` (read line by line as Server-Sent Events),
   * or `binary` (written to a file).
   */
  response?: "json" | "stream" | "binary";
  /** One line of context shown above the snippet tabs. */
  note?: string;
}

export interface SnippetOptions {
  baseUrl: string;
  /** Printed as `Authorization: Bearer <apiKey>`; omitted for an unauthenticated request. */
  apiKey?: string;
}

/** The placeholder every snippet shows in place of the signed-in user's VoiceKit API key. */
export const API_KEY_PLACEHOLDER = "$VOICEKIT_API_KEY";

export const SNIPPET_LANGUAGES = ["curl", "python", "node"] as const;

export type SnippetLanguage = (typeof SNIPPET_LANGUAGES)[number];

export function buildRequestUrl(spec: RequestSpec, options: SnippetOptions): string {
  const origin = originOf(options);
  const entries = Object.entries(spec.query ?? {}).filter(
    (entry): entry is [string, Exclude<QueryValue, undefined>] => entry[1] !== undefined,
  );
  const search = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return search ? `${origin}${spec.path}?${search}` : `${origin}${spec.path}`;
}

/** A JSON body. A multipart form is sent through `spec.form` instead, so it never counts here. */
const hasBody = (spec: RequestSpec) => spec.body !== undefined && !spec.form;

/** Form parts with unset fields dropped, in declaration order. */
const formParts = (spec: RequestSpec): [string, string][] =>
  Object.entries(spec.form?.fields ?? {}).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "",
  );

/**
 * What `JSON.stringify` would actually put on the wire. Keys whose value is `undefined` are
 * dropped, so the Python snippet does not turn them into `None` — on a PATCH that is the
 * difference between leaving a stored field alone and clearing it.
 */
const wireBody = (spec: RequestSpec): unknown => JSON.parse(JSON.stringify(spec.body ?? null));

const jsonBody = (spec: RequestSpec) => JSON.stringify(spec.body, null, 2);

const originOf = ({ baseUrl }: SnippetOptions) => baseUrl.replace(/\/+$/, "");

/** Indents every line but the first, so a multi-line body sits under its argument. */
const indentRest = (text: string, pad: string) => text.split("\n").join(`\n${pad}`);

/** `'` cannot appear inside a single-quoted shell string; close, escape, reopen. */
const shellQuote = (text: string) => `'${text.replace(/'/g, "'\\''")}'`;

function headerEntries(spec: RequestSpec, options: SnippetOptions): [string, string][] {
  const entries: [string, string][] = [];
  if (hasBody(spec)) entries.push(["Content-Type", "application/json"]);
  if (options.apiKey) entries.push(["Authorization", `Bearer ${options.apiKey}`]);
  return entries;
}

function headerObject(spec: RequestSpec, options: SnippetOptions, pad: string): string | null {
  const entries = headerEntries(spec, options).map(([name, value]) => `"${name}": "${value}"`);
  return entries.length > 0 ? `{${pad}${entries.join(", ")}${pad}}` : null;
}

export function renderCurl(spec: RequestSpec, options: SnippetOptions): string {
  const lines = [`curl -X ${spec.method} "${buildRequestUrl(spec, options)}"`];
  for (const [name, value] of headerEntries(spec, options)) lines.push(`  -H "${name}: ${value}"`);
  if (hasBody(spec)) lines.push(`  -d ${shellQuote(jsonBody(spec))}`);
  if (spec.form) {
    const file = spec.form.file;
    if (file) lines.push(`  -F ${shellQuote(`${file.field}=@${file.filename}`)}`);
    for (const [name, value] of formParts(spec)) lines.push(`  -F ${shellQuote(`${name}=${value}`)}`);
  }
  if (spec.response === "binary") lines.push(`  -o ${shellQuote(binaryFilename(spec))}`);
  return lines.join(" \\\n");
}

/** JSON is not Python: `true`/`false`/`null` have to become `True`/`False`/`None`. */
function pythonLiteral(value: unknown, pad = ""): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    // A flat list of scalars reads better on one line; only nested structures earn a block.
    if (value.every((item) => item === null || typeof item !== "object")) {
      return `[${value.map((item) => pythonLiteral(item)).join(", ")}]`;
    }
    const inner = `${pad}    `;
    return `[\n${value.map((item) => `${inner}${pythonLiteral(item, inner)}`).join(",\n")}\n${pad}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  const inner = `${pad}    `;
  const body = entries
    .map(([key, item]) => `${inner}${JSON.stringify(key)}: ${pythonLiteral(item, inner)}`)
    .join(",\n");
  return `{\n${body}\n${pad}}`;
}

/** Query params stay on one line — they are short, and `requests` takes them as a flat dict. */
function pythonParams(spec: RequestSpec): string | null {
  const entries = Object.entries(spec.query ?? {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;
  const body = entries
    .map(([key, value]) => `${JSON.stringify(key)}: ${pythonLiteral(value)}`)
    .join(", ");
  return `{${body}}`;
}

/** The file the binary response is saved to. The API serves WAV for TTS by default. */
const binaryFilename = (_spec: RequestSpec) => "speech.wav";

/** Python file-like parts: `files=` for the upload, `data=` for the plain fields. */
function pythonForm(spec: RequestSpec): { files: string | null; data: string | null } {
  const parts = formParts(spec);
  const data = parts.length
    ? `{${parts.map(([name, value]) => `${JSON.stringify(name)}: ${JSON.stringify(value)}`).join(", ")}}`
    : null;
  const file = spec.form?.file;
  const files = file ? `{${JSON.stringify(file.field)}: open(${JSON.stringify(file.filename)}, "rb")}` : null;
  return { files, data };
}

export function renderPython(spec: RequestSpec, options: SnippetOptions): string {
  const call = spec.method.toLowerCase();
  const params = pythonParams(spec);
  // `requests` appends `params` to whatever query string the URL already has, so the URL passed
  // alongside them has to be the bare path.
  const url = params ? `${originOf(options)}${spec.path}` : buildRequestUrl(spec, options);
  const args = [`    "${url}"`];
  if (params) args.push(`    params=${params}`);
  const headers = headerObject(spec, options, "");
  if (headers) args.push(`    headers=${headers}`);
  if (hasBody(spec)) {
    args.push(`    json=${pythonLiteral(wireBody(spec), "    ")}`);
  }
  if (spec.form) {
    const form = pythonForm(spec);
    if (form.files) args.push(`    files=${form.files}`);
    if (form.data) args.push(`    data=${form.data}`);
  }
  if (spec.response === "stream") args.push("    stream=True");
  const lines = [
    "import requests",
    "",
    `response = requests.${call}(`,
    `${args.join(",\n")},`,
    ")",
    "response.raise_for_status()",
  ];
  if (spec.response === "stream") {
    lines.push("for line in response.iter_lines():", "    if line:", "        print(line.decode())");
  } else if (spec.response === "binary") {
    lines.push(`with open("${binaryFilename(spec)}", "wb") as out:`, "    out.write(response.content)");
  } else {
    lines.push("print(response.json())");
  }
  return lines.join("\n");
}

export function renderNode(spec: RequestSpec, options: SnippetOptions): string {
  const init = [`  method: "${spec.method}"`];
  const headers = headerObject(spec, options, " ");
  if (headers) init.push(`  headers: ${headers}`);
  if (hasBody(spec)) {
    init.push(`  body: JSON.stringify(${indentRest(jsonBody(spec), "  ")})`);
  }
  const prelude: string[] = [];
  if (spec.form) {
    prelude.push("const form = new FormData();");
    const file = spec.form.file;
    if (file) {
      prelude.push(`form.append(${JSON.stringify(file.field)}, await openAsBlob(${JSON.stringify(file.filename)}), ${JSON.stringify(file.filename)});`);
    }
    for (const [name, value] of formParts(spec)) {
      prelude.push(`form.append(${JSON.stringify(name)}, ${JSON.stringify(value)});`);
    }
    init.push("  body: form");
  }
  const consume =
    spec.response === "stream"
      ? [
          "const reader = response.body.getReader();",
          "const decoder = new TextDecoder();",
          "for (;;) {",
          "  const { value, done } = await reader.read();",
          "  if (done) break;",
          "  process.stdout.write(decoder.decode(value, { stream: true }));",
          "}",
        ]
      : spec.response === "binary"
        ? [
            `await writeFile("${binaryFilename(spec)}", Buffer.from(await response.arrayBuffer()));`,
          ]
        : ["console.log(await response.json());"];
  const imports = [
    ...(spec.form?.file ? ['import { openAsBlob } from "node:fs";'] : []),
    ...(spec.response === "binary" ? ['import { writeFile } from "node:fs/promises";'] : []),
    ...(spec.form || spec.response === "binary" ? [""] : []),
  ];
  return [
    ...imports,
    ...prelude,
    `const response = await fetch("${buildRequestUrl(spec, options)}", {`,
    `${init.join(",\n")},`,
    "});",
    "",
    "if (!response.ok) throw new Error(await response.text());",
    ...consume,
  ].join("\n");
}

const RENDERERS: Record<SnippetLanguage, (spec: RequestSpec, options: SnippetOptions) => string> = {
  curl: renderCurl,
  python: renderPython,
  node: renderNode,
};

export const SNIPPET_LANGUAGE_LABELS: Record<SnippetLanguage, string> = {
  curl: "cURL",
  python: "Python",
  node: "Node.js",
};

export function renderSnippet(
  language: SnippetLanguage,
  spec: RequestSpec,
  options: SnippetOptions,
): string {
  return RENDERERS[language](spec, options);
}
