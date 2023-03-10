const { rm } = require('fs/promises')
const Dictionary = require('../../../models/dictionary')
const Entry = require('../../../models/entry')
const Extraction = require('../../../models/extraction')
const {
  searchEntryIndex,
  deleteEntryFromIndex,
  deleteDictionaryEntriesFromIndex
} = require('../../../models/search-engine')
const genEditorAllQuery = require('../../../models/helpers/search/generate-query/editor/all')
const { prepareEditorEntries } = require('../../../models/helpers/search')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')
const { minEntriesRequirementCheckAndAct } = require('../../helpers/dictionary')
const { getExportFilesPath } = require('../../../models/helpers/dictionary')

const dictionary = {}

dictionary.getEntry = async (req, res) => {
  const entryId = req.query.id
  const [entry, domainLabels] = await Promise.all([
    Entry.fetchFull(entryId),
    Dictionary.fetchDomainLabelsFromEntryId(entryId)
  ])

  const data = {
    entry,
    allDomainLabels: domainLabels
  }
  res.send(data)
}

dictionary.createEntry = async (req, res) => {
  const { body } = req
  const { dictionaryId } = body

  const entryId = await Entry.create(req.user.id, dictionaryId, body)
  await Promise.all([
    Dictionary.updateMetadataAfterModifyingEntries(dictionaryId),
    Entry.indexIntoSearchEngine(entryId, true)
  ])

  res.send({ entryId })
}

dictionary.updateEntry = async (req, res) => {
  const { entryId } = req.body
  const dictionaryId = await Entry.update(req.user.id, req.body)
  await Promise.all([
    Dictionary.updateMetadataAfterModifyingEntry(entryId),
    Entry.indexIntoSearchEngine(entryId, true),
    minEntriesRequirementCheckAndAct.onUpdate(dictionaryId)
  ])
  res.end()
}

dictionary.fetchEntries = async (req, res) => {
  const dictionaryId = req.query.id
  const hitsQuery = genEditorAllQuery(dictionaryId)
  const hits = await searchEntryIndex(hitsQuery)

  const terms = prepareEditorEntries(hits)
  res.send(terms)
}

// This function deletes selected entry.
dictionary.deleteEntry = async (req, res) => {
  const { entryId } = req.query
  const dictionaryId = await Entry.delete(entryId)
  await Promise.all([
    Dictionary.updateMetadataAfterModifyingEntries(dictionaryId),
    deleteEntryFromIndex(entryId, true),
    minEntriesRequirementCheckAndAct.onDelete(dictionaryId, req.app)
  ])

  res.end()
}

// This function deletes all entries in seleceted dictionary.
dictionary.deleteAllEntries = async (req, res) => {
  // TODO This method executes all delete operations before sending the response,
  // TODO after which the client tells the user it might take a few minutes.
  const dictionaryId = +req.params.dictionaryId
  await Entry.deleteAll(dictionaryId)
  await Promise.all([
    Dictionary.updateMetadataAfterModifyingEntries(dictionaryId),
    deleteDictionaryEntriesFromIndex(dictionaryId),
    minEntriesRequirementCheckAndAct.onDelete(dictionaryId, req.app)
  ])

  res.end()
}

dictionary.publishAllEntries = async (req, res) => {
  // // TODO This method executes all operations before sending the response,
  // // TODO after which the client tells the user it might take a few minutes.
  // // TODO Also, the message is generic and the same as with deleting a dictionary or all of its entries.

  const dictionaryId = +req.params.dictionaryId

  await Entry.publishAllQualified(dictionaryId)

  // TODO Consider reducing the following two index operations into a single one.
  await Promise.all([
    Dictionary.updateMetadataAfterModifyingEntries(dictionaryId),
    deleteDictionaryEntriesFromIndex(dictionaryId)
  ])

  await Dictionary.indexIntoSearchEngine(dictionaryId)

  res.end()
}

dictionary.delete = async (req, res) => {
  // TODO This method executes all operations before sending the response,
  // TODO after which the client tells the user it might take a few minutes.
  // TODO It also keeps the user on a page which shouldn't exist anymore.
  // TODO In fact, any value is apparently valid as dictionaryId URL parameter (no validation yet).
  const dictionaryId = +req.params.dictionaryId
  await Dictionary.delete(dictionaryId)
  await deleteDictionaryEntriesFromIndex(dictionaryId)
  const exportFilesPath = getExportFilesPath(dictionaryId)
  await rm(exportFilesPath, { recursive: true, force: true })

  res.end()
}

dictionary.updateDomainLabels = async (req, res) => {
  const { dictionaryId, payload } = req.body.params

  await Dictionary.updateDomainLabel(dictionaryId, payload)
  res.end()
}

