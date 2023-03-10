// TODO Consider alternative paging when hits exceed 10000.

module.exports = function (filters, hitsPerPage, page) {
  const queryDsl = {
    from: hitsPerPage * (page - 1),
    size: hitsPerPage,
    query: {
      bool: {
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
