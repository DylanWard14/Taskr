import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js", () => ({
  createTeamWithOwner: vi.fn(),
  listTeamsForUser: vi.fn(),
  findTeamById: vi.fn(),
  findMembership: vi.fn(),
  listTeamMembers: vi.fn(),
  findUserByEmail: vi.fn(),
  addTeamMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  countOwners: vi.fn(),
}));

import * as repository from "./repository.js";
import {
  addMember,
  createTeam,
  getTeamForUser,
  getTeamMembers,
  getTeamsForUser,
  removeMember,
  updateMemberRole,
} from "./service.js";

const mocked = vi.mocked(repository);

const TEAM_ID = "team-1";
const OWNER_ID = "owner-1";
const ADMIN_ID = "admin-1";
const MEMBER_ID = "member-1";
const OUTSIDER_ID = "outsider-1";

function membership(role: "owner" | "admin" | "member") {
  return {
    team_id: TEAM_ID,
    user_id: "whoever",
    role,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe("teams service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTeam", () => {
    it("creates the team and makes the creator its owner", async () => {
      const team = { id: TEAM_ID, name: "Engineering", created_at: new Date(), updated_at: new Date() };
      mocked.createTeamWithOwner.mockResolvedValueOnce(team);

      const result = await createTeam(OWNER_ID, { name: "Engineering" });

      expect(result).toEqual(team);
      expect(mocked.createTeamWithOwner).toHaveBeenCalledWith("Engineering", OWNER_ID);
    });
  });

  describe("getTeamsForUser", () => {
    it("delegates to the repository", async () => {
      mocked.listTeamsForUser.mockResolvedValueOnce([]);
      await getTeamsForUser(OWNER_ID);
      expect(mocked.listTeamsForUser).toHaveBeenCalledWith(OWNER_ID);
    });
  });

  describe("getTeamForUser", () => {
    it("returns the team for a member", async () => {
      const team = { id: TEAM_ID, name: "Eng", created_at: new Date(), updated_at: new Date() };
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.findTeamById.mockResolvedValueOnce(team);

      const result = await getTeamForUser(TEAM_ID, MEMBER_ID);

      expect(result).toEqual(team);
    });

    it("returns 404 for a non-member (does not leak team existence)", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(getTeamForUser(TEAM_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.findTeamById).not.toHaveBeenCalled();
    });
  });

  describe("getTeamMembers", () => {
    it("returns 404 for a non-member", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(getTeamMembers(TEAM_ID, OUTSIDER_ID)).rejects.toMatchObject({ status: 404 });
      expect(mocked.listTeamMembers).not.toHaveBeenCalled();
    });

    it("lists members for a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));
      mocked.listTeamMembers.mockResolvedValueOnce([
        { user_id: MEMBER_ID, email: "m@example.com", name: "M", role: "member" },
      ]);

      const result = await getTeamMembers(TEAM_ID, MEMBER_ID);

      expect(result).toHaveLength(1);
    });
  });

  describe("addMember", () => {
    it("returns 404 for a non-member requester (does not leak team existence)", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(
        addMember(TEAM_ID, OUTSIDER_ID, { email: "new@example.com", role: "member" }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("blocks a regular member from adding members (403)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("member"));

      await expect(
        addMember(TEAM_ID, MEMBER_ID, { email: "new@example.com", role: "member" }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("blocks an admin from granting the owner role (403)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("admin"));

      await expect(
        addMember(TEAM_ID, ADMIN_ID, { email: "new@example.com", role: "owner" }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("returns 404 when the target email has no matching user", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("admin"));
      mocked.findUserByEmail.mockResolvedValueOnce(undefined);

      await expect(
        addMember(TEAM_ID, ADMIN_ID, { email: "missing@example.com", role: "member" }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("returns 409 when the target is already a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("admin"));
      mocked.findUserByEmail.mockResolvedValueOnce({
        id: MEMBER_ID,
        email: "existing@example.com",
        name: "Existing",
      });
      mocked.findMembership.mockResolvedValueOnce(membership("member"));

      await expect(
        addMember(TEAM_ID, ADMIN_ID, { email: "existing@example.com", role: "member" }),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocked.addTeamMember).not.toHaveBeenCalled();
    });

    it("allows an owner to add a member and grant admin", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findUserByEmail.mockResolvedValueOnce({
        id: "new-user",
        email: "new@example.com",
        name: "New",
      });
      mocked.findMembership.mockResolvedValueOnce(undefined);
      mocked.addTeamMember.mockResolvedValueOnce({
        team_id: TEAM_ID,
        user_id: "new-user",
        role: "admin",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await addMember(TEAM_ID, OWNER_ID, {
        email: "new@example.com",
        role: "admin",
      });

      expect(result).toEqual({
        user_id: "new-user",
        email: "new@example.com",
        name: "New",
        role: "admin",
      });
      expect(mocked.addTeamMember).toHaveBeenCalledWith(TEAM_ID, "new-user", "admin");
    });
  });

  describe("updateMemberRole", () => {
    it("returns 404 for a non-member requester", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(
        updateMemberRole(TEAM_ID, OUTSIDER_ID, MEMBER_ID, "admin"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("blocks a non-owner from changing roles (403)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("admin"));

      await expect(
        updateMemberRole(TEAM_ID, ADMIN_ID, MEMBER_ID, "admin"),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("blocks a user from changing their own role", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));

      await expect(
        updateMemberRole(TEAM_ID, OWNER_ID, OWNER_ID, "admin"),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("returns 404 when the target is not a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(
        updateMemberRole(TEAM_ID, OWNER_ID, OUTSIDER_ID, "admin"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("prevents demoting the last remaining owner (409)", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce({ ...membership("owner"), user_id: MEMBER_ID });
      mocked.countOwners.mockResolvedValueOnce(1);

      await expect(
        updateMemberRole(TEAM_ID, OWNER_ID, MEMBER_ID, "admin"),
      ).rejects.toMatchObject({ status: 409 });
      expect(mocked.updateMemberRole).not.toHaveBeenCalled();
    });

    it("allows an owner to demote a co-owner when another owner remains", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce({ ...membership("owner"), user_id: MEMBER_ID });
      mocked.countOwners.mockResolvedValueOnce(2);
      mocked.updateMemberRole.mockResolvedValueOnce({
        team_id: TEAM_ID,
        user_id: MEMBER_ID,
        role: "admin",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await updateMemberRole(TEAM_ID, OWNER_ID, MEMBER_ID, "admin");

      expect(result).toEqual({ user_id: MEMBER_ID, role: "admin" });
      expect(mocked.updateMemberRole).toHaveBeenCalledWith(TEAM_ID, MEMBER_ID, "admin");
    });

    it("allows an owner to change another member's role when not the last owner", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce({ ...membership("admin"), user_id: MEMBER_ID });
      mocked.updateMemberRole.mockResolvedValueOnce({
        team_id: TEAM_ID,
        user_id: MEMBER_ID,
        role: "member",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await updateMemberRole(TEAM_ID, OWNER_ID, MEMBER_ID, "member");

      expect(result).toEqual({ user_id: MEMBER_ID, role: "member" });
    });
  });

  describe("removeMember", () => {
    it("returns 404 for a non-member requester", async () => {
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(removeMember(TEAM_ID, OUTSIDER_ID, MEMBER_ID)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("returns 404 when the target is not a member", async () => {
      mocked.findMembership.mockResolvedValueOnce(membership("owner"));
      mocked.findMembership.mockResolvedValueOnce(undefined);

      await expect(removeMember(TEAM_ID, OWNER_ID, OUTSIDER_ID)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("blocks a regular member from removing another member (403)", async () => {
      mocked.findMembership.mockResolvedValueOnce({ ...membership("member"), user_id: MEMBER_ID });
      mocked.findMembership.mockResolvedValueOnce({ ...membership("member"), user_id: "other" });

      await expect(removeMember(TEAM_ID, MEMBER_ID, "other")).rejects.toMatchObject({
        status: 403,
      });
    });

    it("blocks an admin from removing another admin (403)", async () => {
      mocked.findMembership.mockResolvedValueOnce({ ...membership("admin"), user_id: ADMIN_ID });
      mocked.findMembership.mockResolvedValueOnce({ ...membership("admin"), user_id: "other-admin" });

      await expect(removeMember(TEAM_ID, ADMIN_ID, "other-admin")).rejects.toMatchObject({
        status: 403,
      });
    });

    it("prevents removing the last remaining owner", async () => {
      mocked.findMembership.mockResolvedValueOnce({ ...membership("owner"), user_id: OWNER_ID });
      mocked.findMembership.mockResolvedValueOnce({ ...membership("owner"), user_id: OWNER_ID });
      mocked.countOwners.mockResolvedValueOnce(1);

      await expect(removeMember(TEAM_ID, OWNER_ID, OWNER_ID)).rejects.toMatchObject({
        status: 409,
      });
      expect(mocked.removeMember).not.toHaveBeenCalled();
    });

    it("allows a member to remove themselves (leave the team)", async () => {
      mocked.findMembership.mockResolvedValueOnce({ ...membership("member"), user_id: MEMBER_ID });
      mocked.findMembership.mockResolvedValueOnce({ ...membership("member"), user_id: MEMBER_ID });
      mocked.removeMember.mockResolvedValueOnce(1);

      await removeMember(TEAM_ID, MEMBER_ID, MEMBER_ID);

      expect(mocked.removeMember).toHaveBeenCalledWith(TEAM_ID, MEMBER_ID);
    });

    it("allows an owner or admin to remove a regular member", async () => {
      mocked.findMembership.mockResolvedValueOnce({ ...membership("admin"), user_id: ADMIN_ID });
      mocked.findMembership.mockResolvedValueOnce({ ...membership("member"), user_id: MEMBER_ID });
      mocked.removeMember.mockResolvedValueOnce(1);

      await removeMember(TEAM_ID, ADMIN_ID, MEMBER_ID);

      expect(mocked.removeMember).toHaveBeenCalledWith(TEAM_ID, MEMBER_ID);
    });
  });
});
