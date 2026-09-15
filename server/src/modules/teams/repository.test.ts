import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, transactionMock } = vi.hoisted(() => {
  return { dbMock: vi.fn(), transactionMock: vi.fn() };
});

vi.mock("../../lib/db.js", () => ({
  db: Object.assign(dbMock, { transaction: transactionMock }),
}));

import * as repository from "./repository.js";

// A minimal stand-in for a Knex query builder: every chain method returns the
// same object, and the object itself is thenable so it can be awaited no
// matter which method the chain happens to terminate on.
function createQueryBuilder(result: unknown) {
  const qb: Record<string, unknown> = {};
  const chain = ["where", "join", "select", "insert", "count"];
  for (const method of chain) {
    qb[method] = vi.fn(() => qb);
  }
  qb.first = vi.fn(() => Promise.resolve(result));
  qb.del = vi.fn(() => Promise.resolve(result));
  qb.returning = vi.fn(() => Promise.resolve(result));
  qb.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return qb;
}

describe("teams repository", () => {
  beforeEach(() => {
    dbMock.mockReset();
    transactionMock.mockReset();
  });

  it("listTeamsForUser joins team_members and filters by user id", async () => {
    const teams = [{ id: "team-1", name: "Team One" }];
    const qb = createQueryBuilder(teams);
    dbMock.mockReturnValue(qb);

    const result = await repository.listTeamsForUser("user-1");

    expect(dbMock).toHaveBeenCalledWith("teams");
    expect(qb.join).toHaveBeenCalledWith("team_members", "teams.id", "team_members.team_id");
    expect(qb.where).toHaveBeenCalledWith("team_members.user_id", "user-1");
    expect(qb.select).toHaveBeenCalledWith("teams.*");
    expect(result).toEqual(teams);
  });

  it("getTeamById looks up a team by id and returns undefined when missing", async () => {
    const qb = createQueryBuilder(undefined);
    dbMock.mockReturnValue(qb);

    const result = await repository.getTeamById("missing-team");

    expect(dbMock).toHaveBeenCalledWith("teams");
    expect(qb.where).toHaveBeenCalledWith({ id: "missing-team" });
    expect(result).toBeUndefined();
  });

  it("getMembership queries team_members by team and user", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    const qb = createQueryBuilder(membership);
    dbMock.mockReturnValue(qb);

    const result = await repository.getMembership("team-1", "user-1");

    expect(dbMock).toHaveBeenCalledWith("team_members");
    expect(qb.where).toHaveBeenCalledWith({ team_id: "team-1", user_id: "user-1" });
    expect(result).toEqual(membership);
  });

  it("findUserByEmail queries users by email", async () => {
    const user = { id: "user-1", email: "a@example.com" };
    const qb = createQueryBuilder(user);
    dbMock.mockReturnValue(qb);

    const result = await repository.findUserByEmail("a@example.com");

    expect(dbMock).toHaveBeenCalledWith("users");
    expect(qb.where).toHaveBeenCalledWith({ email: "a@example.com" });
    expect(result).toEqual(user);
  });

  it("createTeamWithOwner inserts the team and an owner membership row inside a transaction", async () => {
    const teamRow = { id: "team-1", name: "New Team" };
    const teamsQb = createQueryBuilder([teamRow]);
    const membersQb = createQueryBuilder(undefined);

    const trx = vi.fn((table: string) => (table === "teams" ? teamsQb : membersQb));
    transactionMock.mockImplementation(async (cb: (trx: unknown) => unknown) => cb(trx));

    const result = await repository.createTeamWithOwner("New Team", "user-1");

    expect(trx).toHaveBeenCalledWith("teams");
    expect(teamsQb.insert).toHaveBeenCalledWith({ name: "New Team" });
    expect(trx).toHaveBeenCalledWith("team_members");
    expect(membersQb.insert).toHaveBeenCalledWith({
      team_id: "team-1",
      user_id: "user-1",
      role: "owner",
    });
    expect(result).toEqual(teamRow);
  });

  it("addMember inserts a team_members row with the given role", async () => {
    const qb = createQueryBuilder(undefined);
    dbMock.mockReturnValue(qb);

    await repository.addMember("team-1", "user-2", "admin");

    expect(dbMock).toHaveBeenCalledWith("team_members");
    expect(qb.insert).toHaveBeenCalledWith({ team_id: "team-1", user_id: "user-2", role: "admin" });
  });

  it("removeMember deletes the matching team_members row", async () => {
    const qb = createQueryBuilder(1);
    dbMock.mockReturnValue(qb);

    await repository.removeMember("team-1", "user-2");

    expect(dbMock).toHaveBeenCalledWith("team_members");
    expect(qb.where).toHaveBeenCalledWith({ team_id: "team-1", user_id: "user-2" });
    expect(qb.del).toHaveBeenCalled();
  });

  it("countOwners returns the number of owners for a team", async () => {
    const qb = createQueryBuilder({ count: "2" });
    dbMock.mockReturnValue(qb);

    const result = await repository.countOwners("team-1");

    expect(dbMock).toHaveBeenCalledWith("team_members");
    expect(qb.where).toHaveBeenCalledWith({ team_id: "team-1", role: "owner" });
    expect(result).toBe(2);
  });

  it("countOwners returns 0 when there is no matching row", async () => {
    const qb = createQueryBuilder(undefined);
    dbMock.mockReturnValue(qb);

    const result = await repository.countOwners("team-1");

    expect(result).toBe(0);
  });
});
