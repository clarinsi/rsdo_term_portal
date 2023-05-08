const Dictionary = require('../../../models/dictionary')
const { searchEntryIndex } = require('../../../models/search-engine')
const { intoDbArray } = require('../../../models/helpers')
const {
  prepareEntries,
  prepareEditorEntries,
  prepareAggregation,
  prepareSeachFilterData
} = require('../../../models/helpers/search')
const generateQuery = require('../../../models/helpers/search/generate-query')
const { getInstanceSetting } = require('../../../models/helpers')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')

exports.listMainEntries = async (req, res) => {
  const searchString = req.query.q?.trim()

  if (!searchString) return res.status(400).end()

  const filters = {
    sourceLanguages: intoDbArray(req.query.sl, 'always'),
    targetLanguages: intoDbArray(req.query.tl, 'always'),
    primaryDomains: intoDbArray(req.query.pd, 'always'),
    dictionaries: intoDbArray(req.query.d, 'always'),
    sources: intoDbArray(req.query.s, 'always')
  }

  const hitsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  const hitsQuery = await generateQuery.main(
    searchString,
    filters,
    hitsPerPage,
    page
  )

  const hits = await searchEntryIndex(hitsQuery)

  const numberOfAllHits = hits.body.hits.total.value
  const numberOfAllPages = Math.ceil(numberOfAllHits / hitsPerPage)

  let entriesByCategory = prepareEntries(hits)

  // TODO Luka (note to self): Consider reworking Miha's logic below. It's hacky and possibly error prone.
  // TODO copied code below, maybe refactor to a helper function?
  // check express/controllers/index.js search
  entriesByCategory = Object.entries(entriesByCategory).reduce(
    (acc, category, index) => {
      acc[category[0]] = category[1].map(entry => {
        if (entry.foreignEntries) {
          entry.foreignEntries = entry.foreignEntries.map(fe => {
            fe.terms = fe.terms ? fe.terms.filter(term => !!term) : []
            fe.synonyms = fe.synonyms
              ? fe.synonyms.filter(synonym => !!synonym)
              : []
            fe.nbspCount = fe.terms.length + fe.synonyms.length - 1
            return fe
          })
        }

        return entry
      })
      return acc
    },
    {}
  )

  // duplicated code below for filtering foreignent, optimize later
  const categoriesLabels = Object.keys(entriesByCategory)
  for (
    let categoryIndex = 0;
    categoryIndex < categoriesLabels.length;
    categoryIndex++
  ) {
    entriesByCategory[categoriesLabels[categoryIndex]] = entriesByCategory[
      categoriesLabels[categoryIndex]
    ].map(entry => {
      entry.foreignEntries = entry.foreignEntries?.filter(foreignEntry => {
        if (filters.targetLanguages.length > 0) {
          return filters.targetLanguages.includes(`${foreignEntry.lang.id}`)
        } else {
          return true
        }
      })
      return entry
    })
  }

  // res.send({ page, numberOfAllPages, entries })
  res.append('page', page)
  res.append('number-of-all-pages', numberOfAllPages)
  res.render('utilities/response-pug-wrapper/entryLister', {
    entriesByCategory
  })
}

exports.listEditorEntries = async (req, res) => {
  const { dictionaryId } = req.params

  if (!dictionaryId) return res.status(400).end()

  const qs = req.query

  const searchField = qs.field
  const searchString = qs.q?.trim() ?? ''

  const filters = {
    isValid: qs.isValid === undefined ? undefined : qs.isValid !== 'false',
    isPublished:
      qs.isPublished === undefined ? undefined : qs.isPublished !== 'false',
    hasComments:
      qs.hasComments === undefined ? undefined : qs.hasComments !== 'false',
    isComplete:
      qs.isComplete === undefined ? undefined : qs.isComplete !== 'false',
    isTerminologyReviewed:
      qs.isTerminologyReviewed === undefined
        ? undefined
        : qs.isTerminologyReviewed !== 'false',
    isLanguageReviewed:
      qs.isLanguageReviewed === undefined
        ? undefined
        : qs.isLanguageReviewed !== 'false'
  }

  const hitsQuery = generateQuery.editor(
    dictionaryId,
    searchField,
    searchString,
    filters
  )

  const hits = await searchEntryIndex(hitsQuery)

  const entries = prepareEditorEntries(hits)

  res.send(entries)
}

exports.listFilteredDictionaries = async (req, res) => {
  let searchString = req.query.q?.trim()

  if (!searchString) {
    searchString = ''
  }

  const filters = {
    // sourceLanguages: intoDbArray(req.query.sl, 'always'),
    // targetLanguages: intoDbArray(req.query.tl, 'always'),
    primaryDomains: intoDbArray(req.query.pd, 'always')
    // sources: intoDbArray(req.query.s, 'always')
  }

  const orderType = req.query.orderType
  const orderIndex = req.query.orderIndex === 'true'

  // TODO: User another constant since this one is also user in the search results
  const hitsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  // const defaultportalname = await getInstanceSetting('portal_name')
  const defaultportalcode = await getInstanceSetting('portal_code')

  let dictionaries

  // mapping done here to not expose database info to public
  let orderAttribute
  if (orderType === 'domainName') {
    orderAttribute = 'dp'
  } else {
    orderAttribute = 'd'
  }

  dictionaries = await Dictionary.fetchBasicInfoPerPageFilteredWithOrdering(
    searchString,
    filters.primaryDomains,
    hitsPerPage,
    page,
    orderAttribute,
    orderIndex,
    req.determinedLanguage
  )

  dictionaries = dictionaries.map(e => {
    if (!e.portalcode) {
      e.portalcode = defaultportalcode
      // e.portalname = defaultportalname
    }
    return e
  })

  const numberOfAllHits = parseInt(
    (await Dictionary.fetchFilteredCount(searchString, filters.primaryDomains))
      .count
  )
  const numberOfAllPages = Math.ceil(numberOfAllHits / hitsPerPage)

  // res.send({ page, numberOfAllPages, entries })
  res.append('page', page)
  res.append('number-of-all-pages', numberOfAllPages)
  res.render('utilities/response-pug-wrapper/dictionaryLister', {
    dictionaries
  })
}

exports.showModalFilterResults = async (req, res) => {
  const searchString = req.query.q?.trim()

  if (!searchString) return res.status(400).end()

  const selectedFilter = req.query.selectedFilter

  // The selected
  const filters = {
    sourceLanguages:
      selectedFilter === 'sourceLanguages'
        ? []
        : intoDbArray(req.query.sl, 'always'),
    targetLanguages:
      selectedFilter === 'targetLanguages'
        ? []
        : intoDbArray(req.query.tl, 'always'),
    primaryDomains:
      selectedFilter === 'primaryDomains'
        ? []
        : intoDbArray(req.query.pd, 'always'),
    dictionaries:
      selectedFilter === 'dictionaries'
        ? []
        : intoDbArray(req.query.d, 'always'),
    sources:
      selectedFilter === 'sources' ? [] : intoDbArray(req.query.s, 'always')
  }

  const hitsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  const [, aggregateQuery] = await generateQuery.main(
    searchString,
    filters,
    hitsPerPage,
    page,
    true
  )

  const aggregationRaw = await searchEntryIndex(aggregateQuery)

  const aggregation = await prepareAggregation(
    aggregationRaw,
    req.determinedLanguage
  )
  res.send(prepareSeachFilterData(aggregation, filters))
}
