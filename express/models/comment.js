const db = require('./db')
const Entry = require('./entry')
// const debug = require('debug')('termPortal:models/comment')

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

          case 'entry_dict_ext': {
            const { dictionary_id: dictionaryId } = await Entry.fetch(ctxId)

            if (
              user.hasRole('portal admin') ||
              user.hasRole('dictionaries admin') ||
              user.hasDictionaryRole(dictionaryId, 'administration')
            ) {
              isCommentModerator = true
            }
            break
          }

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

  // Fetch context info for a specific comment.
  static async fetchContextById(id) {
    const {
      rows: [{ context_type: ctxType, context_id: ctxId }]
    } = await db.query(
      'SELECT context_type, context_id FROM comment WHERE id = $1',
      [id]
    )

    return { ctxType, ctxId }
  }

  static async updateStatus(status, id) {
    const values = [id, status]
    const text = `
      UPDATE comment
      SET status = $1
      WHERE id = $2`
    await db.query(text, values)
  }
}

module.exports = Comment
