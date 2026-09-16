import jwt from "jsonwebtoken";

export interface AuthedUser {
  id: string;
  email: string;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export function signToken(user: AuthedUser): string {
  return jwt.sign(user, getSecret(), { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthedUser {
  return jwt.verify(token, getSecret()) as AuthedUser;
}
