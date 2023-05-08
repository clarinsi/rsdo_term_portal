const router = require('express-promise-router')()

const extraction = require('../../../controllers/api/v1/extraction')
const { validateOwnership } = require('../../../controllers/extraction')

// TODO Try to lock file editing or other operations once extraction was started.

// All further routes are only available to authenticated users.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.status(400).end()
})

// Delete extraction.
router.delete('/:id', validateOwnership, extraction.delete)

// List documents.
router.get('/:id/documents', validateOwnership, extraction.docsList)

// Update documents.
router.put('/:id/documents', validateOwnership, extraction.docsUpdate)

// Delete a specific document.
router.delete(
  '/:id/documents/:filename',
  validateOwnership,
  extraction.docDelete
)

// List stop term files.
router.get('/:id/stop-terms', validateOwnership, extraction.stopTermsList)

// Update stop term files.
router.put('/:id/stop-terms', validateOwnership, extraction.stopTermsUpdate)

// Delete a specific stop term file.
router.delete(
  '/:id/stop-terms/:filename',
  validateOwnership,
  extraction.stopTermDelete
)

// Save oss params.
router.post('/:id/oss-save-params', validateOwnership, extraction.ossSaveParams)

// Execute search by oss params.
router.put('/:id/oss-search', validateOwnership, extraction.ossSearch)

// Confirm oss params.
router.put(
  '/:id/oss-confirm-params',
  validateOwnership,
  extraction.ossConfirmParams
)

// Begin extraction.
router.put('/:id/begin', validateOwnership, extraction.begin)

// Duplicate extraction.
router.post('/:id/duplicate', validateOwnership, extraction.duplicate)

// Export term candidates.
router.get(
  '/:id/term-candidates-export',
  validateOwnership,
  extraction.termCandidatesExport
)

// List term candidates for specific extraction.
router.get(
  '/:id/term-candidates',
  validateOwnership,
  extraction.listTermCandidates
)

module.exports = router
