const { separateSlovenianLanguage, queryForField } = require('../..')

const whitespace = /\s+/

// TODO Consider alternative paging when hits exceed 10000.

module.exports = async function (searchString, filters, hitsPerPage, page) {
  const searchTokens = searchString.split(whitespace)

  const termQuery = queryForField('term', searchTokens)
  const foreignTermQuery = queryForField('foreignEntries.terms', searchTokens)
  const synonymsQuery = queryForField('synonyms', searchTokens)
  const foreignSynonymsQuery = queryForField(
    'foreignEntries.synonyms',
    searchTokens
  )
  const labelQuery = queryForField('label', searchTokens)
  const definitionQuery = queryForField('definition', searchTokens)
  const otherQuery = queryForField('other', searchTokens)
  const domainLabelsQuery = queryForField('domainLabels', searchTokens)
  const linksQuery = queryForField('links', searchTokens)
  const foreignDefinitionQuery = queryForField(
    'foreignEntries.definition',
    searchTokens
  )

  const slovenianFieldQueries = [
    termQuery,
    synonymsQuery,
    labelQuery,
    definitionQuery,
    otherQuery,
    domainLabelsQuery,
    linksQuery
  ]

  const foreignFieldQueries = [
    foreignTermQuery,
    foreignSynonymsQuery,
    foreignDefinitionQuery
  ]

  const queryDsl = {
    from: hitsPerPage * (page - 1),
    size: hitsPerPage,
    query: {
      bool: {
        must: {
          dis_max: {
            queries: [
              {
                constant_score: {
                  filter: termQuery,
                  boost: 5
                }
              },
              {
                constant_score: {
                  filter: {
                    nested: {
                      path: 'foreignEntries',
                      query: foreignTermQuery
                    }
                  },
                  boost: 3
                }
              },
              {
                constant_score: {
                  filter: {
                    dis_max: {
                      queries: [
                        synonymsQuery,
                        {
                          nested: {
                            path: 'foreignEntries',
                            query: foreignSynonymsQuery
                          }
                        }
                      ]
                    }
                  },
                  boost: 2
                }
              },
              {
                constant_score: {
                  filter: {
                    dis_max: {
                      queries: [
                        labelQuery,
                        definitionQuery,
                        otherQuery,
                        domainLabelsQuery,
                        linksQuery,
                        {
                          nested: {
                            path: 'foreignEntries',
                            query: foreignDefinitionQuery
                          }
                        }
                      ]
                    }
                  },
                  boost: 1
                }
              }
            ]
          }
        },
        filter: [
          {
            term: {
              isPublished: true
            }
          },
          {
            term: {
              'dictionary.status': 'published'
            }
          }
        ]
      }
    },
    sort: ['_score', 'term.sort', 'homonymSort']
  }

  if (filters.primaryDomains.length) {
    queryDsl.query.bool.filter.push({
      terms: {
        'primaryDomain.id': filters.primaryDomains
      }
    })
  }

  if (filters.dictionaries.length) {
    queryDsl.query.bool.filter.push({
      terms: {
        'dictionary.id': filters.dictionaries
      }
    })
  }

  if (filters.sources.length) {
    queryDsl.query.bool.filter.push({
      terms: {
        'source.code': filters.sources
      }
    })
  }

  if (filters.targetLanguages.length) {
    queryDsl.query.bool.filter.push({
      nested: {
        path: 'foreignEntries',
        query: {
          terms: {
            'foreignEntries.lang.id': filters.targetLanguages
          }
        }
      }
    })
  }

  if (filters.sourceLanguages.length) {
    const [foreignLanguages, isSlovenianSource] =
      await separateSlovenianLanguage(filters.sourceLanguages)

    const sourceLanguageFilter = {
      dis_max: {
        queries: []
      }
    }

    if (isSlovenianSource) {
      sourceLanguageFilter.dis_max.queries.push(...slovenianFieldQueries)
    }

    if (foreignLanguages.length) {
      sourceLanguageFilter.dis_max.queries.push({
        nested: {
          path: 'foreignEntries',
          query: {
            bool: {
              must: [
                {
                  terms: {
                    'foreignEntries.lang.id': foreignLanguages
                  }
                },
                {
                  dis_max: {
                    queries: foreignFieldQueries
                  }
                }
              ]
            }
          }
        }
      })
    }

    queryDsl.query.bool.filter.push(sourceLanguageFilter)
  }

  return [queryDsl, slovenianFieldQueries, foreignFieldQueries]
}
