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
  let extractions = []
  if (req.user) {
    extractions = await Extraction.fetchAllForUser(req.user.id)
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
  }

  res.render('pages/extraction/list', {
    title: req.t('Seznam luščenj'),
    extractions
  })
}

extraction.create = async (req, res) => {
  const extractionCount = await Extraction.countAllForUser(req.user.id)
  if (extractionCount >= MAX_EXTRACTIONS_PER_USER) {
    // TODO Tukaj bo treba prikazati tudi obvestilo uporabniku skladno s trenutno metodologijo prikaza obvestil.
    return res.redirect(303, 'back')
  }

  const extractionName = req.t('Luščenje') + `${extractionCount + 1}`
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
  res.redirect(303, `luscenje/${extractionId}`)
}

extraction.validateOwnership = async (req, res, next) => {
  const { id: extractionId } = req.params
  if (!extractionId) return res.redirect(303, '/')

  const extraction = await Extraction.fetch(extractionId)
  if (extraction.userId !== req.user.id) return res.redirect(303, '/')

  req.extractionData = extraction
  next()
}

extraction.edit = async (req, res) => {
  const extractionId = req.params.id
  const extraction = req.extractionData

  if (extraction.ossParams) {
    const [allPrimaryDomains, ossDocumentTypes, stopTermsFiles] =
      await Promise.all([
        Dictionary.fetchAllPrimaryDomains(req.determinedLanguage),
        Extraction.fetchOssDocumentTypes(req.determinedLanguage),
        Extraction.fetchAllStopTermsFilesStats(extractionId)
      ])
    const { params } = extraction.ossParams
    const domainUdk = params?.domainUdk?.[0]
    if (domainUdk) {
      extraction.domainId = await Domain.fetchIdByUdkCode(domainUdk)
    }
    extraction.documentType = intoDbArray(params.documentType, 'always')
    extraction.year = intoDbArray(params.year, 'always')
    extraction.keywords = intoDbArray(params.keywords, 'always')

    res.render('pages/extraction/edit-oss', {
      title: req.t('Besedila'),
      id: extractionId,
      extraction,
      allPrimaryDomains,
      ossDocumentTypes,
      stopTermsFiles
    })
  } else {
    const [extractionDocuments, stopTermsFiles] = await Promise.all([
      Extraction.fetchAllDocumentsStats(extractionId),
      Extraction.fetchAllStopTermsFilesStats(extractionId)
    ])
    res.render('pages/extraction/edit-own', {
      title: req.t('Besedila'),
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
  res.redirect(303, `./${extractionId}`)
}

extraction.docsEdit = async (req, res) => {
  const extractionId = req.params.id
  const extractionDocuments = await Extraction.fetchAllDocumentsStats(
    extractionId
  )

  res.render('pages/extraction/docs-edit', {
    title: req.t('Besedila'),
    id: extractionId,
    extractionDocuments
  })
}

extraction.stopTermsEdit = async (req, res) => {
  const extractionId = req.params.id
  const stopTermsFiles = await Extraction.fetchAllStopTermsFilesStats(
    extractionId
  )

  res.render('pages/extraction/stop-terms-edit', {
    title: req.t('Stop termini'),
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

  res.render('pages/extraction/term-candidates', {
    title: req.t('Terminološki kandidati'),
    extractionId,
    termCandidatesJson,
    firstPageOfTermCandidates,
    hitsPerPage,
    numberOfAllPages
  })
}

module.exports = extraction
