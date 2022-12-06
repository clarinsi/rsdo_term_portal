const Cursor = require('pg-cursor')
const db = require('./db')
const { intoDbArray, getInstanceSetting } = require('./helpers')
const { deserialize, bulkIndex } = require('./helpers/dictionary')
const { readFileIntoDb } = require('./helpers/dictionary/import-file')
// const debug = require('debug')('termPortal:models/dictionary')

class Dictionary {
  // Convert DB names into JS names.
  // TODO Add (language sensitive) dictionary status text conversion.
  constructor({
    id,
    name_sl: nameSl,
    time_modified: timeModified,
    status,
    count_entries: countEntries,
    count_comments: countComments
  }) {
    this.id = id
    this.nameSl = nameSl
    this.timeModified = timeModified
    this.status = status
    this.countEntries = countEntries
    this.countComments = countComments
  }

  // Fetch all dictionaries from DB.
  static async fetchAll() {
    // TODO Implement SQL stored procedures or functions.
    const { rows: fetchedDictionaries } = await db.query(`
      SELECT
        id,
        name_sl,
        time_modified,
        status,
        count_entries,
        count_comments
      FROM dictionary
      ORDER BY time_modified DESC`)
    const deserializedDictionaries = fetchedDictionaries.map(
      dictionary => new this(dictionary)
    )
    return deserializedDictionaries
  }

  /*
  // Fetch all dictionaries from DB by it's ID.
  static async fetchAllByUser(id) {
    // TODO Implement SQL stored procedures or functions.
    const text = `
      SELECT
        id,
        name_sl,
        time_modified,
        status,
        count_entries,
        count_comments
      FROM dictionary
      WHERE id=$1
    `
    const values = [id]
    const { rows: fetchedDictionaries } = await db.query(text, values)
    const deserializedDictionary = new this(fetchedDictionaries[0])
    return deserializedDictionary
  }
  */

  // Fetch all dictionaries from DB for which the user has at least one dictionary role.
  static async fetchAllByUser(userId) {
    // TODO Implement SQL stored procedures or functions.
    const text = `
      SELECT
        id,
        name_sl,
        time_modified,
        status,
        count_entries,
        count_comments
      FROM dictionary
      WHERE id IN (
        SELECT dictionary_id
        FROM user_role
        WHERE user_id = $1 AND role_name = 'editor'
      )
      ORDER BY time_modified DESC
    `
    const values = [userId]
    const { rows: fetchedDictionaries } = await db.query(text, values)
    const deserializedDictionaries = fetchedDictionaries.map(
      dictionary => new this(dictionary)
    )
    return deserializedDictionaries
  }

  // Fetch all primary domains from DB.
  static async fetchAllPrimaryDomains() {
    // TODO Implement SQL stored procedures or functions.
    const { rows: fetchedDomains } = await db.query(`
      SELECT id, name_sl, name_en
      FROM domain_primary
      ORDER BY id`)
    const deserializedDomains = fetchedDomains.map(domain =>
      deserialize.primaryDomain(domain)
    )
    return deserializedDomains
  }

  // Fetch primary domain for a specific dictionary from DB.
  static async fetchPrimaryDomain(dictionaryId) {
    // TODO Implement SQL stored procedures or functions.
    const { rows: fetchedDomains } = await db.query(
      `
      SELECT dp.id, dp.name_sl, dp.name_en
      FROM domain_primary dp
      INNER JOIN dictionary dict ON dict.domain_primary_id = dp.id
      WHERE dict.id = $1`,
      [dictionaryId]
    )
    const deserializedDomain = deserialize.primaryDomain(fetchedDomains[0])

    return deserializedDomain
  }

  // Fetch all approved secondary domains from DB.
  static async fetchAllApprovedSecondaryDomains() {
    // TODO Implement SQL stored procedures or functions.
    const { rows: fetchedDomains } = await db.query(`
      SELECT
        id,
        name_sl,
        name_en
      FROM domain_secondary
      WHERE approved`)
    const deserializedDomains = fetchedDomains.map(domain =>
      deserialize.approvedSecondaryDomain(domain)
    )
    return deserializedDomains
  }

  // Fetch all languages from DB.
  static async fetchAllLanguages(lang) {
    // TODO Implement SQL stored procedures or functions.
    const { rows: fetchedLanguages } = await db.query(`
      SELECT
        id,
        ${lang}
      FROM language
      ORDER BY ${lang}`)
    const deserializedLanguages = fetchedLanguages.map(language =>
      deserialize.language(language)
    )
    return deserializedLanguages
  }

