const { separateSlovenianLanguage } = require('../..')

// TODO Consider alternative paging when hits exceed 10000.

module.exports = async function (searchString, filters, hitsPerPage, page) {
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
                  filter: {
                    term: {
                      'term.keyword': {
                        value: searchString
                      }
                    }
                  },
                  boost: 6
                }
              },
              {
                constant_score: {
                  filter: {
                    match: {
                      term: {
                        query: searchString,
                        operator: 'and'
                      }
                    }
                  },
                  boost: 5
                }
              },
              {
                constant_score: {
                  filter: {
                    nested: {
                      path: 'foreignEntries',
                      query: {
                        term: {
                          'foreignEntries.terms.keyword': {
                            value: searchString
                          }
                        }
                      }
                    }
                  },
                  boost: 4
                }
              },
              {
                constant_score: {
                  filter: {
                    nested: {
                      path: 'foreignEntries',
                      query: {
                        match: {
                          'foreignEntries.terms': {
                            query: searchString,
                            operator: 'and'
                          }
                        }
                      }
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
                        {
                          match: {
                            synonyms: {
                              query: searchString,
                              operator: 'and'
                            }
                          }
                        },
                        {
                          nested: {
                            path: 'foreignEntries',
                            query: {
                              match: {
                                'foreignEntries.synonyms': {
                                  query: searchString,
                                  operator: 'and'
                                }
                              }
                            }
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
                        {
                          multi_match: {
                            query: searchString,
                            operator: 'and',
                            fields: [
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
                              match: {
                                'foreignEntries.definition': {
                                  query: searchString,
                                  operator: 'and'
                                }
                              }
                            }
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
      sourceLanguageFilter.dis_max.queries.push({
        multi_match: {
          query: searchString,
          operator: 'and',
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
      })
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
                  multi_match: {
                    query: searchString,
                    operator: 'and',
                    fields: [
                      'foreignEntries.terms',
                      'foreignEntries.synonyms',
                      'foreignEntries.definition'
                    ]
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

  return queryDsl
}
