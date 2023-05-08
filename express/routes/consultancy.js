const router = require('express-promise-router')()

const user = require('../middleware/user')
const { consultancy, consultancyAdmin } = require('../controllers/consultancy')

router.get('/', consultancy.index)

router.get('/iskanje', consultancy.search)

router.get('/vprasanje/novo', consultancy.new)

router.get('/vprasanje/:id', consultancy.specificQuestion)

router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.redirect(303, '/')
})

router.get(
  '/vprasanje/admin/novo',
  user.canAdministrateConsultancy,
  consultancyAdmin.new
)

router.get(
  '/vprasanje/admin/svetovalci',
  user.canAdministrateConsultancy,
  consultancyAdmin.users
)

router.get(
  '/vprasanje/admin/zavrnjeno',
  user.canAdministrateConsultancy,
  consultancyAdmin.rejected
)

router.get(
  '/vprasanje/admin/objavljeno',
  user.canConsult,
  consultancyAdmin.published
)

router.get(
  '/vprasanje/admin/pripravljeno',
  user.canAdministrateConsultancy,
  consultancyAdmin.prepared
)

router.get(
  '/vprasanje/admin/v-delu',
  user.canConsult,
  consultancyAdmin.inProgress
)

// router.get('/vprasanje/admin/statistika', consultancyAdmin.statistics)

router.get(
  '/vprasanje/admin/urejanje/:id',
  user.canConsultEntry,
  consultancyAdmin.edit
)

module.exports = router
