import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  RequestSpec,
  buildRequestUrl,
  renderCurl,
  renderNode,
  renderPython,
} from "@/lib/apiSnippet";

const options = { baseUrl: "https://api.example.com" };

const postSpec: RequestSpec = {
  id: "call.outbound",
  title: "Start an outbound call",
  method: "POST",
  path: "/api/call/outbound",
  body: {
    assistant_id: "asst_1",
    metadata: { name: "John", vip: true, note: null, tags: ["a"] },
  },
};

const getSpec: RequestSpec = {
  id: "assistant.callLogs",
  title: "List call logs",
  method: "GET",
  path: "/api/assistant/call-logs/asst_1",
  query: { page: 1, limit: 20, start_date: undefined },
};

describe("buildRequestUrl", () => {
  it("joins the base URL and path, dropping a trailing slash", () => {
    expect(buildRequestUrl(postSpec, { baseUrl: "https://api.example.com/" })).toBe(
      "https://api.example.com/api/call/outbound",
    );
  });

  it("appends defined query params only, encoded", () => {
    expect(buildRequestUrl(getSpec, options)).toBe(
      "https://api.example.com/api/assistant/call-logs/asst_1?page=1&limit=20",
    );
  });
});

describe("renderCurl", () => {
  it("sends the JSON body with a content-type header", () => {
    const snippet = renderCurl(postSpec, options);
    expect(snippet).toContain('curl -X POST "https://api.example.com/api/call/outbound"');
    expect(snippet).toContain('-H "Content-Type: application/json"');
    expect(snippet).toContain('"assistant_id": "asst_1"');
  });

  it("omits the body and content-type for a GET", () => {
    const snippet = renderCurl(getSpec, options);
    expect(snippet).not.toContain("-d ");
    expect(snippet).not.toContain("Content-Type");
  });

  it("escapes single quotes so the shell command stays valid", () => {
    const snippet = renderCurl(
      { ...postSpec, body: { prompt: "You're Sarah. Say \"hi\"." } },
      options,
    );
    expect(snippet).toContain(`You'\\''re Sarah`);
    // Every quote outside the escape sequences still pairs up.
    const body = snippet.slice(snippet.indexOf("-d '"));
    expect(body.split("'").length % 2).toBe(0);
  });
});

describe("renderPython", () => {
  it("uses requests with a Python dict body", () => {
    const snippet = renderPython(postSpec, options);
    expect(snippet).toContain("import requests");
    expect(snippet).toContain("requests.post(");
    expect(snippet).toContain('"vip": True');
    expect(snippet).toContain('"note": None');
    expect(snippet).toContain('"tags": ["a"]');
  });

  it("passes query params instead of a body for a GET", () => {
    const snippet = renderPython(getSpec, options);
    expect(snippet).toContain("requests.get(");
    expect(snippet).toContain('params={"page": 1, "limit": 20}');
    expect(snippet).not.toContain("json=");
  });

  it("keeps the query out of the URL when it is passed as params", () => {
    // requests appends params to an existing query string, which would send each one twice.
    const snippet = renderPython(getSpec, options);
    expect(snippet).toContain('"https://api.example.com/api/assistant/call-logs/asst_1"');
    expect(snippet).not.toContain("call-logs/asst_1?");
  });

  it("drops undefined fields instead of sending None, like JSON.stringify does", () => {
    const spec: RequestSpec = { ...postSpec, body: { kept: "yes", dropped: undefined } };
    const snippet = renderPython(spec, options);
    expect(snippet).toContain('"kept": "yes"');
    expect(snippet).not.toContain("dropped");
    // The curl body is the contract the other two have to match.
    expect(renderCurl(spec, options)).not.toContain("dropped");
  });
});

describe("renderNode", () => {
  it("uses fetch with a JSON.stringify body", () => {
    const snippet = renderNode(postSpec, options);
    expect(snippet).toContain('method: "POST"');
    expect(snippet).toContain("body: JSON.stringify({");
    expect(snippet).toContain('"vip": true');
  });

  it("omits the body for a GET", () => {
    const snippet = renderNode(getSpec, options);
    expect(snippet).not.toContain("JSON.stringify");
  });
});

describe("authorization header", () => {
  const authed = { baseUrl: "https://api.example.com", apiKey: "key-1" };

  it("adds a Bearer header to every renderer", () => {
    expect(renderCurl(postSpec, authed)).toContain('-H "Authorization: Bearer key-1"');
    expect(renderPython(postSpec, authed)).toContain('"Authorization": "Bearer key-1"');
    expect(renderNode(postSpec, authed)).toContain('"Authorization": "Bearer key-1"');
  });

  it("sends the header on a bodyless GET too", () => {
    expect(renderCurl(getSpec, authed)).toContain("Authorization: Bearer key-1");
    expect(renderPython(getSpec, authed)).toContain('"Authorization": "Bearer key-1"');
    expect(renderNode(getSpec, authed)).toContain('"Authorization": "Bearer key-1"');
  });

  it("omits the header when no key is passed", () => {
    expect(renderCurl(postSpec, options)).not.toContain("Authorization");
    expect(renderPython(postSpec, options)).not.toContain("Authorization");
    expect(renderNode(postSpec, options)).not.toContain("Authorization");
  });
});

describe("generated snippets parse", () => {
  // A snippet that does not run is worse than none. A prompt with an apostrophe and a double
  // quote is the shape that breaks naive shell quoting, so it is the one worth parsing.
  const spec: RequestSpec = {
    ...postSpec,
    body: {
      assistant_prompt: "You're \"Sarah\" from Acme; say hi.\nLine two.",
      metadata: { vip: true, note: null, tags: ["a", "b"] },
    },
  };

  const parses = (command: string, args: string[], source: string) => {
    const result = spawnSync(command, args, { input: source, encoding: "utf8" });
    if (result.error) return null; // interpreter not installed on this machine
    return { ok: result.status === 0, stderr: result.stderr };
  };

  it("renders a cURL command bash accepts", () => {
    const result = parses("bash", ["-n"], renderCurl(spec, options));
    if (!result) return;
    expect(result.stderr).toBe("");
    expect(result.ok).toBe(true);
  });

  it("renders Python the interpreter compiles", () => {
    const result = parses(
      "python3",
      ["-c", "import sys; compile(sys.stdin.read(), 'snippet.py', 'exec')"],
      renderPython(spec, options),
    );
    if (!result) return;
    expect(result.stderr).toBe("");
    expect(result.ok).toBe(true);
  });

  it("renders Node the parser accepts", () => {
    // `--check` needs a file, and top-level await needs a module, so wrap and pipe instead.
    const source = `void (async () => {\n${renderNode(spec, options)}\n})();`;
    const result = parses("node", ["--input-type=module", "--eval", `new Function(${JSON.stringify(source)})`], "");
    if (!result) return;
    expect(result.stderr).toBe("");
    expect(result.ok).toBe(true);
  });
});
