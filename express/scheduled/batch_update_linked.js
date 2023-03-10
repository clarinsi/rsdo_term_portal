/* eslint-disable no-console */
/**
 * Linked dictionary updater. It is meant to run periodically (cron).
 * Linked server shall implement an api that that shall generally exhibit 2 endpoints:
 * - /APIPATH/dictionaries : shall return list of linked dictionaries, refer to API spec for detail
 * - /APIPATH/dictionary/$SOURCE_ID/entries?lastSynced=$SINCE
 * There may be some variations to the api since tha prota provides setting to linked server and dictionary URL.
 * This process will take given urls to obtain data by replacing relevant parameters:
 * - linked_portal.url is used to obtain updatable entries for each dictionary. Url field normally contains placeholders for dictionaryId an lastSyncTime
 * - linked dictionaries' table is processed one by one and updatable entries are requested for each linked dictionary.
 *
 * Updates:
 * nov 2022: added parameters to allow single node/dictionary sync on request
 */

const { exec } = require('child_process')
const fs = require('fs')
const async = require('async')
const needle = require('needle')
const xmlFlow = require('xml-flow')
const debug = require('debug')('termPortal:batch_update_linked')
const debugDetail = require('debug')('termPortal:batch_update_linked_detail')
const dbc = require('../models/db').getExtraClient()
const Dictionary = require('../models/dictionary')
const ConsultancyEntry = require('../models/consultancy-entry')
const batch = require('../models/batch')
const path = require('path')
const { deleteDictionaryEntriesFromIndex } = require('../models/search-engine')
const jobName = 'update_linked_dictionaries'
const threadId = '' + process.pid
const args = process.argv.slice(2)
process.title = jobName
const report = new batch.Report(jobName, threadId)
let linkedPortals = []
let linkedDictionaries = []
let linkedDictionaryEntriesToUpdate = []
let languageList = []
let limitType = ''
let limitCode = ''

let dictionarySyncStartTimestamp = null // marks begining of data pump, UTC, SQL timestamp form 'YYYY-MM-DD hh:mm:ss'

function printSynopsisAndExit() {
  console.error('node batch_update_linked [node <nodeId>|dict <dictId>|zrc]')
  process.exit(1)
}

if (args.length > 0) {
  switch (args[0]) {
    case 'node':
      if (args.length !== 2) printSynopsisAndExit()
      limitType = args[0]
      limitCode = args[1]
      updateDictionaries(() => {
        // all errors are already handled/recorded inside the procedure
        debug('exiting updateDictionaries')
        process.exit()
      })
      break
    case 'dict':
      if (args.length !== 2) printSynopsisAndExit()
      limitType = args[0]
      limitCode = args[1]
      updateDictionaries(() => {
        // all errors are already handled/recorded inside the procedure
        debug('exiting updateDictionaries')
        process.exit()
      })
      break
    case 'zrc':
      updateZrcSvetovalnica(err => {
        if (err) console.error(err)
        debug('exiting zrc')
        process.exit()
      })
      break
    default:
      printSynopsisAndExit()
  }
} else {
  // default operation update all linked dictionaries
  updateDictionaries(() => {
    // all errors are already handled/recorded inside the procedure
    debug('exiting updateDictionaries')
    process.exit()
  })
}

