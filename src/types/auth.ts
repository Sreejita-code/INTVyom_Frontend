export interface AuthUser {
  user_id: string;
  user_name: string;
}

export interface AuthLoginPayload {
  user_name: string;
  password: string;
}

export interface AuthSignupPayload extends AuthLoginPayload {
  org_name: string;
  user_email: string;
}
