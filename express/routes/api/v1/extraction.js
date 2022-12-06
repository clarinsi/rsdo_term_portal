const router = require('express-promise-router')()

const extraction = require('../../../controllers/api/v1/extraction')

// TODO In final version test authentication and authorization.
// TODO Also try to lock file editing or other operations once extraction was started.

// Delete extraction.
router.delete('/:id', extraction.delete)

// List documents.
router.get('/:id/documents', extraction.docsList)

// Update documents.
router.put('/:id/documents', extraction.docsUpdate)

// Delete a specific document.
router.delete('/:id/documents/:filename', extraction.docDelete)

// List stop term files.
router.get('/:id/stop-terms', extraction.stopTermsList)

// Update stop term files.
router.put('/:id/stop-terms', extraction.stopTermsUpdate)

// Delete a specific stop term file.
router.delete('/:id/stop-terms/:filename', extraction.stopTermDelete)

// Save oss params.
router.post('/:id/oss-save-params', extraction.ossSaveParams)

// Execute search by oss params.
router.put('/:id/oss-search', extraction.ossSearch)

// Confirm oss params.
router.put('/:id/oss-confirm-params', extraction.ossConfirmParams)

// Begin extraction.
router.put('/:id/begin', extraction.begin)

// Duplicate extraction.
router.post('/:id/duplicate', extraction.duplicate)

// Export term candidates.
router.get('/:id/term-candidates-export', extraction.termCandidatesExport)

// List all finished extractions for current user.
// TODO Is this enpoint even necessarry?
router.get('/finished-for-user', extraction.listFinishedForUser)

// List term candidates for specific extraction.
router.get('/:id/term-candidates', extraction.listTermCandidates)

module.exports = router
