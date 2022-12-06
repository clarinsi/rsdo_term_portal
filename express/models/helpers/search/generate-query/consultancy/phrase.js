// TODO Consider alternative paging when hits exceed 10000.

module.exports = function (searchString, filters, hitsPerPage, page) {
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
                    match_phrase: {
                      title: searchString
                    }
                  },
                  boost: 3
                }
              },
              {
                constant_score: {
                  filter: {
                    match_phrase: {
                      question: searchString
                    }
                  },
                  boost: 2
                }
              },
              {
                constant_score: {
                  filter: {
                    match_phrase: {
                      answer: searchString
                    }
                  },
                  boost: 1
                }
              }
            ]
          }
        },
        filter: []
      }
    },
    sort: ['_score', 'timeCreated']
  }

  if (filters.status) {
    queryDsl.query.bool.filter.push({
      term: {
        status: filters.status
      }
    })
  }

  if (filters.assignedConsultant) {
    queryDsl.query.bool.filter.push({
      term: {
        'assignedConsultants.id': filters.assignedConsultant
      }
    })
  }

  if (filters.primaryDomain) {
    queryDsl.query.bool.filter.push({
      term: {
        'primaryDomain.id': filters.primaryDomain
      }
    })
  }

  return queryDsl
}
