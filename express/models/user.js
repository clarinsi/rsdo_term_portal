const db = require('./db')
const bcrypt = require('bcrypt')
const uid = require('uid-safe')
const { deserialize } = require('./helpers/user')

const User = {}

// Create new user in DB.
User.create = async user => {
  const SALT_ROUNDS = 12
  const bcryptHash = await bcrypt.hash(user.password, SALT_ROUNDS)

  const values = [
    user.username || null,
    user.firstName || null,
    user.lastName || null,
    user.email || null,
    bcryptHash || null
  ]
  if (user.language) values.push(user.language)

  const text = `INSERT INTO "user" (
      username,
      first_name,
      last_name,
      email,
      bcrypt_hash
      ${user.language ? ', language' : ''}
    )
    VALUES (${db.genParamStr(values)})
    RETURNING id`

  const { rows } = await db.query(text, values)

  const userId = rows[0].id

  return userId
}

// Save an activation token for a single user in DB.
User.saveActivationToken = async (userId, activationToken) => {
  await db.query(
    'INSERT INTO user_token_activation (token, user_id) VALUES ($1, $2)',
    [activationToken, userId]
  )
}

// Fetch user from DB by (valid) activation token.
User.fetchByActivationToken = async activationToken => {
  const TOKEN_VALID_PERIOD = '1 week'
  const text = `
    SELECT u.id
    FROM user_token_activation t
    INNER JOIN "user" u ON u.id = t.user_id
    WHERE
      t.token = $1
      AND AGE(NOW(), t.time_created) < INTERVAL '${TOKEN_VALID_PERIOD}'
  `
  const values = [activationToken]

  const { rows } = await db.query(text, values)
  const user = rows[0]

  // TODO Perhaps suggest to the user to request another one and make a shortcut.
  if (!user) throw Error('Povezava je neveljavna ali pa je že potekla')

  return user
}

// Activate user account.
User.activateAccount = async user => {
  await db.query(
    `UPDATE "user" SET status = 'active', time_activated = NOW() WHERE id = $1`,
    [user.id]
  )
}

// Generate a user remember me token.
User.generateRememberMeToken = async () => {
  const token = await uid(32)
  return token
}

// Save a remember me token for a single user in DB.
User.saveRememberMeToken = async (user, rememberMeToken) => {
  await db.query(
    'INSERT INTO user_token_remember_me (token, user_id) VALUES ($1, $2)',
    [rememberMeToken, user.id]
  )
}

// Remove a specific remember me token from DB.
User.clearRememberMeToken = async rememberMeToken => {
  await db.query('DELETE FROM user_token_remember_me WHERE token = $1', [
    rememberMeToken
  ])
}

// Fetch user data that should be available on every request from DB by id.
User.fetchDeserializedDataById = async userId => {
  const text = `
    SELECT
      u.id,
      u.username,
      u.first_name,
      u.last_name,
      u.email,
      u.hits_per_page,
      u.language,
      ARRAY(
        SELECT jsonb_build_object(
          'roleName', r.role_name,
          'dictionaryId', r.dictionary_id,
          'administration', r.administration,
          'terminologyReview', r.terminology_review,
          'languageReview', r.language_review,
          'editing', r.editing)
        FROM user_role r
        WHERE r.user_id = u.id
      ) user_roles,
      ARRAY(
        SELECT jsonb_build_object(
          'id', cr.entry_id,
          'isModerator', cr.is_moderator)
        FROM consultancy_entry_consultant cr
        WHERE cr.user_id = u.id
      ) assigned_consultancy_entries
    FROM "user" u
    WHERE
      u.id = $1`
  const values = [userId]

  const {
    rows: [user]
  } = await db.query(text, values)

  const deserializedUser = deserialize.userById(user)
  return deserializedUser
}

// Fetch all registered users on the portal
User.fetchAll = async (resultsPerPage, page) => {
  const {
    rows: [{ result }]
  } = await db.query(
    `
      SELECT jsonb_build_object(
        'pages_total', (
          SELECT CEIL(COUNT(*) / $1::float)
          FROM "user"
        ),
        'results', ARRAY(
          SELECT jsonb_build_object(
            'id', id,
            'userName', username,
            'email', email,
            'status', status
          )
          FROM "user"
          ORDER BY username
          LIMIT $1
          OFFSET $2
        )
      ) result
    `,
    [resultsPerPage, resultsPerPage * (page - 1)]
  )

  return result
}

