const db = require('./db')
const debug = require('debug')('termPortal:models/comment')
const User = require('../models/user')
const {
  portalAdminInitialEmail,
  portalAdminInitialPassword
} = require('../config/keys')

class Comment {
  // Deserialize flat data into an organized comment object.
  constructor({
    id,
    message,
    author_first_name: authorFirstName,
    author_last_name: authorLastName,
    time_created: timeCreated,
    status,
    quote_message: quoteMessage,
    quote_author_first_name: quoteAuthorFirstName,
    quote_author_last_name: quoteAuthorLastName,
    quote_time_created: quoteTimeCreated
  }) {
    this.id = id
    this.message = message
    this.author = { firstName: authorFirstName, lastName: authorLastName }
    this.timeCreated = timeCreated
    this.status = status

    this.quote = quoteMessage
      ? {
          message: quoteMessage,
          author: {
            firstName: quoteAuthorFirstName,
            lastName: quoteAuthorLastName
          },
          timeCreated: quoteTimeCreated
        }
      : null
  }

  // Fetch comments from DB.
  static async list(filters, user, resultsPerPage, page) {
    const { ctxType, ctxId } = filters

    if (!ctxType) throw Error('Missing context type')

    const values = [resultsPerPage, ctxType]

    let whereClause = 'WHERE c.context_type = $2'

    if (ctxId) {
      whereClause += ' AND c.context_id = $3'
      values.push(ctxId)
    }

    const nonModeratedContexts = ['entry_dict_int', 'entry_consult_int']
    // In internal/non-moderated contexts, fetch all context specific comments and never show visibility toggles.
    // In external/moderated contexts, for users with elevated context related rights, show all comments and show visibility toggles,
    // for everyone else, show only visible comments and don't show visibility toggles.
    let displayVisibilityToggles = false
    if (!nonModeratedContexts.includes(ctxType)) {
      let isCommentModerator = false
      if (user) {
        switch (ctxType) {
          case 'portal':
            if (user.hasRole('portal admin')) isCommentModerator = true
            break

          case 'dictionary':
            if (
              user.hasRole('portal admin') ||
              user.hasRole('dictionaries admin')
            ) {
              isCommentModerator = true
            }
            break

          case 'consultancy':
            if (
              user.hasRole('portal admin') ||
              user.hasRole('consultancy admin')
            ) {
              isCommentModerator = true
            }
            break

          case 'entry_dict_ext':
            if (
              user.hasRole('portal admin') ||
              user.hasRole('consultancy admin') ||
              user.hasDictionaryRole(ctxId, 'administration')
            ) {
              isCommentModerator = true
            }
            break

          default:
            throw Error('Invalid context type')
        }
      }

      if (isCommentModerator) {
        displayVisibilityToggles = true
      } else {
        whereClause += " AND c.status = 'visible'"
      }
    }

    let offsetValue
    if (page === 'last') {
      offsetValue = `(SELECT (CEIL(COUNT(*) / $1::float) - 1) * $1 FROM comment c ${whereClause})`
    } else {
      offsetValue = resultsPerPage * (page - 1)
    }

    const text = `
      SELECT jsonb_build_object(
        'pages_total', (
          SELECT CEIL(COUNT(*) / $1::float)
          FROM comment c
          ${whereClause}
        ),
        'comment_count', (
          SELECT COUNT(*)
          FROM comment c
          ${whereClause}
        ),
        'comments', ARRAY(
          SELECT jsonb_build_object(
            'id', c.id,
            'message', c.message,
            'timeCreated', c.time_created,
            'status', c.status,
            'author', (
              SELECT jsonb_build_object(
                'firstName', cu.first_name,
                'lastName', cu.last_name
              )
            ),
            'showEye', ${displayVisibilityToggles},
            'quote', (
              SELECT
                CASE
                  WHEN c.quoted_comment_id IS NULL THEN NULL
                  ELSE jsonb_build_object(
                    'message', q.message,
                    'timeCreated', q.time_created,
                    'author', (
                      SELECT jsonb_build_object(
                        'firstName', qu.first_name,
                        'lastName', qu.last_name
                      )
                    )
                  )
                END
            )
          )
          FROM comment c
          LEFT JOIN "user" cu
          ON cu.id = c.author_id
          LEFT JOIN comment q
          ON q.id = c.quoted_comment_id
          LEFT JOIN "user" qu
          ON qu.id = q.author_id
          ${whereClause}
          ORDER BY c.time_created
          LIMIT $1
          OFFSET ${offsetValue}
        )
      ) results`
    const { rows } = await db.query(text, values)

    const { results } = rows[0]
    return results
  }

