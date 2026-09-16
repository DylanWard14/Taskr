// localStorage key used to persist the auth JWT. Shared by lib/api-client.ts
// (which attaches it to outgoing requests) and features/auth's hooks (which
// write/clear it around login/signup/logout, and listen for cross-tab
// changes to it).
export const TOKEN_STORAGE_KEY = 'taskr_token'