function updateDictionaries(done) {
  async.waterfall(
    [
      function (cbw) {
        batch.init(dbc, report, cbw)
      },
      function (cbw) {
        batch.reportPhase(dbc, report, 'preparing', 0, cbw)
      },
      function (cbw) {
        batch.reportItem(dbc, report, 'languages', 50, cbw)
      },
      function (cbw) {
        debug('fetching languages')
        dbc.query(
          'SELECT code, id FROM language ORDER BY code',
          (err, result) => {
            if (err) return cbw(err)
            languageList = result.rows
            debugDetail(languageList)
            cbw()
          }
        )
      },
      function (cbw) {
        debug('reportItem servers')
        batch.reportItem(dbc, report, 'servers', 100, err => {
          cbw(err)
        })
      },
      function (cbw) {
        debug('fetching servers')
        let sql =
          'SELECT * FROM linked_portal WHERE is_enabled = true ORDER BY id'
        if (limitType === 'node')
          sql =
            'SELECT * FROM linked_portal WHERE code=' +
            limitCode +
            ' AND is_enabled = true'
        if (limitType === 'dict')
          sql =
            "SELECT * FROM linked_portal WHERE id IN (SELECT linked_portal_id FROM linked_dictionary WHERE source_dictionary_id ='" +
            limitCode +
            "' AND is_enabled = true)"
        dbc.query(sql, (err, result) => {
          if (err) return cbw(err)
          linkedPortals = result.rows
          debugDetail(linkedPortals)
          cbw()
        })
      },
      function (cbw) {
        debug('reportItem dictionaries')
        batch.reportItem(dbc, report, 'dictionaries', 60, err => {
          cbw(err)
        })
      },
      function (cbw) {
        debug('fetching dictionaries')
        let sql =
          'SELECT ld.*, lp.url_update, lp.url_index FROM linked_dictionary AS ld' +
          ' INNER JOIN linked_portal AS lp ON lp.id = ld.linked_portal_id' +
          ' WHERE ld.is_enabled = true AND lp.is_enabled = true' +
          ' ORDER BY lp.id, ld.id'
        if (limitType === 'node')
          sql =
            'SELECT ld.*, lp.url_update, lp.url_index FROM linked_dictionary AS ld' +
            ' INNER JOIN linked_portal AS lp ON lp.id = ld.linked_portal_id' +
            " WHERE ld.is_enabled = true AND lp.code = '" +
            limitCode +
            "'"
        else if (limitType === 'dict')
          sql =
            'SELECT ld.*, lp.url_update, lp.url_index FROM linked_dictionary AS ld' +
            ' INNER JOIN linked_portal AS lp ON lp.id = ld.linked_portal_id' +
            " WHERE ld.is_enabled = true AND ld.source_dictionary_id = '" +
            limitCode +
            "'"
        dbc.query(sql, (err, result) => {
          if (err) return cbw(err)
          linkedDictionaries = result.rows
          debugDetail(linkedDictionaries)
          cbw()
        })
      },
      function (cbw) {
        if (!linkedDictionaries || linkedDictionaries.length === 0) {
          debug('finalize: no linked dictionaries')
          batch.finalize(dbc, report, 'no linked dictionaries', cbw)
          process.exit()
        }
        const stepPercent = 100 / linkedDictionaries.length
        async.eachOfSeries(
          linkedDictionaries,
          (ldict, key, cbe) => {
            debug('processing dictionary', ldict.name)
            async.waterfall(
              [
                function (cbwd) {
                  batch.reportPhase(
                    dbc,
                    report,
                    'fetching ' + ldict.name,
                    stepPercent * (key + 0.2),
                    errd => {
                      cbwd(errd)
                    }
                  )
                },
                function (cbwd) {
                  fetchUpdates(ldict, errd => {
                    cbwd(errd)
                  })
                },
                function (cbwd) {
                  batch.reportPhase(
                    dbc,
                    report,
                    'updating ' + ldict.name,
                    stepPercent * (key + 0.5),
                    errd => {
                      cbwd(errd)
                    }
                  )
                },
                function (cbwd) {
                  applyUpdates(dbc, ldict, errd => {
                    if (errd) return cbwd(errd)
                    dbc.query(
                      'UPDATE linked_dictionary SET time_last_synced=$1 WHERE id=$2',
                      [dictionarySyncStartTimestamp, ldict.id],
                      errd => {
                        cbwd(errd)
                      }
                    )
                  })
                },
                function (cbwd) {
                  if (linkedDictionaryEntriesToUpdate.length) {
                    debug('reindexing')
                    const startIndex = Date.now()
                    const dictionaryId = ldict.target_dictionary_id
                    deleteDictionaryEntriesFromIndex(dictionaryId)
                      .then(() => {
                        return Dictionary.indexIntoSearchEngine(dictionaryId)
                      })
                      .catch(e =>
                        console.error('dictionary reindex failed:', e)
                      )
                      .finally(() => {
                        const indexMilis = Date.now() - startIndex
                        debug(`done indexing: ${indexMilis}ms`)
                        cbwd()
                      })
                  } else {
                    debug('skipping reindexing (no new entries)')
                    cbwd()
                  }
                }
              ],
              errw2 => {
                cbe(errw2)
              }
            )
          },
          erre => {
            cbw(erre)
          }
        )
      }
    ],
    err => {
      // end of waterfall
      if (err) {
        console.error(err)
        batch.fail(dbc, report, err, errf => {
          if (errf) console.error(errf)
          dbc.end()
          done()
        })
      } else {
        batch.finalize(dbc, report, 'completed', errf => {
          if (errf) console.error(errf)
          dbc.end()
          done()
        })
      }
    }
  )
}

