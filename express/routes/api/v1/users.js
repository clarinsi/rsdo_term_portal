const router = require('express-promise-router')()
const user = require('../../../controllers/users')
const users = require('../../../controllers/api/v1/users')

// Validate and create a new user.
router.post('/register', user.register)

// Validate and log the user in.
router.post('/login', user.login)

router.get('/addUser', user.findByUsernameOrEmail)

router.get('/listAllUsers', users.listUsers)

router.post('/hitsPerPage', users.updateHitsPerPage)

router.post('/nameAndSurname', users.updateFristNameAndSurname)

module.exports = router
