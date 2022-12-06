const Entry = require('../models/entry')
const { getInstanceSetting } = require('../models/helpers')
const Dictionary = require('../models/dictionary')
const Comment = require('../models/comment')
const { searchEntryIndex } = require('../models/search-engine')
const { intoDbArray } = require('../models/helpers')
const {
  prepareEntries,
  prepareAggregation,
  prepareSeachFilterData
} = require('../models/helpers/search')
const generateQuery = require('../models/helpers/search/generate-query')
const { DEFAULT_HITS_PER_PAGE } = require('../config/settings')
const SFDSuggestionImporter = require('./helpers/search-filter-data-suggestion-importer')
const User = require('../models/user')

// TODO Luka (note to self): Measure performance, consider caching.
exports.index = async (req, res) => {
  const {
    allPrimaryDomains,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals
  } = await SFDSuggestionImporter.initialize()

  const englishLanguageEnabled = false // dummy variable for future edit

  const latestDicts = await Dictionary.fetchLatest3DictsByPublishDate(
    englishLanguageEnabled
  )

  const portalName = await getInstanceSetting('portal_name')
  const portalDescription = await getInstanceSetting('portal_description')

  const isRoot = true

  res.render('pages/index', {
    allPrimaryDomains,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals,
    latestDicts,
    portalName,
    portalDescription,
    isRoot
  })
}

exports.search = async (req, res) => {
  const searchString = req.query.q?.trim()

  if (!searchString) return res.redirect('/')

  const {
    allPrimaryDomains,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals
  } = await SFDSuggestionImporter.initialize()

  const filters = {
    sourceLanguages: intoDbArray(req.query.sl, 'always'),
    targetLanguages: intoDbArray(req.query.tl, 'always'),
    primaryDomains: intoDbArray(req.query.pd, 'always'),
    dictionaries: intoDbArray(req.query.d, 'always'),
    sources: intoDbArray(req.query.s, 'always')
  }

  const hitsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  const [hitsQuery, aggregateQuery] = await generateQuery.main(
    searchString,
    filters,
    hitsPerPage,
    page,
    true
  )

  const [hits, aggregationRaw] = await Promise.all([
    searchEntryIndex(hitsQuery),
    searchEntryIndex(aggregateQuery)
  ])

  const numberOfAllHits = hits.body.hits.total.value
  const numberOfAllPages = Math.ceil(numberOfAllHits / hitsPerPage)

  // TODO If there's no hits, this is probably the place where suggestions/related queries and processing would happen.

  let entriesByCategory = prepareEntries(hits)

  // Similar to search query without any extra filters, this is required for modal to diplay ALL res.
  // const allAggregation = await indexAllResultsNoFiltering(req, res)

  const aggregation = await prepareAggregation(aggregationRaw)
  const searchFilterData = prepareSeachFilterData(aggregation, filters)

  // TODO Luka (note to self): Consider reworking Miha's logic below. It's hacky and possibly error prone.
  // TODO copied code below, maybe refactor to a helper function?
  // check express/controllers/api/v1/search.js listMainEntries
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

  const count = Object.values(entriesByCategory).reduce((acc, cat, idx) => {
    return acc + cat.length
  }, 0)

  // filter to 5 resuts per search filter
  Object.entries(searchFilterData).forEach(([key, value]) => {
    searchFilterData[key] = value.filter((p, i) => {
      return i < 5
    })
  })

  // todo implement ALL disabled in pug view if required
  const disabledSideMenuFilters = {
    sourceLanguages: searchString === '*',
    targetLanguages: false,
    primaryDomains: false,
    dictionaries: false,
    sources: false
  }

  if (count < 1) {
    return res.render('pages/search/no-results', {
      allPrimaryDomains,
      sourceLanguages,
      targetLanguages,
      allDictionaryNames,
      portals,
      searchString,
      entriesByCategory,
      searchFilterData,
      disabledSideMenuFilters,
      // allAggregation,
      numberOfAllHits,
      numberOfAllPages,
      page
    })
  }

  // TODO Add a page title?
  res.render('pages/search/results', {
    allPrimaryDomains,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals,
    searchString,
    entriesByCategory,
    searchFilterData,
    disabledSideMenuFilters,
    // allAggregation,
    numberOfAllHits,
    numberOfAllPages,
    page
  })
}