  // Create new dictionary in DB and assign the creator as its admin.
  static async create(dictionary, userId) {
    const values = [
      dictionary.nameSl || null,
      dictionary.nameSlShort || null,
      dictionary.nameEn || null,
      intoDbArray(dictionary.author),
      dictionary.issn || null,
      dictionary.domainPrimary || null,
      !!dictionary.hasDomainLabels,
      !!dictionary.hasLabel,
      !!dictionary.hasDefinition,
      !!dictionary.hasSynonyms,
      !!dictionary.hasLinks,
      !!dictionary.hasOther,
      !!dictionary.hasForeignLanguages,
      !!dictionary.hasForeignDefinitions,
      !!dictionary.hasForeignSynonyms,
      !!dictionary.hasImages,
      !!dictionary.hasAudio,
      !!dictionary.hasVideos,
      intoDbArray(dictionary.domainSecondary, 'always'),
      intoDbArray(dictionary.domainSecondaryNewNameSl, 'always'),
      intoDbArray(dictionary.domainSecondaryNewNameEn, 'always'),
      intoDbArray(dictionary.language, 'always'),
      userId
    ]
    const text = `SELECT dictionary_new (${db.genParamStr(values)})`

    await db.query(text, values)
  }

  // Fetch single dictionary data for editing description from DB.
  static async fetchEditDescription(dictionaryId) {
    const text = `
      SELECT
        id,  
        name_sl,
        name_en,
        name_sl_short,
        author,
        domain_primary_id,
        description,
        issn
      FROM 
        dictionary
      WHERE
        id = $1`
    const values = [dictionaryId]

    const { rows } = await db.query(text, values)
    const fetchedDictionary = rows[0]

    const deserializedDictionary =
      deserialize.editDescription(fetchedDictionary)

    return deserializedDictionary
  }

  // Fetch secondary domains associated with a single dictionary from DB.
  static async fetchSecondaryDomains(dictionaryId) {
    const text = `
      SELECT
        ds.id,
        ds.name_sl,
        ds.name_en
      FROM dictionary d
      INNER JOIN dictionary_domain_secondary dd ON d.id = dd.dictionary_id
      INNER JOIN domain_secondary ds ON dd.domain_secondary_id = ds.id
      WHERE d.id = $1`
    const values = [dictionaryId]

    const { rows: fetchedSecondaryDomains } = await db.query(text, values)

    const deserializedSecondaryDomains = fetchedSecondaryDomains.map(domain =>
      deserialize.secondaryDomain(domain)
    )

    return deserializedSecondaryDomains
  }

  // Update single dictionary description in DB.
  static async updateDescription(dictionaryId, dictionary) {
    const values = [
      dictionaryId,
      dictionary.nameSl || null,
      dictionary.nameSlShort || null,
      dictionary.nameEn || null,
      dictionary.issn || null,
      dictionary.domainPrimary || null,
      intoDbArray(dictionary.author),
      dictionary.description || null
    ]

    const text = `
      UPDATE
        dictionary
      SET
        name_sl = $2,
        name_sl_short = $3,
        name_en = $4,
        issn = $5,
        domain_primary_id = $6,
        author = $7,
        description = $8
      WHERE
        id = $1`

    await db.query(text, values)
  }

  // Delete secondary domain associations with a single dictionary from DB.
  static async deleteSecondaryDomains(dictionaryId, dictionary) {
    const value = [dictionaryId]

    const text = `
      DELETE FROM
        dictionary_domain_secondary
      WHERE
        dictionary_id = $1`
    await db.query(text, value)
  }

  // Insert new secondary domain associations with a single dictionary into DB.
  static async updateSecondaryDomains(dictionaryId, dictionary) {
    const updatedSecondaryDomains = intoDbArray(
      dictionary.domainSecondary,
      'always'
    )
    const values = [dictionaryId, updatedSecondaryDomains]

    const text = `
      INSERT INTO dictionary_domain_secondary (dictionary_id, domain_secondary_id)
      VALUES ($1, UNNEST($2::smallint[]))`
    await db.query(text, values)
  }

  // Fetch single dictionary data for editing users from DB.
  static async fetchEditUsers(dictionaryId) {
    const text = `
      SELECT
        id,
        name_sl,
        entries_have_terminology_review_flag,
        entries_have_language_review_flag,
        status
      FROM
        dictionary
      WHERE
        id = $1`
    const value = [dictionaryId]

    const { rows } = await db.query(text, value)
    const fetchedDictionary = rows[0]

    const deserializedDictionary = deserialize.editUsers(fetchedDictionary)

    return deserializedDictionary
  }

  // Update single dictionary users and their roles in DB.
  static async updateUsers(dictionaryId, dictionary, newDictStatus) {
    const values = [
      dictionaryId,
      !!dictionary.hasTerminologyReview,
      !!dictionary.hasLanguageReview,
      newDictStatus
    ]

    const text = `
      UPDATE
        dictionary
      SET
        entries_have_terminology_review_flag = $2,
        entries_have_language_review_flag = $3,
        status = $4
      WHERE
        id = $1`

    await db.query(text, values)
  }

