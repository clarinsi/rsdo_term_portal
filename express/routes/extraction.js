const router = require('express-promise-router')()
const extraction = require('../controllers/extraction')
const extractionPocRouter = require('./extraction-poc')

// List all extractions.
router.get('/', extraction.list)

// All further routes are only available to authenticated users.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect(req.baseUrl)
})

// Create new extraction.
router.post('/', extraction.create)

router.use('/poc', extractionPocRouter)

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

// // TODO: Ask Luka or Miro what to do with this page.
// router.get('/id_luscenja/kandidati', (req, res) => {
//   res.render('pages/extraction/terms', {
//     title: 'Terminološki kandidati'
//   })
// })

// // Show a form to export a dictionary
// router.get('/id_luscenja/dokumenti/besedila', (req, res) => {
//   res.render('pages/extraction/docs-edit', {
//     title: 'Besedila'
//   })
// })

// // Show a form to export a dictionary
// router.get('/id_luscenja/oss', (req, res) => {
//   res.render('pages/extraction/edit-oss', {
//     title: 'KAS + dokumenti'
//   })
// })

// router.get('/id_luscenja/dokumenti/termini', (req, res) => {
//   res.render('pages/extraction/stop-terms-edit', {
//     title: 'Termini'
//   })
// })

module.exports = router