dictionary.renovateSecondaryDomains = async (req, res) => {
  const data = req.body.params.payload

  await Dictionary.renovateSecondaryDomains(data)
  res.end()
}

dictionary.getEntryVersionSnapshot = async (req, res) => {
  const { entryId, version } = req.params

  const historySnapshot = await Entry.fetchVersionSnapshot(entryId, version)

  res.send(historySnapshot)
}

dictionary.listDictionaries = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchAllAdminDictionaries(resultsPerPage, page)

  res.send({ page, numberOfAllPages, results })
}

dictionary.listDomainLabels = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const { dictionaryId } = req.params
  const page = +req.query.p > 0 ? +req.query.p : 1

  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchPaginationDomainLabels(
      dictionaryId,
      resultsPerPage,
      page
    )

  res.send({ page, numberOfAllPages, results })
}

dictionary.listFilteredDomainLabels = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const { dictionaryId } = req.params
  const page = +req.query.p > 0 ? +req.query.p : 1

  let { q } = req.query

  if (!q) {
    q = ''
  }

  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchFilteredPaginationDomainLabels(
      dictionaryId,
      q,
      resultsPerPage,
      page
    )

  res.append('page', page)
  res.append('number-of-all-pages', numberOfAllPages)
  res.render('utilities/response-pug-wrapper/domainLabelLister', {
    dictionary: { id: dictionaryId },
    numberOfAllPages,
    results
  })
}

dictionary.listSecondaryDomainData = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  let { q } = req.query
  const page = +req.query.p > 0 ? +req.query.p : 1

  if (!q) {
    q = ''
  }

  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchFilteredSecondaryDomains(q, resultsPerPage, page)

  res.append('page', page)
  res.append('number-of-all-pages', numberOfAllPages)

  res.render('utilities/response-pug-wrapper/secondaryDomainLister', {
    page,
    numberOfAllPages,
    results
  })
}

dictionary.listSecondaryDomains = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const page = +req.query.p > 0 ? +req.query.p : 1
  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchAllSecondaryDomains(resultsPerPage, page)

  res.send({ page, numberOfAllPages, results })
}

dictionary.showImportFromFileForm = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const { dictionaryId } = req.params
  const page = +req.query.p > 0 ? +req.query.p : 1
  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchAllImports(dictionaryId, resultsPerPage, page)

  res.send({ page, numberOfAllPages, results })
}

dictionary.showExportToFileForm = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const { dictionaryId } = req.params
  const page = +req.query.p > 0 ? +req.query.p : 1
  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchExports(dictionaryId, resultsPerPage, page)

  res.send({ page, numberOfAllPages, results })
}

dictionary.importFromExtraction = async (req, res) => {
  const { id: dictionaryId, extractionId } = req.params
  const { from, to } = req.body
  const fromIndex = +from > 1 ? Math.floor(from) - 1 : 0
  const toIndex = Number.isInteger(+(to === '' ? undefined : to))
    ? Math.abs(to)
    : undefined

  // TODO Authentication, authorization, validation.

  const termCandidatesToImport = await Extraction.fetchTermCandidatesSlice(
    extractionId,
    fromIndex,
    toIndex
  )

  await Dictionary.importFromExtraction(
    dictionaryId,
    req.user.id,
    termCandidatesToImport
  )

  await Dictionary.indexIntoSearchEngine(dictionaryId)

  res.end()
}

dictionary.exportBegin = async (req, res) => {
  const dictionaryId = req.params.id
  const exportParams = {
    isValidFilter:
      req.body.isValidFilter === 'on' ? undefined : req.body.isValidFilter,
    isPublishedFilter:
      req.body.isPublishedFilter === 'on'
        ? undefined
        : req.body.isPublishedFilter,
    statusFilter:
      req.body.statusFilter === 'complete'
        ? 'complete'
        : req.body.statusFilter === 'inEdit'
        ? 'in_edit'
        : undefined,
    isTerminologyReviewedFilter:
      req.body.isTerminologyReviewedFilter === 'on'
        ? undefined
        : req.body.isTerminologyReviewedFilter,
    isLanguageReviewedFilter:
      req.body.isLanguageReviewedFilter === 'on'
        ? undefined
        : req.body.isLanguageReviewedFilter,
    exportFileFormat: req.body.exportFileFormat
  }

  const exportId = await Dictionary.beginExport(dictionaryId, exportParams)

  res.end()

  // Explicitcly catch any errors after the response has been sent
  // since the the final error handler won't be able to send another.
  try {
    // TODO Consider delegating processing of export to a seperate process or at least a seperate thread (much like importing, extraction, ...).
    await Dictionary.processExport(exportId)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
  }
}

module.exports = dictionary
