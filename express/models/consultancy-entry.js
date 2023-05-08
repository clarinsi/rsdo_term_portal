const db = require('./db')
const {
  searchEngineClient,
  deleteConsultancyEntriesFromIndex,
  CONSULTANCY_ENTRY_INDEX
} = require('./search-engine')
const { removeHtmlTags } = require('./helpers')

class ConsultancyEntry {
  constructor({
    id,
    id_external: idExternal,
    time_created: timeCreated,
    status,
    author_id: authorId,
    institution,
    description,
    domain_primary_id_initial: domainPrimaryIdInitial,
    existing_solutions: existingSolutions,
    examples_of_use: examplesOfUse,
    time_published: timePublished,
    title,
    question,
    answer,
    path,
    answer_authors: answerAuthors,
    domain_primary_id: domainPrimaryId,
    first_name: firstName,
    last_name: lastName,
    is_moderator: isModerator,
    formatted_time_created: formattedTimeCreated,
    formatted_time_published: formattedTimePublished
  }) {
    this.id = id
    this.idExternal = idExternal
    this.timeCreated = timeCreated
    this.status = status
    this.authorId = authorId
    this.institution = institution
    this.description = description
    this.domainPrimaryIdInitial = domainPrimaryIdInitial
    this.existingSolutions = existingSolutions
    this.examplesOfUse = examplesOfUse
    this.timePublished = timePublished
    this.title = title
    this.question = question
    this.answer = answer
    this.path = path
    this.answerAuthors = answerAuthors
    this.domainPrimaryId = domainPrimaryId
    this.firstName = firstName
    this.lastName = lastName
    this.isModerator = isModerator
    this.formattedTimeCreated = formattedTimeCreated
    this.formattedTimePublished = formattedTimePublished
  }

  // Fetch consultancy entry by ID
  // to_char(time_created,'HH24:MI:SS DD/MM/YYYY')
  // TODO i18n date format
  static async fetchByIdWithFormattedTime(id) {
    const { rows: fetchedConsEntry } = await db.query(
      `
      SELECT 

      id,
	    id_external,
	    to_char(time_created,'DD. MM. YYYY') time_created,
	    status,
	    author_id,
	    institution,
	    description,
	    domain_primary_id_initial,
	    existing_solutions,
	    examples_of_use,
	    to_char(time_published,'DD. MM. YYYY') time_published,
	    title,
	    question,
	    answer,
	    path,
	    answer_authors,
	    domain_primary_id

      FROM consultancy_entry
      WHERE id=$1`,
      [id]
    )

    return new this(fetchedConsEntry[0])
  }

  static async fetchById(id) {
    const { rows: fetchedConsEntry } = await db.query(
      `
      SELECT 

      id,
	    id_external,
	    to_char(time_created, 'DD. MM. YYYY') time_created,
	    status,
	    author_id,
	    institution,
	    description,
	    domain_primary_id_initial,
	    existing_solutions,
	    examples_of_use,
	    to_char(time_published,'DD. MM. YYYY') time_published,
	    title,
	    question,
	    answer,
	    path,
	    answer_authors,
	    domain_primary_id

      FROM consultancy_entry
      WHERE id=$1`,
      [id]
    )

    return new this(fetchedConsEntry[0])
  }

  // Fetch dictionaries admin emails.
  static async fetchConsultancyAdminEmails() {
    const query = {
      text: `
        SELECT email FROM "user" WHERE id
        IN(SELECT user_id FROM user_role
          WHERE role_name = 'consultancy admin')`,
      rowMode: 'array'
    }

    const { rows: users } = await db.query(query)
    const emails = users.flat()
    return emails
  }

  static async fetchModeratorEmail(entryId) {
    const query = {
      text: `
      SELECT email FROM "user" WHERE id
      IN (SELECT user_id FROM consultancy_entry_consultant cec 
        WHERE cec.entry_id=$1 AND cec.is_moderator=true)`,
      rowMode: 'array'
    }

    const { rows: users } = await db.query(query, [entryId])
    const emails = users.flat()
    return emails
  }