exports.entryDetails = async (req, res) => {
  const termId = req.params.entryId

  /* const [entry, domainLabels] = await Promise.all([
    Entry.fetchFullWithOrderedForeignLanguages(termId),
    Dictionary.fetchDomainLabelsFromEntryId(termId)
  ]) */

  const entry = await Entry.fetchFullWithOrderedForeignLanguages(termId)

  /* const entryData = {
    entry
    // allDomainLabelsJoined: domainLabels.map(e => e.name).join(', ')
  } */

  // unnecessary legacy assigment, refactor when time is available
  const entryData = entry

  const {
    allPrimaryDomains,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals
  } = await SFDSuggestionImporter.initialize()

  const [dictStruct, dictionaryData, selectedDomainLabelsForEntry] =
    await Promise.all([
      Dictionary.fetchDictionaryWithEditStructure(entry.dictionary_id),
      Dictionary.fetchDictionaryBasicInfo(entry.dictionary_id),
      Entry.fetchDomainLabels(termId)
    ])

  ///

  const filters = { ctxType: 'entry_dict_ext', ctxId: termId }
  // TODO: integrate numberOfAllPages, commentCount with pug

  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const page = 1 // +req.query.p > 0 ? +req.query.p : 1
  const {
    pages_total: numberOfAllPages,
    comments,
    comment_count: commentCount
  } = await Comment.list(filters, req.user, resultsPerPage, page)

  ///

  // check if it is a local dictionary
  if (!dictionaryData.portalname && !dictionaryData.portalcode) {
    dictionaryData[0].portalname = await getInstanceSetting('portal_name')
    dictionaryData[0].portalcode = await getInstanceSetting('portal_code')
  }

  const reducedData = dictionaryData.reduce(
    (acc, x) => {
      if (acc.isbegin) {
        x.languages = [x.languagesl]
        x.subDomains = [x.domainsecondarysl]
        return x
      }
      if (!acc.languages.includes(x.languagesl)) {
        acc.languages.push(x.languagesl)
      }
      if (!acc.subDomains.includes(x.domainsecondarysl)) {
        acc.subDomains.push(x.domainsecondarysl)
      }

      return acc
    },
    { isbegin: true }
  )

  const { structure } = dictStruct

  // Improved version of entropy, but some data duplications still exist
  // struct data contains important data and re-maps for unification (maybe refactor later)
  const structData = {
    termId: termId,
    prevWindowTitle: 'Iskanje',
    prevHref: '/iskanje',
    portalCode: dictionaryData[0].portalcode,
    portalName: dictionaryData[0].portalname,
    dictName: structure.nameSl,
    dictHref: `/slovarji/${structure.id}/o-slovarju?sentFromEntryId=${termId}`,
    fullAuthorName: reducedData.author ? reducedData.author.join(', ') : '',
    areas: dictionaryData[0].domain_primary,
    subareas: reducedData.subDomains ? reducedData.subDomains.join(', ') : '',
    languages: reducedData.languages ? reducedData.languages.join(', ') : ''
  }

  if (reducedData.author) {
    if (reducedData.author.length > 2) {
      structData.authorLabel = 'Avtorji'
    } else if (reducedData.author.length === 2) {
      structData.authorLabel = 'Avtorja'
    } else if (reducedData.author.length === 1) {
      structData.authorLabel = 'Avtor'
    }
  }

  const finalData = {
    ...reducedData,
    ...structData
  }

  let selectedDomainLabelsForEntryString = ''
  if (selectedDomainLabelsForEntry.length) {
    selectedDomainLabelsForEntryString = mergeDomains(
      selectedDomainLabelsForEntry,
      (acc, n) => {
        if (acc === '') return n.name
        else return acc + ', ' + n.name
      }
    )
  }

  /* entryData.entry.foreign_entries.forEach((val, idx) => {
    entry.foreignEntries[idx] = await 
  }) */

  const langs = await Dictionary.fetchLanguages(entryData.dictionary_id)
  entryData.foreign_entries.forEach((val, idx) => {
    try {
      entry.foreign_entries[idx].name_sl = langs[idx].nameSl
      entry.foreign_entries[idx].name_en = langs[idx].nameEn
    } catch (e) {}
  })

  res.render('pages/search/result-detail', {
    allPrimaryDomains,
    entryData,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals,
    termId,
    structure,
    finalData,
    selectedDomainLabelsForEntryString,
    numberOfAllPages,
    comments,
    commentCount
  })
}

exports.myProfile = async (req, res) => {
  res.render('pages/profile/my-profile', { title: 'Moj račun' })
}

exports.changePassword = async (req, res) => {
  res.render('pages/profile/change-password', { title: 'Spremeni geslo' })
}

exports.userSettings = async (req, res) => {
  const hitsPerPageArr = await User.fetchAllowedHitsPerPage()
  res.render('pages/profile/change-profile-settings', {
    title: 'Nastavitve računa',
    hitsPerPageArr,
    hitsForUser: req.user?.hitsPerPage
  })
}

function mergeDomains(
  domainList,
  aggregationFn = (acc, n) => {
    if (acc === '') return n
    else return acc + ', ' + n
  }
) {
  return Array.from(domainList).reduce(aggregationFn, '')
}

function filterResults(entries) {
  let mode = 0
  const termLst = []
  const ftermLst = []
  const otherLst = []
  entries.forEach(entry => {
    switch (entry._title) {
      case 'term':
        mode = 0
        break
      case 'foreignTerm':
        mode = 1
        break
      case 'other':
        mode = 2
    }

    switch (mode) {
      case 0:
        termLst.push(entry)
        break
      case 1:
        ftermLst.push(entry)
        break
      case 2:
        otherLst.push(entry)
        break
    }
  })

  return [termLst, ftermLst, otherLst]
}
