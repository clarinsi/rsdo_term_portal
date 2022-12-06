const { fieldMap } = require('../..')
const generateQuery = require('./all')

module.exports = function (dictionaryId, searchField, filters) {
  const searchFieldFilters = generateSearchFieldFilters(searchField)

  const queryDsl = generateQuery(dictionaryId, filters, searchFieldFilters)

  return queryDsl
}

function generateSearchFieldFilters(searchField) {
  const mappedName = fieldMap[searchField]

  if (mappedName) {
    if (mappedName.startsWith('foreignEntries')) {
      return {
        nested: {
          path: 'foreignEntries',
          query: {
            exists: {
              field: mappedName
            }
          }
        }
      }
    }

    return {
      exists: {
        field: mappedName
      }
    }
  }

  return {
    dis_max: {
      queries: [
        {
          exists: {
            field: 'term'
          }
        },
        {
          exists: {
            field: 'synonyms'
          }
        },
        {
          exists: {
            field: 'label'
          }
        },
        {
          exists: {
            field: 'definition'
          }
        },
        {
          exists: {
            field: 'other'
          }
        },
        {
          exists: {
            field: 'domainLabels'
          }
        },
        {
          exists: {
            field: 'links'
          }
        },
        {
          nested: {
            path: 'foreignEntries',
            query: {
              dis_max: {
                queries: [
                  {
                    exists: {
                      field: 'foreignEntries.terms'
                    }
                  },
                  {
                    exists: {
                      field: 'foreignEntries.synonyms'
                    }
                  },
                  {
                    exists: {
                      field: 'foreignEntries.definition'
                    }
                  }
                ]
              }
            }
          }
        }
      ]
    }
  }
}
