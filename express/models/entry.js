const db = require('./db')
const { searchEngineClient, ENTRY_INDEX } = require('./search-engine')
const { intoDbArray, getInstanceSetting, removeHtmlTags } = require('./helpers')
const {
  prepareEntryForIndexing,
  sanitizeField
} = require('./helpers/dictionary')

const Entry = {}

// Create a new dictionary entry in DB.
Entry.create = async (userId, dictionaryId, entry) => {
  const pickedLinks = intoDbArray(entry.links, 'always')
  const pickedType = intoDbArray(entry.type, 'always')
  const links = pickedLinks.map((link, index) => ({
    link: sanitizeField.toMixedBasic(link),
    type: pickedType[index]
  }))
  const foreign = intoDbArray(entry.foreign, 'always')
  const foreignLanguageContent = foreign.reduce((agg, row) => {
    if (row.term || row.definition || row.synonym) {
      agg.push({
        language: row.code,
        terms: intoDbArray(row.term, 'undefined')?.map(term =>
          sanitizeField.toMixedBasic(term)
        ),
        definition: sanitizeField.toMixedExtended(row.definition) || null,
        synonyms: intoDbArray(row.synonym, 'undefined')?.map(synonym =>
          sanitizeField.toMixedBasic(synonym)
        )
      })
    }
    return agg
  }, [])

  const isValid =
    !!entry.term &&
    (!!entry.definition || foreignLanguageContent.some(el => el.terms))

  const values = [
    dictionaryId,
    isValid,
    entry.status,
    sanitizeField.toMixedBasic(entry.term) || null,
    userId,
    entry.homonymSort || null,
    entry.wordforms || null,
    entry.accent || null,
    entry.pronunciation || null,
    intoDbArray(entry.domainLabels, 'always').map(label =>
      sanitizeField.toText(label)
    ),
    sanitizeField.toMixedExtended(entry.label) || null,
    sanitizeField.toMixedExtended(entry.definition) || null,
    intoDbArray(entry.synonyms)?.map(synonym =>
      sanitizeField.toMixedBasic(synonym)
    ),
    links,
    sanitizeField.toMixedOther(entry.other) || null,
    foreignLanguageContent,
    intoDbArray(entry.image)?.map(image => sanitizeField.toText(image)),
    intoDbArray(entry.audio)?.map(audio => sanitizeField.toText(audio)),
    intoDbArray(entry.video)?.map(video => sanitizeField.toText(video))
  ]
  const text = `SELECT entry_new (${db.genParamStr(values)})`

  const {
    rows: [{ entry_new: entryId }]
  } = await db.query(text, values)

  return entryId
}

// Fetch all data, related to single entry from DB.
Entry.fetchFull = async entryId => {
  const text = `
    SELECT
      jsonb_strip_nulls(
        jsonb_build_object(
          'dictionary_id', e.dictionary_id,
          'is_valid', e.is_valid,
          'is_published', e.is_published,
          'is_terminology_reviewed', e.is_terminology_reviewed,
          'is_language_reviewed', e.is_language_reviewed,
          'status', e.status,
          'term', e.term,
          'version', e.version,
          'version_author', (
            SELECT username
            FROM "user" u
            LEFT JOIN entry e ON e.version_author = u.id
            WHERE e.id = $1
          ),
          'homonym_sort', e.homonym_sort,
          'label', e.label,
          'definition', e.definition,
          'synonyms', e.synonym,
          'other', e.other,
          'image', e.image,
          'audio', e.audio,
          'video', e.video,
          'time_modified', e.time_modified,
          'domain_labels', ARRAY(
            SELECT name
            FROM entry_domain_label edl
            LEFT JOIN domain_label dl ON dl.id = edl.domain_label_id
            WHERE entry_id = e.id
          ),
          'links', ARRAY(
            SELECT jsonb_build_object(
              'type', type,
              'link', link
            )
            FROM entry_link
            WHERE entry_id = e.id
          ),
          'foreign_entries', ARRAY(
            SELECT jsonb_strip_nulls(
              jsonb_build_object(
                'language_id', language_id,
                'term', term,
                'definition', definition,
                'synonym', synonym
              )
            )
            FROM entry_foreign
            WHERE entry_id = e.id
          ),
          'versions', ARRAY(
            SELECT jsonb_strip_nulls(
             jsonb_build_object(
                'version', version,
                'version_time', version_time,
                'version_author', (
                  SELECT username
                  FROM "user"
                  WHERE id = (version_snapshot['version_author'])::int
                )
              )
            )
            FROM entry_version_history
            WHERE entry_id = e.id
          )
        )
      ) entry
      FROM entry e
      WHERE e.id = $1`
  const value = [entryId]
  const {
    rows: [{ entry }]
  } = await db.query(text, value)

  return entry
}

