const { randomBytes } = require('crypto')
const { promisify } = require('util')
const passport = require('passport')
const User = require('../models/user')
const email = require('../models/email')
const { origin } = require('../config/keys')
const { rememberMeCookieSettings } = require('../config/settings')
const RandomBytesAsync = promisify(randomBytes)
const { DEFAULT_HITS_PER_PAGE } = require('../config/settings')

const user = {}

user.register = async (req, res) => {
  // TODO Add validation.
  const userId = await User.create(req.body)
  const activationToken = (await RandomBytesAsync(32)).toString('hex')
  await User.saveActivationToken(userId, activationToken)
  const { email: userEmail, username } = req.body
  let activationLink = new URL('/users/activate', origin)
  activationLink.searchParams.set('token', activationToken)
  activationLink = activationLink.href
  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync('email/user-activation', {
    username,
    activationLink
  })
  await email.send({
    to: userEmail,
    subject: 'Aktivacija računa',
    html: emailHtml
  })
  res.send('Registracija uspešna')
}

user.activateAccount = async (req, res) => {
  // TODO Add validation. What if user is already logged in? What if account is already active? ...
  const { token } = req.query
  const user = await User.fetchByActivationToken(token)
  await User.activateAccount(user)
  const loginAsync = promisify(req.login.bind(req))
  await loginAsync(user)
  res.redirect('/')
}

user.login = async (req, res, next) => {
  passport.authenticate(
    'local',
    {
      badRequestMessage:
        'Nepravilno uporabniško ime, elektronski naslov ali geslo.'
    },
    async (err, user, info) => {
      if (err) return next(err)

      if (!user) {
        const err = Error(info.message)
        err.status = 403
        err.displayInProd = true
        return next(err)
      }

      const loginAsync = promisify(req.login.bind(req))
      await loginAsync(user)

      if (req.body.rememberMe) {
        // TODO Consider what happens if the user already has a remember me token.
        const rememberMeToken = await User.generateRememberMeToken()
        await User.saveRememberMeToken(user, rememberMeToken)
        res.cookie('remember_me', rememberMeToken, rememberMeCookieSettings)
      }

      res.send('Prijava uspešna')
    }
  )(req, res, next)
}

user.logout = async (req, res) => {
  const rememberMeToken = req.signedCookies.remember_me

  if (rememberMeToken) {
    res.clearCookie('remember_me')
    await User.clearRememberMeToken(rememberMeToken)
  }

  req.logout()
  // Manually clear session.passport due to bug in current passport version.
  delete req.session.passport.user
  res.redirect('/')
}

user.list = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { pages_total: numberOfAllPages, results } = await User.fetchAll(
    resultsPerPage,
    1
  )
  res.render('pages/admin/user-list', {
    title: 'Seznam slovarjeva',
    numberOfAllPages,
    results
  })
}

user.listAllWithPortalRoles = async (req, res) => {
  const users = await User.fetchAllWithPortalRoles()
  res.render('pages/admin/user-portals', { title: 'Seznam slovarjev', users })
}

user.findByUsernameOrEmail = async (req, res) => {
  const userNameEmail = req.query.userNameEmail
  const searchedUser = await User.findByUsernameOrEmail(userNameEmail)
  res.send(searchedUser)
}

user.updateRoles = async (req, res) => {
  await User.updatePortalRoles(req.body.rolesPerUser)
  res.redirect('back')
}

user.adminEdit = async (req, res) => {
  const userId = req.params.userId
  const [userData, userRoles] = await Promise.all([
    User.fetchUser(userId),
    User.fetchUserRoles(userId)
  ])
  res.render('pages/admin/user-edit', {
    title: 'Urejanje uporabnikov',
    userData,
    userRoles
  })
}

// TODO Aljaž: Luka, please adjust update function for updating user's password and email
// TODO Handle username unique constraint failure.
user.adminUpdate = async (req, res) => {
  const { userId } = req.params
  await User.updateUser(userId, req.body)
  res.redirect('back')
}

module.exports = user
