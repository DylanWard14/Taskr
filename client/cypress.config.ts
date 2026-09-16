import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    chromeWebSecurity: false,
  },
  env: {
    // Matches the VITE_API_BASE_URL fallback baked into client/src/lib/api-client.ts.
    // Specs use this (via cy.request, which isn't subject to browser CORS) to seed
    // data directly against the API — e.g. creating a second user to invite to a team.
    apiUrl: 'http://localhost:3000',
  },
})