// Fetch all data, related to single entry from DB with ordered foreign languages.
Entry.fetchFullWithOrderedForeignLanguages = async entryId => {
  const text = `
    SELECT
      jsonb_strip_nulls(
        jsonb_build_object(
          'dictionary_id', e.dictionary_id,
          'is_valid', e.is_valid,
          'is_published', e.is_published,
          'is_terminology_reviewed', e.is_terminology_reviewed,
          'is_language_reviewed', e.is_language_reviewed,
          'status', e.status,
          'term', e.term,
          'synonym', e.synonym,
          'version', e.version,
          'version_author', (
            SELECT username
            FROM "user" u
            LEFT JOIN entry e ON e.version_author = u.id
            WHERE e.id = $1
          ),
          'homonym_sort', e.homonym_sort,
          'label', e.label,
          'definition', e.definition,
          'synonyms', e.synonym,
          'other', e.other,
          'image', e.image,
          'audio', e.audio,
          'video', e.video,
          'time_modified', e.time_modified,
          'external_url', e.external_url,
          'domain_labels', ARRAY(
            SELECT name
            FROM entry_domain_label edl
            LEFT JOIN domain_label dl ON dl.id = edl.domain_label_id
            WHERE entry_id = e.id
          ),
          'links', ARRAY(
            SELECT jsonb_build_object(
              'type', type,
              'link', link
            )
            FROM entry_link
            WHERE entry_id = e.id
          ),
          'foreign_entries', ARRAY(
            SELECT jsonb_strip_nulls(
              jsonb_build_object(
                'language_id', ef.language_id,
                'term', ef.term,
                'definition', ef.definition,
                'synonym', ef.synonym
              )
            )
            FROM entry e
            LEFT JOIN entry_foreign ef on ef.entry_id = e.id
            LEFT JOIN dictionary_language dl on dl.dictionary_id = e.dictionary_id AND ef.language_id = dl.language_id
            LEFT JOIN language l on l.id = ef.language_id
            WHERE entry_id = $1
            ORDER BY dl.selection_order
          ),
          'versions', ARRAY(
            SELECT jsonb_strip_nulls(
             jsonb_build_object(
                'version', version,
                'version_time', version_time
              )
            )
            FROM entry_version_history
            WHERE entry_id = e.id
          )
        )
      ) entry
      FROM entry e
      WHERE e.id = $1`
  const value = [entryId]
  const {
    rows: [{ entry }]
  } = await db.query(text, value)

  return entry
}

// Fetch single entry data from DB.
Entry.fetch = async entryId => {
  const text = `
    SELECT
      dictionary_id,
      term,
      is_published,
      is_terminology_reviewed,
      is_language_reviewed,
      homonym_sort,
      status,
      label,
      definition,
      synonym,
      other,
      image,
      audio,
      video
    FROM entry
    WHERE id = $1`
  const value = [entryId]
  const { rows: fetchedEntryData } = await db.query(text, value)
  return fetchedEntryData[0]
}

// Fetch domain labels associated with a single entry from DB.
Entry.fetchDomainLabels = async entryId => {
  const text = `
    SELECT
      dl.id,
      dl.dictionary_id,
      dl.name	
    FROM entry e
    INNER JOIN entry_domain_label edl ON e.id = edl.entry_id
    INNER JOIN domain_label dl ON edl.domain_label_id = dl.id
    WHERE e.id = $1`
  const value = [entryId]
  const { rows: fetchedDomainLabels } = await db.query(text, value)
  return fetchedDomainLabels
}

// Fetch foreign content associated with a single entry from DB.
Entry.fetchForeign = async entryId => {
  const text = `
    SELECT term, language_id, definition, synonym
    FROM entry_foreign
    WHERE entry_id=$1`
  const value = [entryId]
  const { rows: fetchedEntries } = await db.query(text, value)
  return fetchedEntries
}

// Redundant. Use getInstanceSetting function instead.
// Entry.fetchEditingPhase = async () => {
//   const text = `
//     SELECT
//       name, value
//     FROM
//       instance_settings
//     WHERE
//       name = 'can_publish_entries_in_edit'
//   `
//   const { rows: fetchedPhase } = await db.query(text)
//   const aggregatedSettings = aggregateSettings(fetchedPhase)
//   const deserializedSettings = deserialize.dictSettings(aggregatedSettings)
//   return deserializedSettings
// }

