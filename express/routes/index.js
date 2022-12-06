const router = require('express-promise-router')()
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
  res.render('pages/help', { title: 'Pomoč' })
})

// Create a route to download pdf
router.get('/pomoc/pdf', (req, res) => {
  res.download('public/documents/Podrocja_TP_2022-11-28.pdf')
})

// Create a route to download guidance pdf
router.get('/pomoc/guidance-pdf', (req, res) => {
  res.download('public/documents/RSDO_smernice.pdf')
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
  res.render('pages/privacy-policy', { title: 'Politika zasebnosti' })
})

// Render terms of use page
router.get('/pogoji-uporabe', (req, res) => {
  res.render('pages/terms-of-use', { title: 'Pogoji uporabe' })
})

// All routes require an authenticated user.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect('/')
})

router.get('/moj-racun', index.myProfile)

router.get('/spremeni-geslo', index.changePassword)

router.get('/nastavitve-racuna', index.userSettings)

module.exports = router
