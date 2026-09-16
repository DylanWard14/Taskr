import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// jsdom doesn't implement scrollTo; TanStack Router's scroll restoration calls
// it on navigation, which otherwise logs a noisy "Not implemented" error.
window.scrollTo = () => {}
