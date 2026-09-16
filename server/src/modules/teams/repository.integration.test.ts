import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../../lib/db.js";
import { createTeamWithOwner, findMembership, findTeamById } from "./repository.js";

// This suite exercises `createTeamWithOwner` against a real Postgres
// instance (the same one used by `docker compose up` / local dev, via
// server/src/lib/db.ts's connection config) to verify transactional
// atomicity — a property mocking `db.transaction` can't meaningfully prove.
//
// It's skipped automatically when no database is reachable (e.g. sandboxes
// or CI without Docker/Postgres available), so `npm test` still passes
// there without requiring a special env var or separate test command.
const DB_PROBE_TIMEOUT_MS = 2000;

async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await Promise.race([
      db.raw("select 1"),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("db probe timed out")), DB_PROBE_TIMEOUT_MS),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

const dbAvailable = await isDatabaseAvailable();

describe.skipIf(!dbAvailable)("teams repository createTeamWithOwner (integration, live DB)", () => {
  afterAll(async () => {
    await db.destroy();
  });

  it("creates the team and an owner membership row together", async () => {
    const [user] = await db("users")
      .insert({
        email: `integration-${randomUUID()}@example.com`,
        password_hash: "not-a-real-hash",
        name: "Integration Test User",
      })
      .returning("*");

    try {
      const teamName = `Integration Team ${randomUUID()}`;
      const team = await createTeamWithOwner(teamName, user.id);

      const persistedTeam = await findTeamById(team.id);
      expect(persistedTeam?.name).toBe(teamName);

      const membership = await findMembership(team.id, user.id);
      expect(membership?.role).toBe("owner");

      await db("teams").where({ id: team.id }).del();
    } finally {
      await db("users").where({ id: user.id }).del();
    }
  });

  it("rolls back the team insert when the owner membership insert fails (atomicity)", async () => {
    const teamName = `Integration Team ${randomUUID()}`;
    // A user_id that doesn't exist in `users` violates team_members' foreign
    // key on insert, which should abort the whole transaction — including
    // the teams row inserted moments earlier in the same transaction.
    const nonExistentUserId = randomUUID();

    await expect(createTeamWithOwner(teamName, nonExistentUserId)).rejects.toThrow();

    const orphanedTeams = await db("teams").where({ name: teamName });
    expect(orphanedTeams).toHaveLength(0);
  });
});