// Fetch all users with at least one portal role along with all their portal roles.
User.fetchAllWithPortalRoles = async () => {
  const text = `
    SELECT u.id,
    u.username,
    u.email,
    jsonb_build_object(
      'isPortalAdmin', 'portal admin' = ANY (r.roles_array),
      'isDictionariesAdmin', 'dictionaries admin' = ANY (r.roles_array),
      'isConsultancyAdmin', 'consultancy admin' = ANY (r.roles_array)
    ) roles
    FROM (
      SELECT user_id, array_agg(role_name) roles_array
      FROM user_role
      WHERE role_name IN ('portal admin', 'dictionaries admin', 'consultancy admin')
      GROUP BY user_id
    ) r
    LEFT JOIN "user" u ON u.id = r.user_id
    ORDER BY u.id
`
  const { rows: users } = await db.query(text)
  return users
}

// Find searched user with specific username or email
User.findByUsernameOrEmail = async userNameEmail => {
  const text = `
    SELECT
      id,
      username,
      email
    FROM "user"
    WHERE username=$1
    OR email=$1`
  const value = [userNameEmail]

  const { rows: user } = await db.query(text, value)
  return user
}

// Delete relevant portal roles and set new ones.
User.updatePortalRoles = async rolesPerUser => {
  const rolesPerUserArr = Object.entries(rolesPerUser)
  const dbClient = await db.getClient()
  try {
    await dbClient.query('BEGIN')

    const removeAllPortalRolesQuery = `
      DELETE FROM user_role
      WHERE role_name IN ('portal admin', 'dictionaries admin', 'consultancy admin')`
    await dbClient.query(removeAllPortalRolesQuery)

    const updateRoles = rolesPerUserArr.map(async ([userId, roles]) => {
      userId = +userId.replaceAll("'", '')
      const rolesArr = []
      if (roles.isPortalAdmin) rolesArr.push('portal admin')
      if (roles.isDictionariesAdmin) rolesArr.push('dictionaries admin')
      if (roles.isConsultancyAdmin) {
        rolesArr.push('consultancy admin')
        rolesArr.push('consultant')
      }

      const updateRolesPerUser = rolesArr.map(async roleName => {
        const text = `
          INSERT INTO user_role (user_id, role_name)
          VALUES ($1, $2)`
        const values = [userId, roleName]

        await dbClient.query(text, values)
      })

      await Promise.all(updateRolesPerUser)
    })

    await Promise.all(updateRoles)

    const countAdminsQuery = `
      SELECT COUNT(*) portal_admins_count
      FROM user_role
      WHERE role_name = 'portal admin'`
    const { rows } = await dbClient.query(countAdminsQuery)
    const portalAdminsCount = +rows[0].portal_admins_count
    if (!portalAdminsCount) throw Error('Can not delete all portal admins')

    await dbClient.query('COMMIT')
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  } finally {
    dbClient.release()
  }
}

User.fetchUser = async userId => {
  const text = `
    SELECT id, username, first_name, last_name, email, status, language
    FROM "user"
    WHERE id = $1`
  const value = [userId]

  const { rows } = await db.query(text, value)
  const fetchedUser = rows[0]

  const deserializedUserData = deserialize.user(fetchedUser)
  return deserializedUserData
}

User.updateUser = async (userId, payload) => {
  const previousStatusText = 'SELECT status FROM "user" WHERE id = $1'
  const { rows } = await db.query(previousStatusText, [userId])
  const previousStatus = rows[0].status

  let statusValue
  if (previousStatus === 'registered') {
    statusValue = !payload.status ? 'registered' : 'active'
  } else statusValue = !payload.status ? 'inactive' : 'active'

  const updateText = `
    UPDATE "user"
    SET
      username = $2,
      first_name = $3,
      last_name = $4,
      status = $5
    WHERE id = $1`

  const values = [
    userId,
    payload.username,
    payload.firstName,
    payload.lastName,
    statusValue
  ]

  await db.query(updateText, values)
}

User.fetchUserRoles = async userId => {
  const text = `
    SELECT
    jsonb_build_object(
      'isPortalAdmin', 'portal admin' = ANY (r.roles_array),
      'isDictionariesAdmin', 'dictionaries admin' = ANY (r.roles_array),
      'isConsultancyAdmin', 'consultancy admin' = ANY (r.roles_array),
      'isConsultant', 'consultant' = ANY (r.roles_array),
      'isEditor', 'editor' = ANY (r.roles_array)
    ) roles
    FROM (
      SELECT user_id, array_agg(role_name) roles_array
      FROM user_role
      WHERE role_name IN ('portal admin', 'dictionaries admin', 'consultancy admin', 'consultant', 'editor')
      GROUP BY user_id
    ) r
    LEFT JOIN "user" u ON u.id = r.user_id
    WHERE u.id=$1`
  const value = [userId]

  const { rows } = await db.query(text, value)
  const fetchedUser = rows[0]

  return fetchedUser
}

