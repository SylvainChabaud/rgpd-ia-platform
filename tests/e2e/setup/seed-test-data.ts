/**
 * E2E Test Data Seeding
 * 
 * Creates test users and tenants for E2E tests
 * Run before E2E tests: npm run test:e2e:setup
 */

import { config } from 'dotenv'
import { Pool } from 'pg'
import { createHash } from 'crypto'

// Load environment variables
config()

const TEST_PASSWORD = 'AdminPass123!'

// Hash password with salt (same format as Sha256PasswordHasher)
function hashPassword(password: string): string {
  const salt = 'testsalt1234567890abcdef' // Fixed salt for test reproducibility
  const digest = createHash('sha256').update(salt + ':' + password).digest('hex')
  return `${salt}:${digest}`
}

const TEST_PASSWORD_HASH = hashPassword(TEST_PASSWORD)

// Helper to hash email
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex')
}

async function seedTestData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log('🌱 Seeding test data...')

    // 1. Create test tenant
    const tenantResult = await pool.query(`
      INSERT INTO tenants (slug, name)
      VALUES ('test-tenant', 'Test Tenant')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `)
    const tenantId = tenantResult.rows[0].id
    console.log('✅ Test tenant created:', tenantId)

    // 2. Create PLATFORM admin user
    const platformEmail = 'admin@platform.local'
    const platformEmailHash = hashEmail(platformEmail)
    
    // Check if PLATFORM admin exists
    const existingPlatform = await pool.query(
      'SELECT id FROM users WHERE scope = $1',
      ['PLATFORM']
    )
    
    if (existingPlatform.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (email_hash, display_name, password_hash, scope, role, tenant_id)
        VALUES ($1, 'Admin Platform', $2, 'PLATFORM', 'SUPER_ADMIN', NULL)
      `, [platformEmailHash, TEST_PASSWORD_HASH])
      console.log('✅ PLATFORM admin created: admin@platform.local')
    } else {
      // Update password and display_name
      await pool.query(
        'UPDATE users SET password_hash = $1, email_hash = $2, display_name = $3 WHERE scope = $4',
        [TEST_PASSWORD_HASH, platformEmailHash, 'Admin Platform', 'PLATFORM']
      )
      console.log('✅ PLATFORM admin updated: admin@platform.local')
    }

    // 3. Create TENANT admin user
    const tenantEmail = 'admin@tenant1.local'
    const tenantEmailHash = hashEmail(tenantEmail)
    
    const existingTenant = await pool.query(
      'SELECT id FROM users WHERE email_hash = $1',
      [tenantEmailHash]
    )
    
    if (existingTenant.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (email_hash, display_name, password_hash, scope, role, tenant_id)
        VALUES ($1, 'Admin Tenant', $2, 'TENANT', 'ADMIN', $3)
      `, [tenantEmailHash, TEST_PASSWORD_HASH, tenantId])
      console.log('✅ TENANT admin created: admin@tenant1.local')
    } else {
      await pool.query(
        'UPDATE users SET password_hash = $1, tenant_id = $2, display_name = $3 WHERE email_hash = $4',
        [TEST_PASSWORD_HASH, tenantId, 'Admin Tenant', tenantEmailHash]
      )
      console.log('✅ TENANT admin updated: admin@tenant1.local')
    }

    // 4. Create additional tenants for CRUD tests
    const additionalTenants = [
      { slug: 'acme-corp', name: 'ACME Corporation' },
      { slug: 'tech-startup', name: 'Tech Startup Inc' },
      { slug: 'health-clinic', name: 'Health Clinic' },
    ]

    for (const tenant of additionalTenants) {
      await pool.query(`
        INSERT INTO tenants (slug, name)
        VALUES ($1, $2)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      `, [tenant.slug, tenant.name])
    }
    console.log(`✅ ${additionalTenants.length} additional tenants created`)

    console.log('✅ Test data seeded successfully!')
    console.log('\n📝 Test credentials:')
    console.log('   PLATFORM Admin: admin@platform.local / AdminPass123!')
    console.log('   TENANT Admin:   admin@tenant1.local / AdminPass123!')

  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { seedTestData }
