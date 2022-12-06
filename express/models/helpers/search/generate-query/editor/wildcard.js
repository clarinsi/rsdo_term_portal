const { fieldMap, queryForField } = require('../..')
const generateQuery = require('./all')

const whitespace = /\s+/

module.exports = function (dictionaryId, searchField, searchString, filters) {
  const searchFieldFilters = generateSearchFieldFilters(
    searchField,
    searchString
  )

  const queryDsl = generateQuery(dictionaryId, filters, searchFieldFilters)

  return queryDsl
}

function generateSearchFieldFilters(searchField, searchString) {
  const searchTokens = searchString.split(whitespace)

  const mappedName = fieldMap[searchField]

  if (mappedName) {
    if (mappedName.startsWith('foreignEntries')) {
      return {
        nested: {
          path: 'foreignEntries',
          query: queryForField(mappedName, searchTokens)
        }
      }
    }

    return queryForField(mappedName, searchTokens)
  }

  return {
    dis_max: {
      queries: [
        queryForField('term', searchTokens),
        queryForField('synonyms', searchTokens),
        queryForField('label', searchTokens),
        queryForField('definition', searchTokens),
        queryForField('other', searchTokens),
        queryForField('domainLabels', searchTokens),
        queryForField('links', searchTokens),
        {
          nested: {
            path: 'foreignEntries',
            query: {
              dis_max: {
                queries: [
                  queryForField('foreignEntries.terms', searchTokens),
                  queryForField('foreignEntries.synonyms', searchTokens),
                  queryForField('foreignEntries.definition', searchTokens)
                ]
              }
            }
          }
        }
      ]
    }
  }
}