/**
 * fetch upates for given linked dictionary.
 * Updates are stored in global linkedDictionaryEntriesToUpdate
 * @param ldict the linked dictionary record
 * @param done
 */
function fetchUpdates(ldict, done) {
  const lastSync = ldict.time_last_synced
    ? ldict.time_last_synced.toISOString().substring(0, 19).replace('T', ' ')
    : '2000-01-01 00:00:00'
  dictionarySyncStartTimestamp = new Date()
    .toISOString()
    .substring(0, 19)
    .replace('T', ' ')
  const url = ldict.url_update
    .replace('$SOURCE_ID', encodeURIComponent(ldict.source_dictionary_id))
    .replace('$SINCE', encodeURIComponent(lastSync))
  debug('retrieving from ', url)
  const options = {
    compressed: true,
    // follow     : 10,
    accept: 'application/json'
  }
  needle.get(url, options, function (error, response, body) {
    if (error) return done(error)
    if (body.error) {
      // server side error message
      return done(body)
    }
    // the body will contain decoded JSON array of dictionary items to update
    if (Array.isArray(body)) {
      debug('fetched:', body.length)
      linkedDictionaryEntriesToUpdate = body
    } else if (body.entries) {
      debug('fetched:', body.entries.length)
      linkedDictionaryEntriesToUpdate = body.entries
    } else {
      console.error('invalid body', body)
      linkedDictionaryEntriesToUpdate = []
    }
    done()
  })
}

/* deprecated for burning identity values
const sqlUpsertEntry =
  'INSERT INTO entry ' +
  ' (dictionary_id, is_valid, is_published, term, label, definition, synonym, external_id, external_url)' +
  ' VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)' +
  ' ON CONFLICT (dictionary_id,external_id)' +
  ' DO UPDATE SET time_modified = now(),' +
  ' term = $4, label = $5, definition = $6, synonym = $7, external_url = $9'
*/
const sqlInsertEntry =
  'INSERT INTO entry ' +
  ' (dictionary_id, is_valid, is_published, term, label, definition, synonym, external_id, external_url, status)' +
  " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'complete') returning id"
const sqlUpdateEntry =
  "UPDATE entry SET time_modified = now(), term = $1, label = $2, definition = $3, synonym = $4, external_url = $5, status = 'complete'" +
  ' WHERE id = $6'
const sqlSelectEntryByExternalId =
  'SELECT id FROM entry WHERE dictionary_id = $1 AND external_id = $2'

const sqlUpsertEntryTranslation =
  'INSERT INTO entry_foreign ' +
  ' (entry_id, language_id, term, definition, synonym)' +
  ' VALUES ($1,$2,$3,$4,$5)' +
  ' ON CONFLICT (entry_id, language_id)' +
  ' DO UPDATE SET term = $3, definition = $4, synonym = $5'

/**
 * Apply updates from global linkedDictionaryEntriesToUpdate to given dictionary.
 * @param dbc database connection
 * @param ldict the linked dictionary record
 * @param done
 */