  // Fetch single dictionary's admin emails.
  static async fetchAdminEmails(dictionaryId) {
    const query = {
      text: `
        SELECT email FROM "user" WHERE id
        IN(SELECT user_id FROM user_role WHERE dictionary_id = $1
          AND administration = true)`,
      values: [dictionaryId],
      rowMode: 'array'
    }

    const { rows: users } = await db.query(query)
    const emails = users.flat()
    return emails
  }

  // Fetch dictionaries admin emails.
  static async fetchDictionariesAdminEmails() {
    const query = {
      text: `
        SELECT email FROM "user" WHERE id
        IN(SELECT user_id FROM user_role
          WHERE role_name = 'dictionaries admin')`,
      rowMode: 'array'
    }

    const { rows: users } = await db.query(query)
    const emails = users.flat()
    return emails
  }

  // Fetch single dictionary data for editing structure from DB.
  static async fetchEditStructure(dictionaryId) {
    const text = `
      SELECT
        id,
        name_sl,
        entries_have_domain_labels,
        entries_have_label,
        entries_have_definition,
        entries_have_synonyms,
        entries_have_links,
        entries_have_other,
        entries_have_foreign_languages,
        entries_have_foreign_definitions,
        entries_have_foreign_synonyms,
        entries_have_images,
        entries_have_audio,
        entries_have_videos
      FROM
        dictionary
      WHERE id = $1`

    const value = [dictionaryId]

    const { rows } = await db.query(text, value)
    const fetchedDictionary = rows[0]

    const deserializedDictionary = deserialize.editStructure(fetchedDictionary)

    return deserializedDictionary
  }

  // Fetch single dictionary data for viewing details about it
  static async fetchDictionaryBasicInfo(dictionaryId) {
    const isInEnglish = false
    const lang = isInEnglish ? 'd.name_en' : 'd.name_sl'
    const text = `
    SELECT
      d.id,
      ${lang} dictionarysl,
      d.count_entries,
      to_char(d.time_modified,'YYYY-MM-DD') time_modified,
      d.issn,
      d.author,
      dp.name_sl domain_primary,
      description,
      l.name_sl languageSl,
      ds.name_sl domainSecondarySl,
      lp.name portalname,
      lp.code portalcode
    FROM
      dictionary d
      INNER JOIN dictionary_language dl ON dl.dictionary_id = d.id
      INNER JOIN language l ON dl.language_id = l.id
      LEFT JOIN dictionary_domain_secondary dds on dds.dictionary_id = d.id 
      LEFT JOIN domain_secondary ds ON dds.domain_secondary_id = ds.id
      INNER JOIN domain_primary dp ON d.domain_primary_id = dp.id
      LEFT JOIN linked_dictionary ld ON  ld.target_dictionary_id = d.id
      LEFT JOIN linked_portal lp ON ld.linked_portal_id = lp.id
    WHERE d.id = $1`
    // AND ds.approved

    const value = [dictionaryId]

    const { rows } = await db.query(text, value)

    return rows
  }

  // Fetch dictionaries data for viewing details about it
  static async fetchBasicInfoForAllDictionaries(isInEnglish) {
    const lang = isInEnglish ? 'd.name_en' : 'd.name_sl'
    const text = `
    SELECT
      distinct(d.id),
      ${lang} dictionarysl,
      d.count_entries,
      to_char(d.time_modified,'YYYY-MM-DD') time_modified,
      d.issn,
      d.author,
      dp.name_sl domain_primary,
      description,
      lp.name portalname,
      lp.code portalcode
    FROM
      dictionary d
      FULL JOIN dictionary_language dl ON dl.dictionary_id = d.id
      INNER JOIN domain_primary dp ON d.domain_primary_id = dp.id
      LEFT JOIN linked_dictionary ld ON  ld.target_dictionary_id = d.id
      LEFT JOIN linked_portal lp ON ld.linked_portal_id = lp.id
    ORDER BY ${lang} ASC  
    `

    const { rows } = await db.query(text)

    return rows
  }

