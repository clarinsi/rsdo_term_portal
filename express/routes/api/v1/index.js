const router = require('express-promise-router')()
const commentsRouter = require('./comments')
const systemRouter = require('./system')
const usersRouter = require('./users')
const entriesRouter = require('./entries')
const dictionariesRouter = require('./dictionaries')
const portalsRouter = require('./portals')
const searchRouter = require('./search')
const consultancyRouter = require('./consultancy')
const extractionRouter = require('./extraction')

router.use('/comments', commentsRouter)
router.use('/system', systemRouter)
router.use('/users', usersRouter)
router.use('/entries', entriesRouter)
router.use('/dictionaries', dictionariesRouter)
router.use('/portals', portalsRouter)
router.use('/search', searchRouter)
router.use('/consultancy', consultancyRouter)
router.use('/extraction', extractionRouter)

module.exports = router
