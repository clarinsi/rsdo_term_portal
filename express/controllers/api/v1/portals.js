const Portal = require('../../../models/portal')
const axios = require('axios')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')

const portal = {}

portal.create = async (req, res) => {
  const portal = await Portal.create(req.body)
  res.send(portal)
}

portal.syncRemoteDictionaries = async (req, res) => {
  const { linkedPortalId } = req.params
  const { indexURL } = await Portal.fetchPortal(linkedPortalId)

  const { data: dictionaries } = await axios.get(indexURL)

  await Portal.syncRemoteDictionaries(linkedPortalId, dictionaries)

  res.end()
}

portal.deleteLinkedDictionary = async (req, res) => {
  const { linkedPortalId } = req.params
  await Portal.deleteLinkedDictionary(linkedPortalId)
  res.end()
}

portal.fetchDictionary = async (req, res) => {
  const portalId = req.query.id
  const dictionaries = await Portal.fetchDictionaries(portalId)
  res.send(dictionaries)
}

portal.updatePortalStatus = async (req, res) => {
  const portalId = req.body.params.id
  const isEnabled = req.body.params.isEnabled
  await Portal.updatePortalStatus(portalId, isEnabled)
  res.end()
}

portal.listSelectedLinkedDicts = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const { portalId } = req.params
  const page = +req.query.p > 0 ? +req.query.p : 1

  const { pages_total: numberOfAllPages, results } =
    await Portal.fetchSelectedLinkedDictionaries(portalId, resultsPerPage, page)

  res.send({ page, numberOfAllPages, results })
}

portal.listAllLinkedDicts = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const page = +req.query.p > 0 ? +req.query.p : 1

  const { pages_total: numberOfAllPages, results } =
    await Portal.fetchAllLinkedDictionaries(resultsPerPage, page)

  res.send({ page, numberOfAllPages, results })
}

module.exports = portal
