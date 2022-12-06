const { removeHtmlTags } = require('../../helpers')
const { searchEngineClient, ENTRY_INDEX } = require('../../search-engine')

exports.deserialize = {
  primaryDomain(domain) {
    const deserializedDomain = {
      id: domain.id,
      nameSl: domain.name_sl,
      nameEn: domain.name_en
    }

    return deserializedDomain
  },

  secondaryDomain(domain) {
    const deserializedDomain = {
      id: domain.id,
      isApproved: domain.approved,
      nameSl: domain.name_sl,
      nameEn: domain.name_en
    }

    return deserializedDomain
  },

  approvedSecondaryDomain(domain) {
    const deserializedDomain = {
      id: domain.id,
      nameSl: domain.name_sl,
      nameEn: domain.name_en
    }

    return deserializedDomain
  },

  language(language) {
    const deserializedLanguage = {
      id: language.id,
      code: language.code,
      nameSl: language.name_sl,
      nameEn: language.name_en
    }

    return deserializedLanguage
  },

  editDescription(dictionary) {
    const deserializedDictionary = {
      id: dictionary.id,
      nameSl: dictionary.name_sl,
      nameEn: dictionary.name_en,
      nameSlShort: dictionary.name_sl_short,
      author: dictionary.author,
      domainPrimary: dictionary.domain_primary_id,
      description: dictionary.description,
      issn: dictionary.issn
    }

    return deserializedDictionary
  },

  editUsers(dictionary) {
    const deserializedDictionary = {
      id: dictionary.id,
      nameSl: dictionary.name_sl,
      terminologyReviewFlag: dictionary.entries_have_terminology_review_flag,
      languageReviewFlag: dictionary.entries_have_language_review_flag,
      status: dictionary.status
    }

    return deserializedDictionary
  },

  editStructure(dictionary) {
    const deserializedDictionary = {
      id: dictionary.id,
      nameSl: dictionary.name_sl,
      hasDomainLabels: dictionary.entries_have_domain_labels,
      hasLabel: dictionary.entries_have_label,
      hasDefinition: dictionary.entries_have_definition,
      hasSynonyms: dictionary.entries_have_synonyms,
      hasLinks: dictionary.entries_have_links,
      hasOther: dictionary.entries_have_other,
      hasForeignLanguages: dictionary.entries_have_foreign_languages,
      hasForeignDefinitions: dictionary.entries_have_foreign_definitions,
      hasForeignSynonyms: dictionary.entries_have_foreign_synonyms,
      hasImages: dictionary.entries_have_images,
      hasAudio: dictionary.entries_have_audio,
      hasVideo: dictionary.entries_have_videos
    }

    return deserializedDictionary
  },

  editDomainLabels(domainLabel) {
    const deserializedDomainLabel = {
      id: domainLabel.id,
      name: domainLabel.name,
      isVisible: domainLabel.is_visible
    }

    return deserializedDomainLabel
  },

  imports(oneImport) {
    const deserializedImports = {
      timeStarted: oneImport.time_started,
      status: oneImport.status,
      deleteExisting: oneImport.delete_existing_entries,
      fileFormat: oneImport.file_format,
      countValidEntries: oneImport.count_valid_entries
    }

    return deserializedImports
  }
}

exports.bulkIndex = async (entries, primaryDomain, dictionary, source) => {
  const entriesCount = entries.length
  if (!entries.length) return

  // Construct request body.
  const bulkBody = new Array(entriesCount * 2)
  for (let i = 0; i < entriesCount; i++) {
    let entry = prepareEntryForIndexing(entries[i])
    bulkBody[i * 2] = { index: { _index: ENTRY_INDEX, _id: entry.id } }

    entry.primaryDomain = primaryDomain
    entry.dictionary = dictionary
    entry.source = source
    entry = removeHtmlTags(JSON.stringify(entry))
    bulkBody[i * 2 + 1] = entry
  }

  // Send the request.
  const bulkResponse = await searchEngineClient.bulk({ body: bulkBody })

  // Log possible errors.
  if (bulkResponse.errors) {
    const erroredDocuments = []
    bulkResponse.items.forEach((action, i) => {
      const operation = Object.keys(action)[0]
      if (action[operation].error) {
        erroredDocuments.push({
          // If the status is 429 it means that you can retry the document,
          // otherwise it's very likely a mapping error, and you should
          // fix the document before to try it again.
          status: action[operation].status,
          error: action[operation].error,
          operation: action[operation].body[i * 2],
          document: action[operation].body[i * 2 + 1]
        })
      }
    })
    console.log('Errors indexing documents:') // eslint-disable-line no-console
    console.log(erroredDocuments) // eslint-disable-line no-console
  }
}

function prepareEntryForIndexing(entry) {
  // Snake case property names into camel case.
  entry.isValid = entry.is_valid
  delete entry.is_valid

  entry.isPublished = entry.is_published
  delete entry.is_published

  entry.isTerminologyReviewed = entry.is_terminology_reviewed
  delete entry.is_terminology_reviewed

  entry.isLanguageReviewed = entry.is_language_reviewed
  delete entry.is_language_reviewed

  entry.homonymSort = entry.homonym_sort
  delete entry.homonym_sort

  entry.timeMostRecentComment = entry.time_most_recent_comment
  delete entry.time_most_recent_comment

  entry.domainLabels = entry.domain_labels
  delete entry.domain_labels

  entry.foreignEntries = entry.foreign_entries
  delete entry.foreign_entries

  // Remove (top-level) properies with null or empty array values.
  entry = Object.fromEntries(
    Object.entries(entry).filter(
      ([_, v]) => v !== null && (!Array.isArray(v) || v.length)
    )
  )

  return entry
}

exports.prepareEntryForIndexing = prepareEntryForIndexing
