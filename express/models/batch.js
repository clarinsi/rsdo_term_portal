const debug = require('debug')('app:batch')
// const db = require('../models/db')

function update(dbc, report, status, done) {
  const reps = JSON.stringify(report)
  debug('update', status, reps.length)
  if (status === 'D' || status === 'F') {
    dbc.query(
      'UPDATE batch SET report=$1, job_state=$2, ended=now(), changed=now() WHERE id=$3',
      [reps, status, report.id],
      err => {
        done(err)
      }
    )
  } else {
    dbc.query(
      'UPDATE batch SET report=$1, changed=now() WHERE id=$2',
      [reps, report.id],
      err => {
        done(err)
      }
    )
  }
}

module.exports = {
  Report: function (jobName, threadId) {
    this.id = 0
    this.name = jobName
    this.thread = threadId
    this.warnings = 0
    this.progress = {
      total_percent: 0,
      phase_name: '',
      phase_percent: 0,
      item_name: ''
    }
    this.trace = [] // here we push messages and errors
  },

  /**
   * initializes batch tracker by adding a record to batch table
   * @param job_name name of the job
   * @param done (err, BatchId)
   */
  init: function (dbc, report, done) {
    debug('initializing', report)
    dbc.query(
      'INSERT INTO batch (job_name, job_state, thread, report) VALUES($1,$2,$3,$4) RETURNING id',
      [report.name, 'R', report.thread, JSON.stringify(report)],
      (err, result) => {
        if (err) return done(err)
        debug(result)
        report.id = result.rows[0].id
        done()
      }
    )
  },

  /**
   * Close the batch by marking its status as completed and setting end_time.
   * @param report object containing full batch report
   * @param msg final message
   * @param done
   */
  finalize: function (dbc, report, msg, done) {
    debug('finalizing', msg)
    if (msg) report.trace.push(msg)
    else report.trace.push('done')
    update(dbc, report, 'D', done)
  },

  /**
   * Report on phase. If phase name changes add new phase message to trace.
   * @param report object containing full batch report
   * @param phase name of phase
   * @param percentJob percent (total for job)
   * @param done
   */
  reportPhase: function (dbc, report, phase, percentJob, done) {
    debug('phase', phase, percentJob)
    if (report.progress.phase_name !== phase) {
      report.trace.push('starting phase ' + phase)
      report.progress.phase_percent = 0
      report.progress.item_name = ''
    }
    report.progress.phase_name = phase
    report.progress.total_percent = percentJob
    update(dbc, report, '', done)
  },

  /**
   * Report on item processed. This is sublevel of phase
   * @param report object containing full batch report
   * @param item name of item
   * @param percentPhase percent of current phase done
   * @param done
   */
  reportItem: function (dbc, report, item, percentPhase, done) {
    debug('item', item, percentPhase)
    report.progress.item_name = item
    report.progress.phase_percent = percentPhase
    update(dbc, report, '', done)
  },

  /**
   * Report error during process and close batch with status Failed and setting end_time.
   * @param report object containing full batch report
   * @param err the error. If it contains stack it will be included in trace
   * @param done
   */
  fail: function (dbc, report, err, done) {
    debug('fail', err)
    if (err.stack) report.trace.push(err.stack)
    else if (err.message) report.trace.push(err.message)
    else report.trace.push(JSON.stringify(err))
    update(dbc, report, 'F', done)
  }
}