function applyUpdates(dbc, ldict, done) {
  debug('applying updates')
  const targetDictionaryId = ldict.target_dictionary_id
  let currentEntry = null
  let termsSqlArray = ''
  let synonymsSqlArray = null
  let processed = 0
  let failed = 0
  async.eachOfSeries(
    linkedDictionaryEntriesToUpdate,
    (entry, key, cbe) => {
      let entryId = 0
      const entryIdExternal = '' + entry.id
      currentEntry = entry
      async.waterfall(
        [
          function (cbw) {
            // debug(`find existing entry ${targetDictionaryId}.${entryIdExternal}`)
            dbc.query(
              sqlSelectEntryByExternalId,
              [targetDictionaryId, entryIdExternal],
              (errdb, result) => {
                if (errdb) {
                  return cbw(errdb)
                }
                if (result && result.rows && result.rows.length > 0) {
                  entryId = result.rows[0].id
                } else {
                  entryId = 0
                }
                cbw()
              }
            )
          },
          function (cbw) {
            const synonymArray = entry.synonyms
            if (entryId > 0) {
              // entry exists -> update it
              // SET term = $1, label = $2, definition = $3, synonym = $4, external_url = $5
              debugDetail('update entry', entry)
              dbc.query(
                sqlUpdateEntry,
                [
                  entry.term,
                  entry.label,
                  entry.definition,
                  synonymArray,
                  entry.url,
                  entryId
                ],
                errq => {
                  cbw(errq)
                }
              )
            } else {
              // entry doesnt exists -> insert it
              debugDetail('insert entry', entry)
              dbc.query(
                sqlInsertEntry,
                [
                  targetDictionaryId,
                  true,
                  true,
                  entry.term,
                  entry.label,
                  entry.definition,
                  synonymArray,
                  entryIdExternal,
                  entry.url
                ],
                (errq, result) => {
                  if (errq) return cbw(errq)
                  if (result && result.rows && result.rows.length > 0)
                    entryId = result.rows[0].id
                  else return cbw(new Error('no insert id'))
                  cbw()
                }
              )
            }
          },
          function (cbw) {
            debugDetail('deleting removed entry translations')
            let includedLangIds = [0]
            entry.translations.forEach(et => {
              const lng = languageList.find(l => {
                return l.code === et.language_code
              })
              if (lng) includedLangIds.push(lng.id)
            })
            // keep unique ids
            includedLangIds = Array.from(new Set(includedLangIds))
            debugDetail('except for languages', includedLangIds)
            dbc.query(
              'DELETE FROM entry_foreign WHERE entry_id=$1 AND language_id NOT IN (' +
                includedLangIds.join(',') +
                ')',
              [entryId],
              (errq, result) => {
                if (!errq && result.rowCount)
                  debugDetail('deleted translations: ', result.rowCount)
                cbw(errq)
              }
            )
          },
          function (cbw) {
            debugDetail('upserting entry translations')
            async.eachOfSeries(
              entry.translations,
              (trans, key, cbTrans) => {
                const transLang = languageList.find(l => {
                  return l.code === trans.lang
                })
                if (!transLang) {
                  console.warn(
                    'WARN: language not mapped, skipping translation upsert: ',
                    trans
                  )
                  report.trace.push(
                    'WARN: language not mapped, skipping translation upsert: ' +
                      trans.language_code
                  )
                  report.warnings++
                  return cbTrans()
                }
                debugDetail('upsert translation', entryId, transLang.id, trans)
                termsSqlArray = trans.terms
                if (trans.synonyms && trans.synonyms.length) {
                  synonymsSqlArray = trans.synonyms
                }
                dbc.query(
                  sqlUpsertEntryTranslation,
                  [
                    entryId,
                    transLang.id,
                    termsSqlArray,
                    trans.definition,
                    synonymsSqlArray
                  ],
                  errq => {
                    if (errq) {
                      console.warn(
                        'WARN: error upserting translation: ',
                        trans,
                        errq
                      )
                      report.trace.push(
                        'WARN: error upserting translation: ' + errq
                      )
                      report.warnings++
                    }
                    cbTrans()
                  }
                )
              },
              errt => {
                // translations upsert callback
                cbw(errt)
              }
            )
          },
          function (cbw) {
            debugDetail('clearing entry links')
            dbc.query(
              'DELETE FROM entry_link WHERE entry_id = $1',
              [entryId],
              errq => {
                if (errq) {
                  const msg = `WARN: error clearing entry links: ${errq}`
                  console.error(msg)
                  report.trace.push(msg)
                  report.warnings++
                }
                cbw()
              }
            )
          },
          function (cbw) {
            if (!entry.links || entry.links.length === 0) return cbw()
            debugDetail('setting entry links:', entry.links.length)
            let sql = 'INSERT INTO entry_link (entry_id, type, link) VALUES '
            entry.links.forEach(link => {
              if (typeof link === 'string') {
                sql += `(${entryId},'related','${link}'),`
              } else {
                sql += `(${entryId},'${link.type}','${link.link}'),`
              }
            })
            sql = sql.substring(0, sql.length - 1)
            dbc.query(sql, errq => {
              if (errq) {
                const msg = `WARN: error setting entry links:\n${errq}\n${sql}`
                console.error(msg)
                report.trace.push(msg)
                report.warnings++
              }
              cbw()
            })
          }
        ],
        errw => {
          // entry callback
          if (errw) {
            console.error('updating entry failed', currentEntry, errw)
            failed++
          } else processed++
          cbe()
        }
      )
    },
    erre => {
      // entries callback
      if (erre) return done(erre)
      if (failed > 0) {
        const msg = `Done with some entries failed: ${failed} out of ${
          failed + processed
        }`
        console.error(msg)
        return done(msg)
      }
      done()
    }
  )
}

/***********************************************************************************************************************
 * ZRC Svetovalnica
 */

/**
 * Convert row as parsed by npm xml-flow parser
 * @param row
 * @param domainPrimary
 */