  // Insert a new comment into DB.
  static async create(comment, userId) {
    const text =
      'INSERT INTO comment (message, author_id, context_type, context_id, quoted_comment_id) VALUES ($1, $2, $3, $4, $5)'
    const values = [
      comment.message,
      userId,
      comment.ctxType,
      comment.ctxId,
      comment.quoteId
    ]

    await db.query(text, values)
  }

  static async updateStatus(status, id) {
    const values = [id, status]
    const text = `
      UPDATE comment
      SET status = $1
      WHERE id = $2`
    await db.query(text, values)
  }

  // Insert a new demo comment into DB.
  static async createDemo(comment) {
    const text =
      "INSERT INTO comment (message, author_id, context_type, quoted_comment_id) VALUES ($1, $2, 'portal', $3) RETURNING id"
    const values = [comment.message, pickRandomMockUserId(), comment.quoteId]
    const { rows } = await db.query(text, values)
    const idOfInsertedComment = rows[0].id
    const text2 = `${selectAllCommentsQueryString} WHERE c.id = ${idOfInsertedComment}`
    const { rows: rows2 } = await db.query(text2)

    const insertedComment = rows2[0]

    const deserializedComment = new this(insertedComment)

    return deserializedComment
  }

  // Seed DB with <commentCount> random comments.
  static async seed(commentCount) {
    const seedTasks = []

    for (let i = 0; i < commentCount; i++) {
      seedTasks.push(this.createDemo({ message: pickRandomMockMessage() }))
    }

    const seededComments = await Promise.all(seedTasks)
    debug(`Successfully seeded ${commentCount} comments`)
    debug('Comments:')
    seededComments.forEach(comment => debug(comment))
  }

  // Clear all comments from DB.
  static async clear() {
    await db.query('TRUNCATE comment')
  }
}

// Base SQL query string to fetch all comments.
// Can be extended with a WHEN filter clause.
const selectAllCommentsQueryString = `SELECT
c.id,
c.message,
cu.first_name author_first_name, 
cu.last_name author_last_name,
c.time_created,
c.status,
q.message quote_message,
qu.first_name quote_author_first_name,
qu.last_name quote_author_last_name,
q.time_created quote_time_created
FROM comment c
LEFT JOIN "user" cu
ON cu.id = c.author_id
LEFT JOIN comment q
ON q.id = c.quoted_comment_id
LEFT JOIN "user" qu
ON qu.id = q.author_id`

// A list of messages of varying length for DB seeding.
const mockMessageVariations = [
  'Lorem ipsum dolor sit amet.',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Dolorem obcaecati ut reprehenderit explicabo, adipisci atque! Repudiandae eos facilis veniam modi.',
  'Lorem ipsum dolor sit amet consectetur adipisicing elit. Ab dicta error architecto id soluta laborum pariatur saepe doloribus voluptatem voluptas totam placeat, inventore rem! Tempore illum deleniti esse nemo. Amet.',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur tristique at sem eu ultricies. Curabitur cursus efficitur ipsum, et iaculis ipsum egestas vel egestas vestibulum nec odio posuere, mollis diam et, bibendum velit. Proin non velit nec dui luctus dolor.',
  'Lorem ipsum dolor sit, amet consectetur adipisicing elit. Eveniet deleniti ad quasi, ea, recusandae esse autem expedita tempora molestiae ipsa labore magnam dolorem nostrum, corrupti sint obcaecati. Voluptatum molestiae, qui laudantium voluptatibus eius, ratione voluptate, eaque quae alias dicta pariatur?'
]

// A list of users for DB seeding and random asigning to new
// comments until authentication and session mechanism are in place.
const mockUsers = [
  { firstName: 'Primož', lastName: 'Roglič' },
  { firstName: 'Tadej', lastName: 'Pogačar' },
  { firstName: 'Krištof', lastName: 'Kolumb' },
  { firstName: 'Rudolf', lastName: 'Maister' },
  { firstName: 'Ricky', lastName: 'Rickardo' },
  { firstName: 'Freddy', lastName: 'Mercury' },
  { firstName: 'Roger', lastName: 'Moore' },
  { firstName: 'Michael', lastName: 'Jackson' },
  { firstName: 'John', lastName: 'Elton' },
  { firstName: 'Harry', lastName: 'Potter' }
]

