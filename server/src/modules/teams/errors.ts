export type TeamHttpStatus = 400 | 403 | 404 | 409;

export class TeamHttpError extends Error {
  status: TeamHttpStatus;

  constructor(status: TeamHttpStatus, message: string) {
    super(message);
    this.name = "TeamHttpError";
    this.status = status;
  }
}
