const router = require('express-promise-router')()

const { consultancy, consultancyAdmin } = require('../controllers/consultancy')

router.get('/', consultancy.index)

router.get('/iskanje', consultancy.search)

router.get('/vprasanje/novo', consultancy.new)

router.get('/vprasanje/:id', consultancy.specificQuestion)

router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect('/')
})

router.get('/vprasanje/admin/novo', consultancyAdmin.new)

router.get('/vprasanje/admin/uporabniki', consultancyAdmin.users)

router.get('/vprasanje/admin/zavrnjeno', consultancyAdmin.rejected)

router.get('/vprasanje/admin/objavljeno', consultancyAdmin.published)

router.get('/vprasanje/admin/pripravljeno', consultancyAdmin.prepared)

router.get('/vprasanje/admin/v-delu', consultancyAdmin.inProgress)

router.get('/vprasanje/admin/statistika', consultancyAdmin.statistics)

router.get('/vprasanje/admin/urejanje/:id', consultancyAdmin.edit)

module.exports = router
