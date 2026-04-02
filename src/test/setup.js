import '@testing-library/jest-dom'
import { configure } from '@testing-library/dom'

// Exclude <option> elements from getByText queries to avoid false positives
// when category names appear in both select options and spending items.
configure({ defaultIgnore: 'script, style, option' })

// Mock window.alert for tests
global.alert = vi.fn()

// Mock URL.createObjectURL and URL.revokeObjectURL for jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Clear localStorage before each test to prevent state leakage between tests
beforeEach(() => {
  localStorage.clear()
})
