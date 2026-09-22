/**
 * The JSON body of a response. A failed response whose body is not JSON — a proxy's HTML error
 * page on a 502 — becomes an `{ error }` envelope; a successful one throws, as `Response.json()`
 * did, so it is never mistaken for an empty result. Typed like the `Response.json()` it replaces.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (res.ok) throw new Error("Unexpected response from the server.");
    return { error: `The server answered ${res.status} ${res.statusText}.`.replace(/ \.$/, ".") };
  }
}
