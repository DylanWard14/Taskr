import { beforeEach, describe, expect, it, vi } from "vitest";

// Vitest hoists vi.mock calls above imports, but allows referencing
// variables named with a `mock` prefix inside the factory.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb: any = vi.fn();
mockDb.fn = { now: vi.fn(() => "now()") };

vi.mock("../../lib/db.js", () => ({
  db: mockDb,
}));

interface QueryBuilder {
  where: ReturnType<typeof vi.fn>;
  andWhere: ReturnType<typeof vi.fn>;
  whereRaw: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  whereExists: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
}

function createBuilder(): QueryBuilder {
  const builder = {} as QueryBuilder;
  const chainMethods = ["where", "andWhere", "whereRaw", "select", "whereExists", "insert", "update", "del"] as const;
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.returning = vi.fn(() => Promise.resolve([]));
  builder.first = vi.fn(() => Promise.resolve(undefined));
  return builder;
}

const {
  createTask,
  deleteTask,
  getTaskForTeam,
  isTeamMember,
  listTasksForTeam,
  updateTask,
} = await import("./repository.js");

beforeEach(() => {
  mockDb.mockReset();
});

describe("isTeamMember", () => {
  it("looks up membership scoped to both the team and the calling user", async () => {
    const builder = createBuilder();
    builder.first = vi.fn(() => Promise.resolve({ team_id: "team-1", user_id: "user-1", role: "member" }));
    mockDb.mockImplementation(() => builder);

    const result = await isTeamMember("team-1", "user-1");

    expect(mockDb).toHaveBeenCalledWith("team_members");
    expect(builder.where).toHaveBeenCalledWith({ team_id: "team-1", user_id: "user-1" });
    expect(result).toEqual({ team_id: "team-1", user_id: "user-1", role: "member" });
  });

  it("resolves undefined when there is no membership row", async () => {
    const builder = createBuilder();
    mockDb.mockImplementation(() => builder);

    const result = await isTeamMember("team-1", "stranger");

    expect(result).toBeUndefined();
  });
});

describe("listTasksForTeam", () => {
  it("scopes the query to the team and to an EXISTS membership check for the caller", () => {
    const tasksBuilder = createBuilder();
    const membersBuilder = createBuilder();
    mockDb.mockImplementation((table: string) => (table === "tasks" ? tasksBuilder : membersBuilder));

    listTasksForTeam("team-1", "user-1");

    expect(mockDb).toHaveBeenCalledWith("tasks");
    expect(mockDb).toHaveBeenCalledWith("team_members");
    expect(tasksBuilder.where).toHaveBeenCalledWith("tasks.team_id", "team-1");
    // The membership check must be wired in as an EXISTS subquery, not trusted from the caller.
    expect(tasksBuilder.whereExists).toHaveBeenCalledWith(membersBuilder);
    expect(membersBuilder.whereRaw).toHaveBeenCalledWith("team_members.team_id = tasks.team_id");
    expect(membersBuilder.andWhere).toHaveBeenCalledWith("team_members.user_id", "user-1");
  });
});

describe("getTaskForTeam", () => {
  it("looks up a task scoped to both its id and its team", async () => {
    const builder = createBuilder();
    mockDb.mockImplementation(() => builder);

    await getTaskForTeam("team-1", "task-1");

    expect(mockDb).toHaveBeenCalledWith("tasks");
    expect(builder.where).toHaveBeenCalledWith({ id: "task-1", team_id: "team-1" });
  });
});

describe("createTask", () => {
  it("inserts the record and returns the created row", async () => {
    const builder = createBuilder();
    builder.returning = vi.fn(() => Promise.resolve([{ id: "task-1", title: "Task" }]));
    mockDb.mockImplementation(() => builder);

    const record = {
      team_id: "team-1",
      title: "Task",
      description: null,
      status: "todo",
      priority: "medium",
      assignee_id: null,
      due_date: null,
      created_by: "user-1",
    };

    const result = await createTask(record);

    expect(mockDb).toHaveBeenCalledWith("tasks");
    expect(builder.insert).toHaveBeenCalledWith(record);
    expect(builder.returning).toHaveBeenCalledWith("*");
    expect(result).toEqual({ id: "task-1", title: "Task" });
  });
});

describe("updateTask", () => {
  it("scopes the update to the task's id and team, and returns the updated row", async () => {
    const builder = createBuilder();
    builder.returning = vi.fn(() => Promise.resolve([{ id: "task-1", status: "done" }]));
    mockDb.mockImplementation(() => builder);

    const result = await updateTask("team-1", "task-1", { status: "done" });

    expect(mockDb).toHaveBeenCalledWith("tasks");
    expect(builder.where).toHaveBeenCalledWith({ id: "task-1", team_id: "team-1" });
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ status: "done" }));
    expect(result).toEqual({ id: "task-1", status: "done" });
  });

  it("resolves undefined when no row matched (task not in that team)", async () => {
    const builder = createBuilder();
    mockDb.mockImplementation(() => builder);

    const result = await updateTask("team-1", "task-1", { status: "done" });

    expect(result).toBeUndefined();
  });
});

describe("deleteTask", () => {
  it("deletes only the row scoped to the task's id and team", async () => {
    const builder = createBuilder();
    builder.del = vi.fn(() => Promise.resolve(1));
    mockDb.mockImplementation(() => builder);

    const result = await deleteTask("team-1", "task-1");

    expect(mockDb).toHaveBeenCalledWith("tasks");
    expect(builder.where).toHaveBeenCalledWith({ id: "task-1", team_id: "team-1" });
    expect(result).toBe(1);
  });
});