  // Fetch dictionary data for viewing details about it
  static async fetchBasicInfoPerPageFiltered(
    searchQuery,
    domainQuery,
    resultsPerPage,
    page
  ) {
    let queryAppend = ''
    if (domainQuery.length > 0) {
      try {
        queryAppend = domainQuery.reduce((acc, e, i) => {
          if (i === 0) {
            let retstring = `( dp.id=${parseInt(e)}`

            if (domainQuery.length - 1 === 0) {
              // if contains only one item -> "AND (dp.id=XXX)"
              retstring = `${retstring} )`
            }

            // "AND [[( dp.id=XXX]]"
            return acc + retstring
          }
          if (i === domainQuery.length - 1) {
            return acc + ` OR dp.id=${parseInt(e)})`
          }

          // "AND ( dp.id=XXX [[OR dp.id=YYY]]"
          return acc + ` OR dp.id=${parseInt(e)}`
        }, 'AND ')
      } catch (e) {
        queryAppend = ''
      }
    }

    const isInEnglish = false
    const lang = isInEnglish ? 'name_en' : 'name_sl'
    const text = `
    SELECT
      distinct (d.id),
      d.${lang} dictionarysl,
      d.count_entries,
      to_char(d.time_modified,'YYYY-MM-DD') time_modified,
      d.issn,
      d.author,
      dp.name_sl domain_primary,
      description,
      lp.name portalname,
      lp.code portalcode
    FROM
      dictionary d
      FULL JOIN dictionary_language dl ON dl.dictionary_id = d.id
      INNER JOIN domain_primary dp ON d.domain_primary_id = dp.id
      LEFT JOIN linked_dictionary ld ON  ld.target_dictionary_id = d.id
      LEFT JOIN linked_portal lp ON ld.linked_portal_id = lp.id
      WHERE d.name_sl LIKE '%' || $1 || '%' ${queryAppend}
      LIMIT $2
      OFFSET $3`

    const { rows } = await db.query(text, [
      searchQuery,
      resultsPerPage,
      resultsPerPage * (page - 1)
    ])

    return rows
  }

  // Fetch dictionary data for viewing details about it
  static async fetchBasicInfoPerPageFilteredWithOrdering(
    searchQuery,
    domainQuery,
    resultsPerPage,
    page,
    orderType,
    orderIndex
  ) {
    let queryAppend = ''
    if (domainQuery.length > 0) {
      try {
        queryAppend = domainQuery.reduce((acc, e, i) => {
          if (i === 0) {
            let retstring = `( dp.id=${parseInt(e)}`

            if (domainQuery.length - 1 === 0) {
              // if contains only one item -> "AND (dp.id=XXX)"
              retstring = `${retstring} )`
            }

            // "AND [[( dp.id=XXX]]"
            return acc + retstring
          }
          if (i === domainQuery.length - 1) {
            return acc + ` OR dp.id=${parseInt(e)})`
          }

          // "AND ( dp.id=XXX [[OR dp.id=YYY]]"
          return acc + ` OR dp.id=${parseInt(e)}`
        }, 'AND ')
      } catch (e) {
        queryAppend = ''
      }
    }

    const isInEnglish = false
    const lang = isInEnglish ? 'name_en' : 'name_sl'

    const orderBy = `${orderType}.${lang} ${orderIndex ? 'DESC' : 'ASC'}`

    // TODO domain primary language toggle!
    const text = `
    SELECT
      distinct (d.id),
      d.${lang} dictionarysl,
      d.count_entries,
      to_char(d.time_modified,'YYYY-MM-DD') time_modified,
      d.issn,
      d.author,
      dp.name_sl domain_primary,
      description,
      lp.name portalname,
      lp.code portalcode
    FROM
      dictionary d
      FULL JOIN dictionary_language dl ON dl.dictionary_id = d.id
      INNER JOIN domain_primary dp ON d.domain_primary_id = dp.id
      LEFT JOIN linked_dictionary ld ON  ld.target_dictionary_id = d.id
      LEFT JOIN linked_portal lp ON ld.linked_portal_id = lp.id
      WHERE d.name_sl LIKE '%' || $1 || '%' ${queryAppend}
      ORDER BY ${orderBy}
      LIMIT $2
      OFFSET $3`

    const { rows } = await db.query(text, [
      searchQuery,
      resultsPerPage,
      resultsPerPage * (page - 1)
    ])

    return rows
  }

  // Fetch dictionary data for viewing details about it
  static async fetchFilteredCount(searchQuery, domainQuery) {
    let queryAppend = ''
    if (domainQuery.length > 0) {
      try {
        queryAppend = domainQuery.reduce((acc, e, i) => {
          if (i === 0) {
            let retstring = `( dp.id=${parseInt(e)}`

            if (domainQuery.length - 1 === 0) {
              // if contains only one item -> "AND (dp.id=XXX)"
              retstring = `${retstring} )`
            }

            // "AND [[( dp.id=XXX]]"
            return acc + retstring
          }
          if (i === domainQuery.length - 1) {
            return acc + ` OR dp.id=${parseInt(e)})`
          }

          // "AND ( dp.id=XXX [[OR dp.id=YYY]]"
          return acc + ` OR dp.id=${parseInt(e)}`
        }, 'AND ')
      } catch (e) {
        queryAppend = ''
      }
    }

    // TODO domain primary language toggle!
    const text = `
    SELECT
      COUNT (distinct (d.id)) AS count
    FROM
      dictionary d
      FULL JOIN dictionary_language dl ON dl.dictionary_id = d.id
      INNER JOIN domain_primary dp ON d.domain_primary_id = dp.id
      LEFT JOIN linked_dictionary ld ON  ld.target_dictionary_id = d.id
      LEFT JOIN linked_portal lp ON ld.linked_portal_id = lp.id
      WHERE d.name_sl LIKE '%' || $1 || '%' ${queryAppend}`

    const { rows } = await db.query(text, [searchQuery])

    return rows[0]
  }

