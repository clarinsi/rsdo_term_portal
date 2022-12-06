const { unlink, rm, mkdir } = require('fs/promises')
const { promisify } = require('util')
const { URLSearchParams } = require('url')
const multer = require('multer')
const validator = require('validator')
const axios = require('axios')
const {
  getExtractionFilesPath,
  getDocumentsPath,
  getStopTermsPath,
  getConllusPath
} = require('../../../models/helpers/extraction')
const { checkIfcanBegin } = require('../../helpers/extraction')
const Extraction = require('../../../models/extraction')
const Domain = require('../../../models/domain')
const email = require('../../../models/email')
const { intoDbArray } = require('../../../models/helpers')
const { origin } = require('../../../config/keys')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')

const MAX_FILE_NAME_LENGTH = 100
const MAX_FILE_SIZE = 10 ** 9 // 1 GB
const VALID_DOCUMENT_EXTENSIONS = ['txt', 'doc', 'docx', 'pdf']
const VALID_STOP_TERMS_FILE_EXTENSION = 'txt'
const MAX_OSS_DOCUMENT_COUNT = 500

const extractionFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const {
      params: { id: extractionId },
      fileType
    } = req
    const destinationPath =
      fileType === 'stopTerms'
        ? getStopTermsPath(extractionId)
        : getDocumentsPath(extractionId)
    cb(null, destinationPath)
  },
  filename: (req, file, cb) => cb(null, file.originalname)
})

const extractionFileBodyParser = multer({
  storage: extractionFileStorage,
  limits: {
    fieldNameSize: 15,
    fieldSize: 10,
    fields: 1,
    fileSize: MAX_FILE_SIZE,
    headerPairs: 500
  },
  fileFilter: extractionFileFilter
}).single('extractionFile')
const parseExtractionFileBody = promisify(extractionFileBodyParser)

const extraction = {}

extraction.delete = async (req, res) => {
  const extractionId = req.params.id
  const corpusId = await Extraction.delete(extractionId)

  if (corpusId) {
    await axios.delete(`http://concordancer:5000/dashboard/corpus/${corpusId}`)
  }

  const extractionFilesPath = getExtractionFilesPath(extractionId)
  await rm(extractionFilesPath, { recursive: true })

  res.end()
}

extraction.docsList = async (req, res) => {
  const extractionId = req.params.id
  const documentsStats = await Extraction.fetchAllDocumentsStats(extractionId)
  res.send(documentsStats)
}

extraction.docsUpdate = async (req, res) => {
  try {
    await parseExtractionFileBody(req, res)
  } catch (error) {
    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      throw Error('File too large. Must not be over 1 GB.')
    }
    throw error
  }
  res.end()
}

extraction.docDelete = async (req, res) => {
  const { id: extractionId, filename } = req.params
  const documentsPath = getDocumentsPath(extractionId)
  const filePath = `${documentsPath}/${filename}`
  await unlink(filePath)
  res.end()
}

extraction.stopTermsList = async (req, res) => {
  const extractionId = req.params.id
  const stopTermsFilesStats = await Extraction.fetchAllStopTermsFilesStats(
    extractionId
  )
  res.send(stopTermsFilesStats)
}

extraction.stopTermsUpdate = async (req, res) => {
  try {
    await parseExtractionFileBody(req, res)
  } catch (error) {
    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      throw Error('File too large. Must not be over 1 GB.')
    }
    throw error
  }
  res.end()
}

extraction.stopTermDelete = async (req, res) => {
  const { id: extractionId, filename } = req.params
  const stopTermsPath = getStopTermsPath(extractionId)
  const filePath = `${stopTermsPath}/${filename}`
  await unlink(filePath)
  res.end()
}

extraction.ossSaveParams = [saveOssParams, (req, res) => res.end()]

extraction.ossSearch = [
  saveOssParams,
  async (req, res) => {
    const { id: extractionId } = req.params
    const { ossParams } = req
    const searchParams = new URLSearchParams({
      ...(ossParams.year && { leta: ossParams.year }),
      ...(ossParams.documentType && { vrste: ossParams.documentType }),
      ...(ossParams.keywords && { kljucneBesede: ossParams.keywords }),
      ...(ossParams.domainUdk && { udk: ossParams.domainUdk })
    })
    const searchApiUrl = `http://rsdo.lhrs.feri.um.si:8080/oss/steviloBesedilPoIskanju?${searchParams}`

    const { data: documentCount } = await axios.get(searchApiUrl)
    const canSave = documentCount && documentCount <= MAX_OSS_DOCUMENT_COUNT
    await Extraction.updateOssParams(extractionId, {
      params: ossParams,
      status: canSave ? 'valid' : 'invalid'
    })
    res.send({ documentCount, canSave })
  }
]

extraction.ossConfirmParams = async (req, res) => {
  const { id: extractionId } = req.params
  const { ossParams } = await Extraction.fetch(extractionId)
  if (ossParams.status !== 'valid') throw Error('OSS params not valid')
  await Extraction.updateOssParams(extractionId, {
    params: ossParams.params,
    status: 'confirmed'
  })
  res.end()
}

