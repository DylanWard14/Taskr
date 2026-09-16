// Shared helpers for generating unique test data. The e2e suite runs against
// a shared, long-lived dev database (not a per-run-empty one), so every spec
// must use randomized identifiers (email addresses, team names, ...) to avoid
// colliding with data left behind by other runs/other people pointed at the
// same DB — e.g. a duplicate email would 409 and break an otherwise-unrelated
// run.
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

export const TEST_PASSWORD = 'password123'
