const router = require('express-promise-router')()
const system = require('../../../controllers/api/v1/system')
const {
  listDictionaries,
  syncDictionary
} = require('../../../controllers/api/v1/inter_instance_sync')

// Receive Content Security Policy violation reports.
router.post('/csp-reports', system.handleCspReports)

// Trigger synchronization with Eurotermbank.
router.get('/eurotermbank-sync-push', system.syncWithEurotermbank)

// List dictionaries (one page).
router.get('/inter-instance-sync/dictionaries', listDictionaries)

// List dictionary entries updated since....
router.get(
  '/inter-instance-sync/dictionary/:dictionaryId/entries',
  syncDictionary
)

module.exports = router
