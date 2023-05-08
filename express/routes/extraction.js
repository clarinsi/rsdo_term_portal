const router = require('express-promise-router')()
const extraction = require('../controllers/extraction')

// List all extractions.
router.get('/', extraction.list)

// All further routes are only available to authenticated users.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect(303, req.baseUrl)
})

// Create new extraction.
router.post('/', extraction.create)

// Edit extraction.
router.get('/:id', extraction.validateOwnership, extraction.edit)

// Update extraction (own documents).
router.post('/:id', extraction.validateOwnership, extraction.updateOwn)

// Edit documents.
router.get('/:id/besedila', extraction.validateOwnership, extraction.docsEdit)

// Edit stop terms.
router.get(
  '/:id/stop-termini',
  extraction.validateOwnership,
  extraction.stopTermsEdit
)

// List term candidates for extraction and display export interface.
router.get(
  '/:id/kandidati',
  extraction.validateOwnership,
  extraction.listTermCandidates
)

module.exports = router
