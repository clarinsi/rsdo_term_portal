// TODO Consider alternative paging when hits exceed 10000.

module.exports = function (filters, hitsPerPage, page) {
  const queryDsl = {
    from: hitsPerPage * (page - 1),
    size: hitsPerPage,
    query: {
      bool: {
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

  return queryDsl
}
