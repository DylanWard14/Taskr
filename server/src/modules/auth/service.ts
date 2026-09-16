import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { signToken } from "../../lib/jwt.js";
import { createUser, findUserByEmail } from "./repository.js";
import type { LoginInput, SignupInput } from "./schema.js";

const SALT_ROUNDS = 10;

function toPublicUser(user: { id: string; email: string; name: string }) {
  return { id: user.id, email: user.email, name: user.name };
}

export async function signup(input: SignupInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new HTTPException(409, { message: "Email is already registered" });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await createUser({ email: input.email, passwordHash, name: input.name });

  const token = signToken({ id: user.id, email: user.email });
  return { token, user: toPublicUser(user) };
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const token = signToken({ id: user.id, email: user.email });
  return { token, user: toPublicUser(user) };
}
