const debug = require('debug')('termPortal:generate-query')
const genAllHitQuery = require('./main/all')
const genAllAggQuery = require('./main/aggregate-all')
const genPhraseHitQuery = require('./main/phrase')
const genPhraseAggQuery = require('./main/aggregate-phrase')
const genWildcardHitQuery = require('./main/wildcard')
const genWildcardAggQuery = require('./main/aggregate-wildcard')
const genMultiWordHitQuery = require('./main/word-multi')
const genWordAggQuery = require('./main/aggregate-word')
const genSingleWordHitQuery = require('./main/word-single')
const genEditorAllQuery = require('./editor/all')
const genEditorExistsQuery = require('./editor/exists')
const genEditorPhraseQuery = require('./editor/phrase')
const genEditorWildcardQuery = require('./editor/wildcard')
const genEditorWordsQuery = require('./editor/words')
const genConsultancyAllQuery = require('./consultancy/all')
const genConsultancyPhraseQuery = require('./consultancy/phrase')
const genConsultancyWildcardQuery = require('./consultancy/wildcard')
const genConsultancyWordsQuery = require('./consultancy/words')

const notOnlyAsterisks = /[^*"\s]/
const hasWildcards = /[*?]/
const hasWhitespace = /\s/

// Determines query type, constructs and returns appropriate search engine query(es).
exports.main = async (
  searchString,
  filters,
  hitsPerPage,
  page,
  withAggregation
) => {
  let hitsQuery
  let aggregateQuery

  const firstChar = searchString[0]
  const lastChar = searchString[searchString.length - 1]

  // TODO Aditional sanitization/transformation?

  if (!notOnlyAsterisks.test(searchString)) {
    debug('query type: all')
    hitsQuery = genAllHitQuery(filters, hitsPerPage, page)
    if (withAggregation) {
      aggregateQuery = genAllAggQuery(hitsQuery)
    }
  } else if (firstChar === '"' && lastChar === '"') {
    debug('query type: phrase')
    searchString = searchString.slice(1, -1)
    hitsQuery = await genPhraseHitQuery(
      searchString,
      filters,
      hitsPerPage,
      page
    )
    if (withAggregation) {
      aggregateQuery = genPhraseAggQuery(searchString, hitsQuery)
    }
  } else if (hasWildcards.test(searchString)) {
    debug('query type: wildcard')
    let slovenianFieldQueries, foreignFieldQueries
    ;[hitsQuery, slovenianFieldQueries, foreignFieldQueries] =
      await genWildcardHitQuery(searchString, filters, hitsPerPage, page)
    if (withAggregation) {
      aggregateQuery = genWildcardAggQuery(
        hitsQuery,
        slovenianFieldQueries,
        foreignFieldQueries
      )
    }
  } else if (hasWhitespace.test(searchString)) {
    debug('query type: multi word')
    hitsQuery = await genMultiWordHitQuery(
      searchString,
      filters,
      hitsPerPage,
      page
    )
    if (withAggregation) {
      aggregateQuery = genWordAggQuery(searchString, hitsQuery)
    }
  } else {
    debug('query type: single word')
    hitsQuery = await genSingleWordHitQuery(
      searchString,
      filters,
      hitsPerPage,
      page
    )
    if (withAggregation) {
      aggregateQuery = genWordAggQuery(searchString, hitsQuery)
    }
  }

  return withAggregation ? [hitsQuery, aggregateQuery] : hitsQuery
}

// Determines query type, constructs and returns appropriate search engine query for editor.
exports.editor = (dictionaryId, searchField, searchString, filters) => {
  let hitsQuery

  const firstChar = searchString[0]
  const lastChar = searchString[searchString.length - 1]

  // TODO Aditional sanitization/transformation?

  if (!searchString) {
    debug('query type: all')
    hitsQuery = genEditorAllQuery(dictionaryId, filters)
  } else if (!notOnlyAsterisks.test(searchString)) {
    debug('query type: exists')
    hitsQuery = genEditorExistsQuery(dictionaryId, searchField, filters)
  } else if (firstChar === '"' && lastChar === '"') {
    debug('query type: phrase')
    searchString = searchString.slice(1, -1)
    hitsQuery = genEditorPhraseQuery(
      dictionaryId,
      searchField,
      searchString,
      filters
    )
  } else if (hasWildcards.test(searchString)) {
    debug('query type: wildcard')
    hitsQuery = genEditorWildcardQuery(
      dictionaryId,
      searchField,
      searchString,
      filters
    )
  } else {
    debug('query type: words')
    hitsQuery = genEditorWordsQuery(
      dictionaryId,
      searchField,
      searchString,
      filters
    )
  }

  return hitsQuery
}

// Determines query type, constructs and returns appropriate search engine query for consultancy.
exports.consultancy = (searchString, filters, hitsPerPage, page) => {
  let hitsQuery

  const firstChar = searchString[0]
  const lastChar = searchString[searchString.length - 1]

  // TODO Aditional sanitization/transformation?

  if (!notOnlyAsterisks.test(searchString)) {
    debug('query type: all')
    hitsQuery = genConsultancyAllQuery(filters, hitsPerPage, page)
  } else if (firstChar === '"' && lastChar === '"') {
    debug('query type: phrase')
    searchString = searchString.slice(1, -1)
    hitsQuery = genConsultancyPhraseQuery(
      searchString,
      filters,
      hitsPerPage,
      page
    )
  } else if (hasWildcards.test(searchString)) {
    debug('query type: wildcard')
    hitsQuery = genConsultancyWildcardQuery(
      searchString,
      filters,
      hitsPerPage,
      page
    )
  } else {
    debug('query type: words')
    hitsQuery = genConsultancyWordsQuery(
      searchString,
      filters,
      hitsPerPage,
      page
    )
  }

  return hitsQuery
}
