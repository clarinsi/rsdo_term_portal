const router = require('express-promise-router')()
const v1Router = require('./v1')

// Mark all api calls for conditional special treatment.
router.use((req, res, next) => {
  req.isAjax = true
  next()
})

// TODO Make sure all API endpoints have proper authorization protection (at a later point).
router.use('/v1', v1Router)

module.exports = router
