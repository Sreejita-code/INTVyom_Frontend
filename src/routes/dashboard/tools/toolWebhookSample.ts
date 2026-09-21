import { ToolParameter } from "@/types/tool";

const EXAMPLE_BY_TYPE: Record<string, unknown> = {
  string: "example",
  number: 42,
  boolean: true,
  object: {},
  array: [],
};

/**
 * The body a tool webhook receives: exactly the arguments the model generated, which means
 * exactly the parameters defined on this form. Built from the live rows rather than shipped as a
 * fixed example — a sample of someone else's tool tells the user nothing about their own.
 *
 * An allowed value wins over the type example, because a real call can only send one of those.
 * `_enumString` is read before `enum`: the form only splits the comma-separated string into
 * `enum` on save, so until then it is the only place a just-typed value exists.
 */
export function toolWebhookSample(params: ToolParameter[]): Record<string, unknown> {
  const sample: Record<string, unknown> = {};
  for (const param of params) {
    const name = param.name.trim();
    if (!name) continue;
    sample[name] = firstAllowedValue(param) ?? EXAMPLE_BY_TYPE[param.type] ?? "example";
  }
  return sample;
}

function firstAllowedValue(param: ToolParameter): string | undefined {
  const typed = param._enumString
    ?.split(",")
    .map((value) => value.trim())
    .find((value) => value);
  return typed ?? param.enum?.[0];
}
