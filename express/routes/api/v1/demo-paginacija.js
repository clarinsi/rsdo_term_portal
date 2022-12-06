const router = require('express-promise-router')()
const demoPaginacija = require('../../../controllers/api/v1/demo-paginacija')

// Tale endpoint vrača rezultate.
router.get('/list', demoPaginacija.list)

module.exports = router