  static async fetchAllDictionariesCount() {
    const text = `
    SELECT
      count(d.id)
      FROM
      dictionary d
      INNER JOIN dictionary_language dl ON dl.dictionary_id = d.id
      INNER JOIN domain_primary dp ON d.domain_primary_id = dp.id
      LEFT JOIN linked_dictionary ld ON  ld.target_dictionary_id = d.id
      LEFT JOIN linked_portal lp ON ld.linked_portal_id = lp.id`

    const { rows } = await db.query(text)

    return rows[0]
  }

  // Fetch single dictionary data for editing structure from DB.
  static async fetchDictionaryWithEditStructure(dictionaryId) {
    const text = `
      SELECT
        id,
        name_sl,
        name_sl_short,
        name_en,
        author,
        issn,
        entries_have_domain_labels,
        entries_have_label,
        entries_have_definition,
        entries_have_synonyms,
        entries_have_links,
        entries_have_other,
        entries_have_foreign_languages,
        entries_have_foreign_definitions,
        entries_have_foreign_synonyms,
        entries_have_images,
        entries_have_audio,
        entries_have_videos
      FROM
        dictionary
      WHERE id = $1`

    const value = [dictionaryId]

    const { rows } = await db.query(text, value)
    const fetchedDictionary = rows[0]

    const dictionary = new this(fetchedDictionary)
    const deserializedEditstructure =
      deserialize.editStructure(fetchedDictionary)

    return { dictionary, structure: deserializedEditstructure }
  }

  // Fetch languages associated with a single dictionary from DB.
  static async fetchLanguages(dictionaryId) {
    const text = `
      SELECT
        l.id,
        l.code,
        l.name_sl,
        l.name_en
      FROM dictionary d
      INNER JOIN dictionary_language dl ON d.id = dl.dictionary_id
      INNER JOIN language l ON dl.language_id = l.id
      WHERE d.id = $1
      ORDER BY dl.selection_order`
    const value = [dictionaryId]

    const { rows: fetchedLanguages } = await db.query(text, value)

    const deserializedLanguages = fetchedLanguages.map(language =>
      deserialize.language(language)
    )
    return deserializedLanguages
  }

  // Fetch latest 3 dictionaries by publish date
  static async fetchLatest3DictsByPublishDate(isInEnglish) {
    const lang = isInEnglish ? 'd.name_en' : 'd.name_sl'
    const text = `
    SELECT
    d.id,
    ${lang} dictionarysl,
    dp.name_sl domain_primary
    FROM dictionary d
    INNER JOIN domain_primary dp ON d.domain_primary_id = dp.id
    where d.time_published is not NULL
    ORDER BY d.time_published desc
    limit 3`

    const { rows } = await db.query(text)
    return rows
  }

  // Update single dictionary structure in DB.
  static async updateStructure(dictionaryId, dictionary) {
    const values = [
      dictionaryId,
      !!dictionary.hasDomainLabels,
      !!dictionary.hasLabel,
      !!dictionary.hasDefinition,
      !!dictionary.hasSynonyms,
      !!dictionary.hasLinks,
      !!dictionary.hasOther,
      !!dictionary.hasForeignLanguages,
      !!dictionary.hasForeignDefinitions,
      !!dictionary.hasForeignSynonyms,
      !!dictionary.hasImages,
      !!dictionary.hasAudio,
      !!dictionary.hasVideos
    ]

    const text = `
      UPDATE
        dictionary
      SET
        entries_have_domain_labels = $2,
        entries_have_label = $3,
        entries_have_definition = $4,
        entries_have_synonyms = $5,
        entries_have_links = $6,
        entries_have_other = $7,
        entries_have_foreign_languages = $8,
        entries_have_foreign_definitions = $9,
        entries_have_foreign_synonyms = $10,
        entries_have_images = $11,
        entries_have_audio = $12,
        entries_have_videos = $13
      WHERE
        id = $1`

    await db.query(text, values)
  }

  // Delete language associations with a single dictionary from DB.
  static async deleteLanguages(dictionaryId) {
    const value = [dictionaryId]

    const text = `
      DELETE FROM
        dictionary_language
      WHERE
        dictionary_id = $1`
    await db.query(text, value)
  }

  // Insert new language associations with a single dictionary into DB.
  static async updateLanguages(dictionaryId, dictionary) {
    const updatedLanguages = intoDbArray(dictionary.language, 'always')
    const selectionOrder = updatedLanguages.map((language, index) => index + 1)
    const values = [dictionaryId, updatedLanguages, selectionOrder]

    const text = `
      INSERT INTO dictionary_language (dictionary_id, language_id, selection_order)
      VALUES ($1, UNNEST($2::smallint[]), UNNEST($3::smallint[]))`
    await db.query(text, values)
  }

