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
const dbc = require('../models/db').getExtraClient()
const ConsultancyEntry = require('../models/consultancy-entry')
const batch = require('../models/batch')
const path = require('path')
const stream = require('stream')
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
      updateDictionaries()
      break
    case 'dict':
      if (args.length !== 2) printSynopsisAndExit()
      limitType = args[0]
      limitCode = args[1]
      updateDictionaries()
      break
    case 'zrc':
      updateZrcSvetovalnica(err => {
        if (err) console.error(err)
        process.exit()
      })
      break
    default:
      printSynopsisAndExit()
  }
} else {
  updateDictionaries()
}

function updateDictionaries() {
  async.waterfall(
    [
      function (cbw) {
        debug('init')
        batch.init(dbc, report, cbw)
      },
      function (cbw) {
        debug('phase')
        batch.reportPhase(dbc, report, 'preparing', 0, cbw)
      },
      function (cbw) {
        debug('item')
        batch.reportItem(dbc, report, 'languages', 50, cbw)
      },
      function (cbw) {
        debug('fetching languages')
        dbc.query(
          'SELECT code, id FROM language ORDER BY code',
          (err, result) => {
            if (err) return cbw(err)
            languageList = result.rows
            debug(languageList)
            cbw()
          }
        )
      },
      function (cbw) {
        debug('item')
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
          debug(linkedPortals)
          cbw()
        })
      },
      function (cbw) {
        debug('item')
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
          debug(linkedDictionaries)
          cbw()
        })
      },
      function (cbw) {
        if (!linkedDictionaries || linkedDictionaries.length === 0) {
          debug('finalize')
          return batch.finalize(dbc, report, 'no linked dictionaries', cbw)
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
                    cbwd(errd)
                  })
                },
                function (cbwd) {
                  dbc.query(
                    'UPDATE linked_dictionary SET time_last_synced=$1 WHERE id=$2',
                    [dictionarySyncStartTimestamp, ldict.id],
                    errd => {
                      cbwd(errd)
                    }
                  )
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
      if (err) {
        console.error(err)
        batch.fail(dbc, report, err, errf => {
          if (errf) console.error(errf)
          dbc.end()
        })
      } else {
        batch.finalize(dbc, report, 'completed', errf => {
          if (errf) console.error(errf)
          dbc.end()
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
  const lastSync = ldict.synced
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
    } else {
      debug('fetched:', body.entries.length)
      linkedDictionaryEntriesToUpdate = body.entries
    }
    done()
  })
}

const sqlUpsertEntry =
  'INSERT INTO entry ' +
  ' (dictionary_id, is_valid, is_published, term, label, definition, synonym, external_id, external_url)' +
  ' VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)' +
  ' ON CONFLICT (dictionary_id,external_id)' +
  ' DO UPDATE SET time_modified = now(),' +
  ' term = $4, label = $5, definition = $6, synonym = $7, external_url = $9'

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
      currentEntry = entry
      async.waterfall(
        [
          function (cbw) {
            debug('upsert entry', entry)
            dbc.query(
              sqlUpsertEntry,
              [
                targetDictionaryId,
                true,
                true,
                entry.term,
                entry.label,
                entry.definition,
                entry.synonym,
                '' + entry.id,
                entry.url
              ],
              errq => {
                cbw(errq)
              }
            )
          },
          function (cbw) {
            debug('fetch entry id')
            dbc.query(
              'SELECT id FROM entry WHERE dictionary_id=$1 AND external_id=$2',
              [targetDictionaryId, '' + entry.id],
              (errq, result) => {
                if (errq) return cbw(errq)
                entryId = result.rows[0].id
                cbw()
              }
            )
          },
          function (cbw) {
            debug('deleting removed entry translations')
            let includedLangIds = [0]
            entry.translations.forEach(et => {
              const lng = languageList.find(l => {
                return l.code === et.language_code
              })
              if (lng) includedLangIds.push(lng.id)
            })
            // keep unique ids
            includedLangIds = Array.from(new Set(includedLangIds))
            debug('except for languages', includedLangIds)
            dbc.query(
              'DELETE FROM entry_foreign WHERE entry_id=$1 AND language_id NOT IN (' +
                includedLangIds.join(',') +
                ')',
              [entryId],
              (errq, result) => {
                if (!errq && result.rowCount)
                  debug('deleted translations: ', result.rowCount)
                cbw(errq)
              }
            )
          },
          function (cbw) {
            debug('upserting entry translations')
            async.eachOfSeries(
              entry.translations,
              (trans, key, cbst) => {
                const transLang = languageList.find(l => {
                  return l.code === trans.language_code
                })
                if (!transLang) {
                  debug(
                    'WARN: language not mapped, skipping translation upsert: ',
                    trans
                  )
                  report.trace.push(
                    'WARN: language not mapped, skipping translation upsert: ' +
                      trans.language_code
                  )
                  report.warnings++
                  return cbst()
                }
                debug(
                  'updaing translation for entry',
                  entryId,
                  trans.lang,
                  trans.terms
                )
                termsSqlArray = '{"' + trans.term.join('","') + '"}'
                if (trans.synonym && trans.synonym.length) {
                  synonymsSqlArray = '{"' + trans.synonym.join('","') + '"}'
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
                      debug('WARN: error upserting translation: ', trans, errq)
                      report.trace.push(
                        'WARN: error upserting translation: ' + errq
                      )
                      report.warnings++
                    }
                    cbst()
                  }
                )
              },
              errt => {
                // translations upsert callback
                cbw(errt)
              }
            )
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
      if (failed > 0)
        console.error('Done with some entries failed:', failed, '/0', processed)
      done(erre)
    }
  )
}