  // Fetch all consultancy entries filtered by status from DB.
  static async fetchAllByStatusCount(status) {
    // TODO Luka: Miha, define specific fields instead of using *.
    const sqlQuery = `
      SELECT COUNT(id)
      FROM consultancy_entry
      WHERE status=$1`

    const values = [status]
    const { rows } = await db.query(sqlQuery, values)

    return rows[0].count
  }

  static async fetchWithStatusByIdCount(status, id) {
    const sqlQuery = `
      SELECT COUNT(DISTINCT(ce.id))
      FROM "consultancy_entry" ce
      INNER JOIN "consultancy_entry_consultant" cec ON ce.id = cec.entry_id
      INNER JOIN "user" u ON u.id = cec.user_id
      WHERE ce.status=$1 and cec.user_id=$2`
    const values = [status, id]
    const { rows } = await db.query(sqlQuery, values)

    return rows[0].count
  }

  static async fetchWithStatusById(status, id) {
    const sqlQuery = `
      SELECT ce.id, 
      to_char(time_created, 'FMDD. FMMM. YYYY') formatted_time_created,
      author_id,
      institution,
      description,
      domain_primary_id_initial,
      to_char(time_published, 'FMDD. FMMM. YYYY') time_published,
      title,
      question,
      answer,
      path,
      answer_authors,
      domain_primary_id,
      first_name,
      last_name,
      cec.is_moderator

      FROM "consultancy_entry" ce
      INNER JOIN "consultancy_entry_consultant" cec ON ce.id = cec.entry_id
      INNER JOIN "user" u ON u.id = cec.user_id
      WHERE ce.status=$1 and cec.user_id=$2
      ORDER BY time_created DESC`

    /* filter them in pug by displaying moderator, and showing authors
     of non moderator */
    /* AND cec.is_moderator='true';` */

    const values = [status, id]
    const { rows: fetchedConsEntries } = await db.query(sqlQuery, values)

    const deserializedConsEntries = fetchedConsEntries.map(
      consEntry => new this(consEntry)
    )
    return deserializedConsEntries
  }

  static async fetchInProgressById(id) {
    return await this.fetchWithStatusById('in progress', id)
  }

  static async fetchPublishedById(id) {
    return await this.fetchWithStatusById('published', id)
  }

  // Fetch entry count.
  static async fetchAllByStatusWithAuthorDataCount(status) {
    const sqlQuery = `
      SELECT COUNT(DISTINCT(ce.id))
      FROM "consultancy_entry" ce
      INNER JOIN "consultancy_entry_consultant" cec ON ce.id = cec.entry_id
      INNER JOIN "user" u ON u.id = cec.user_id
      WHERE ce.status=$1`

    /* filter them in pug by displaying moderator, and showing authors
     of non moderator */
    /* AND cec.is_moderator='true';` */

    const values = [status]
    const { rows } = await db.query(sqlQuery, values)
    await db.query(sqlQuery, values)
    return rows[0].count
  }

  // Fetch all consultancy entries filtered by status from DB.
  static async fetchAllByStatusWithAuthorData(status) {
    const sqlQuery = `
      SELECT ce.id, 
      to_char(time_created, 'FMDD. FMMM. YYYY') formatted_time_created,
      author_id,
      institution,
      description,
      domain_primary_id_initial,
      to_char(time_published, 'FMDD. FMMM. YYYY') time_published,
      title,
      question,
      answer,
      path,
      answer_authors,
      domain_primary_id,
      first_name,
      last_name,
      cec.is_moderator

      FROM "consultancy_entry" ce
      INNER JOIN "consultancy_entry_consultant" cec ON ce.id = cec.entry_id
      INNER JOIN "user" u ON u.id = cec.user_id
      WHERE ce.status=$1
      ORDER BY time_created DESC`

    /* filter them in pug by displaying moderator, and showing authors
     of non moderator */
    /* AND cec.is_moderator='true';` */

    const values = [status]
    const { rows: fetchedConsEntries } = await db.query(sqlQuery, values)

    const deserializedConsEntries = fetchedConsEntries.map(
      consEntry => new this(consEntry)
    )
    return deserializedConsEntries
  }