function pickRandomMockMessage() {
  return mockMessageVariations[
    Math.floor(Math.random() * mockMessageVariations.length)
  ]
}

function pickRandomMockUserId() {
  return Math.ceil(Math.random() * mockUsers.length)
}

async function seedMockUsersInDb() {
  const { rows } = await db.query('SELECT COUNT(*) user_count FROM "user"')
  const userCount = rows[0].user_count
  if (+userCount) return 'Users already exist'

  await Promise.all(
    mockUsers.map(async user => {
      const text =
        'INSERT INTO "user"(username, first_name, last_name, email, bcrypt_hash) VALUES ($1, $2, $3, $4, \'dummyBcryptHash\') RETURNING *'
      const values = [
        `${user.firstName}_${user.lastName}`,
        user.firstName,
        user.lastName,
        `${user.firstName}.${user.lastName}@rsdo.com`
      ]
      const { rows } = await db.query(text, values)
      const createdUser = rows[0]
      debug(`Created user: ${JSON.stringify(createdUser)}`)
    })
  )
  return 'Successfully seeded all users'
}

async function seedPortalAdmin() {
  const {
    rows: [{ exists }]
  } = await db.query(
    "SELECT EXISTS (SELECT 1 FROM user_role WHERE role_name = 'portal admin')"
  )

  if (exists) return 'Skipping creation of portal admin (already exists)'

  const MOCK_ADMIN_BASE = 'admin'
  const adminUser = {
    username: MOCK_ADMIN_BASE,
    firstName: MOCK_ADMIN_BASE,
    lastName: MOCK_ADMIN_BASE,
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

async function seedConsultants() {
  const {
    rows: [mockConsultancyAdmin]
  } = await db.query('SELECT id FROM "user" WHERE username = $1', ['cadmin'])

  if (mockConsultancyAdmin) {
    return "Consultants already exist: 'cadmin', 'consultant1', 'consultant2', 'consultant3'"
  }

  const cadminUser = {
    username: 'cadmin',
    firstName: 'cadmin',
    lastName: 'cadmin',
    password: 'cadmin',
    email: 'cadmin@rsdo.com'
  }
  const userId = await User.create(cadminUser)
  const assignConsultancyAdminRole = db.query(
    `INSERT INTO user_role (user_id, role_name)
    VALUES
    ($1, 'consultancy admin')`,
    [userId]
  )
  const activateConsultancyAdminUser = db.query(
    `UPDATE "user" SET status = 'active', time_activated = time_registered WHERE username = $1`,
    [cadminUser.username]
  )
  await Promise.all([assignConsultancyAdminRole, activateConsultancyAdminUser])

  for (let i = 1; i <= 3; i++) {
    const consultant = {
      username: `consultant${i}`,
      firstName: `consultant${i}`,
      lastName: `consultant${i}`,
      password: `consultant${i}`,
      email: `consultant${i}@rsdo.com`
    }
    const userId = await User.create(consultant)
    const assignConsultantRole = db.query(
      `INSERT INTO user_role (user_id, role_name)
      VALUES
      ($1, 'consultant')`,
      [userId]
    )
    const activateConsultant = db.query(
      `UPDATE "user" SET status = 'active', time_activated = time_registered WHERE username = $1`,
      [consultant.username]
    )
    await Promise.all([assignConsultantRole, activateConsultant])
  }

  return `Successfully seeded consultants 'cadmin', 'consultant1', 'consultant2', 'consultant3'`
}

Comment.seedDummyData = () => {
  // Seed DB with mock users on empty DB.
  // seedMockUsersInDb()
  //   .then(debug)
  //   .catch(err => {
  //     debug('Users not seeded.')
  //     debug(err)
  //   })

  // Seed DB with mock portal admin user on empty DB.
  // TODO Replace with a more robust solution for production.
  seedPortalAdmin()
    .then(debug)
    .catch(err => {
      debug('Portal admin not seeded.')
      debug(err)
    })

  // Seed DB with mock consultancy admin and consultant users on empty DB.
  // seedConsultants()
  //   .then(debug)
  //   .catch(err => {
  //     debug('Consultants not seeded.')
  //     debug(err)
  //   })
}

module.exports = Comment