extraction.begin = async (req, res) => {
  const extractionId = req.params.id
  const extraction = await Extraction.fetch(extractionId)
  const canBegin = await checkIfcanBegin(extraction)
  if (!canBegin) throw Error('Extraction does not qualify to be ran')

  let timeStarted
  const { ossParams, name: extractionName } = extraction
  if (ossParams) {
    timeStarted = await Extraction.beginOss(extractionId)
  } else {
    const conllusPath = getConllusPath(extractionId)
    await mkdir(conllusPath, { recursive: true })
    const documentsNames = await Extraction.fetchAllDocumentsNames(extractionId)
    timeStarted = await Extraction.beginOwn(extractionId, documentsNames)
  }

  res.send(timeStarted)

  if (ossParams) {
    // TODO This next method is only a temporary solution.
    // TODO It should be called before response and its execution delegated to a seperate process or at least a seperate thread.
    await Extraction.processOss(extractionId, ossParams.params)
  } else {
    // TODO This next method is only a temporary solution.
    // TODO It should be called before response and its execution delegated to a seperate process or at least a seperate thread.
    await Extraction.processOwn(extractionId, extractionName)
  }

  const extractionLink = new URL('/luscenje', origin)
  const renderAsync = promisify(req.app.render.bind(req.app))
  const authorEmail = await Extraction.fetchAuthorEmail(extractionId)
  const emailHtml = await renderAsync('email/extraction-done', {
    extractionName,
    extractionLink
  })
  await email.send({
    to: authorEmail,
    subject: 'Luščenje končano',
    html: emailHtml
  })
}

extraction.duplicate = async (req, res) => {
  // TODO Validate, if can be duplicated: status = finished or failed.
  // TODO Execute duplication.
  res.send('DUPLICATING!')
}

extraction.termCandidatesExport = async (req, res) => {
  // TODO CSV logic (Luka's task)
  // const extractionId = req.params.id
  // const { from, to } = req.query
  // const fromIndex = +from > 1 ? Math.floor(from) - 1 : 0
  // const toIndex = Number.isInteger(+to) ? Math.abs(to) : undefined
  // console.log({ extractionId, fromIndex, toIndex })
  res.download('public/images/help-amebis-logo-pug-demo.png')
}

extraction.listFinishedForUser = async (req, res) => {
  const extractions = await Extraction.fetchFinishedForUser(req.user.id)
  res.send(extractions)
}

extraction.listTermCandidates = async (req, res) => {
  const extractionId = req.params.id
  const termCandidatesJson = await Extraction.fetchTermCandidatesJson(
    extractionId
  )
  const termCandidates = JSON.parse(termCandidatesJson).terminoloski_kandidati
  const hitsPerPage = +req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const numberOfAllPages = Math.ceil(termCandidates.length / hitsPerPage)

  res.send({ hitsPerPage, numberOfAllPages, termCandidates })
}

function extractionFileFilter(req, file, cb) {
  let fileType
  switch (req.path.split('/').at(-1)) {
    case 'documents':
      fileType = 'document'
      break

    case 'stop-terms':
      fileType = 'stopTerms'
      break

    default:
      return cb(Error('Invalid API endpoint'))
  }

  const filenamePartsArray = file.originalname.split('.')

  const fileExtension = filenamePartsArray.pop()
  if (
    (fileType === 'document' &&
      !VALID_DOCUMENT_EXTENSIONS.includes(fileExtension)) ||
    (fileType === 'stopTerms' &&
      fileExtension !== VALID_STOP_TERMS_FILE_EXTENSION)
  ) {
    return cb(Error('Invalid file type'))
  }

  const fileName = filenamePartsArray.join('.')
  if (!fileName || fileName.length > MAX_FILE_NAME_LENGTH) {
    return cb(
      Error(
        `Filename must be between 1 and ${MAX_FILE_NAME_LENGTH} characters long.`
      )
    )
  }
  if (!validator.isAlphanumeric(fileName[0], 'sl-SI', { ignore: '_' })) {
    return cb(
      Error(
        'Filename must begin with an alphanumeric character or an underscore.'
      )
    )
  }
  if (!validator.isAlphanumeric(fileName, 'sl-SI', { ignore: ' _-.' })) {
    return cb(
      Error(
        'Filename can only contain alphanumeric characters, spaces, underscores, minuses and periods.'
      )
    )
  }

  req.fileType = fileType
  cb(null, true)
}

async function saveOssParams(req, res, next) {
  const { id: extractionId } = req.params
  const { body } = req
  const ossParams = {
    ...(body.domain && {
      domainUdk: intoDbArray(
        (await Domain.fetchById(body.domain)).udkCode,
        'always'
      )
    }),
    ...(body.documentType && {
      documentType: intoDbArray(body.documentType, 'always').map(type => +type)
    }),
    ...(body.year && {
      year: intoDbArray(body.year, 'always').map(year => +year)
    }),
    ...(body.keywords && {
      keywords: intoDbArray(body.keywords, 'always')
    })
  }

  await Extraction.update(extractionId, body.name)
  await Extraction.updateOssParams(extractionId, {
    params: ossParams,
    status: 'unvalidated'
  })

  req.ossParams = ossParams
  next()
}

module.exports = extraction
