// Shared helper for turning a caught error (typically an ApiError from
// lib/api-client.ts) into a user-facing message. Features render this
// directly rather than a generic "Something went wrong" so server-provided
// messages (e.g. permission/conflict errors from the teams API) reach the UI.
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
