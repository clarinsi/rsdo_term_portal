const { mkdir } = require('fs/promises')
const db = require('../models/db')
const User = require('../models/user')
const {
  portalAdminInitialEmail,
  portalAdminInitialPassword
} = require('../config/keys')
const { TEMP_EXPORT_PATH } = require('./settings')
const debug = require('debug')('termPortal:config/init')

exports.fsStructure = async () => {
  await mkdir(TEMP_EXPORT_PATH, { recursive: true })
}

async function createPortalAdmin() {
  const {
    rows: [{ exists }]
  } = await db.query(
    "SELECT EXISTS (SELECT 1 FROM user_role WHERE role_name = 'portal admin')"
  )

  if (exists) return 'Skipping creation of portal admin (already exists)'

  const ADMIN_BASE = 'admin'
  const adminUser = {
    username: ADMIN_BASE,
    firstName: ADMIN_BASE,
    lastName: ADMIN_BASE,
    password: portalAdminInitialPassword,
    email: portalAdminInitialEmail
  }
  const userId = await User.create(adminUser)
  const assignAdminRole = db.query(
    `INSERT INTO user_role (user_id, role_name)
    VALUES
    ($1, 'portal admin'),
    ($1, 'dictionaries admin'),
    ($1, 'consultancy admin'),
    ($1, 'consultant')`,
    [userId]
  )
  const activateAdminUser = db.query(
    `UPDATE "user" SET status = 'active', time_activated = time_registered WHERE username = $1`,
    [adminUser.username]
  )
  await Promise.all([assignAdminRole, activateAdminUser])
  return `Successfully created portal admin (username: ${adminUser.username}, password: ${adminUser.password})`
}

exports.adminUser = async () => {
  // Generate portal admin user in empty DB.
  // TODO Replace with a more robust solution for production.
  try {
    const message = await createPortalAdmin()
    debug(message)
  } catch (error) {
    debug('Portal admin not seeded.')
    debug(error)
  }
}
