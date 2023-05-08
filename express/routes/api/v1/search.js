const router = require('express-promise-router')()
const search = require('../../../controllers/api/v1/search')
const user = require('../../../middleware/user')

// Return search results for main search.
router.get('/main', search.listMainEntries)

// Return search results for editor search.
router.get(
  '/editor/:dictionaryId',
  user.isAuthenticated,
  user.canContentEdit,
  search.listEditorEntries
)

router.get('/dictionaries', search.listFilteredDictionaries)

router.get('/term-filters', search.showModalFilterResults)

module.exports = router
