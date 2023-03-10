exports.aggregateSettings = settings => {
  const deserializedSettings = settings.reduce((agg, setting) => {
    agg[setting.name] = setting.value
    return agg
  }, {})
  return deserializedSettings
}

exports.deserialize = {
  settings(settings) {
    const deserializedSettings = {
      nameSl: settings.portal_name_sl,
      nameEn: settings.portal_name_en,
      descriptionSl: settings.portal_description_sl,
      descriptionEn: settings.portal_description_en,
      code: settings.portal_code,
      isExtractionEnabled: settings.is_extraction_enabled,
      isDictionariesEnabled: settings.is_dictionaries_enabled,
      isConsultancyEnabled: settings.is_consultancy_enabled
    }

    return deserializedSettings
  },
  dictSettings(settings) {
    const deserializedSettings = {
      minEntriesPerDictionary: settings.min_entries_per_dictionary,
      dictionaryPublishApproval: settings.dictionary_publish_approval,
      // keepNumOfExportsPerDict: settings.keep_num_of_exports_per_dictionary,
      // dictionaryAutoSaveFrequency: settings.dictionary_auto_save_frequency,
      numOfHistoryEntriesPerEntry: settings.num_of_history_entires_per_entry,
      canPublishEntriesInEdit: settings.can_publish_entries_in_edit
    }

    return deserializedSettings
  },
  consultSettings(settings) {
    const deserializedSettings = {
      consultancyType: settings.consultancy_type,
      zrcEmail: settings.zrc_email,
      zrcURL: settings.zrc_url
    }

    return deserializedSettings
  },
  connections(connection) {
    const deserializedConnections = {
      id: connection.id,
      name: connection.name,
      indexURL: connection.url_index,
      code: connection.code,
      isEnabled: connection.is_enabled,
      synced: connection.time_last_synced,
      isLinked: connection.is_linked,
      URLupdate: connection.url_update
    }

    return deserializedConnections
  },
  dictionaries(dictionary) {
    const deserializeDictionaries = {
      id: dictionary.id,
      name: dictionary.name,
      code: dictionary.code,
      isEnabled: dictionary.is_enabled
    }

    return deserializeDictionaries
  }
}