// Delete foreign content of a single entry from DB.
Entry.deleteForeign = async entryId => {
  const text = 'DELETE FROM entry_foreign WHERE entry_id = $1'
  const value = [entryId]
  await db.query(text, value)
}

// Delete domain label associations with a single entry from DB.
Entry.deleteDomainLabels = async entryId => {
  const text = 'DELETE FROM entry_domain_label WHERE entry_id = $1'
  const value = [entryId]
  await db.query(text, value)
}

// Delete links of a single entry from DB.
Entry.deleteLinks = async entryId => {
  const text = 'DELETE FROM entry_link WHERE entry_id = $1'
  const value = [entryId]
  await db.query(text, value)
}

// Delete single entry from DB.
Entry.delete = async entryId => {
  const text = 'DELETE FROM entry WHERE id = $1 RETURNING dictionary_id'
  const value = [entryId]
  const {
    rows: [{ dictionary_id: dictionaryId }]
  } = await db.query(text, value)
  return dictionaryId
}

// Delete foreign content for selected dictionary from DB.
Entry.deleteAllForeign = async dictionaryId => {
  const text = `
    DELETE FROM entry_foreign 
    WHERE entry_id
    IN (SELECT id
        FROM entry
        WHERE dictionary_id = $1)`
  const value = [dictionaryId]
  await db.query(text, value)
}

// Delete all domain label associations for selected dictionary from DB.
Entry.deleteAllDomainLabels = async dictionaryId => {
  const text = `
    DELETE FROM entry_domain_label 
    WHERE entry_id
    IN (SELECT id
        FROM entry
        WHERE dictionary_id = $1)`
  const value = [dictionaryId]
  await db.query(text, value)
}

// Delete all links for selected dictionary.
Entry.deleteAllLinks = async dictionaryId => {
  const text = `
    DELETE FROM entry_link 
    WHERE entry_id
    IN (SELECT id
        FROM entry
        WHERE dictionary_id = $1)`
  const value = [dictionaryId]
  await db.query(text, value)
}

// (Re)index specific entry into entry search index.
Entry.indexIntoSearchEngine = async (entryId, shouldWait) => {
  // TODO If this method is ever used for linked portals/dictionaries,
  // TODO rework the source object below (already done in Dictionary.indexIntoSearchEngine).
  const values = [entryId]
  const text = `
    SELECT
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', e.id,
          'is_valid', e.is_valid,
          'is_published', e.is_published,
          'is_terminology_reviewed', e.is_terminology_reviewed,
          'is_language_reviewed', e.is_language_reviewed,
          'status', e.status,
          'term', e.term,
          'homonym_sort', e.homonym_sort,
          'label', e.label,
          'definition', e.definition,
          'synonyms', e.synonym,
          'other', e.other,
          'time_most_recent_comment', e.time_most_recent_comment,
          'domain_labels', ARRAY(
            SELECT name
            FROM entry_domain_label edl
            LEFT JOIN domain_label dl ON dl.id = edl.domain_label_id
            WHERE entry_id = e.id
          ),
          'links', ARRAY(
            SELECT link
            FROM entry_link
            WHERE entry_id = e.id
          ),
          'foreign_entries', ARRAY(
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
            LEFT JOIN language l ON l.id = ef.language_id
            WHERE entry_id = e.id
          )
        )
      ) entry,
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
    FROM entry e
    JOIN dictionary d ON d.id = e.dictionary_id
    JOIN domain_primary dp ON dp.id = d.domain_primary_id
    WHERE e.id = $1`

  const {
    rows: [dataToIndex]
  } = await db.query(text, values)

  const { dictionary, primary_domain: primaryDomain } = dataToIndex
  let { entry } = dataToIndex

  // TODO i18n Luka: index portal name for both languages?
  const source = {
    code: await getInstanceSetting('portal_code'),
    name: await getInstanceSetting('portal_name_sl')
  }

  entry = prepareEntryForIndexing(entry)
  entry.primaryDomain = primaryDomain
  entry.dictionary = dictionary
  entry.source = source
  entry = removeHtmlTags(JSON.stringify(entry))

  await searchEngineClient.index({
    id: entryId,
    index: ENTRY_INDEX,
    body: entry,
    refresh: shouldWait ? 'wait_for' : false
  })
}

// Delete all entries for selected dictionary from search index.
Entry.deleteAllFromIndex = async dictionaryId => {
  await searchEngineClient.deleteByQuery({
    index: ENTRY_INDEX,
    body: { query: { match: { 'dictionary.id': dictionaryId } } }
  })
}

