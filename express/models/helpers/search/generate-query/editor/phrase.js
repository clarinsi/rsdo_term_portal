const { fieldMap } = require('../..')
const generateQuery = require('./all')

module.exports = function (dictionaryId, searchField, searchString, filters) {
  const searchFieldFilters = generateSearchFieldFilters(
    searchField,
    searchString
  )

  const queryDsl = generateQuery(dictionaryId, filters, searchFieldFilters)

  return queryDsl
}

function generateSearchFieldFilters(searchField, searchString) {
  const mappedName = fieldMap[searchField]

  if (mappedName) {
    if (mappedName.startsWith('foreignEntries')) {
      return {
        nested: {
          path: 'foreignEntries',
          query: {
            match_phrase: {
              [mappedName]: searchString
            }
          }
        }
      }
    }

    return {
      match_phrase: {
        [mappedName]: searchString
      }
    }
  }

  return {
    dis_max: {
      queries: [
        {
          multi_match: {
            query: searchString,
            type: 'phrase',
            fields: [
              'term',
              'synonyms',
              'label',
              'definition',
              'other',
              'domainLabels',
              'links'
            ]
          }
        },
        {
          nested: {
            path: 'foreignEntries',
            query: {
              multi_match: {
                query: searchString,
                type: 'phrase',
                fields: [
                  'foreignEntries.terms',
                  'foreignEntries.synonyms',
                  'foreignEntries.definition'
                ]
              }
            }
          }
        }
      ]
    }
  }
}
