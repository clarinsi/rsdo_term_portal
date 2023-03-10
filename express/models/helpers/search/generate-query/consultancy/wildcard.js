const { queryForField } = require('../..')

const whitespace = /\s+/

// TODO Consider alternative paging when hits exceed 10000.

module.exports = function (searchString, filters, hitsPerPage, page) {
  const searchTokens = searchString.split(whitespace)

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
                  filter: queryForField('title', searchTokens),
                  boost: 3
                }
              },
              {
                constant_score: {
                  filter: queryForField('question', searchTokens),
                  boost: 2
                }
              },
              {
                constant_score: {
                  filter: queryForField('answer', searchTokens),
                  boost: 1
                }
              }
            ]
          }
        },
        filter: []
      }
    },
    sort: ['_score', { timeCreated: 'desc' }]
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
