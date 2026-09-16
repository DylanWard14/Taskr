import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import jwt from "jsonwebtoken";
import type { AuthedUser } from "../../middleware/auth.js";
import { findUserByEmail, findUserById, insertUser } from "./repository.js";
import type { LoginInput, SignupInput } from "./schema.js";

const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;

// Postgres unique_violation error code, used to detect a race between the
// pre-insert email check and a concurrent signup for the same address.
const POSTGRES_UNIQUE_VIOLATION = "23505";

// A pre-computed bcrypt hash of a value nobody will ever type, used to run a
// dummy comparison when no user is found so that login() takes comparable
// time whether or not the email exists (avoids a timing side-channel that
// would let an attacker enumerate registered emails).
const DUMMY_PASSWORD_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8O2m1zXG7X3P1E9wJ4kK1sZ9Z1nQe6";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === POSTGRES_UNIQUE_VIOLATION
  );
}

function issueToken(user: AuthedUser): string {
  return jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRY,
  });
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new HTTPException(409, { message: "Email is already in use" });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  let user;
  try {
    user = await insertUser({
      email: input.email,
      passwordHash,
      name: input.name,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HTTPException(409, { message: "Email is already in use" });
    }
    throw err;
  }

  const token = issueToken({ id: user.id, email: user.email });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await findUserByEmail(input.email);

  // Always run a bcrypt comparison, even when the user doesn't exist, so the
  // response time doesn't leak whether the email is registered.
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const token = issueToken({ id: user.id, email: user.email });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function getMe(userId: string): Promise<AuthResponse["user"]> {
  const user = await findUserById(userId);
  if (!user) {
    throw new HTTPException(401, { message: "User not found" });
  }

  return { id: user.id, email: user.email, name: user.name };
}
