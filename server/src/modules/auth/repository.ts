import { db } from "../../lib/db.js";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export function findUserByEmail(email: string) {
  return db<UserRecord>("users").where({ email }).first();
}

export function findUserById(id: string) {
  return db<UserRecord>("users").where({ id }).first();
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<UserRecord> {
  const [user] = await db<UserRecord>("users")
    .insert({ email: input.email, password_hash: input.passwordHash, name: input.name })
    .returning("*");
  return user;
}