// Delete all entries for selected dictionary from DB.
Entry.deleteAll = async dictionaryId => {
  const text = 'DELETE FROM entry WHERE dictionary_id = $1'
  const value = [dictionaryId]
  await db.query(text, value)
}

// Publish all entries for selected dictionary from DB that match the criteria.
Entry.publishAllQualified = async dictionaryId => {
  const text = `
    UPDATE entry
    SET is_published = TRUE
    WHERE
      dictionary_id = $1
      AND is_valid = TRUE
      AND status = ANY(
        CASE (SELECT value FROM instance_settings WHERE name = 'can_publish_entries_in_edit')
          WHEN 'T' THEN ARRAY ['complete', 'in_edit']::entry_status[]
          ELSE ARRAY ['complete']::entry_status[]
        END
      )
  `
  const value = [dictionaryId]

  await db.query(text, value)
}

// Update single entry in DB.
Entry.update = async (userId, entry) => {
  // Copied from Entry.create and modified.
  const pickedLinks = intoDbArray(entry.links, 'always')
  const pickedType = intoDbArray(entry.type, 'always')
  const links = pickedLinks.map((link, index) => ({
    link: sanitizeField.toMixedBasic(link),
    type: pickedType[index]
  }))
  const foreign = intoDbArray(entry.foreign, 'always')
  const foreignLanguageContent = foreign.reduce((agg, row) => {
    if (row.term || row.definition || row.synonym) {
      agg.push({
        language: row.code,
        terms: intoDbArray(row.term, 'undefined')?.map(term =>
          sanitizeField.toMixedBasic(term)
        ),
        definition: sanitizeField.toMixedExtended(row.definition) || null,
        synonyms: intoDbArray(row.synonym, 'undefined')?.map(synonym =>
          sanitizeField.toMixedBasic(synonym)
        )
      })
    }
    return agg
  }, [])
  const isValid =
    !!entry.term &&
    (!!entry.definition || foreignLanguageContent.some(el => el.terms))

  const values = [
    entry.entryId,
    isValid,
    !!entry.isPublished,
    !!entry.isTerminologyReviewed,
    !!entry.isLanguageReviewed,
    entry.status,
    sanitizeField.toMixedBasic(entry.term) || null,
    userId,
    entry.homonymSort || null,
    intoDbArray(entry.domainLabels, 'always').map(label =>
      sanitizeField.toText(label)
    ),
    sanitizeField.toMixedExtended(entry.label) || null,
    sanitizeField.toMixedExtended(entry.definition) || null,
    intoDbArray(entry.synonyms)?.map(synonym =>
      sanitizeField.toMixedBasic(synonym)
    ),
    links,
    sanitizeField.toMixedOther(entry.other) || null,
    foreignLanguageContent,
    intoDbArray(entry.image)?.map(image => sanitizeField.toText(image)),
    intoDbArray(entry.audio)?.map(audio => sanitizeField.toText(audio)),
    intoDbArray(entry.video)?.map(video => sanitizeField.toText(video))
  ]
  const text = `SELECT entry_update (${db.genParamStr(values)})`

  const {
    rows: [{ entry_update: dictionaryId }]
  } = await db.query(text, values)

  return dictionaryId
}

// // Fetch all versions (with timestamps) of a single entry from DB.
// Entry.fetchVersions = async entryId => {
//   const { rows: historyVersions } = await db.query(
//     'SELECT version, version_time FROM entry_version_history WHERE entry_id = $1',
//     [entryId]
//   )

//   return historyVersions
// }

// Fetch a single version snapshot of a single entry from DB.
Entry.fetchVersionSnapshot = async (entryId, version) => {
  const {
    rows: [{ version_snapshot: historySnapshot, author }]
  } = await db.query(
    `SELECT v.version_snapshot, (
        SELECT u.username
        FROM "user" u
        WHERE u.id = (v.version_snapshot['version_author'])::int) as author
    FROM entry_version_history v WHERE v.entry_id = $1 and v.version = $2`,
    [entryId, version]
  )

  return { data: historySnapshot, author }
}

/* Fetch by language and entry Id. Note that this version includes the language name */
Entry.fetchForeignEntryById = async entryId => {
  const text = `
    SELECT
      entry_id,
      language_id,
      code,
      name_sl,
      name_en,
      term,
      definition,
      synonym
    FROM entry_foreign ef
    INNER JOIN language lang ON ef.language_id = lang.id
    WHERE ef.entry_id = $1`
  const value = [entryId]
  const { rows: fetchedDomainLabels } = await db.query(text, value)
  return fetchedDomainLabels
}

module.exports = Entry
