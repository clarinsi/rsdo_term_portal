const debug = require('debug')('termPortal:models/search-engine')
const { Client } = require('@opensearch-project/opensearch')

const ENTRY_INDEX = 'entry'
const CONSULTANCY_ENTRY_INDEX = 'consultancy_entry'
const client = new Client({ node: 'http://opensearch:9200' })

exports.initEntryIndex = async () => {
  const { statusCode } = await client.indices.exists({ index: ENTRY_INDEX })

  const doesIndexExist = statusCode === 200

  if (doesIndexExist) {
    debug('Entry search index already exists.')
    return
  }

  await client.indices.create({
    index: ENTRY_INDEX,
    body: {
      settings: {
        number_of_replicas: 0
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          id: { type: 'keyword', index: false, doc_values: false },
          isValid: { type: 'boolean', doc_values: false },
          isPublished: { type: 'boolean', doc_values: false },
          isTerminologyReviewed: { type: 'boolean', doc_values: false },
          isLanguageReviewed: { type: 'boolean', doc_values: false },
          status: { type: 'keyword', doc_values: false },
          term: {
            type: 'text',
            doc_values: false,
            fields: {
              keyword: { type: 'keyword', doc_values: false },
              sort: {
                type: 'icu_collation_keyword',
                index: false,
                language: 'sl',
                country: 'SI'
              }
            }
          },
          homonymSort: { type: 'keyword', index: false },
          label: { type: 'text', doc_values: false },
          definition: { type: 'text', doc_values: false },
          synonyms: { type: 'text', doc_values: false },
          other: { type: 'text', doc_values: false },
          timeMostRecentComment: { type: 'date' },
          domainLabels: { type: 'text', doc_values: false },
          links: { type: 'text', doc_values: false },
          foreignEntries: {
            type: 'nested',
            properties: {
              lang: {
                properties: {
                  id: { type: 'keyword' },
                  code: { type: 'keyword', index: false, doc_values: false },
                  nameSl: { type: 'keyword', index: false, doc_values: false },
                  nameEn: { type: 'keyword', index: false, doc_values: false }
                }
              },
              terms: {
                type: 'text',
                doc_values: false,
                fields: {
                  keyword: { type: 'keyword', doc_values: false }
                }
              },
              definition: { type: 'text', doc_values: false },
              synonyms: { type: 'text', doc_values: false }
            }
          },
          primaryDomain: {
            properties: {
              id: { type: 'keyword' },
              nameSl: { type: 'keyword', index: false, doc_values: false },
              nameEn: { type: 'keyword', index: false, doc_values: false }
            }
          },
          dictionary: {
            properties: {
              id: { type: 'keyword' },
              nameSl: { type: 'keyword', index: false, doc_values: false },
              nameSlShort: { type: 'keyword', index: false, doc_values: false },
              nameEn: { type: 'keyword', index: false, doc_values: false },
              status: { type: 'keyword', doc_values: false }
            }
          },
          source: {
            properties: {
              code: { type: 'keyword' },
              name: { type: 'keyword', index: false, doc_values: false }
            }
          }
        }
      }
    }
  })
  debug('Entry search index created.')
}

exports.initConsultancyEntryIndex = async () => {
  const { statusCode } = await client.indices.exists({
    index: CONSULTANCY_ENTRY_INDEX
  })

  const doesIndexExist = statusCode === 200

  if (doesIndexExist) {
    debug('Consultancy entry search index already exists.')
    return
  }

  await client.indices.create({
    index: CONSULTANCY_ENTRY_INDEX,
    body: {
      settings: {
        number_of_replicas: 0
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          id: { type: 'keyword', index: false, doc_values: false },
          timeCreated: { type: 'date', index: false },
          status: { type: 'keyword', doc_values: false },
          description: { type: 'text', index: false, doc_values: false },
          title: { type: 'text', doc_values: false },
          question: { type: 'text', doc_values: false },
          answer: { type: 'text', doc_values: false },
          answerAuthors: { type: 'keyword', index: false, doc_values: false },
          primaryDomain: {
            properties: {
              id: { type: 'keyword', doc_values: false },
              nameSl: { type: 'keyword', index: false, doc_values: false },
              nameEn: { type: 'keyword', index: false, doc_values: false }
            }
          },
          assignedConsultants: {
            properties: {
              id: { type: 'keyword', doc_values: false },
              firstName: { type: 'keyword', index: false, doc_values: false },
              lastName: { type: 'keyword', index: false, doc_values: false },
              isModerator: { type: 'boolean', index: false, doc_values: false }
            }
          }
        }
      }
    }
  })
  debug('Consultancy entry search index created.')
}

exports.waitForConnection = () => {
  return new Promise(resolve => {
    async function testConnection() {
      try {
        // eslint-disable-next-line no-console
        console.log('Verifying connection to search engine server')
        await client.ping()
        // eslint-disable-next-line no-console
        console.log('Connection to search engine server verified')
        resolve()
      } catch {
        // eslint-disable-next-line no-console
        console.error('Could not connect to search engine server')
        setTimeout(testConnection, 1000)
      }
    }
    testConnection()
  })
}

exports.searchEngineClient = client

exports.ENTRY_INDEX = ENTRY_INDEX

exports.CONSULTANCY_ENTRY_INDEX = CONSULTANCY_ENTRY_INDEX

// A wrapper, to simplify querying the entry index.
exports.searchEntryIndex = async query => {
  const hits = await client.search({
    index: ENTRY_INDEX,
    filter_path: 'hits,aggregations',
    body: query
  })

  return hits
}

// A wrapper, to simplify querying the consultancy entry index.
exports.searchConsultancyEntryIndex = async query => {
  const hits = await client.search({
    index: CONSULTANCY_ENTRY_INDEX,
    filter_path: 'hits',
    body: query
  })

  return hits
}

exports.deleteEntryFromIndex = async (entryId, shouldWait) => {
  await client.delete({
    index: ENTRY_INDEX,
    id: entryId,
    refresh: shouldWait ? 'wait_for' : false
  })
}

exports.deleteConsultancyEntryFromIndex = async (entryId, shouldWait) => {
  await client.delete({
    index: CONSULTANCY_ENTRY_INDEX,
    id: entryId,
    refresh: shouldWait ? 'wait_for' : false
  })
}

exports.deleteDictionaryEntriesFromIndex = async dictionaryId => {
  await client.deleteByQuery({
    index: ENTRY_INDEX,
    body: {
      query: {
        term: {
          'dictionary.id': {
            value: dictionaryId
          }
        }
      }
    }
  })
}

exports.deleteConsultancyEntriesFromIndex = async () => {
  await client.deleteByQuery({
    index: CONSULTANCY_ENTRY_INDEX,
    body: {
      query: {
        match_all: {}
      }
    }
  })
}
