const db = require('./db')
// const debug = require('debug')('termPortal:sync')

// Fetch all own published dictionaries from DB.
class InterInstanceSync {
  static async listDictionaries() {
    const indexSql = `
      SELECT
        d.id,
        d.name_sl,
        d.name_sl_short,
        d.name_en,
        d.author,
        d.issn,
        dp.name_sl domain_primary_name_sl,
        ARRAY(
          SELECT jsonb_build_object(
            'name_sl', ds.name_sl,
            'name_en', ds.name_en
          )
          FROM dictionary_domain_secondary dds
          LEFT JOIN domain_secondary ds ON ds.id = dds.domain_secondary_id
          WHERE dds.dictionary_id = d.id
        ) domain_secondary_names,
        ARRAY(
          SELECT l.code
          FROM dictionary_language dl
          LEFT JOIN language l ON l.id = dl.language_id
          WHERE dl.dictionary_id = d.id
          ORDER BY dl.selection_order
        ) language_codes, 
        d.time_created,
        d.time_modified,
        d.time_content_modified,
        d.description,
        d.entries_have_domain_labels,
        d.entries_have_label,
        d.entries_have_definition,
        d.entries_have_synonyms,
        d.entries_have_links,
        d.entries_have_other,
        d.entries_have_foreign_languages,
        d.entries_have_foreign_definitions,
        d.entries_have_foreign_synonyms,
        d.entries_have_images,
        d.entries_have_audio,
        d.entries_have_videos,
        d.entries_have_terminology_review_flag,
        d.entries_have_language_review_flag
      FROM dictionary d
      LEFT JOIN domain_primary dp ON dp.id = d.domain_primary_id
      LEFT JOIN linked_dictionary ld on ld.target_dictionary_id = d.id
      WHERE ld.id IS NULL AND d.status = 'published'
      ORDER BY id
    `

    const { rows: dictionaryList } = await db.query(indexSql)
    return dictionaryList
  }

  /**
   * Fetch all published (complete) entries for given dictionary that were modified after since date.
   * Entries shall include list of translations.
   * @param dictionaryId
   * @param since
   * @returns {Promise<*>}
   */
  static async getUpdatedEntriesSince(dictionaryId, since) {
    const sqlEntries =
      'SELECT id, term, label, definition, synonym FROM entry' +
      " WHERE dictionary_id= $1 AND time_modified > $2 AND status='complete' AND is_published IS TRUE"
    const sqlTranslations =
      'SELECT l.code AS language_code, ef.entry_id, ef.term, ef.definition, ef.synonym FROM entry_foreign AS ef' +
      ' INNER JOIN language AS l ON l.id = ef.language_id' +
      ' WHERE entry_id = ANY($1::int[]) ORDER BY ef.entry_id, l.code'
    const { rows: entryList } = await db.query(sqlEntries, [
      dictionaryId,
      since
    ])
    const entryIds = entryList.map(e => {
      return e.id
    })
    const { rows: translationList } = await db.query(sqlTranslations, [
      entryIds
    ])
    let currentEntryId = 0
    let lastEntryId = 0
    translationList.forEach(t => {
      currentEntryId = t.entry_id
      const entry = entryList.find(e => {
        return e.id === currentEntryId
      })
      if (!entry) return
      if (lastEntryId === 0) {
        entry.translations = []
        lastEntryId = t.entry_id
      } else if (currentEntryId !== lastEntryId) {
        // new entry translations : save previous
        entry.translations = []
        lastEntryId = currentEntryId
        currentEntryId = t.entry_id
      }
      entry.translations.push(t)
    })
    return entryList
  }
}

module.exports = InterInstanceSync
