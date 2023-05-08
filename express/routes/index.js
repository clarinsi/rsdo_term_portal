const router = require('express-promise-router')()
const { isAuthenticated: isUserAuthenticated } = require('../middleware/user')
const index = require('../controllers/index')
const user = require('../controllers/users')

// TODO Some of these endpoints might need authorization protection. Review and clean up at a later point.

/* GET home page. */
router.get('/', index.index)

// Show a list of search results.
router.get('/iskanje', index.search)

// Show a list of search results.
router.get('/termin/:entryId', index.entryDetails)

// Render help page
router.get('/pomoc', (req, res) => {
  res.render('pages/help', { title: req.t('Pomoč') })
})

// Create a route to download pdf
router.get('/pomoc/pdf', (req, res) => {
  res.download('public/documents/Tabela.pdf')
})

// Create a route to download guidance pdf
router.get('/pomoc/guidance-pdf', (req, res) => {
  res.download('public/documents/RSDO_smernice.pdf')
})

// Create a route to download schema
router.get('/slovarji/xml-schema', (req, res) => {
  res.download('public/documents/dictionary_schema.xsd')
})

// Activate user account.
router.get('/users/activate', user.activateAccount)

// Render privacy policy page
router.get('/politika-zasebnosti', (req, res) => {
  res.render(`pages/privacy-policy_${req.language}`, {
    title: req.t('titlePrivacyPolicy')
  })
})

// Render terms of use page
router.get('/pogoji-uporabe', (req, res) => {
  res.render(`pages/terms-of-use_${req.language}`, {
    title: req.t('titleTermsOfUse')
  })
})

// Form for user to reset their password.
router.get('/ponastavitev-gesla', index.resetPassword)

// Confirm user email change.
router.get('/sprememba-elektronskega-naslova', index.changeEmail)

// Change user locale.
router.get('/spremeni-jezik/:languageCode', index.changeUserLanguage)

router.get('/moj-racun', isUserAuthenticated, index.myProfile)

router.get('/izbrisi-racun', isUserAuthenticated, index.deleteProfile)

router.get('/spremeni-geslo', isUserAuthenticated, index.changePassword)

router.get('/nastavitve-racuna', isUserAuthenticated, index.userSettings)

// Log the user out.
router.post('/users/logout', isUserAuthenticated, user.logout)

module.exports = router
