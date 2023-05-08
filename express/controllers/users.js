const { randomBytes } = require('crypto')
const { promisify } = require('util')
const passport = require('passport')
const User = require('../models/user')
const email = require('../models/email')
const { logout: logoutUser } = require('../middleware/user')
const { origin } = require('../config/keys')
const { rememberMeCookieSettings } = require('../config/settings')
const RandomBytesAsync = promisify(randomBytes)
const { DEFAULT_HITS_PER_PAGE } = require('../config/settings')

const user = {}

user.register = async (req, res) => {
  // TODO Add validation.

  const userId = await User.create(
    {
      ...req.body,
      language: req.session.language
    },
    req.t
  )
  const activationToken = (await RandomBytesAsync(32)).toString('hex')
  await User.saveActivationToken(userId, activationToken)
  const { email: userEmail, username } = req.body
  let activationLink = new URL('/users/activate', origin)
  activationLink.searchParams.set('token', activationToken)
  activationLink = activationLink.href
  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync(`email/user-activation_${req.language}`, {
    username,
    activationLink
  })
  await email.send({
    to: userEmail,
    subject: req.t('Aktivacija računa'),
    html: emailHtml
  })
  res.send(req.t('Registracija uspešna'))
}

user.activateAccount = async (req, res) => {
  // TODO Add validation. What if user is already logged in? What if account is already active? ...
  const { token } = req.query
  if (!token) return res.redirect(303, '/')

  const user = await User.activateAccountWithToken(token, req.t)
  const loginAsync = promisify(req.login.bind(req))
  await loginAsync(user)

  if (req.session.language) {
    await User.updateLanguage(user.id, req.session.language)
    delete req.session.language
  }

  req.flash(
    'info',
    req.t('Uspešno ste aktivirali svoj uporabniški račun in se prijavili.')
  )
  res.redirect(303, '/')
}

user.login = async (req, res, next) => {
  passport.authenticate(
    'local',
    {
      badRequestMessage: req.t(
        'Nepravilno uporabniško ime, elektronski naslov ali geslo.'
      )
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

      if (req.session.language) {
        await User.updateLanguage(user.id, req.session.language)
        delete req.session.language
      }

      res.send(req.t('Prijava uspešna'))
    }
  )(req, res, next)
}

user.logout = [logoutUser, (req, res) => res.redirect(303, '/')]

user.generateResetPasswordToken = async (req, res) => {
  const { usernameOrEmail } = req.body
  const user = await User.fetchByUsernameOrEmail(usernameOrEmail)

  if (!user) {
    return res
      .status(400)
      .send(req.t('Nepravilno uporabniško ime ali elektronski naslov.'))
  }

  if (user.status !== 'active') {
    return res
      .status(400)
      .send(
        req.t(
          'Uporabniški račun še ni aktiviran. Kliknite aktivacijsko povezavo, katero smo vam poslali po elektronski pošti.'
        )
      )
  }

  const resetPasswordToken = (await RandomBytesAsync(32)).toString('hex')
  await User.saveResetPasswordToken(user.id, resetPasswordToken)
  const { email: userEmail, username } = user
  let resetPasswordLink = new URL('/ponastavitev-gesla', origin)
  resetPasswordLink.searchParams.set('token', resetPasswordToken)
  resetPasswordLink = resetPasswordLink.href
  const renderAsync = promisify(req.app.render.bind(req.app))
  // TODO i18n - prepare proper slovenian an english email templates
  const emailHtml = await renderAsync(
    `email/user-reset-password-token_${req.language}`,
    {
      username,
      resetPasswordLink
    }
  )
  await email.send({
    to: userEmail,
    subject: req.t('Ponastavitev gesla'),
    html: emailHtml
  })
  res.send()
}

user.changePassword = async (req, res) => {
  const { token, password, passwordRepeat } = req.body

  if (password !== passwordRepeat) {
    return res.status(400).send(req.t('Gesli se ne ujemata'))
  }
  // TODO Add additional password validation (min length, ...)

  const user = await User.resetPasswordWithToken(token, password, req.t)

  const renderAsync = promisify(req.app.render.bind(req.app))
  // TODO i18n - prepare proper slovenian an english email templates
  const emailHtml = await renderAsync(
    `email/user-reset-password-success_${req.language}`,
    {
      username: user.username
    }
  )
  await email.send({
    to: user.email,
    subject: req.t('Uspešna ponastavitev gesla'),
    html: emailHtml
  })

  req.flash('info', req.t('Vaše geslo je bilo uspešno ponastavljeno.'))

  const loginAsync = promisify(req.login.bind(req))
  await loginAsync(user)

  if (req.session.language) {
    await User.updateLanguage(user.id, req.session.language)
    delete req.session.language
  }

  res.send()
}

user.list = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { pages_total: numberOfAllPages, results } = await User.fetchAll(
    resultsPerPage,
    1
  )
  res.render('pages/admin/user-list', {
    title: req.t('Seznam uporabnikov'),
    numberOfAllPages,
    results
  })
}

user.listAllWithPortalRoles = async (req, res) => {
  const users = await User.fetchAllWithPortalRoles()
  res.render('pages/admin/user-portals', {
    title: req.t('Skrbniki portala'),
    users
  })
}

user.findByUsernameOrEmail = async (req, res) => {
  const userNameEmail = req.query.userNameEmail
  const searchedUser = await User.findByUsernameOrEmail(userNameEmail)
  res.send(searchedUser)
}

user.updateRoles = async (req, res) => {
  await User.updatePortalRoles(req.body.rolesPerUser)
  res.redirect(303, 'back')
}

user.adminEdit = async (req, res) => {
  const userId = req.params.userId
  const [userData, userRoles] = await Promise.all([
    User.fetchUser(userId),
    User.fetchUserRoles(userId)
  ])

  if (userData.status === 'closed') return res.redirect(303, '/')

  res.render('pages/admin/user-edit', {
    title: req.t('Uporabnik'),
    userData,
    userRoles
  })
}

// TODO Aljaž: Luka, please adjust update function for updating user's password and email
// TODO Handle username unique constraint failure.
user.adminUpdate = async (req, res) => {
  const { userId } = req.params
  await User.updateUser(userId, req.body)
  res.redirect(303, 'back')
}

module.exports = user
