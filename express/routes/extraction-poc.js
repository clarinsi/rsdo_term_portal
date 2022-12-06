const router = require('express-promise-router')()
const extraction = require('../controllers/extraction-poc')

// TODO In final version test authentication and authorization.

// List all extractions.
router.get('/', extraction.list)

// Create new extraction.
router.post('/', extraction.create)

// Edit extraction.
router.get('/:id', extraction.edit)

// Update extraction (own documents).
router.post('/:id', extraction.updateOwn)

// Edit documents.
router.get('/:id/besedila', extraction.docsEdit)

// Edit stop terms.
router.get('/:id/stop-termini', extraction.stopTermsEdit)

// List term candidates for extraction and display export interface.
router.get('/:id/kandidati', extraction.listTermCandidates)

module.exports = router