  static async fetchAllRejected() {
    const newEntries = await this.fetchAllByStatusWithAuthorData('rejected')
    return newEntries
  }

  static async fetchAllInProgress() {
    const newEntries = await this.fetchAllByStatusWithAuthorData('in progress')
    return newEntries
  }

  static async fetchAllPrepared() {
    const newEntries = await this.fetchAllByStatusWithAuthorData('review')
    return newEntries
  }

  static async fetchAllPublished() {
    const newEntries = await this.fetchAllByStatusWithAuthorData('published')
    return newEntries
  }

  static async fetch5MostRecentPublished() {
    const sqlQuery = `
      SELECT ce.id, 
      to_char(time_created, 'FMDD. FMMM. YYYY') formatted_time_created,
      author_id,
      institution,
      description,
      domain_primary_id_initial,
      to_char(time_published, 'FMDD. FMMM. YYYY') time_published,
      title,
      question,
      answer,
      path,
      answer_authors,
      domain_primary_id,
      first_name,
      last_name,
      cec.is_moderator

      FROM "consultancy_entry" ce
      INNER JOIN "consultancy_entry_consultant" cec ON ce.id = cec.entry_id
      INNER JOIN "user" u ON u.id = cec.user_id
      WHERE ce.status=$1
      ORDER BY time_published DESC
      LIMIT 5`

    /* filter them in pug by displaying moderator, and showing authors
     of non moderator */
    /* AND cec.is_moderator='true';` */

    const values = ['published']
    const { rows: fetchedConsEntries } = await db.query(sqlQuery, values)

    const deserializedConsEntries = fetchedConsEntries.map(
      consEntry => new this(consEntry)
    )
    return deserializedConsEntries
  }

  static async fetchPublishedCount() {
    const sqlQuery = `
      SELECT COUNT(DISTINCT(ce.id))

      FROM "consultancy_entry" ce
      INNER JOIN "consultancy_entry_consultant" cec ON ce.id = cec.entry_id
      INNER JOIN "user" u ON u.id = cec.user_id
      WHERE ce.status=$1`

    /* filter them in pug by displaying moderator, and showing authors
     of non moderator */
    /* AND cec.is_moderator='true';` */

    const values = ['published']
    const { rows } = await db.query(sqlQuery, values)

    return rows[0].count
  }

  /*
  static async fetchAuthorsFirstAndLastName(entryId, userId) {
    const sqlQuery = `
      SELECT u.first_name u.last_name
      FROM "user" u INNER JOIN "consultancy_entry_consultant" cec ON u.id = cec.user_id
      WHERE cec.entry_id=$1 and cec.user_id=$2`

    const values = [entryId, userId]
    const { rows: fetchedConsEntries } = await db.query(sqlQuery, values)

    return fetchedConsEntries
  }
  */

  /* Get shared authors in progress,
   answer_authors only get published when the question is published */
  static async getSharedAuthorsArrayBeforePublish(entryId) {
    const sqlQuery = `SELECT cec.entry_id, cec.user_id,
    u.first_name, u.last_name, u.username
    FROM "consultancy_entry_consultant" cec INNER JOIN
    "user" u ON u.id = cec.user_id
     WHERE cec.entry_id=$1 AND cec.is_moderator='false';`

    const values = [entryId]

    const { rows } = await db.query(sqlQuery, values)
    return rows
  }

  static async getModerator(entryId) {
    const sqlQuery = `
    SELECT u.id, u.first_name, u.last_name
    FROM "consultancy_entry" ce
    INNER JOIN "consultancy_entry_consultant" cec ON ce.id = cec.entry_id
    INNER JOIN "user" u ON u.id = cec.user_id
    WHERE ce.id=$1 AND cec.is_moderator=true;`

    const values = [entryId]

    const { rows } = await db.query(sqlQuery, values)
    return rows[0]
  }

  static async getSharedAuthorsArray(entryId) {
    const sqlQuery = `SELECT answer_authors FROM "consultancy_entry"
     WHERE id=$1;`

    const values = [entryId]

    const { rows } = await db.query(sqlQuery, values)
    return rows[0]
  }