const sqlUpsertZRCConsultancy =
  'INSERT INTO consultancy_entry ' +
  ' (id_external, status, time_published, institution, title, question, answer, answer_authors, domain_primary_id)' +
  ' VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)' +
  ' ON CONFLICT (id_external)' +
  ' DO UPDATE SET status = $2, time_published = $3, title = $5, question = $6, answer = $7, answer_authors = $8, domain_primary_id = $9'

/**
 * Update consultancy entries/index for sites
 * that will have their consultancy linked to ZRC/Terminološka svetovalnica.
 * The data is available as full export on https://www.zrc-sazu.si/sl/sites/default/files/xml/term-exp.xml
 * Requires CULR installed on a machine.
 */
function updateZrcSvetovalnica(cbf) {
  const file = path.join(__dirname, './term-exp.xml')
  let domainPrimary = null
  let consultancyQueue = []
  async.waterfall(
    [
      function (cbw) {
        debug('check consultancy type')
        dbc.query(
          "SELECT value FROM instance_settings WHERE name = 'consultancy_type'",
          [],
          (errq, result) => {
            debug('fetched consultancy_type', errq, result)
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
            debug('fetched domain_primary', errq, result)
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
            console.debug('done')
            cbw()
          }
        })
      },
      function (cbw) {
        debug('process source file')
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
            // debug(row);
            targetRow = {
              status: 'published',
              institution: 'ZRC-SAZU',
              description: 'Terminološka svetovalnica',
              authors: [],
              domain_primary_id: null
            }
            row.$markup.forEach(field => {
              let domain = null
              // debug('processing field',field)
              switch (field.$attrs.name) {
                case 'nid':
                  targetRow.id_external = field.$markup.length
                    ? field.$markup[0]
                    : null
                  break
                case 'title':
                  targetRow.title = field.$markup.length
                    ? field.$markup.join(' ')
                    : ''
                  break
                case 'field_vprasanje_value':
                  targetRow.question = field.$markup.length
                    ? field.$markup.join(' ')
                    : ''
                  break
                case 'body_value':
                  targetRow.answer = field.$markup.length
                    ? field.$markup.join(' ')
                    : ''
                  break
                case 'changed':
                  // debug('processing time_published',field)
                  targetRow.time_published = field.$markup.length
                    ? new Date(parseInt(field.$markup[0]))
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
            consultancyQueue.push(targetRow)
            debug('row from xml', targetRow)
            if (consultancyQueue.length > 10 && !xmlStream.isPaused) {
              // above will accumulate the queue while here we're draining it
              let lastX = -1
              xmlStream.pause()
              const tempQueue = []
              while (consultancyQueue.length > 0)
                tempQueue.push(consultancyQueue.shift())
              async.eachOfSeries(
                tempQueue,
                (qrow, x, cbrow) => {
                  //  ' (id_external, consultancy_entry_status, time_published, institution, title, question, answer, answer_authors, domain_primary_id)' +
                  if (qrow === null) return cbrow()
                  lastX = x
                  dbc.query(
                    sqlUpsertZRCConsultancy,
                    [
                      qrow.id_external,
                      qrow.status,
                      qrow.time_published,
                      qrow.institution,
                      qrow.title,
                      qrow.question,
                      qrow.answer,
                      qrow.authors,
                      qrow.domain_primary_id
                    ],
                    errdb => {
                      if (errdb) {
                        debug(
                          'WARN: error upserting ZRC consultancy: ',
                          targetRow,
                          errdb
                        )
                        report.trace.push(
                          'WARN: error upserting translation: ' + errdb
                        )
                        report.warnings++
                      }
                      cbrow()
                    }
                  )
                },
                qerr => {
                  consultancyQueue = consultancyQueue.splice(0, lastX + 1)
                  xmlStream.resume()
                }
              )
            }
          })
          .on('error', xerr => {
            console.error(xerr)
          })
          .on('end', () => {
            cbw()
          })
      },
      function (cbw) {
        ConsultancyEntry.reindexAll()
          .catch(e => console.error('consultancy reindex failed:', e))
          .finally(() => cbw())
      }
    ],
    err => {
      cbf(err)
    }
  )
}
