module.exports = function (
  hitsQuery,
  slovenianFieldQueries,
  foreignFieldQueries
) {
  // A shallow copy will prevent hitsQuery from being modified.
  const queryDsl = { ...hitsQuery }

  queryDsl.from = 0
  queryDsl.size = 0

  queryDsl.aggs = {
    primaryDomains: {
      terms: {
        field: 'primaryDomain.id',
        size: 100
      }
    },
    dictionaries: {
      terms: {
        field: 'dictionary.id',
        size: 200
      }
    },
    sources: {
      terms: {
        field: 'source.code'
      }
    },
    slovenianHits: {
      filter: {
        dis_max: {
          queries: slovenianFieldQueries
        }
      }
    },
    foreign: {
      nested: {
        path: 'foreignEntries'
      },
      aggs: {
        targetLanguages: {
          terms: {
            field: 'foreignEntries.lang.id',
            size: 50
          }
        },
        foreignHits: {
          filter: {
            dis_max: {
              queries: foreignFieldQueries
            }
          },
          aggs: {
            sourceLanguages: {
              terms: {
                field: 'foreignEntries.lang.id',
                size: 50
              }
            }
          }
        }
      }
    }
  }

  return queryDsl
}
