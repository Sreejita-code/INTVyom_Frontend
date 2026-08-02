export interface ServiceResponse<T = unknown> {
  ok: boolean;
  json: T;
}
