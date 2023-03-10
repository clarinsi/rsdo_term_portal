const db = require('./db')
const { aggregateSettings, deserialize } = require('./helpers/portal')

const Portal = {}

Portal.fetchInstanceSettings = async () => {
  const text = `
    SELECT
      name, value
    FROM
      instance_settings
    WHERE
      name
    IN (
      'portal_name_sl',
      'portal_name_en',
      'portal_code',
      'portal_description_sl',
      'portal_description_en',
      'is_consultancy_enabled',
      'is_dictionaries_enabled',
      'is_extraction_enabled')`

  const { rows: fetchedSettings } = await db.query(text)

  const aggregatedSettings = aggregateSettings(fetchedSettings)
  const deserializedSettings = deserialize.settings(aggregatedSettings)
  return deserializedSettings
}

Portal.updateInstaceSettings = async payload => {
  const isExtractionEnabled = payload.isExtractionEnabled ? 'T' : 'F'
  const isDictionariesEnabled = payload.isDictionariesEnabled ? 'T' : 'F'
  const isConsultancyEnabled = payload.isConsultancyEnabled ? 'T' : 'F'

  const values = [
    payload.portalNameSl,
    payload.portalNameEn,
    payload.portalCode,
    payload.portalDescriptionSl,
    payload.portalDescriptionEn,
    isExtractionEnabled,
    isDictionariesEnabled,
    isConsultancyEnabled
  ]

  const text = `
    UPDATE
      instance_settings
    SET
      value
    = CASE name
    WHEN
      'portal_name_sl' THEN $1
    WHEN
      'portal_name_en' THEN $2
    WHEN
      'portal_code' THEN $3
    WHEN
      'portal_description_sl' THEN $4
    WHEN
      'portal_description_en' THEN $5
    WHEN
      'is_extraction_enabled' THEN $6
    WHEN
      'is_dictionaries_enabled' THEN $7
    WHEN
      'is_consultancy_enabled' THEN $8
    ELSE value
    END`

  await db.query(text, values)
}

Portal.fetchInstanceDictSettings = async () => {
  const text = `
    SELECT
      name, value
    FROM
      instance_settings
    WHERE
      name
    IN (
      'min_entries_per_dictionary',
      'dictionary_publish_approval',
      'num_of_history_entires_per_entry',
      'can_publish_entries_in_edit')`

  const { rows: fetchedSettings } = await db.query(text)

  const aggregatedSettings = aggregateSettings(fetchedSettings)
  const deserializedSettings = deserialize.dictSettings(aggregatedSettings)
  return deserializedSettings
}

Portal.updateInstaceDictSettings = async payload => {
  const dictionaryPublish = payload.dictionaryPublishApproval ? 'T' : 'F'
  const canPublishEntriesInEdit = payload.canPublishEntriesInEdit ? 'T' : 'F'

  const values = [
    payload.minEntriesPerDictionary,
    dictionaryPublish,
    // payload.keepNumOfExportsPerDict,
    // payload.dictionaryAutoSaveFrequency,
    payload.numOfHistoryEntriesPerEntry,
    canPublishEntriesInEdit
  ]

  const text = `
    UPDATE
      instance_settings
    SET
      value
    = CASE name
    WHEN
      'min_entries_per_dictionary' THEN $1
    WHEN
      'dictionary_publish_approval' THEN $2
    WHEN
      'num_of_history_entires_per_entry' THEN $3
    WHEN
      'can_publish_entries_in_edit' THEN $4
    ELSE value
    END`

  await db.query(text, values)
}

Portal.fetchInstanceConsultancySettings = async () => {
  const text = `
    SELECT
      name, value
    FROM
      instance_settings
    WHERE
      name
    IN (
      'consultancy_type',
      'zrc_email',
      'zrc_url')`

  const { rows: fetchedSettings } = await db.query(text)

  const aggregatedSettings = aggregateSettings(fetchedSettings)
  const deserializedSettings = deserialize.consultSettings(aggregatedSettings)
  return deserializedSettings
}

