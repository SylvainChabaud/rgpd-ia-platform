/**
 * E2E Test Data Seeding
 * 
 * Creates test users and tenants for E2E tests
 * Run before E2E tests: npm run test:e2e:setup
 */

import { config } from 'dotenv'
import { Pool } from 'pg'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config()

// Get test credentials from .env (with fallback to defaults)
const TEST_PLATFORM_ADMIN_EMAIL = process.env.TEST_PLATFORM_ADMIN_EMAIL || 'admin@platform.local'
const TEST_PLATFORM_ADMIN_PASSWORD = process.env.TEST_PLATFORM_ADMIN_PASSWORD || 'Admin1234'
const TEST_PLATFORM_ADMIN_NAME = process.env.TEST_PLATFORM_ADMIN_NAME || 'Platform Administrator'

const TEST_TENANT_ADMIN_EMAIL = process.env.TEST_TENANT_ADMIN_EMAIL || 'admin@tenant1.local'
const TEST_TENANT_ADMIN_PASSWORD = process.env.TEST_TENANT_ADMIN_PASSWORD || 'Admin1234'
const TEST_TENANT_ADMIN_NAME = process.env.TEST_TENANT_ADMIN_NAME || 'Tenant Administrator'

const TEST_PASSWORD_SALT = process.env.TEST_PASSWORD_SALT || 'testsalt1234567890abcdef'

// Hash password with salt (same format as Sha256PasswordHasher)
function hashPassword(password: string, salt: string = TEST_PASSWORD_SALT): string {
  const digest = createHash('sha256').update(salt + ':' + password).digest('hex')
  return `${salt}:${digest}`
}

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
    const platformEmail = TEST_PLATFORM_ADMIN_EMAIL
    const platformPassword = TEST_PLATFORM_ADMIN_PASSWORD
    const platformName = TEST_PLATFORM_ADMIN_NAME
    const platformEmailHash = hashEmail(platformEmail)
    const platformPasswordHash = hashPassword(platformPassword)

    // Check if PLATFORM admin exists
    const existingPlatform = await pool.query(
      'SELECT id FROM users WHERE scope = $1',
      ['PLATFORM']
    )

    if (existingPlatform.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (email_hash, display_name, password_hash, scope, role, tenant_id)
        VALUES ($1, $2, $3, 'PLATFORM', 'SUPERADMIN', NULL)
      `, [platformEmailHash, platformName, platformPasswordHash])
      console.log(`✅ PLATFORM admin created: ${platformEmail}`)
    } else {
      // Update password and display_name
      await pool.query(
        'UPDATE users SET password_hash = $1, email_hash = $2, display_name = $3 WHERE scope = $4',
        [platformPasswordHash, platformEmailHash, platformName, 'PLATFORM']
      )
      console.log(`✅ PLATFORM admin updated: ${platformEmail}`)
    }

    // 3. Create TENANT admin user
    const tenantEmail = TEST_TENANT_ADMIN_EMAIL
    const tenantPassword = TEST_TENANT_ADMIN_PASSWORD
    const tenantName = TEST_TENANT_ADMIN_NAME
    const tenantEmailHash = hashEmail(tenantEmail)
    const tenantPasswordHash = hashPassword(tenantPassword)

    const existingTenant = await pool.query(
      'SELECT id FROM users WHERE email_hash = $1',
      [tenantEmailHash]
    )

    if (existingTenant.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (email_hash, display_name, password_hash, scope, role, tenant_id)
        VALUES ($1, $2, $3, 'TENANT', 'TENANT_ADMIN', $4)
      `, [tenantEmailHash, tenantName, tenantPasswordHash, tenantId])
      console.log(`✅ TENANT admin created: ${tenantEmail}`)
    } else {
      await pool.query(
        'UPDATE users SET password_hash = $1, tenant_id = $2, display_name = $3 WHERE email_hash = $4',
        [tenantPasswordHash, tenantId, tenantName, tenantEmailHash]
      )
      console.log(`✅ TENANT admin updated: ${tenantEmail}`)
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

    // 5. Seed security incidents (violations RGPD)
    console.log('🔐 Seeding security incidents...')
    const incidentsSeedPath = join(__dirname, '../../../migrations/seeds/dev-incidents.sql')
    const incidentsSeedSQL = readFileSync(incidentsSeedPath, 'utf-8')

    try {
      await pool.query(incidentsSeedSQL)
      console.log('✅ 10 security incidents seeded')
    } catch (error) {
      console.warn('⚠️  Failed to seed security incidents (non-blocking):', error)
    }

    // 6. Seed dashboard data (consents, ai_jobs, rgpd_requests, audit_events)
    console.log('📊 Seeding dashboard data...')
    const dashboardSeedPath = join(__dirname, '../../../migrations/seeds/dev-dashboard-data.sql')
    const dashboardSeedSQL = readFileSync(dashboardSeedPath, 'utf-8')

    try {
      await pool.query(dashboardSeedSQL)
      console.log('✅ Dashboard data seeded (consents, ai_jobs, rgpd_requests, audit_events)')
    } catch (error) {
      console.warn('⚠️  Failed to seed dashboard data (non-blocking):', error)
    }

    console.log('✅ Test data seeded successfully!')
    console.log('\n📝 Test credentials:')
    console.log('   PLATFORM Admin: admin@platform.local / Admin1234')
    console.log('   TENANT Admin:   admin@tenant1.local / Admin1234')

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