function convertZrcConsultancyRow(row, domainPrimary) {
  const targetRow = {
    status: 'published',
    institution: 'ZRC-SAZU',
    description: 'Terminološka svetovalnica',
    authors: [],
    domain_primary_id: null
  }
  row.$markup.forEach(field => {
    let domain = null
    // debugDetail('processing field',field)
    switch (field.$attrs.name) {
      case 'nid':
        targetRow.id_external = field.$markup.length ? field.$markup[0] : null
        break
      case 'title':
        targetRow.title = field.$markup.length ? field.$markup.join(' ') : ''
        break
      case 'field_vprasanje_value':
        targetRow.question = field.$markup.length ? field.$markup.join(' ') : ''
        break
      case 'body_value':
        targetRow.answer = field.$markup.length ? field.$markup.join(' ') : ''
        break
      case 'changed':
        // debugDetail('processing time_published',field)
        targetRow.time_published = field.$markup.length
          ? new Date(parseInt(field.$markup[0] * 1000))
          : null
        break
      case 'question_date':
        // debugDetail('processing question_date',field)
        targetRow.time_created = field.$markup.length
          ? new Date(parseInt(field.$markup[0] * 1000))
          : null
        break
      case 'term_field_UDK':
        domain = domainPrimary.find(d => {
          return d.udk_code === field.$markup[0]
        })
        if (domain) targetRow.domain_primary_id = domain.id
        break
      case 'term_field':
        domain = domainPrimary.find(d => {
          return d.name_sl === field.$markup[0]
        })
        if (domain && !targetRow.domain_primary_id)
          targetRow.domain_primary_id = domain.id
        break
      case 'authors':
        field.$markup.forEach(author => {
          targetRow.authors.push(author.$markup[0])
        })
        break
      default:
        break // ignore unmapped
    }
  })
  return targetRow
}

/**
 * persist a queue of consultancy records
 * @param queue
 * @param cb
 */
function persistSvetovalnica(queue, cb) {
  async.eachOfSeries(
    queue,
    (qrow, x, cbrow) => {
      //  ' (id_external, consultancy_entry_status, time_published, institution, title, question, answer, answer_authors, domain_primary_id)' +
      if (qrow === null) return cbrow()
      if (!qrow.id_external) return cbrow()
      dbc.query(
        'SELECT id FROM consultancy_entry WHERE id_external=$1',
        [qrow.id_external],
        (errdb, resultTest) => {
          if (errdb) {
            console.error(
              'WARN: error testing ZRC consultancy record',
              qrow,
              errdb
            )
            return cbrow()
          }
          if (resultTest && resultTest.rows.length > 0) {
            // record exists - > update it
            // SET status = $1, time_published = $2, title = $3, question = $4, answer = $5, answer_authors = $6,
            // domain_primary_id = $7, time_created = $8
            dbc.query(
              sqlUpdateZRCConsultancy,
              [
                qrow.status,
                qrow.time_published,
                qrow.title,
                qrow.question,
                qrow.answer,
                qrow.authors,
                qrow.domain_primary_id,
                qrow.time_created,
                resultTest.rows[0].id
              ],
              errdb => {
                if (errdb) {
                  console.error(
                    'WARN: error updating ZRC consultancy: ',
                    qrow,
                    errdb
                  )
                  report.trace.push(
                    'WARN: error updating ZRC consultancy: ' + errdb
                  )
                  report.warnings++
                }
                cbrow()
              }
            )
          } else {
            // record doesn't exist - > insert it
            dbc.query(
              sqlInsertZRCConsultancy,
              [
                qrow.id_external,
                qrow.status,
                qrow.time_published,
                qrow.institution,
                qrow.title,
                qrow.question,
                qrow.answer,
                qrow.authors,
                qrow.domain_primary_id,
                qrow.time_created
              ],
              errdb => {
                if (errdb) {
                  console.error(
                    'WARN: error inserting ZRC consultancy: ',
                    qrow,
                    errdb
                  )
                  report.trace.push(
                    'WARN: error inserting consultancy: ' + errdb
                  )
                  report.warnings++
                }
                cbrow()
              }
            )
          }
        }
      )
    },
    qerr => {
      if (qerr) console.error(qerr)
      cb()
    }
  )
}

