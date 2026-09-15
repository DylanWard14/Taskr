import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { HTTPException } from "hono/http-exception";
import type { LoginInput, SignupInput } from "./schema.js";
import { createUser, findUserByEmail, type UserRecord } from "./repository.js";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function issueToken(user: Pick<UserRecord, "id" | "email">): string {
  return jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRY,
  });
}

function toAuthResult(user: UserRecord): AuthResult {
  return {
    token: issueToken(user),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);

  if (!passwordMatches) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  return toAuthResult(user);
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    throw new HTTPException(409, { message: "Email is already registered" });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await createUser({
    email: input.email,
    passwordHash,
    name: input.name,
  });

  return toAuthResult(user);
}
