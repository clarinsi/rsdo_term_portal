const router = require('express-promise-router')()
const dictionary = require('../controllers/dictionaries')
const user = require('../controllers/users')
const portal = require('../controllers/portals')

// All routes require an authenticated user.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect('/')
})

// Menu entry point. Redirect based on role.
router.get('/', (req, res, next) => {
  const { user, baseUrl } = req
  if (user.hasRole('portal admin')) {
    return res.redirect(`${baseUrl}/nastavitve/portal`)
  } else if (user.hasRole('dictionaries admin')) {
    return res.redirect(`${baseUrl}/slovarji`)
  }
  res.redirect('/')
})

// Authorize endpoints for portal admin.
router.use(
  ['/nastavitve', '/povezave', '/uporabniki', '/komentarji'],
  (req, res, next) => {
    if (req.user.hasRole('portal admin')) return next()
    res.redirect('/')
  }
)

// Authorize endpoints for dictionaries admin.
router.use(['/slovarji', '/podrocja'], (req, res, next) => {
  if (req.user.hasRole('dictionaries admin')) return next()
  res.redirect('/')
})

router.get('/nastavitve/portal', portal.instanceSettings)

router.post('/nastavitve/portal', portal.updateInstaceSettings)

router.get('/nastavitve/slovarji', portal.instanceDictSettings)

router.post('/nastavitve/slovarji', portal.updateInstanceDictSettings)

router.get('/nastavitve/svetovalnica', portal.instanceConsultancySettings)

router.post('/nastavitve/svetovalnica', portal.updateInstanceConusltacySettings)

router.get('/povezave/seznam', portal.list)

router.get('/povezave/nova', portal.new)

router.get('/povezave/slovarji', portal.fetchAllLinkedDictionaries)

router.post('/povezave/slovarji', portal.updateAllDictionaries)

router.get('/povezave/seznam/:portalId', portal.fetchSelectedLinkedDictionaries)

router.post('/povezave/seznam/:portalId', portal.updateSelectedDictionaries)

router.get('/povezava/:portalId/urejanje', portal.fetchPortal)

router.post('/povezava/:portalId/urejanje', portal.updatePortal)

// Show a list of user's dictionaries.
router.get('/slovarji', dictionary.listAdminDictionaries)

router.get('/slovarji/:dictionaryId/podatki', dictionary.adminEditDescription)

router.post(
  '/slovarji/:dictionaryId/podatki',
  dictionary.updateAdminDescription
)

router.get('/slovarji/:dictionaryId/uporabniki', dictionary.editUsers)

router.post('/slovarji/:dictionaryId/uporabniki', dictionary.updateUsers)

router.get('/slovarji/:dictionaryId/struktura', dictionary.editStructure)

router.post('/slovarji/:dictionaryId/struktura', dictionary.updateStructure)

router.get(
  '/slovarji/:dictionaryId/podrocne-oznake',
  dictionary.editDomainLabels
)

router.get('/slovarji/:dictionaryId/napredno', dictionary.editAdvanced)

router.get('/slovarji/:dictionaryId/komentarji', dictionary.comments)

router.get('/slovarji/:dictionaryId/izvoz', dictionary.showExportToFileForm)

router.get(
  '/slovarji/:dictionaryId/uvoz/datoteka',
  dictionary.showImportFromFileForm
)

router.get(
  '/slovarji/:dictionaryId/uvoz/luscenje',
  dictionary.showImportFromExtractionForm
)

router.get('/uporabniki/portal', user.listAllWithPortalRoles)

router.post('/uporabniki/portal', user.updateRoles)

router.get('/uporabniki/seznam', user.list)

// Show an admin form to edit specific user's data.
router.get('/uporabniki/:userId/urejanje', user.adminEdit)

// Validate and update specific user's data as admin.
router.post('/uporabniki/:userId/urejanje', user.adminUpdate)

router.get('/podpodrocja', dictionary.showSecondaryDomains)

router.get('/komentarji', portal.comments)

module.exports = router
