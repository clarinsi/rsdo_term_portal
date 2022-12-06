const router = require('express-promise-router')()
const dictionary = require('../controllers/dictionaries')
const user = require('../middleware/user')
// const debug = require('debug')('termPortal:routers/dictionary')

// Show a list of user's dictionaries.
router.get('/moji', dictionary.list)

router.get('/', dictionary.dictionaryList)

router.get('/:dictionaryId/o-slovarju', dictionary.dictionaryDetails)

// All further routes are only available to authenticated users.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect(req.baseUrl)
})

// Show a form to create a new dictionary.
router.get('/nov', dictionary.new)

// Validate and create a new dictionary.
router.post('/nov', dictionary.create)

// Show a form to add/edit the title and the description of a dictionary.
router.get(
  '/:dictionaryId/podatki',
  user.isDictionaryAdmin,
  dictionary.editDescription
)

// Validate and update existing dictionary title and description.
router.post(
  '/:dictionaryId/podatki',
  user.isDictionaryAdmin,
  dictionary.updateDescription
)

// Show a form to add/edit users of a dictionary and their roles.
router.get(
  '/:dictionaryId/uporabniki',
  user.isDictionaryAdmin,
  dictionary.editUsers
)

// Validate and update existing dictionary user settings.
router.post(
  '/:dictionaryId/uporabniki',
  user.isDictionaryAdmin,
  dictionary.updateUsers
)

// Show a form to edit the structure of a dictionary.
router.get(
  '/:dictionaryId/struktura',
  user.isDictionaryAdmin,
  dictionary.editStructure
)

// Validate and update existing dictionary structure.
router.post(
  '/:dictionaryId/struktura',
  user.isDictionaryAdmin,
  dictionary.updateStructure
)

// Show a form to create new or edit existing domain labels of the selected dictionary.
router.get(
  '/:dictionaryId/podrocne-oznake',
  user.isDictionaryAdmin,
  dictionary.editDomainLabels
)

// Show a form with advanced dictionary settings.
router.get(
  '/:dictionaryId/napredno',
  user.isDictionaryAdmin,
  dictionary.editAdvanced
)

// Show comments for the given dicitonary.
router.get(
  '/:dictionaryId/komentarji',
  user.isDictionaryAdmin,
  dictionary.comments
)

// Show a page to preview, create or edit dictionary entries and their comments.
router.get(
  '/:dictionaryId/vsebina',
  user.isDictionaryEditor,
  dictionary.showContent
)

// Validate and update dictionary content entries.
// router.post(
//   '/:dictionaryId/vsebina',
//   user.isDictionaryEditor,
//   dictionary.updateContent
// )

// Show a form to export a dictionary.
router.get(
  '/:dictionaryId/izvoz',
  user.isDictionaryEditor,
  dictionary.showExportToFileForm
)

// Show a form to import dictionary data from file.
router.get(
  '/:dictionaryId/uvoz/datoteka',
  user.isDictionaryEditor,
  dictionary.showImportFromFileForm
)

// Validate and import dictionary data from file.
router.post(
  '/:dictionaryId/uvoz/datoteka',
  user.isDictionaryEditor,
  dictionary.importFromFile
)

// Show a form to import dictionary data from extraction process.
router.get(
  '/:dictionaryId/uvoz/luscenje',
  user.isDictionaryEditor,
  dictionary.showImportFromExtractionForm
)

module.exports = router