User.fetchAllWithDictionaryRights = async dictionaryId => {
  const text = `
    SELECT u.username,u.email, u.id, r.administration, r.editing, r.terminology_review, r.language_review
    FROM user_role r
    INNER JOIN "user" u ON u.id = r.user_id
    WHERE dictionary_id = $1
    ORDER BY u.username`

  const value = [dictionaryId]
  const { rows: fetchedUserRights } = await db.query(text, value)

  const deserializedRights = fetchedUserRights.map(user =>
    deserialize.userRights(user)
  )
  return deserializedRights
}

User.updateUserRights = async (dictionaryId, rightsPerUser) => {
  const rightsPerUserArr = Object.entries(rightsPerUser)
  const dbClient = await db.getClient()
  try {
    await dbClient.query('BEGIN')

    const value = [dictionaryId]
    const text = `
      DELETE FROM user_role
      WHERE dictionary_id = $1`
    await dbClient.query(text, value)

    const roleName = 'editor'
    const updateRights = rightsPerUserArr.map(async ([userId, roles]) => {
      userId = +userId.replaceAll("'", '')
      const values = [
        userId,
        roleName,
        dictionaryId,
        !!roles.isAdministration,
        !!roles.isEditing,
        !!roles.isTerminologyReview,
        !!roles.isLanguageReview
      ]

      const text = `
        INSERT INTO user_role (user_id, role_name, dictionary_id, administration, editing, terminology_review, language_review)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`
      await dbClient.query(text, values)
    })

    await Promise.all(updateRights)

    const textCount = `
      SELECT COUNT(*) dictionary_admins_count
      FROM user_role
      WHERE administration = true
      AND dictionary_id = $1`
    const { rows } = await dbClient.query(textCount, value)
    const portalAdminsCount = +rows[0].dictionary_admins_count
    if (!portalAdminsCount) throw Error('Can not delete all dictionary admins')

    await dbClient.query('COMMIT')
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  } finally {
    dbClient.release()
  }
}

User.deleteUserDictionary = async dictionaryId => {
  const text = 'DELETE FROM user_role WHERE dictionary_id = $1'
  const value = [dictionaryId]

  await db.query(text, value)
}

// Fetch user with role consultant or consultancy admin
User.fetchConsultants = async () => {
  // fetch domains string for the user
  const text = `
    SELECT DISTINCT u.id, u.username, u.first_name, u.last_name, ur.domains
    FROM user_role ur
    INNER JOIN "user" u ON u.id = ur.user_id
    ORDER BY u.id ASC
  `

  const { rows } = await db.query(text)
  const users = rows

  return users
}

// Insert consultancy role domains
User.updateConsultancyDomains = async (id, value) => {
  await db.query('UPDATE user_role SET domains=$1 WHERE user_id = $2', [
    value,
    id
  ])
}

// Insert new consultant role with domain of
User.insertNewConsultantWithDomain = async (userId, domains) => {
  const { rows } = await db.query(
    "SELECT user_id FROM user_role WHERE user_id = $1 and role_name = 'consultant'",
    [userId]
  )

  if (rows.length) return

  await db.query(
    "INSERT INTO user_role (user_id, domains, role_name) VALUES ($1, $2, 'consultant')",
    [userId, domains]
  )
}

// Insert new consultant role with domain of
User.insertNewConsultantWithDomainByUsername = async (username, domains) => {
  const { rows } = await db.query(
    'SELECT id FROM "user" WHERE username = $1 or email = $1',
    [username]
  )

  await User.insertNewConsultantWithDomain(rows[0].id, domains)
}

// Remove consultant role
User.removeConsultant = async userId => {
  await db.query(
    `DELETE FROM user_role
    WHERE user_id=$1 and role_name='consultant'`,
    [userId]
  )
}

User.fetchAllowedHitsPerPage = async () => {
  return (
    await db.query(`SELECT unnest(enum_range(NULL::user_hits_per_page))`)
  ).rows.map(e => e.unnest)
}

User.updateFirstNameAndLastName = async (username, firstName, lastName) => {
  return await db.query(
    `UPDATE "user"
      SET  first_name=$2, last_name=$3
      WHERE username=$1;`,
    [username, firstName, lastName]
  )
}

User.updateHitsPerPage = async (username, hitsPerPageAmount) => {
  return await db.query(
    `UPDATE "user"
      SET hits_per_page=$2::user_hits_per_page
      WHERE username=$1;`,
    [username, hitsPerPageAmount]
  )
}

// Update user's language.
User.updateLanguage = async (userId, languageCode) => {
  await db.query('UPDATE "user" SET language = $1 WHERE id = $2', [
    languageCode,
    userId
  ])
}

module.exports = User
