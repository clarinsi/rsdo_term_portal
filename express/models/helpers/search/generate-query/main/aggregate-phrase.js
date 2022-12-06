module.exports = function (searchString, hitsQuery) {
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
            multi_match: {
              query: searchString,
              type: 'phrase',
              fields: [
                'foreignEntries.terms',
                'foreignEntries.synonyms',
                'foreignEntries.definition'
              ]
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