  static async updateSharedAuthorsArray(entryId, authors) {
    const sqlQuery = `UPDATE "consultancy_entry" SET answer_authors=$2
     WHERE id=$1;`

    const values = [entryId, authors]

    await db.query(sqlQuery, values)
  }

  static async createQuestion(consultancyEntry) {
    const sqlQuery = `INSERT INTO consultancy_entry (
      status,
      author_id,
      institution,
      description,
      domain_primary_id_initial,
      existing_solutions,
      examples_of_use
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7
    )
    RETURNING id;`

    const values = [
      consultancyEntry.status,
      consultancyEntry.authorId,
      consultancyEntry.institution,
      consultancyEntry.description,
      consultancyEntry.domainPrimaryIdInitial || null,
      consultancyEntry.existingSolutions,
      consultancyEntry.examplesOfUse
    ]

    const {
      rows: [{ id }]
    } = await db.query(sqlQuery, values)
    return id
  }

  static async updateQuestion(consultancyEntry) {
    await db.transaction(async dbClient => {
      const sqlQuery = `UPDATE consultancy_entry SET
      id_external=$2,
      status=$3,
      author_id=$4,
      institution=$5,
      description=$6,
      domain_primary_id_initial=$7,
      existing_solutions=$8,
      examples_of_use=$9,
      title=$10,
      question=$11,
      answer=$12,
      path=$13,
      answer_authors=$14,
      domain_primary_id=$15
      WHERE id=$1;`

      const values = [
        consultancyEntry.id,
        consultancyEntry.idExternal,
        consultancyEntry.status,
        consultancyEntry.authorId,
        consultancyEntry.institution,
        consultancyEntry.description,
        consultancyEntry.domainPrimaryIdInitial,
        consultancyEntry.existingSolutions,
        consultancyEntry.examplesOfUse,
        consultancyEntry.title,
        consultancyEntry.question,
        consultancyEntry.answer,
        consultancyEntry.path,
        consultancyEntry.answerAuthors,
        consultancyEntry.domainPrimaryId
      ]

      await dbClient.query(sqlQuery, values)

      await dbClient.query(
        `UPDATE "consultancy_entry" SET status=$2
      WHERE id=$1;`,
        [consultancyEntry.id, 'in progress']
      )
    })
  }

  static async deleteQuestion(id) {
    const sqlQuery = `DELETE FROM consultancy_entry
                  WHERE id=$1;`

    const values = [id]

    await db.query(sqlQuery, values)
  }

  /** refactor in case you need both moderator and non moderator
   * insertions as a common function
   */
  static async insertNonModerator(entryId, userId) {
    const sqlQuery = `INSERT INTO "consultancy_entry_consultant" (entry_id, user_id, is_moderator) VALUES
    ($1, $2, 'false');
 `

    const values = [entryId, userId]

    const { rows } = await db.query(sqlQuery, values)
    return rows
  }

  static async assignWorkInProgress(entryId, userId) {
    await db.transaction(async dbClient => {
      let sqlQuery = `SELECT entry_id FROM consultancy_entry_consultant 
      WHERE entry_id=$1 AND is_moderator='true'`

      let values = [entryId]

      const { rows } = await dbClient.query(sqlQuery, values)
      if (rows.length) {
        await dbClient.query(
          `DELETE FROM consultancy_entry_consultant 
        WHERE entry_id=$1 AND is_moderator='true'`,
          values
        )
      }
      sqlQuery = [
        `UPDATE "consultancy_entry" SET status='in progress'
       WHERE id=$1;`,
        `INSERT INTO "consultancy_entry_consultant" (entry_id, user_id, is_moderator) VALUES
          ($1, $2, 'true');
       `
      ]

      values = [[entryId], [entryId, userId]]

      for (let i = 0; i < sqlQuery.length; i++) {
        await dbClient.query(sqlQuery[i], values[i])
      }
    })
  }

