import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./repository.js");

import { TeamHttpError } from "./errors.js";
import * as repository from "./repository.js";
import { addMember, getTeamForMember, removeMember } from "./service.js";

const mockedRepository = vi.mocked(repository);

describe("teams service authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTeamForMember", () => {
    it("returns the team when the caller is a member", async () => {
      mockedRepository.getMembership.mockResolvedValue({
        team_id: "team-1",
        user_id: "user-1",
        role: "member",
      } as never);
      mockedRepository.getTeamById.mockResolvedValue({ id: "team-1", name: "Team One" } as never);

      const result = await getTeamForMember("team-1", "user-1");

      expect(result).toEqual({ id: "team-1", name: "Team One" });
    });

    it("throws 403 when the team exists but the caller is not a member", async () => {
      mockedRepository.getMembership.mockResolvedValue(undefined);
      mockedRepository.getTeamById.mockResolvedValue({ id: "team-1", name: "Team One" } as never);

      await expect(getTeamForMember("team-1", "outsider")).rejects.toMatchObject(
        new TeamHttpError(403, "You are not a member of this team"),
      );
    });

    it("throws 404 when the team does not exist", async () => {
      mockedRepository.getMembership.mockResolvedValue(undefined);
      mockedRepository.getTeamById.mockResolvedValue(undefined);

      await expect(getTeamForMember("missing-team", "user-1")).rejects.toMatchObject(
        new TeamHttpError(404, "Team not found"),
      );
    });
  });

  describe("addMember", () => {
    it("throws 404 when the acting user is not a member of the team", async () => {
      mockedRepository.getMembership.mockResolvedValue(undefined);

      await expect(
        addMember("team-1", "outsider", { email: "new@example.com", role: "member" } as never),
      ).rejects.toMatchObject(new TeamHttpError(404, "Team not found"));

      expect(mockedRepository.addMember).not.toHaveBeenCalled();
    });

    it("throws 403 when the acting user is only a regular member", async () => {
      mockedRepository.getMembership.mockResolvedValue({
        team_id: "team-1",
        user_id: "user-1",
        role: "member",
      } as never);

      await expect(
        addMember("team-1", "user-1", { email: "new@example.com", role: "member" } as never),
      ).rejects.toMatchObject(new TeamHttpError(403, "Only team owners or admins can manage members"));

      expect(mockedRepository.addMember).not.toHaveBeenCalled();
    });

    it("throws 404 when the target user cannot be found", async () => {
      mockedRepository.getMembership.mockResolvedValueOnce({
        team_id: "team-1",
        user_id: "owner-1",
        role: "owner",
      } as never);
      mockedRepository.findUserByEmail.mockResolvedValue(undefined);

      await expect(
        addMember("team-1", "owner-1", { email: "missing@example.com", role: "member" } as never),
      ).rejects.toMatchObject(new TeamHttpError(404, "User not found"));
    });

    it("throws 409 when the target user is already a member", async () => {
      mockedRepository.getMembership
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "owner-1", role: "owner" } as never)
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "user-2", role: "member" } as never);
      mockedRepository.findUserByEmail.mockResolvedValue({ id: "user-2", email: "a@example.com" } as never);

      await expect(
        addMember("team-1", "owner-1", { email: "a@example.com", role: "member" } as never),
      ).rejects.toMatchObject(new TeamHttpError(409, "User is already a member of this team"));

      expect(mockedRepository.addMember).not.toHaveBeenCalled();
    });

    it("adds the member when the acting user is an owner or admin", async () => {
      mockedRepository.getMembership
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "admin-1", role: "admin" } as never)
        .mockResolvedValueOnce(undefined);
      mockedRepository.findUserByEmail.mockResolvedValue({ id: "user-2", email: "a@example.com" } as never);
      mockedRepository.addMember.mockResolvedValue(undefined);

      const result = await addMember("team-1", "admin-1", {
        email: "a@example.com",
        role: "member",
      } as never);

      expect(mockedRepository.addMember).toHaveBeenCalledWith("team-1", "user-2", "member");
      expect(result).toEqual({ teamId: "team-1", userId: "user-2", role: "member" });
    });
  });

  describe("removeMember", () => {
    it("throws 403 when the acting user is not an owner or admin", async () => {
      mockedRepository.getMembership.mockResolvedValue({
        team_id: "team-1",
        user_id: "user-1",
        role: "member",
      } as never);

      await expect(removeMember("team-1", "user-1", "user-2")).rejects.toMatchObject(
        new TeamHttpError(403, "Only team owners or admins can manage members"),
      );

      expect(mockedRepository.removeMember).not.toHaveBeenCalled();
    });

    it("throws 409 when removing the last owner", async () => {
      mockedRepository.getMembership
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "owner-1", role: "owner" } as never)
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "owner-1", role: "owner" } as never);
      mockedRepository.countOwners.mockResolvedValue(1);

      await expect(removeMember("team-1", "owner-1", "owner-1")).rejects.toMatchObject(
        new TeamHttpError(409, "Cannot remove the last owner of a team"),
      );

      expect(mockedRepository.removeMember).not.toHaveBeenCalled();
    });

    it("removes the member when there is more than one owner", async () => {
      mockedRepository.getMembership
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "owner-1", role: "owner" } as never)
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "owner-2", role: "owner" } as never);
      mockedRepository.countOwners.mockResolvedValue(2);
      mockedRepository.removeMember.mockResolvedValue(undefined);

      await removeMember("team-1", "owner-1", "owner-2");

      expect(mockedRepository.removeMember).toHaveBeenCalledWith("team-1", "owner-2");
    });

    it("throws 404 when the target membership does not exist", async () => {
      mockedRepository.getMembership
        .mockResolvedValueOnce({ team_id: "team-1", user_id: "owner-1", role: "owner" } as never)
        .mockResolvedValueOnce(undefined);

      await expect(removeMember("team-1", "owner-1", "ghost-user")).rejects.toMatchObject(
        new TeamHttpError(404, "Membership not found"),
      );
    });
  });
});
