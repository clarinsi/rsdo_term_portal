const { randomBytes } = require('crypto')
const { promisify } = require('util')
const RandomBytesAsync = promisify(randomBytes)
const User = require('../../../models/user')
const email = require('../../../models/email')
const { logout: logoutUser } = require('../../../middleware/user')
const { origin } = require('../../../config/keys')
const {
  DEFAULT_HITS_PER_PAGE,
  CHANGE_EMAIL_TOKEN_VALID_DAYS
} = require('../../../config/settings')

const users = {}
users.listUsers = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  const { pages_total: numberOfAllPages, results } = await User.fetchAll(
    resultsPerPage,
    page
  )

  res.send({ page, numberOfAllPages, results })
}

users.updateHitsPerPage = async (req, res) => {
  const hitAmount = req.body.hitAmount

  await User.updateHitsPerPage(req.user.userName, hitAmount)

  res.status(200).send()
}

users.updateBasicData = async (req, res) => {
  const { firstName, lastName, email: newEmail } = req.body

  // TODO Validation (valid email format, ...).

  const oldEmail = await User.updateFirstNameAndLastName(
    req.user.id,
    firstName,
    lastName
  )

  if (newEmail === oldEmail) return res.send()

  if (await User.isEmailAlreadyTaken(newEmail)) {
    req.flash('info', req.t('Elektronski naslov uporablja že drug uporabnik.'))
    return res.send()
  }

  const changeEmailToken = (await RandomBytesAsync(32)).toString('hex')
  await User.saveChangeEmailToken(req.user.id, changeEmailToken, newEmail)
  let changeEmailLink = new URL('/sprememba-elektronskega-naslova', origin)
  changeEmailLink.searchParams.set('token', changeEmailToken)
  changeEmailLink = changeEmailLink.href
  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync(
    `email/user-change-email-token_${req.language}`,
    {
      username: req.user.userName,
      changeEmailLink
    }
  )
  await email.send({
    to: newEmail,
    subject: req.t('Sprememba elektronskega naslova'),
    html: emailHtml
  })

  const message =
    req.t(
      'Na vaš elektronski naslov smo vam poslali sporočilo s povezavo, s katero boste potrdili menjavo elektronskega naslova. Povezava za potrditev je veljavna '
    ) +
    `${CHANGE_EMAIL_TOKEN_VALID_DAYS} ` +
    req.t('dni.')

  req.flash('info', message)
  res.send()
}

users.updatePassword = async (req, res) => {
  const { passwordOld, passwordNew, passwordNewRepeat } = req.body

  // TODO Validation (mirror front end validation, ...).
  if (passwordNew !== passwordNewRepeat) {
    const err = Error(req.t('Gesli se ne ujemata'))
    err.status = 403
    err.displayInProd = true

    throw err
  }

  await User.changePassword(req.user.id, passwordOld, passwordNew, req.t)

  // TODO Invalidate or log out all session for this user. More details in deleteCurrent method TODO.

  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync(
    `email/user-change-password_${req.language}`,
    {
      username: req.user.userName
    }
  )
  await email.send({
    to: req.user.email,
    subject: req.t('Sprememba gesla'),
    html: emailHtml
  })

  req.flash('info', 'Geslo je bilo spremenjeno.')
  res.send()
}

users.deleteCurrent = [
  async (req, res, next) => {
    await User.closeAccount(req.user.id)
    next()
  },
  logoutUser,
  (req, res) => {
    // TODO Invalidate or log out all session for this user. Current workaround is in passport.deserializeUser.
    // You can probably do it in 1 of 3 ways:
    // 1. Brute force; loop through all sessions (using session store's all or ids methods),
    //    look up their values and remote the ones with user's id
    // 2. Include user Id as part of session key; something similar to https://github.com/tj/connect-redis/issues/210#issuecomment-1336545115
    // 3. Create some kind of inverse index, mapping user id to his/hers sessions (also mentioned in issue linked above)
    req.flash('info', req.t('Vaš uporabniški račun je bil uspešno izbrisan.'))
    res.send()
  }
]

module.exports = users
