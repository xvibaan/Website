export type UserRole = 'customer' | 'admin';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthSessionClaims {
  sub: string; // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface SafeUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
