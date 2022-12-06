const Portal = require('../../portal')
const { getSlovenianLanguageId } = require('..')

const slCollator = new Intl.Collator('sl', { sensitivity: 'base' })

// Return a new array, with slovenian language removed and isSlovenianSource set to true if present.
exports.separateSlovenianLanguage = async languages => {
  const slovenianLanguageId = await getSlovenianLanguageId()
  let isSlovenianSource = false

  const foreignLanguages = languages.filter(language => {
    if (language !== slovenianLanguageId) return true

    isSlovenianSource = true
    return false
  })

  return [foreignLanguages, isSlovenianSource]
}

// Simplify and enhance search engine's hits output into useful entries object.
exports.prepareEntries = hits => {
  const entriesByCategory = hits.body.hits.hits.reduce(
    (agg, hit) => {
      const entry = hit._source

      switch (hit._score) {
        case 6:
        case 5:
          agg.byTerm.push(entry)
          break
        case 4:
        case 3:
          agg.byForeignTerm.push(entry)
          break
        case 2:
        case 1:
          agg.byOther.push(entry)
          break
        default:
          agg.uncategorized.push(entry)
      }

      return agg
    },
    { byTerm: [], byForeignTerm: [], byOther: [], uncategorized: [] }
  )

  return entriesByCategory
}

// Transform search engine's aggregation raw output into correct and friendly format.
exports.prepareAggregation = async aggregationRaw => {
  const { aggregations, hits } = aggregationRaw.body

  const hitsCount = hits.total.value
  if (!hitsCount) return

  const primaryDomainIds = aggregations.primaryDomains.buckets.map(
    bucket => bucket.key
  )

  const dictionaryIds = aggregations.dictionaries.buckets.map(
    bucket => bucket.key
  )

  const languageIdSet = new Set()
  const refinedSourceLanguageBuckets = []

  aggregations.foreign.targetLanguages.buckets.forEach(bucket =>
    languageIdSet.add(bucket.key)
  )

  const slovenianHitCount = aggregations.slovenianHits?.doc_count
  // "Match all" aggregation returns no slovenian hits and source languages.
  if (slovenianHitCount) {
    const slovenianLanguageId = await getSlovenianLanguageId()
    const slovenianBucket = {
      key: slovenianLanguageId,
      doc_count: slovenianHitCount
    }
    let wasSlovenianBucketInserted = false

    aggregations.foreign.foreignHits.sourceLanguages.buckets.forEach(bucket => {
      if (!wasSlovenianBucketInserted && bucket.doc_count < slovenianHitCount) {
        languageIdSet.add(slovenianLanguageId)
        refinedSourceLanguageBuckets.push(slovenianBucket)
        wasSlovenianBucketInserted = true
      }
      languageIdSet.add(bucket.key)
      refinedSourceLanguageBuckets.push(bucket)
    })

    if (!wasSlovenianBucketInserted) {
      languageIdSet.add(slovenianLanguageId)
      refinedSourceLanguageBuckets.push(slovenianBucket)
    }
  } else if (slovenianHitCount === 0) {
    aggregations.foreign.foreignHits.sourceLanguages.buckets.forEach(bucket => {
      languageIdSet.add(bucket.key)
      refinedSourceLanguageBuckets.push(bucket)
    })
  }

  const languageIds = [...languageIdSet]

  const names = await Portal.getSearchAggregateNames(
    primaryDomainIds,
    dictionaryIds,
    languageIds
  )

  const aggregation = {
    sourceLanguages: refinedSourceLanguageBuckets.map(
      ({ key: id, doc_count: hits }) => {
        return { id, name: names.languages[id], hits }
      }
    ),
    targetLanguages: aggregations.foreign.targetLanguages.buckets.map(
      ({ key: id, doc_count: hits }) => {
        return { id, name: names.languages[id], hits }
      }
    ),
    primaryDomains: aggregations.primaryDomains.buckets.map(
      ({ key: id, doc_count: hits }) => {
        return { id, name: names.primaryDomains[id], hits }
      }
    ),
    dictionaries: aggregations.dictionaries.buckets.map(
      ({ key: id, doc_count: hits }) => {
        return { id, name: names.dictionaries[id], hits }
      }
    ),
    sources: aggregations.sources.buckets.map(
      ({ key: id, doc_count: hits }) => {
        return { id, name: id, hits }
      }
    )
  }

  sortAggregation(aggregation)

  return aggregation
}

// Enhance aggregation for display in search filters.
exports.prepareSeachFilterData = (aggregation, filters) => {
  const enhancedAggregation = {}

  if (aggregation) {
    for (const category of Object.keys(aggregation)) {
      const enhancedCategoryMembers = aggregation[category].map(member => {
        if (filters[category].includes(member.id)) member.checked = true
        return member
      })

      enhancedAggregation[category] = enhancedCategoryMembers
    }
  }

  return enhancedAggregation
}

// Maps editor search api field names into search engine ones.
exports.fieldMap = {
  term: 'term',
  synonyms: 'synonyms',
  label: 'label',
  definition: 'definition',
  other: 'other',
  domainLabels: 'domainLabels',
  links: 'links',
  foreignTerms: 'foreignEntries.terms',
  foreignSynonyms: 'foreignEntries.synonyms',
  foreignDefinition: 'foreignEntries.definition'
}

// Generate search engine DSL wildcard query fragment for a single field.
exports.queryForField = (field, searchTokens) => {
  return {
    bool: {
      filter: searchTokens.map(token => {
        return {
          wildcard: {
            [field]: {
              value: token
            }
          }
        }
      })
    }
  }
}

// Simplify and enhance search engine's editor hits output into useful entries list.
exports.prepareEditorEntries = hits => {
  const entries = hits.body.hits.hits.map(hit => {
    const entry = hit._source

    entry.foreignTerm = hit.fields['foreignEntries.terms']?.[0]
    entry.commentActivityIndicator = hit.fields.commentActivityIndicator[0]

    return entry
  })

  return entries
}

function sortAggregation(aggregation) {
  for (const categoryBuckets of Object.values(aggregation)) {
    categoryBuckets.sort(bucketCompareFn)
  }
}

function bucketCompareFn(bucketA, bucketB) {
  if (bucketA.hits !== bucketB.hits) return 0
  return slCollator.compare(bucketA.name, bucketB.name)
}

// Simplify search engine's consultancy hits output into useful entries list.
exports.prepareConsultancyEntries = hits => {
  const entries = hits.body.hits.hits.map(hit => hit._source)

  return entries
}