  static async fetchAllAdminDictionaries(resultsPerPage, page) {
    // TODO Implement SQL stored procedures or functions.
    const {
      rows: [{ result }]
    } = await db.query(
      `
      SELECT jsonb_build_object(
        'pages_total', (
          SELECT CEIL(COUNT(*) / $1::float)
          FROM dictionary
        ),
        'results', ARRAY(
          SELECT jsonb_build_object(
            'id', id,
            'name', name_sl,
            'timeCreated', time_created,
            'timeModified', time_modified,
            'status', status
          )
          FROM dictionary
          WHERE count_comments IS NOT NULL
          LIMIT $1
          OFFSET $2
        )
      ) result`,
      [resultsPerPage, resultsPerPage * (page - 1)]
    )

    return result
  }

  static async countPublishedEntries(dictionaryId) {
    const text = `
      SELECT COUNT(*)
      FROM entry
      WHERE is_published = true
      AND dictionary_id = $1`
    const value = [dictionaryId]

    const {
      rows: [{ count }]
    } = await db.query(text, value)

    return count
  }

  static async fetchStatus(dictionaryId) {
    const text = `
      SELECT status
      FROM dictionary
      WHERE id = $1`
    const value = [dictionaryId]

    const {
      rows: [{ status }]
    } = await db.query(text, value)

    return status
  }

  static async updateStatus(dictionaryId, dictionary) {
    const text = `
      UPDATE dictionary
      SET status = $2
      WHERE id = $1`
    const value = [dictionaryId, dictionary.status]

    await db.query(text, value)
  }

  static async updateTimePublished(dictionaryId) {
    const text = `
      UPDATE dictionary
      SET time_published = NOW()
      WHERE id = $1`
    const value = [dictionaryId]

    await db.query(text, value)
  }

  // Update single dictionary metadata in DB after modifying entires.
  static async updateMetadataAfterModifyingEntries(
    dictionaryId,
    dbClient = db // Use the provided client else grab one from the pool.
  ) {
    const values = [dictionaryId]

    const text = `
      UPDATE
        dictionary
      SET
        time_content_modified = NOW(),
        count_entries = (
          SELECT COUNT(*)
          FROM entry
          WHERE dictionary_id = $1
        )
      WHERE id = $1`

    await dbClient.query(text, values)
  }

  // Update single dictionary metadata in DB after modifying its entry.
  static async updateMetadataAfterModifyingEntry(
    entryId,
    dbClient = db // Use the provided client else grab one from the pool.
  ) {
    const values = [entryId]

    const text = `
      UPDATE
        dictionary
      SET
        time_content_modified = NOW(),
        count_entries = (
          SELECT COUNT(*)
          FROM entry
          WHERE dictionary_id = (
            SELECT dictionary_id FROM entry
            WHERE id = $1
          )
        )
      WHERE id = (
        SELECT dictionary_id FROM entry
        WHERE id = $1
      )`

    await dbClient.query(text, values)
  }

  // Create new import file job in DB.
  static async openImportFileJob(
    dictionaryId,
    deleteExistingEntries,
    importFileFormat
  ) {
    const values = [dictionaryId, !!deleteExistingEntries, importFileFormat]
    const text = `
      INSERT INTO import_file_job (
        dictionary_id,
        delete_existing_entries,
        file_format
      )
      VALUES ($1, $2, $3)`

    await db.query(text, values)
  }

  // Import entries from file into DB.
  static async importFromFile(
    userId,
    dictionaryId,
    importFilePath,
    entryStatus
  ) {
    const dbClient = await db.getClient()
    try {
      await dbClient.query('BEGIN')
      await readFileIntoDb(
        userId,
        dictionaryId,
        importFilePath,
        entryStatus,
        dbClient
      )
      await this.updateMetadataAfterModifyingEntries(dictionaryId, dbClient)
      await dbClient.query('COMMIT')
    } catch (error) {
      await dbClient.query('ROLLBACK')
      throw error
    } finally {
      dbClient.release()
    }
  }

