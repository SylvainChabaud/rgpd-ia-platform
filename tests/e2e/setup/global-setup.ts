/**
 * Playwright Global Setup
 * 
 * Runs once before all E2E tests
 * Seeds database with test data
 */

import { seedTestData } from './seed-test-data'

async function globalSetup() {
  console.log('🔧 Running global E2E setup...')
  
  try {
    await seedTestData()
    console.log('✅ Global setup complete')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}

export default globalSetup
