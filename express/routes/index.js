const router = require('express-promise-router')()
const { isAuthenticated: isUserAuthenticated } = require('../middleware/user')
const db = require('../models/db')
const cache = require('../models/cache')
const { searchEngineClient } = require('../models/search-engine')
const index = require('../controllers/index')
const user = require('../controllers/users')
const demoPaginacija = require('../controllers/demo-paginacija')

// TODO Some of these endpoints might need authorization protection. Review and clean up at a later point.

/* GET home page. */
router.get('/', index.index)

// Show a list of search results.
router.get('/iskanje', index.search)

// Show a list of search results.
router.get('/termin/:entryId', index.entryDetails)

/*
router.get('/termin/id_termina', (req, res) => {
  res.render('pages/search/result-detail')
})
*/

router.get('/keys', (req, res) => {
  res.render('pages/search/special-keys-demo-rm-this')
})

router.get('/demo', (req, res) => {
  res.render('pages/admin')
})

router.get('/select', (req, res) => {
  res.render('pages/search-root')
})

router.get('/dictionaries', (req, res) => {
  res.render('pages/my-dictionaries-root')
})

router.get('/db-query-demo', async (req, res) => {
  const queryResult = await db.query("SELECT 'yes' as does_it_work")
  res.send(queryResult.rows[0])
})

router.get('/test-seje', (req, res) => {
  // req.session.before = { a: 1, b: 'yes' }
  const { sessionID, session } = req
  // req.session.after = { c: 2, d: 'no' }
  res.send({ sessionID, session })
})

router.get('/test-cacha', async (req, res, next) => {
  const sRes = await cache.set('my key', 'also my val')
  const gRes = await cache.get('my key')
  res.send({ sRes, gRes })
})

router.get('/test-iskalnika', async (req, res) => {
  const response = await searchEngineClient.ping()
  res.send(response)
})

// Stran z demo implementacijo paginirane vsebine.
router.get('/demo-paginacija', demoPaginacija.izrišiStran)

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

// Render demo help pug page.
router.get('/pomoc-pug-demo', (req, res) => {
  res.render('pages/help-pug-demo-frame', { title: 'Pomoč - pug demo' })
})

// Activate user account.
router.get('/users/activate', user.activateAccount)

// Log the user out.
router.post('/users/logout', user.logout)

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

router.get('/moj-racun', isUserAuthenticated, index.myProfile)

router.get('/izbrisi-racun', isUserAuthenticated, index.deleteProfile)

router.get('/spremeni-geslo', isUserAuthenticated, index.changePassword)

router.get('/nastavitve-racuna', isUserAuthenticated, index.userSettings)

router.get('/ponastavitev-gesla', index.resetPassword)

// Change user locale.
router.get('/spremeni-jezik/:languageCode', index.changeUserLanguage)

module.exports = router
