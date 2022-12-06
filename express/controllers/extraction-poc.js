const { mkdir } = require('fs/promises')
const {
  getDocumentsPath,
  getStopTermsPath
} = require('../models/helpers/extraction')
const { checkIfcanBegin } = require('./helpers/extraction')
const { MAX_EXTRACTIONS_PER_USER } = require('../config/settings')
const Extraction = require('../models/extraction')
const Dictionary = require('../models/dictionary')
const Domain = require('../models/domain')
const { intoDbArray } = require('../models/helpers')
const { DEFAULT_HITS_PER_PAGE } = require('../config/settings')

const extraction = {}

extraction.list = async (req, res) => {
  let extractions = await Extraction.fetchAllForUser(req.user.id)
  extractions = await Promise.all(
    extractions.map(async extraction => {
      extraction.canBegin = await checkIfcanBegin(extraction)
      if (extraction.status === 'finished') {
        extraction.termCandidatesCount =
          await Extraction.fetchTermCandidatesCount(extraction.id)
      }
      return extraction
    })
  )
  res.render('extraction-poc/list', { extractions })
}

extraction.create = async (req, res) => {
  const extractionCount = await Extraction.countAllForUser(req.user.id)
  if (extractionCount >= MAX_EXTRACTIONS_PER_USER) {
    // TODO Tukaj bo treba prikazati tudi obvestilo uporabniku skladno s trenutno metodologijo prikaza obvestil.
    return res.redirect(303, 'back')
  }

  const extractionName = `Luščenje ${extractionCount + 1}`
  const { extractionType } = req.body

  let extractionId
  if (extractionType === 'own') {
    extractionId = await Extraction.createOwn(req.user.id, extractionName)

    const documentsPath = getDocumentsPath(extractionId)
    const stopTermsPath = getStopTermsPath(extractionId)
    await Promise.all([
      mkdir(documentsPath, { recursive: true }),
      mkdir(stopTermsPath, { recursive: true })
    ])
  } else {
    extractionId = await Extraction.createOss(req.user.id, extractionName)

    const stopTermsPath = getStopTermsPath(extractionId)
    await mkdir(stopTermsPath, { recursive: true })
  }

  // Redirect to extraction edit page.
  res.redirect(`poc/${extractionId}`)
}

extraction.edit = async (req, res) => {
  const extractionId = req.params.id
  const extraction = await Extraction.fetch(extractionId)

  if (extraction.ossParams) {
    const [allPrimaryDomains, stopTermsFiles] = await Promise.all([
      Dictionary.fetchAllPrimaryDomains(),
      Extraction.fetchAllStopTermsFilesStats(extractionId)
    ])
    const { params } = extraction.ossParams
    const domainUdk = params?.domainUdk?.[0]
    if (domainUdk)
      extraction.domainId = await Domain.fetchIdByUdkCode(domainUdk)
    extraction.documentType = intoDbArray(params.documentType, 'always')
    extraction.year = intoDbArray(params.year, 'always')
    extraction.keywords = intoDbArray(params.keywords, 'always')

    res.render('extraction-poc/edit-oss', {
      id: extractionId,
      extraction,
      allPrimaryDomains,
      stopTermsFiles
    })
  } else {
    const [extractionDocuments, stopTermsFiles] = await Promise.all([
      Extraction.fetchAllDocumentsStats(extractionId),
      Extraction.fetchAllStopTermsFilesStats(extractionId)
    ])
    res.render('extraction-poc/edit-own', {
      id: extractionId,
      extraction,
      extractionDocuments,
      stopTermsFiles
    })
  }
}

extraction.updateOwn = async (req, res) => {
  const extractionId = req.params.id
  await Extraction.update(extractionId, req.body.name)

  // Reload page.
  res.redirect(`./${extractionId}`)
}

extraction.docsEdit = async (req, res) => {
  const extractionId = req.params.id
  const extractionDocuments = await Extraction.fetchAllDocumentsStats(
    extractionId
  )

  res.render('extraction-poc/docs-edit', {
    id: extractionId,
    extractionDocuments
  })
}

extraction.stopTermsEdit = async (req, res) => {
  const extractionId = req.params.id
  const stopTermsFiles = await Extraction.fetchAllStopTermsFilesStats(
    extractionId
  )

  res.render('extraction-poc/stop-terms-edit', {
    id: extractionId,
    stopTermsFiles
  })
}

extraction.listTermCandidates = async (req, res) => {
  const extractionId = req.params.id
  const termCandidatesJson = await Extraction.fetchTermCandidatesJson(
    extractionId
  )
  const termCandidates = JSON.parse(termCandidatesJson).terminoloski_kandidati
  const hitsPerPage = +req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const numberOfAllPages = Math.ceil(termCandidates.length / hitsPerPage)
  const firstPageOfTermCandidates = termCandidates.slice(0, hitsPerPage)

  res.render('extraction-poc/term-candidates', {
    extractionId,
    termCandidatesJson,
    firstPageOfTermCandidates,
    hitsPerPage,
    numberOfAllPages
  })
}

module.exports = extraction
