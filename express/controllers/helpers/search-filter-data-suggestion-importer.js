const Dictionary = require('../../models/dictionary')
const Portal = require('../../models/portal')
const { getInstanceSetting } = require('../../models/helpers')

const helper = {}

helper.initialize = async () => {
  const initializers = {}

  // TODO Once english language is implemented, gather selected language (sl/en) from request ~ (cookies?)
  const language = 'name_sl'

  // TODO Consider parallelizing following queries. Single vs pooled clients?
  initializers.allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()
  initializers.sourceLanguages = await Dictionary.fetchAllLanguages(language)
  initializers.targetLanguages = initializers.sourceLanguages.filter(
    // drop slovene language
    l => l.id !== 32
  )

  initializers.allDictionaryNames = await Dictionary.fetchAll()

  initializers.portals = []
  initializers.portals.push({
    name: await getInstanceSetting('portal_name'),
    code: await getInstanceSetting('portal_code')
  })

  initializers.portals.concat(await Portal.fetchAll())

  return initializers
}

module.exports = helper