Portal.updateInstaceConsultancySettings = async payload => {
  const values = [payload.consultancyType, payload.zrcEmail, payload.zrcURL]

  const text = `
    UPDATE
      instance_settings
    SET
      value
    = CASE name
    WHEN
      'consultancy_type' THEN $1
    WHEN
      'zrc_email' THEN $2
    WHEN
      'zrc_url' THEN $3
    ELSE value
    END`

  await db.query(text, values)
}

Portal.create = async portal => {
  const isEnabled = true
  const values = [
    portal.name,
    portal.url_update,
    portal.url_index,
    portal.code,
    isEnabled
  ]

  const text = `
    INSERT INTO linked_portal (
        name,
        url_update,
        url_index,
        code,
        is_enabled
      )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id`

  const { rows } = await db.query(text, values)
  return rows
}

Portal.fetchAll = async () => {
  const text = `
    SELECT 
      id,
      name,
      url_index,
      is_enabled,
      code,
      time_last_synced, 
      EXISTS (SELECT ld.name 
        FROM linked_dictionary as ld 
        WHERE lp.id = ld.linked_portal_id) is_linked
    FROM linked_portal as lp
    ORDER BY id`

  const { rows: fetchedConnections } = await db.query(text)

  const deserializedConnections = fetchedConnections.map(connection =>
    deserialize.connections(connection)
  )
  return deserializedConnections
}

Portal.fetchPortal = async portalId => {
  const value = [portalId]
  const text = `
    SELECT
      name,
      url_update,
      url_index,
      code
    FROM 
      linked_portal
    WHERE
      id = $1`

  const { rows } = await db.query(text, value)
  const fetchedPortal = rows[0]
  const deserializedPortal = deserialize.connections(fetchedPortal)
  return deserializedPortal
}

Portal.update = async (portalId, payload) => {
  const values = [
    payload.name,
    payload.code,
    payload.url_update,
    payload.url_index,
    portalId
  ]
  const text = `
    UPDATE
      linked_portal
    SET
      name = $1,
      code = $2,
      url_update = $3,
      url_index = $4
    WHERE id = $5`

  await db.query(text, values)
}

Portal.syncRemoteDictionaries = async (linkedPortalId, dictionaries) => {
  const text = 'SELECT sync_remote_dictionaries($1, $2)'
  const values = [linkedPortalId, dictionaries]

  await db.query(text, values)
}

Portal.deleteLinkedDictionary = async linkedPortalId => {
  const text = `DELETE from linked_portal WHERE id = $1`
  const value = [linkedPortalId]

  await db.query(text, value)
}

Portal.fetchDictionaries = async portalId => {
  const value = [portalId]
  const text = `
    SELECT
      name,
      target_dictionary_id
    FROM linked_dictionary
    WHERE linked_portal_id = $1`

  const { rows: fetchedDictionaries } = await db.query(text, value)
  return fetchedDictionaries
}

Portal.fetchSelectedLinkedDictionaries = async (id, resultsPerPage, page) => {
  const {
    rows: [{ result }]
  } = await db.query(
    `
    SELECT jsonb_build_object(
      'pages_total', (
        SELECT CEIL(COUNT(*) / $2::float)
        FROM linked_dictionary
        WHERE linked_dictionary.linked_portal_id = $1
      ),
      'results', ARRAY(
        SELECT jsonb_build_object(
          'id', linked_dictionary.id,
          'name', linked_dictionary.name,
          'isEnabled', linked_dictionary.is_enabled,
          'code', linked_portal.code
        )
        FROM linked_dictionary
        LEFT JOIN linked_portal 
        ON linked_dictionary.linked_portal_id = linked_portal.id
        WHERE linked_dictionary.linked_portal_id = $1
        ORDER BY linked_dictionary.id
        LIMIT $2
        OFFSET $3
      )
    ) result`,
    [id, resultsPerPage, resultsPerPage * (page - 1)]
  )
  return result
}