  // Index entries of specific dictionary from DB into search engine.
  static async indexIntoSearchEngine(dictionaryId) {
    // TODO Luka: I expect "source" needing a rework once linked portals and dictionaries start working.
    const source = {
      code: await getInstanceSetting('portal_code'),
      name: await getInstanceSetting('portal_name')
    }
    const dbClient = await db.getClient()
    try {
      const queryValues = [dictionaryId]

      const dictionaryQueryText = `
        SELECT
          jsonb_strip_nulls(
            jsonb_build_object(
              'id', d.id,
              'nameSl', d.name_sl,
              'nameSlShort', d.name_sl_short,
              'nameEn', d.name_en,
              'status', d.status
            )
          ) "dictionary",
          jsonb_build_object(
            'id', dp.id,
            'nameSl', dp.name_sl,
            'nameEn', dp.name_en
          ) primary_domain
        FROM dictionary d
        LEFT JOIN domain_primary dp ON dp.id = d.domain_primary_id
        WHERE d.id = $1`

      const {
        rows: [{ dictionary, primary_domain: primaryDomain }]
      } = await dbClient.query(dictionaryQueryText, queryValues)

      const entryQueryText = `
        SELECT
          id,
          is_valid,
          is_published,
          is_terminology_reviewed,
          is_language_reviewed,
          status,
          term,
          homonym_sort,
          label,
          definition,
          synonym synonyms,
          other,
          time_most_recent_comment,
          ARRAY(
            SELECT name
            FROM entry_domain_label edl
            LEFT JOIN domain_label dl ON dl.id = edl.domain_label_id
            WHERE entry_id = e.id
          ) domain_labels,
          ARRAY(
            SELECT link
            FROM entry_link
            WHERE entry_id = e.id
          ) links,
          ARRAY(
            SELECT jsonb_strip_nulls(
              jsonb_build_object(
                'lang', jsonb_build_object(
                  'id', l.id,
                  'code', l.code,
                  'nameSl', l.name_sl,
                  'nameEn', l.name_en
                ),
                'terms', ef.term,
                'definition', ef.definition,
                'synonyms', ef.synonym
              )
            )
            FROM entry_foreign ef
            LEFT JOIN LANGUAGE l ON l.id = ef.language_id
            WHERE entry_id = e.id
          ) foreign_entries
        FROM entry e
        WHERE
          e.dictionary_id = $1`

      const cursor = dbClient.query(new Cursor(entryQueryText, queryValues))

      let entries = []
      do {
        // Keep getting and indexing entries in batches of 100.
        entries = await cursor.read(100)

        await bulkIndex(entries, primaryDomain, dictionary, source)
      } while (entries.length === 100)
    } finally {
      dbClient.release()
    }
  }

  // Fetch single dictionary's name from DB.
  static async fetchName(dictionaryId) {
    const { rows } = await db.query(
      'SELECT name_sl FROM dictionary WHERE id = $1',
      [dictionaryId]
    )
    const dictionaryName = rows[0].name_sl
    return dictionaryName
  }

  // Fetch all domain labels for single dictionary from DB.
  static async fetchDomainLabels(dictionaryId) {
    const { rows: fetchedDomainLabels } = await db.query(
      'SELECT id, name, is_visible FROM domain_label WHERE dictionary_id = $1',
      [dictionaryId]
    )

    const deserializedDomainLabels = fetchedDomainLabels.map(domainLabel =>
      deserialize.editDomainLabels(domainLabel)
    )

    return deserializedDomainLabels
  }

  // Fetch all domain labels for selected entry from DB.
  static async fetchDomainLabelsFromEntryId(entryId) {
    const { rows: fetchedDomainLabels } = await db.query(
      `
      SELECT id, name, is_visible
      FROM domain_label
      WHERE dictionary_id = 
      (SELECT dictionary_id FROM entry WHERE id = $1)`,
      [entryId]
    )

    const deserializedDomainLabels = fetchedDomainLabels.map(domainLabel =>
      deserialize.editDomainLabels(domainLabel)
    )

    return deserializedDomainLabels
  }

  // Fetch all domain labels for pagination for single dictionary from DB.
  static async fetchPaginationDomainLabels(dictionaryId, resultsPerPage, page) {
    const {
      rows: [{ result }]
    } = await db.query(
      `
        SELECT jsonb_build_object(
          'pages_total', (
            SELECT CEIL(COUNT(*) / $2::float)
            FROM domain_label
            WHERE dictionary_id = $1
          ),
          'results', ARRAY(
            SELECT jsonb_build_object(
              'id', id,
              'name', name,
              'isVisible', is_visible
            )
            FROM domain_label
            WHERE dictionary_id = $1
            ORDER BY name
            LIMIT $2
            OFFSET $3
          )
        ) result`,
      [dictionaryId, resultsPerPage, resultsPerPage * (page - 1)]
    )

    return result
  }

  // Fetch all secondary domains from DB.
  static async fetchAllSecondaryDomains(resultsPerPage, page) {
    const {
      rows: [{ result }]
    } = await db.query(
      `
        SELECT jsonb_build_object(
          'pages_total', (
            SELECT CEIL(COUNT(*) / $1::float)
            FROM domain_secondary
          ),
          'results', ARRAY(
            SELECT jsonb_build_object(
              'id', id,
              'isApproved', approved,
              'nameSl', name_sl,
              'nameEn', name_en
            )
            FROM domain_secondary
            ORDER BY name_sl
            LIMIT $1
            OFFSET $2
          )
        ) result`,
      [resultsPerPage, resultsPerPage * (page - 1)]
    )

    return result
  }

