const { EDITOR_MAX_HITS } = require('../../../../../config/settings')

module.exports = function (dictionaryId, filters, searchFieldFilters) {
  const queryDsl = {
    _source: ['id', 'isValid', 'isPublished', 'term'],
    fields: ['foreignEntries.terms'],
    script_fields: {
      commentActivityIndicator: {
        script: {
          source: `
            if (!doc.containsKey('timeMostRecentComment') || doc['timeMostRecentComment'].empty) return "";
            
            ZonedDateTime mostRecentCommentTime = doc['timeMostRecentComment'].value;
            
            long nowMilli = params['now'];
            Instant nowInstant = Instant.ofEpochMilli(nowMilli);
            ZonedDateTime now = ZonedDateTime.ofInstant(nowInstant, ZoneId.of('Z'));
  
            long ageInDays = ChronoUnit.DAYS.between(mostRecentCommentTime, now);
            
            if (ageInDays < 7) {
              return "T"
            } else if (ageInDays < 30) {
              return "M"
            } else if (ageInDays < 365) {
              return "L"
            } else {
              return ""
            }
          `,
          params: {
            now: Date.now()
          }
        }
      }
    },
    size: EDITOR_MAX_HITS,
    query: {
      bool: {
        filter: [
          {
            term: {
              'dictionary.id': dictionaryId
            }
          }
        ]
      }
    },
    sort: ['term.sort', 'homonymSort']
  }

  if (searchFieldFilters) queryDsl.query.bool.filter.push(searchFieldFilters)

  if (filters) {
    if (filters.isValid !== undefined) {
      queryDsl.query.bool.filter.push({
        term: {
          isValid: filters.isValid
        }
      })
    }

    if (filters.isPublished !== undefined) {
      queryDsl.query.bool.filter.push({
        term: {
          isPublished: filters.isPublished
        }
      })
    }

    if (filters.hasComments !== undefined) {
      if (filters.hasComments === true) {
        queryDsl.query.bool.filter.push({
          exists: {
            field: 'timeMostRecentComment'
          }
        })
      } else {
        queryDsl.query.bool.filter.push({
          bool: {
            must_not: {
              exists: {
                field: 'timeMostRecentComment'
              }
            }
          }
        })
      }
    }

    if (filters.isComplete !== undefined) {
      if (filters.isComplete === true) {
        queryDsl.query.bool.filter.push({
          term: {
            status: 'complete'
          }
        })
      } else {
        queryDsl.query.bool.filter.push({
          bool: {
            must_not: {
              term: {
                status: 'complete'
              }
            }
          }
        })
      }
    }

    if (filters.isTerminologyReviewed !== undefined) {
      queryDsl.query.bool.filter.push({
        term: {
          isTerminologyReviewed: filters.isTerminologyReviewed
        }
      })
    }

    if (filters.isLanguageReviewed !== undefined) {
      queryDsl.query.bool.filter.push({
        term: {
          isLanguageReviewed: filters.isLanguageReviewed
        }
      })
    }
  }

  return queryDsl
}
