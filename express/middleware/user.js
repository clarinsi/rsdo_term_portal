const User = require('../models/user')

const user = {}

user.enhance = (req, res, next) => {
  // Make req.user available to view engine.
  res.locals.user = req.user

  // Extend the req.user object with 3 rolechecking methods.
  if (!req.user) return next()
  req.user.hasRole = hasRole
  req.user.hasDictionaryRole = hasDictionaryRole
  req.user.hasAnyDictionaryRole = hasAnyDictionaryRole
  req.user.isEditorOfConsultancyEntry = isEditorOfConsultancyEntry

  next()
}

user.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.isPortalAdmin = (req, res, next) => {
  const isPortalAdmin = req.user.hasRole('portal admin')

  if (isPortalAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.isDictionaryAdmin = (req, res, next) => {
  const { dictionaryId } = req.params
  const isAdmin = req.user.hasDictionaryRole(dictionaryId, 'administration')

  if (isAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.isDictionaryEditor = (req, res, next) => {
  const dictionaryId = req.params.dictionaryId || req.dictionaryId
  const isEditor = req.user.hasAnyDictionaryRole(dictionaryId)

  if (isEditor) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.canAdministrateDictionary = (req, res, next) => {
  const dictionaryId = req.params.dictionaryId || req.dictionaryId
  const isAdmin = req.user.hasDictionaryRole(dictionaryId, 'administration')
  const isPortalAdmin = req.user.hasRole('portal admin')
  const isDictionariesAdmin = req.user.hasRole('dictionaries admin')
  if (isAdmin || isPortalAdmin || isDictionariesAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.canAdministrateDictionaries = (req, res, next) => {
  const isPortalAdmin = req.user.hasRole('portal admin')
  const isDictionariesAdmin = req.user.hasRole('dictionaries admin')
  if (isPortalAdmin || isDictionariesAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.canContentEdit = (req, res, next) => {
  const { dictionaryId } = req.params
  const isEditor = req.user.hasAnyDictionaryRole(dictionaryId)
  const isPortalAdmin = req.user.hasRole('portal admin')
  const isDictionariesAdmin = req.user.hasRole('dictionaries admin')
  if (isEditor || isPortalAdmin || isDictionariesAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.canAdministrateConsultancy = (req, res, next) => {
  const isPortalAdmin = req.user.hasRole('portal admin')
  const isConsultancyAdmin = req.user.hasRole('consultancy admin')
  if (isPortalAdmin || isConsultancyAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.canConsult = (req, res, next) => {
  const isConsultant = req.user.hasRole('consultant')
  const isPortalAdmin = req.user.hasRole('portal admin')
  const isConsultancyAdmin = req.user.hasRole('consultancy admin')
  if (isConsultant || isPortalAdmin || isConsultancyAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.canConsultEntry = (req, res, next) => {
  const id = req.params.id || req.entryId
  const isConsultantForEntry = req.user.isEditorOfConsultancyEntry(id)
  const isPortalAdmin = req.user.hasRole('portal admin')
  const isConsultancyAdmin = req.user.hasRole('consultancy admin')
  if (isConsultantForEntry || isPortalAdmin || isConsultancyAdmin) return next()

  if (req.isAjax) return res.status(400).end()
  res.redirect(303, req.baseUrl || '/')
}

user.logout = async (req, res, next) => {
  const rememberMeToken = req.signedCookies.remember_me

  if (rememberMeToken) {
    res.clearCookie('remember_me')
    await User.clearRememberMeToken(rememberMeToken)
  }

  req.session.language = req.user.language

  req.logout()
  // Manually clear session.passport due to bug in current passport version.
  delete req.session.passport.user

  next()
}

/**
 * Checks if the user has a specific role.
 *
 * @param {'portal admin'|'dictionaries admin'|'consultancy admin'|'consultant'|'editor'} roleName
 * @returns {boolean}
 */
function hasRole(roleName) {
  return this.userRoles.some(role => role.roleName === roleName)
}

/**
 * Checks if the user has a specific dictionary role.
 *
 * @param {number} dictionaryId
 * @param {'administration'|'terminologyReview'|'languageReview'|'editing'} roleName
 * @returns {boolean}
 */
function hasDictionaryRole(dictionaryId, roleName) {
  return this.userRoles.some(role => {
    const validDictionaryRoles = [
      'administration',
      'editing',
      'terminologyReview',
      'languageReview'
    ]
    return (
      role.dictionaryId === +dictionaryId &&
      role.roleName === 'editor' &&
      validDictionaryRoles.includes(roleName) &&
      role[roleName]
    )
  })
}

/**
 * Checks if the user has any dictionary role for the specified dictionary.
 *
 * @param {number} dictionaryId
 * @returns {boolean}
 */
function hasAnyDictionaryRole(dictionaryId) {
  return this.userRoles.some(role => {
    return role.dictionaryId === +dictionaryId && role.roleName === 'editor'
  })
}

/**
 * Checks if the user is an editor of the speficied consultancy entry.
 *
 * @param {number} consultancyEntryId
 * @returns {boolean}
 */
function isEditorOfConsultancyEntry(consultancyEntryId) {
  return this.assignedConsultancyEntries.some(entry => {
    return entry.id === +consultancyEntryId
  })
}

module.exports = user