  static async updateDomainLabel(dictionaryId, data) {
    const dbClient = await db.getClient()
    try {
      await dbClient.query('BEGIN')

      const deletableDomainLabels = data.filter(
        domainLabel => domainLabel.type === 'removeArea'
      )

      const deleteEntryDomainLabel = deletableDomainLabels.map(
        async element => {
          const values = [element.id]
          const text = `
            DELETE FROM entry_domain_label
            WHERE domain_label_id = $1`

          await dbClient.query(text, values)
        }
      )

      await Promise.all(deleteEntryDomainLabel)

      const deleteDomainLabel = deletableDomainLabels.map(async element => {
        const values = [element.id]
        const text = `
          DELETE FROM domain_label
          WHERE id = $1`

        await dbClient.query(text, values)
      })

      await Promise.all(deleteDomainLabel)

      const addableDomainLabels = data.filter(
        domainLabel => domainLabel.type === 'addArea'
      )
      const addDomainLabels = addableDomainLabels.map(async element => {
        const values = [element.name, dictionaryId]
        const text = `
          INSERT INTO domain_label (name, dictionary_id)
          VALUES ($1, $2)`

        await dbClient.query(text, values)
      })

      const addJobs = Promise.all(addDomainLabels)

      const updatableDomainLabels = data.filter(
        domainLabel => domainLabel.type === 'changeArea'
      )
      const updateDomainLabels = updatableDomainLabels.map(async element => {
        const values = [
          element.name,
          element.isVisible,
          element.id,
          dictionaryId
        ]
        const text = `
          UPDATE domain_label
          SET name = $1, is_visible = $2
          WHERE id = $3 AND dictionary_id = $4`

        await dbClient.query(text, values)
      })

      const updateJobs = Promise.all(updateDomainLabels)

      await Promise.all([addJobs, updateJobs])

      await dbClient.query('COMMIT')
    } catch (error) {
      await dbClient.query('ROLLBACK')
      throw error
    } finally {
      dbClient.release()
    }
  }

  static async renovateSecondaryDomains(data) {
    const dbClient = await db.getClient()
    try {
      await dbClient.query('BEGIN')

      const deletableSecondaryDomains = data.filter(
        domainSecondary => domainSecondary.type === 'removeArea'
      )
      const deleteDictionarySecondaryDomains = deletableSecondaryDomains.map(
        async element => {
          const values = [element.id]
          const text = `
          DELETE FROM dictionary_domain_secondary
          WHERE domain_secondary_id = $1`

          await dbClient.query(text, values)
        }
      )

      await Promise.all(deleteDictionarySecondaryDomains)

      const deleteSecondaryDomain = deletableSecondaryDomains.map(
        async element => {
          const values = [element.id]
          const text = `
          DELETE FROM domain_secondary
          WHERE id = $1`

          await dbClient.query(text, values)
        }
      )

      await Promise.all(deleteSecondaryDomain)

      const addableSecondaryDomains = data.filter(
        domainSecondary => domainSecondary.type === 'addArea'
      )
      const addSeconaryDomains = addableSecondaryDomains.map(async element => {
        const values = [element.nameSl, element.nameEn]
        const text = `
        INSERT INTO domain_secondary (name_sl, name_en)
        VALUES ($1, $2)`

        await dbClient.query(text, values)
      })

      const addJobs = Promise.all(addSeconaryDomains)

      const updatableSecondaryDomains = data.filter(
        domainSecondary => domainSecondary.type === 'changeArea'
      )
      const updateSecondaryDomain = updatableSecondaryDomains.map(
        async element => {
          const values = [
            element.nameSl,
            element.nameEn,
            element.isApproved,
            element.id
          ]
          const text = `
          UPDATE domain_secondary
          SET name_sl = $1, name_en = $2, approved = $3
          WHERE id = $4`

          await dbClient.query(text, values)
        }
      )

      const updateJobs = Promise.all(updateSecondaryDomain)

      await Promise.all([addJobs, updateJobs])

      await dbClient.query('COMMIT')
    } catch (error) {
      await dbClient.query('ROLLBACK')
      throw error
    } finally {
      dbClient.release()
    }
  }

  static async fetchAllImports(dictionaryId) {
    const text = `
      SELECT
        time_started,
        status,
        delete_existing_entries,
        file_format,
        count_valid_entries
      FROM import_file_job
      WHERE dictionary_id = $1`

    const value = [dictionaryId]
    const { rows: fetchedImports } = await db.query(text, value)

    const deserializedImports = fetchedImports.map(oneImport =>
      deserialize.imports(oneImport)
    )
    return deserializedImports
  }

  static async delete(dictionaryId) {
    const text = 'DELETE FROM dictionary WHERE id = $1'
    const value = [dictionaryId]
    await db.query(text, value)
  }
}

module.exports = Dictionary
