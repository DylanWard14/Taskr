import { db } from "../../lib/db.js";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function findUserByEmail(email: string) {
  return db<UserRecord>("users").where({ email }).first();
}

export function findUserById(id: string) {
  return db<UserRecord>("users").where({ id }).first();
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const [user] = await db<UserRecord>("users")
    .insert({
      email: input.email,
      password_hash: input.passwordHash,
      name: input.name,
    })
    .returning("*");

  return user;
}
