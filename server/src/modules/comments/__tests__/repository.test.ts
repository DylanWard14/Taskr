import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({ dbMock: vi.fn() }));

vi.mock("../../../lib/db.js", () => ({
  db: dbMock,
}));

// Import after the mock is registered so the module under test picks up the
// mocked `db` export instead of a real knex instance.
const {
  attachMediaToComment,
  createComment,
  deleteCommentById,
  findCommentById,
  findTaskTeamMembership,
  listCommentsForTaskAsMember,
} = await import("../repository.js");

/**
 * A minimal, thenable stand-in for a knex QueryBuilder: every chain method
 * returns itself, and awaiting/`.then`-ing it resolves with the canned
 * `result`, mirroring how knex's builder is itself a promise.
 */
function makeBuilder(result: unknown) {
  const builder: Record<string, unknown> = {
    where: vi.fn(() => builder),
    andWhere: vi.fn(() => builder),
    join: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    whereIn: vi.fn(() => builder),
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    returning: vi.fn(() => builder),
    update: vi.fn(() => Promise.resolve(result)),
    del: vi.fn(() => Promise.resolve(result)),
    first: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

beforeEach(() => {
  dbMock.mockReset();
});

describe("findTaskTeamMembership", () => {
  it("joins tasks to team_members filtered by task and user", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    const builder = makeBuilder(membership);
    dbMock.mockReturnValue(builder);

    const result = await findTaskTeamMembership("task-1", "user-1");

    expect(dbMock).toHaveBeenCalledWith("tasks");
    expect(builder.join).toHaveBeenCalledWith("team_members", "tasks.team_id", "team_members.team_id");
    expect(builder.where).toHaveBeenCalledWith("tasks.id", "task-1");
    expect(builder.andWhere).toHaveBeenCalledWith("team_members.user_id", "user-1");
    expect(result).toEqual(membership);
  });

  it("resolves undefined when there is no membership row", async () => {
    dbMock.mockReturnValue(makeBuilder(undefined));

    const result = await findTaskTeamMembership("task-1", "user-1");

    expect(result).toBeUndefined();
  });
});

describe("listCommentsForTaskAsMember", () => {
  it("returns null without querying comments when the caller has no membership", async () => {
    dbMock.mockReturnValueOnce(makeBuilder(undefined));

    const result = await listCommentsForTaskAsMember("task-1", "user-1");

    expect(result).toBeNull();
    expect(dbMock).toHaveBeenCalledTimes(1);
    expect(dbMock).toHaveBeenCalledWith("tasks");
  });

  it("returns the comments for the task when the caller is a member", async () => {
    const membership = { team_id: "team-1", user_id: "user-1", role: "member" };
    const comments = [{ id: "c1", task_id: "task-1", author_id: "user-1", body: "hi" }];

    const membershipBuilder = makeBuilder(membership);
    const commentsBuilder = makeBuilder(comments);
    dbMock.mockReturnValueOnce(membershipBuilder).mockReturnValueOnce(commentsBuilder);

    const result = await listCommentsForTaskAsMember("task-1", "user-1");

    expect(dbMock).toHaveBeenNthCalledWith(1, "tasks");
    expect(dbMock).toHaveBeenNthCalledWith(2, "comments");
    expect(commentsBuilder.where).toHaveBeenCalledWith({ task_id: "task-1" });
    expect(result).toEqual(comments);
  });
});

describe("createComment", () => {
  it("inserts a comment row scoped to the task and author", async () => {
    const inserted = { id: "c1", task_id: "task-1", author_id: "user-1", body: "hello" };
    const builder = makeBuilder([inserted]);
    dbMock.mockReturnValue(builder);

    const result = await createComment({ taskId: "task-1", authorId: "user-1", body: "hello" });

    expect(dbMock).toHaveBeenCalledWith("comments");
    expect(builder.insert).toHaveBeenCalledWith({
      task_id: "task-1",
      author_id: "user-1",
      body: "hello",
    });
    expect(result).toEqual(inserted);
  });
});

describe("attachMediaToComment", () => {
  it("skips the query when there are no media ids", async () => {
    const result = await attachMediaToComment([], "c1");
    expect(result).toBe(0);
    expect(dbMock).not.toHaveBeenCalled();
  });

  it("updates matching media rows with the comment id", async () => {
    const builder = makeBuilder(2);
    dbMock.mockReturnValue(builder);

    const result = await attachMediaToComment(["m1", "m2"], "c1");

    expect(dbMock).toHaveBeenCalledWith("media");
    expect(builder.whereIn).toHaveBeenCalledWith("id", ["m1", "m2"]);
    expect(builder.update).toHaveBeenCalledWith({ comment_id: "c1" });
    expect(result).toBe(2);
  });
});

describe("findCommentById / deleteCommentById", () => {
  it("looks up a comment by id", async () => {
    const comment = { id: "c1", task_id: "task-1", author_id: "user-1", body: "hi" };
    const builder = makeBuilder(comment);
    dbMock.mockReturnValue(builder);

    const result = await findCommentById("c1");

    expect(dbMock).toHaveBeenCalledWith("comments");
    expect(builder.where).toHaveBeenCalledWith({ id: "c1" });
    expect(result).toEqual(comment);
  });

  it("deletes a comment by id", async () => {
    const builder = makeBuilder(1);
    dbMock.mockReturnValue(builder);

    const result = await deleteCommentById("c1");

    expect(dbMock).toHaveBeenCalledWith("comments");
    expect(builder.where).toHaveBeenCalledWith({ id: "c1" });
    expect(result).toBe(1);
  });
});
