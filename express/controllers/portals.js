const portal = {}
const Portal = require('../models/portal')
const Comment = require('../models/comment')
const { clearCachedInstanceSettings } = require('../models/helpers')
const { DEFAULT_HITS_PER_PAGE } = require('../config/settings')

portal.instanceSettings = async (req, res) => {
  const portal = await Portal.fetchInstanceSettings()

  res.render('pages/admin/portal', {
    title: req.t('Nastavitve portala'),
    portal
  })
}

portal.updateInstaceSettings = async (req, res) => {
  const payload = req.body
  await Portal.updateInstaceSettings(payload)
  await clearCachedInstanceSettings()
  res.redirect('/admin/nastavitve/portal')
}

portal.instanceDictSettings = async (req, res) => {
  const dictionary = await Portal.fetchInstanceDictSettings()

  res.render('pages/admin/settings-dictionaries', {
    title: req.t('Nastavitve slovarjev'),
    dictionary
  })
}

portal.updateInstanceDictSettings = async (req, res) => {
  const payload = req.body
  await Portal.updateInstaceDictSettings(payload)
  await clearCachedInstanceSettings()
  res.redirect('/admin/nastavitve/slovarji')
}

portal.instanceConsultancySettings = async (req, res) => {
  const consultancy = await Portal.fetchInstanceConsultancySettings()
  res.render('pages/admin/portal-consultancy-settings', {
    title: req.t('Nastavitve svetovalnice'),
    consultancy
  })
}

portal.updateInstanceConusltacySettings = async (req, res) => {
  const payload = req.body
  await Portal.updateInstaceConsultancySettings(payload)
  await clearCachedInstanceSettings()
  res.redirect('/admin/nastavitve/svetovalnica')
}

portal.new = async (req, res) => {
  res.render('pages/admin/new-connection', {
    title: req.t('Nova povezava')
  })
}

portal.list = async (req, res) => {
  const allLinkedPortals = await Portal.fetchAll()

  res.render('pages/admin/connections-list', {
    title: req.t('Seznam povezav'),
    allLinkedPortals
  })
}

portal.fetchPortal = async (req, res) => {
  const portalId = req.params.portalId
  const portal = await Portal.fetchPortal(portalId)

  res.render('pages/admin/portal-edit', {
    title: req.t('Uredi povezavo'),
    portal
  })
}

portal.updatePortal = async (req, res) => {
  const portalId = req.params.portalId
  const payload = req.body
  await Portal.update(portalId, payload)
  res.redirect('/admin/povezave/seznam')
}

portal.fetchSelectedLinkedDictionaries = async (req, res) => {
  const linkedId = req.params.portalId
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { pages_total: numberOfAllPages, results } =
    await Portal.fetchSelectedLinkedDictionaries(linkedId, resultsPerPage, 1)

  res.render('pages/admin/portal-list-dict', {
    title: req.t('Slovarji portala'),
    linkedId,
    numberOfAllPages,
    results
  })
}

portal.updateSelectedDictionaries = async (req, res) => {
  const linkedId = req.params.portalId
  await Portal.updateSelectedDictionaries(linkedId, req.body)
  res.redirect('back')
}

portal.fetchAllLinkedDictionaries = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { pages_total: numberOfAllPages, results } =
    await Portal.fetchAllLinkedDictionaries(resultsPerPage, 1)

  res.render('pages/admin/portals-all-linked-dictionaries', {
    title: req.t('Povezani slovarji'),
    numberOfAllPages,
    results
  })
}

portal.updateAllDictionaries = async (req, res) => {
  await Portal.updateAllDictionaries(req.body)
  res.redirect('back')
}

portal.comments = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const type = 'portal'
  const filters = { ctxType: type }
  const { comments, pages_total: numberOfAllPages } = await Comment.list(
    filters,
    req.user,
    resultsPerPage,
    1
  )
  res.render('pages/admin/comments', {
    title: req.t('Komentarji'),
    numberOfAllPages,
    dictionary: { id: req.params.dictionaryId },
    comments
  })
}

module.exports = portal
