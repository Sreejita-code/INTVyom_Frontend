export interface AuthUser {
  user_id: string;
  user_name: string;
  user_email?: string;
  /**
   * The upstream LiveKit key issued at signup, now also the proxy credential: it is sent as
   * `Authorization: Bearer <api_key>` on every request. Null when issuance failed at signup —
   * such a user cannot authenticate and is sent back to the login screen.
   */
  api_key?: string | null;
}

export interface AuthLoginPayload {
  user_name: string;
  password: string;
}

export interface AuthSignupPayload extends AuthLoginPayload {
  org_name: string;
  user_email: string;
}