Portal.updateSelectedDictionaries = async (id, body) => {
  const portalId = id
  let enableArr = body.isEnabled ? Object.keys(body.isEnabled) : []
  const dbClient = await db.getClient()
  try {
    await dbClient.query('BEGIN')

    const setAllToFalse = `
        UPDATE linked_dictionary
        SET is_enabled = false
        WHERE linked_portal_id = $1`
    await dbClient.query(setAllToFalse, [portalId])

    enableArr = enableArr.map(
      linkedDictionaryId => +linkedDictionaryId.replaceAll("'", '')
    )

    const text = `
      UPDATE linked_dictionary
      SET is_enabled = true
      WHERE id = ANY ($1)
      AND linked_portal_id = $2`
    const values = [enableArr, portalId]

    await dbClient.query(text, values)

    await dbClient.query('COMMIT')
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  } finally {
    dbClient.release()
  }
}

Portal.fetchAllLinkedDictionaries = async (resultsPerPage, page) => {
  const {
    rows: [{ result }]
  } = await db.query(
    `
    SELECT jsonb_build_object(
      'pages_total', (
        SELECT CEIL(COUNT(*) / $1::float)
        FROM linked_dictionary
      ),
      'results', ARRAY(
        SELECT jsonb_build_object(
          'id', linked_dictionary.id,
          'name', linked_dictionary.name,
          'isEnabled', linked_dictionary.is_enabled,
          'code', linked_portal.code
        )
        FROM linked_dictionary
        LEFT JOIN linked_portal 
        ON linked_dictionary.linked_portal_id = linked_portal.id
        ORDER BY linked_portal.id
        LIMIT $1
        OFFSET $2
      )
    ) result`,
    [resultsPerPage, resultsPerPage * (page - 1)]
  )
  return result
}

Portal.updateAllDictionaries = async body => {
  const enableArr = Object.keys(body.isEnabled)
  const dbClient = await db.getClient()
  try {
    await dbClient.query('BEGIN')

    const setAllToFalse = `
        UPDATE linked_dictionary
        SET is_enabled = false`
    await dbClient.query(setAllToFalse)

    const enableAllDictionary = enableArr.map(async userId => {
      userId = +userId.replaceAll("'", '')

      const text = `
        UPDATE linked_dictionary
        SET is_enabled = true
        WHERE id = $1`
      const values = [userId]

      await dbClient.query(text, values)
    })

    await Promise.all(enableAllDictionary)

    await dbClient.query('COMMIT')
  } catch (error) {
    await dbClient.query('ROLLBACK')
    throw error
  } finally {
    dbClient.release()
  }
}

Portal.updatePortalStatus = async (portalId, isEnabled) => {
  const values = [isEnabled, portalId]

  const text = `
    UPDATE linked_portal
    SET is_enabled = $1
    WHERE id = $2`

  await db.query(text, values)
}

Portal.getInstanceSettingValue = async settingName => {
  const values = [settingName]

  const text = `
    SELECT value
    FROM instance_settings
    WHERE name = $1`

  const { rows } = await db.query(text, values)
  const settingValue = rows[0].value

  return settingValue
}

Portal.fetchAllInstanceSettingNames = async () => {
  const { rows } = await db.query('SELECT name FROM instance_settings')
  const settingNames = rows.map(row => row.name)

  return settingNames
}

Portal.getSlovenianLanguageId = async () => {
  const { rows } = await db.query("SELECT id FROM language WHERE code = 'sl'")
  const id = rows[0].id

  return id
}

Portal.getSearchAggregateNames = async (
  primaryDomainIds,
  dictionaryIds,
  languageIds
) => {
  const text = `
    SELECT jsonb_build_object(
      'primaryDomains', jsonb_object(
        ARRAY(
          SELECT ARRAY [id, name_sl]::TEXT[]
          FROM domain_primary
          WHERE id = ANY ($1)
        )
      ),
      'dictionaries', jsonb_object(
        ARRAY(
          SELECT ARRAY [id, name_sl]::TEXT[]
          FROM dictionary
          WHERE id = ANY ($2)
        )
      ),
      'languages', jsonb_object(
        ARRAY(
          SELECT ARRAY [id, name_sl]::TEXT[]
          FROM language
          WHERE id = ANY ($3)
        )
      )
    ) "names"
  `
  const values = [primaryDomainIds, dictionaryIds, languageIds]

  const {
    rows: [{ names }]
  } = await db.query(text, values)

  return names
}

module.exports = Portal
