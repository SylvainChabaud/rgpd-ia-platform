/**
 * Jest Setup - Backend Tests
 *
 * Runs after jest.setup.js (which loads .env.test)
 * Configures Node.js environment for backend testing
 */

// Mock fetch for Node.js environment
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder

// Mock Next.js server-only APIs that might be imported
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
    forEach: jest.fn(),
  })),
}))

// Mock Next.js cache APIs
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Increase timeout for database operations
jest.setTimeout(10000)

console.log('✅ Backend test environment configured (Node.js)')
