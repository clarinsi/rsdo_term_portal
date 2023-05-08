const router = require('express-promise-router')()
const user = require('../../../controllers/users')
const users = require('../../../controllers/api/v1/users')
const userAuth = require('../../../middleware/user')

// Validate and create a new user.
router.post('/register', user.register)

// Validate and log the user in.
router.post('/login', user.login)

// Supply user with the token to set a new password.
router.post('/reset-password-init', user.generateResetPasswordToken)

// Validate new passwords, change if successful and sign the user in.
router.post('/reset-password-submit', user.changePassword)

// Find user by username or email in dictionary or admin console.
router.get(
  '/addUser',
  userAuth.isAuthenticated,
  userAuth.canAdministrateDictionary,
  user.findByUsernameOrEmail
)

// List all users in the admin console.
router.get(
  '/listAllUsers',
  userAuth.isAuthenticated,
  userAuth.isPortalAdmin,
  users.listUsers
)

// Update hits per page setting of the requesting user.
router.post('/hitsPerPage', users.updateHitsPerPage)

// Update first name, last name and email of the requesting user.
router.post('/basic-data', users.updateBasicData)

// Update password of the requesting user.
router.post('/password', users.updatePassword)

// Delete user profile of the requesting user.
router.delete('/current', users.deleteCurrent)

module.exports = router
