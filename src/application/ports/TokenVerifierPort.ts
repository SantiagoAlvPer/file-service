export interface AuthUser {
  userId: string;
  role: string;
  email?: string;
}

export interface TokenVerifierPort {
  verify(token: string): AuthUser;
}