/* this is deprecated as it burns identity values
const sqlUpsertZRCConsultancy =
  'INSERT INTO consultancy_entry ' +
  ' (id_external, status, time_published, institution, title, question, answer, answer_authors, domain_primary_id, time_created)' +
  ' VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)' +
  ' ON CONFLICT (id_external)' +
  ' DO UPDATE SET status = $2, time_published = $3, title = $5, question = $6, answer = $7, answer_authors = $8, domain_primary_id = $9, time_created = $10'
*/
const sqlInsertZRCConsultancy =
  'INSERT INTO consultancy_entry ' +
  ' (id_external, status, time_published, institution, title, question, answer, answer_authors, domain_primary_id, time_created)' +
  ' VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)'

const sqlUpdateZRCConsultancy =
  'UPDATE consultancy_entry ' +
  ' SET status = $1, time_published = $2, title = $3, question = $4, answer = $5, answer_authors = $6, domain_primary_id = $7, time_created = $8' +
  ' WHERE id = $9'

/**
 * Update consultancy entries/index
 * that will have their consultancy linked to ZRC/Terminološka svetovalnica.
 * The data is available as full export on https://www.zrc-sazu.si/sl/sites/default/files/xml/term-exp.xml
 * Requires CULR installed on a machine.
 */
function updateZrcSvetovalnica(cbf) {
  const file = path.join(__dirname, './term-exp.xml')
  let domainPrimary = null
  const consultancyQueue = []
  let processMilis, indexMilis
  async.waterfall(
    [
      function (cbw) {
        debug('check consultancy type')
        dbc.query(
          "SELECT value FROM instance_settings WHERE name = 'consultancy_type'",
          [],
          (errq, result) => {
            debugDetail('fetched consultancy_type', errq, result)
            if (errq) return cbw(errq)
            if (result.rows[0].value !== 'ZRC') {
              return cbw('ZRC consultancy not enabled')
            }
            cbw()
          }
        )
      },
      function (cbw) {
        debug('load domain primary')
        dbc.query(
          'SELECT id, name_sl, udk_code FROM domain_primary',
          [],
          (errq, result) => {
            debugDetail('fetched domain_primary', errq, result)
            if (errq) return cbw(errq)
            domainPrimary = result.rows
            cbw()
          }
        )
      },
      function (cbw) {
        debug('check last update')
        cbw()
      },
      function (cbw) {
        debug('download source file')
        const cmd =
          'curl https://www.zrc-sazu.si/sl/sites/default/files/xml/term-exp.xml > "' +
          file +
          '"'
        exec(cmd, function (err, stdout, stderr) {
          if (err) {
            console.error(stderr)
            cbw(err)
          } else {
            debugDetail('done download')
            cbw()
          }
        })
      },
      function (cbw) {
        debug('process source file')
        const startProcess = Date.now()
        let targetRow
        const inFile = fs.createReadStream(file)
        const xmlStream = xmlFlow(inFile, {
          strict: true,
          trim: false,
          preserveMarkup: xmlFlow.ALWAYS,
          simplifyNodes: false,
          useArrays: xmlFlow.ALWAYS
        })
        xmlStream
          .on('tag:row', function (row) {
            targetRow = convertZrcConsultancyRow(row, domainPrimary)
            consultancyQueue.push(targetRow)
            // debugDetail('row from xml', targetRow)
            if (consultancyQueue.length >= 10) {
              if (xmlStream.isPaused) {
                return // accumulating the queue while persisting
              }
              // persist a batch
              xmlStream.pause()
              const tempQueue = []
              while (consultancyQueue.length > 0)
                tempQueue.push(consultancyQueue.shift())
              debugDetail(`persisting batch of ${tempQueue.length}`)
              persistSvetovalnica(tempQueue, errp => {
                if (errp) {
                  console.warn(errp)
                }
                xmlStream.resume()
              })
            }
          })
          .on('error', xerr => {
            console.error(xerr)
          })
          .on('end', () => {
            debugDetail(`persisting final batch of ${consultancyQueue.length}`)
            // delay last batch so that previous can be finished
            setTimeout(() => {
              processMilis = Date.now() - startProcess
              persistSvetovalnica(consultancyQueue, cbw)
            }, 2000)
          })
      },
      function (cbw) {
        debug('reindexing')
        const startIndex = Date.now()
        ConsultancyEntry.reindexAll()
          .catch(e => console.error('consultancy reindex failed:', e))
          .finally(() => {
            indexMilis = Date.now() - startIndex
            cbw()
          })
      }
    ],
    err => {
      debug(`done, processing ${processMilis}ms, indexing ${indexMilis}ms`)
      cbf(err)
    }
  )
}