  static async updateConsultancyEntryStatus(entryId, status) {
    const sqlQuery = `UPDATE "consultancy_entry" SET status=$2
     WHERE id=$1;`

    const values = [entryId, status]

    await db.query(sqlQuery, values)
  }

  static async rejectEntry(entryId) {
    await this.updateConsultancyEntryStatus(entryId, 'rejected')
  }

  static async sendToReview(entryId) {
    await this.updateConsultancyEntryStatus(entryId, 'review')
  }

  static async publish(entryId, answerAuthors) {
    await db.transaction(async dbClient => {
      await dbClient.query(
        `UPDATE "consultancy_entry" SET status=$2
      WHERE id=$1;`,
        [entryId, 'published']
      )

      if (answerAuthors) {
        answerAuthors = answerAuthors.split(',').filter(author => author !== '')
        await dbClient.query(
          `UPDATE "consultancy_entry"
            SET answer_authors=$2
           WHERE id=$1;`,
          [entryId, answerAuthors]
        )
      }

      await dbClient.query(
        `UPDATE "consultancy_entry" 
        SET time_published=CURRENT_TIMESTAMP
         WHERE id=$1;`,
        [entryId]
      )
    })
  }

  static async removeConsultantForEntry(entryId, userId) {
    // TODO check for any other tables where entry id is foreign key
    await db.query(
      `DELETE FROM consultancy_entry_consultant
      WHERE entry_id=$1 AND user_id=$2`,
      [entryId, userId]
    )
  }

  static async removeEntry(id) {
    // TODO check for any other tables where entry id is foreign key
    await db.transaction(async dbClient => {
      await dbClient.query(
        `DELETE FROM consultancy_entry_consultant
        WHERE entry_id=$1`,
        [id]
      )

      await dbClient.query(
        `DELETE FROM consultancy_entry
        WHERE id=$1`,
        [id]
      )
    })
  }

  // (Re)index specific consultancy entry into consultancy search index.
  // TODO i18n name_sl
  static async indexIntoSearchEngine(entryId, shouldWait) {
    const values = [entryId]
    const text = `
    SELECT
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', ce.id,
          'timeCreated', ce.time_created,
          'status', ce.status,
          'description', ce.description,
          'title', ce.title,
          'question', ce.question,
          'answer', ce.answer,
          'answerAuthors', ce.answer_authors,
          'primaryDomain', jsonb_strip_nulls(
            jsonb_build_object(
              'id', dp.id,
              'nameSl', dp.name_sl,
              'nameEn', dp.name_en
            )
          ),
          'assignedConsultants', ARRAY(
            SELECT jsonb_strip_nulls(
              jsonb_build_object(
                'id', u.id,
                'firstName', u.first_name,
                'lastName', u.last_name,
                'isModerator', cec.is_moderator
              )
            )
            FROM consultancy_entry_consultant cec
            LEFT JOIN "user" u on u.id = cec.user_id
            WHERE cec.entry_id = ce.id
            ORDER BY is_moderator DESC
          )
        )
      ) entry
    FROM consultancy_entry ce
    LEFT JOIN domain_primary dp on dp.id = ce.domain_primary_id
    WHERE ce.id = $1`

    let {
      rows: [{ entry }]
    } = await db.query(text, values)

    if (!entry.answerAuthors?.length) delete entry.answerAuthors
    if (!Object.keys(entry.primaryDomain).length) delete entry.primaryDomain
    if (!entry.assignedConsultants.length) delete entry.assignedConsultants

    entry = removeHtmlTags(JSON.stringify(entry))

    await searchEngineClient.index({
      id: entryId,
      index: CONSULTANCY_ENTRY_INDEX,
      body: entry,
      refresh: shouldWait ? 'wait_for' : false
    })
  }

  // Remove all consultancy entries from index and index them all again.
  static async reindexAll() {
    await deleteConsultancyEntriesFromIndex()

    const { rows } = await db.query('SELECT id FROM consultancy_entry')

    for (const row of rows) {
      const { id: entryId } = row
      await this.indexIntoSearchEngine(entryId)
    }
  }
}

module.exports = ConsultancyEntry
