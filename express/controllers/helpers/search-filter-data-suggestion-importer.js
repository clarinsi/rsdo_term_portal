const Dictionary = require('../../models/dictionary')
const Portal = require('../../models/portal')
const { getInstanceSetting } = require('../../models/helpers')

const helper = {}

helper.initialize = async determinedLanguage => {
  const initializers = {}

  // TODO Consider parallelizing following queries. Single vs pooled clients?
  initializers.allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains(
    determinedLanguage
  )
  const allLanguages = await Dictionary.fetchAllLanguages(determinedLanguage)
  initializers.sourceLanguages = allLanguages
  initializers.targetLanguages = allLanguages.filter(
    // drop slovene language
    l => l.id !== 32
  )

  initializers.allDictionaryNames = await Dictionary.fetchAll(
    determinedLanguage
  )

  initializers.portals = []
  initializers.portals.push({
    name: await getInstanceSetting('portal_name_sl'),
    code: await getInstanceSetting('portal_code')
  })

  initializers.portals.concat(await Portal.fetchAll())

  return initializers
}

module.exports = helper
