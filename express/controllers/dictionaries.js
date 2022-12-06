const { unlink } = require('fs/promises')
const { promisify } = require('util')
const multer = require('multer')
const debug = require('debug')('termPortal:controllers/dictionary')
const Dictionary = require('../models/dictionary')
const Entry = require('../models/entry')
const User = require('../models/user')
const Comment = require('../models/comment')
const genEditorAllQuery = require('../models/helpers/search/generate-query/editor/all')
const { searchEntryIndex } = require('../models/search-engine')
const { prepareEditorEntries } = require('../models/helpers/search')
const { getInstanceSetting } = require('../models/helpers')
const { DEFAULT_HITS_PER_PAGE, DATA_FILES_PATH } = require('../config/settings')
const {
  statusChangeCheckAndAct,
  determineNewStatus
} = require('./helpers/dictionary')
const SFDSuggestionImporter = require('./helpers/search-filter-data-suggestion-importer')
const Extraction = require('../models/extraction')

const importFileBodyParser = multer({
  dest: `${DATA_FILES_PATH}/dict_import_temp`,
  limits: {
    fieldNameSize: 21,
    fieldSize: 9,
    fields: 3,
    fileSize: 1000 * 1000 * 1000, // 1GB
    headerPairs: 500
  },
  fileFilter: importFileFilter
}).single('dictionaryImportFile')
const parseImportFileBody = promisify(importFileBodyParser)

const dictionary = {}

dictionary.list = async (req, res) => {
  let dictionaries
  if (req.isAuthenticated()) {
    dictionaries = await Dictionary.fetchAllByUser(req.user.id)
  }
  res.render('pages/dictionaries/list', {
    title: 'Seznam slovarjev',
    dictionaries
  })
}

dictionary.new = async (req, res) => {
  // TODO Once english language is implemented, gather selected language (sl/en) from request ~ (cookies?)
  const language = 'name_sl'
  const [allPrimaryDomains, allSecondaryDomains, allLanguages] =
    await Promise.all([
      Dictionary.fetchAllPrimaryDomains(),
      Dictionary.fetchAllApprovedSecondaryDomains(),
      Dictionary.fetchAllLanguages(language)
    ])

  res.render('pages/dictionaries/new', {
    title: 'Nov slovar',
    allPrimaryDomains,
    allSecondaryDomains,
    allLanguages
  })
}

dictionary.create = async (req, res) => {
  await Dictionary.create(req.body, req.user.id)
  res.redirect('/slovarji/moji')
}

dictionary.editDescription = async (req, res) => {
  const { dictionaryId } = req.params
  const [
    allPrimaryDomains,
    allSecondaryDomains,
    dictionary,
    associatedSecondaryDomains
  ] = await Promise.all([
    Dictionary.fetchAllPrimaryDomains(),
    Dictionary.fetchAllApprovedSecondaryDomains(),
    Dictionary.fetchEditDescription(dictionaryId),
    Dictionary.fetchSecondaryDomains(dictionaryId)
  ])

  res.render('pages/dictionaries/description', {
    title: 'Ime in opis',
    allPrimaryDomains,
    allSecondaryDomains,
    dictionary,
    associatedSecondaryDomains
  })
}

dictionary.updateDescription = async (req, res) => {
  const { dictionaryId } = req.params
  const { body } = req

  // TODO Consider using a transaction.
  await Promise.all([
    Dictionary.updateDescription(dictionaryId, body),
    Dictionary.deleteSecondaryDomains(dictionaryId, body),
    Dictionary.updateSecondaryDomains(dictionaryId, body)
  ])

  res.redirect('back')
}

dictionary.editUsers = async (req, res) => {
  const dictionaryId = req.params.dictionaryId
  const [dictionary, userRights, entriesCount, minEntries, publishApproval] =
    await Promise.all([
      Dictionary.fetchEditUsers(dictionaryId),
      User.fetchAllWithDictionaryRights(dictionaryId),
      Dictionary.countPublishedEntries(dictionaryId),
      getInstanceSetting('min_entries_per_dictionary'),
      getInstanceSetting('dictionary_publish_approval')
    ])

  let viewPath
  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/users'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-users'
  }

  res.render(viewPath, {
    title: 'Uporabniki',
    dictionary,
    userRights,
    entriesCount,
    minEntries,
    publishApproval
  })
}

dictionary.updateUsers = async (req, res) => {
  // TODO Due to reindexing of all of dictionary entries on status change, this operation might take a while.
  // TODO Stress test and consider either a notification to user or alteast a progress indicator while they wait.
  const { dictionaryId } = req.params
  const isPublished = req.body.isPublished === 'on'

  const newDictStatus = await determineNewStatus(isPublished)

  const { nameSl, status: oldDictStatus } = await Dictionary.fetchEditUsers(
    dictionaryId
  )

  await Promise.all([
    Dictionary.updateUsers(dictionaryId, req.body, newDictStatus),
    User.updateUserRights(dictionaryId, req.body.rightsPerUser)
  ])

  if (newDictStatus !== oldDictStatus) {
    if (newDictStatus === 'published') {
      await Dictionary.updateTimePublished(dictionaryId)
    }
    await Dictionary.indexIntoSearchEngine(dictionaryId)
  }

  await statusChangeCheckAndAct.updateUsers(
    dictionaryId,
    isPublished,
    oldDictStatus,
    nameSl,
    req.app,
    req.user
  )

  res.redirect('back')
}

dictionary.editStructure = async (req, res) => {
  // TODO Once english language is implemented, gather selected language (sl/en) from request ~ (cookies?)
  const language = 'name_sl'
  const { dictionaryId } = req.params
  const [dictionary, associatedLanguages, allLanguages] = await Promise.all([
    Dictionary.fetchEditStructure(dictionaryId),
    Dictionary.fetchLanguages(dictionaryId),
    Dictionary.fetchAllLanguages(language)
  ])

  let viewPath
  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/structure'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-structure'
  }

  res.render(viewPath, {
    title: 'Struktura slovarskega sestavka',
    dictionary,
    associatedLanguages,
    allLanguages
  })
}

dictionary.updateStructure = async (req, res) => {
  const { body } = req
  const { dictionaryId } = req.params

  // TODO Consider using a transaction.
  await Promise.all([
    Dictionary.updateStructure(dictionaryId, body),
    Dictionary.deleteLanguages(dictionaryId),
    Dictionary.updateLanguages(dictionaryId, body)
  ])
  res.redirect('back')
}

dictionary.editAdvanced = async (req, res) => {
  const { dictionaryId } = req.params
  const dictionaryName = await Dictionary.fetchName(dictionaryId)
  let viewPath
  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/advanced'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-advanced'
  }

  res.render(viewPath, {
    title: 'Napredno',
    dictionary: { id: req.params.dictionaryId },
    dictionaryName
  })
}

dictionary.comments = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  let viewPath
  const { dictionaryId } = req.params
  const type = 'dictionary'
  const filters = { ctxType: type, ctxId: dictionaryId }
  const [{ comments, pages_total: numberOfAllPages }, dictionaryName] =
    await Promise.all([
      Comment.list(filters, req.user, resultsPerPage, 1),
      Dictionary.fetchName(dictionaryId)
    ])

  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/dictionary-comments'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-comments'
  }

  res.render(viewPath, {
    title: 'Komentarji',
    numberOfAllPages,
    dictionary: { id: req.params.dictionaryId },
    comments,
    dictionaryName
  })
}

dictionary.showImportFromFileForm = async (req, res) => {
  const { dictionaryId } = req.params
  const [imports, dictionaryName] = await Promise.all([
    Dictionary.fetchAllImports(dictionaryId),
    Dictionary.fetchName(dictionaryId)
  ])
  let viewPath
  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/import'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-import'
  }

  res.render(viewPath, {
    title: 'Uvoz iz datoteke',
    dictionary: { id: dictionaryId },
    imports,
    dictionaryName
  })
}

dictionary.listAdminDictionaries = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchAllAdminDictionaries(resultsPerPage, 1)

  res.render('pages/admin/dictionaries-list', {
    title: 'Struktura slovarjev',
    numberOfAllPages,
    results
  })
}

dictionary.adminEditDescription = async (req, res) => {
  const { dictionaryId } = req.params
  const [
    allPrimaryDomains,
    allSecondaryDomains,
    dictionary,
    associatedSecondaryDomains,
    status
  ] = await Promise.all([
    Dictionary.fetchAllPrimaryDomains(),
    Dictionary.fetchAllApprovedSecondaryDomains(),
    Dictionary.fetchEditDescription(dictionaryId),
    Dictionary.fetchSecondaryDomains(dictionaryId),
    Dictionary.fetchStatus(dictionaryId)
  ])

  res.render('pages/admin/dictionary-description', {
    title: 'Podatki',
    allPrimaryDomains,
    allSecondaryDomains,
    dictionary,
    associatedSecondaryDomains,
    status
  })
}

dictionary.updateAdminDescription = async (req, res) => {
  // TODO Due to reindexing of all of dictionary entries on status change, this operation might take a while.
  // TODO Stress test and consider either a notification to user or alteast a progress indicator while they wait.
  const { dictionaryId } = req.params
  const { body } = req
  const newDictStatus = body.status

  const oldDictStatus = await Dictionary.fetchStatus(dictionaryId)

  // TODO Consider using a transaction.
  await Promise.all([
    Dictionary.updateDescription(dictionaryId, body),
    Dictionary.deleteSecondaryDomains(dictionaryId, body),
    Dictionary.updateSecondaryDomains(dictionaryId, body),
    Dictionary.updateStatus(dictionaryId, body)
  ])

  if (newDictStatus !== oldDictStatus) {
    if (newDictStatus === 'published') {
      await Dictionary.updateTimePublished(dictionaryId)
    }
    await Dictionary.indexIntoSearchEngine(dictionaryId)
  }

  await statusChangeCheckAndAct.updateAdminDescription(
    dictionaryId,
    newDictStatus,
    oldDictStatus,
    req.app,
    req.user
  )

  res.redirect('back')
}

dictionary.showImportFromExtractionForm = async (req, res) => {
  const { dictionaryId } = req.params
  const dictionaryName = await Dictionary.fetchName(dictionaryId)
  const extractions = await Extraction.fetchFinishedForUser(req.user.id)
  let viewPath, title
  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/extraction-import'
      title = 'Uvoz'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-extraction-import'
      title = 'Uvoz luščenje'
  }

  res.render(viewPath, {
    title,
    dictionary: { id: dictionaryId },
    dictionaryName,
    extractions
  })
}

dictionary.showExportToFileForm = async (req, res) => {
  const { dictionaryId } = req.params
  const dictionaryName = await Dictionary.fetchName(dictionaryId)
  let viewPath
  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/export'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-export'
  }

  res.render(viewPath, {
    title: 'Izvoz',
    dictionary: { id: req.params.dictionaryId },
    dictionaryName
  })
}

dictionary.editDomainLabels = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { dictionaryId } = req.params
  const [{ pages_total: numberOfAllPages, results }, dictionaryName] =
    await Promise.all([
      Dictionary.fetchPaginationDomainLabels(dictionaryId, resultsPerPage, 1),
      Dictionary.fetchName(dictionaryId)
    ])

  let viewPath
  switch (req.baseUrl) {
    case '/slovarji':
      viewPath = 'pages/dictionaries/domain-labels'
      break
    case '/admin':
      viewPath = 'pages/admin/dictionary-domain-labels'
  }

  res.render(viewPath, {
    title: 'Področne oznake',
    dictionary: { id: dictionaryId },
    numberOfAllPages,
    results,
    dictionaryName
  })
}

dictionary.showContent = async (req, res) => {
  const { dictionaryId } = req.params
  const hitsQuery = genEditorAllQuery(dictionaryId)
  const [
    hits,
    canPublishEntriesInEdit,
    dictionaryName,
    structure,
    languages,
    entryDomainLabels
  ] = await Promise.all([
    searchEntryIndex(hitsQuery),
    getInstanceSetting('can_publish_entries_in_edit'),
    Dictionary.fetchName(dictionaryId),
    Dictionary.fetchEditStructure(dictionaryId),
    Dictionary.fetchLanguages(dictionaryId),
    Dictionary.fetchDomainLabels(dictionaryId)
  ])

  const terms = prepareEditorEntries(hits)

  res.render('pages/dictionaries/content', {
    title: 'Vsebina slovarja',
    terms,
    canPublishEntriesInEdit,
    dictionaryName,
    structure,
    languages,
    dictionaryId,
    entryDomainLabels
  })
}

dictionary.showSecondaryDomains = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { pages_total: numberOfAllPages, results } =
    await Dictionary.fetchAllSecondaryDomains(resultsPerPage, 1)

  res.render('pages/admin/areas', {
    title: 'Podpodročja',
    numberOfAllPages,
    results
  })
}

dictionary.dictionaryList = async (req, res) => {
  /*   const [allPrimaryDomains, allSecondaryDomains, allLanguages] =
    await Promise.all([
      Dictionary.fetchAllPrimaryDomains(),
      Dictionary.fetchAllApprovedSecondaryDomains(),
      Dictionary.fetchAllLanguages()
    ]) */

  // const defaultportalname = await getInstanceSetting('portal_name')
  const defaultportalcode = await getInstanceSetting('portal_code')

  const hitsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const page = +req.query.p > 0 ? +req.query.p : 1

  // initial mapping
  // mapping done here to not expose database info to public
  const orderIndex = false
  const orderAttribute = 'd'

  let dictionaries = await Dictionary.fetchBasicInfoPerPageFilteredWithOrdering(
    '',
    {},
    hitsPerPage,
    page,
    orderAttribute,
    orderIndex
  )

  const numberOfAllHits = parseInt(
    (await Dictionary.fetchAllDictionariesCount()).count
  )
  const numberOfAllPages = Math.ceil(numberOfAllHits / hitsPerPage)

  const allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()

  dictionaries = dictionaries.map(e => {
    if (!e.portalcode) {
      e.portalcode = defaultportalcode
      // e.portalname = defaultportalname
    }
    return e
  })

  const isDictionaryListPage = true

  res.render('pages/dictionaries/dictlist', {
    title: 'Seznam slovarjev',
    dictionaries,
    allPrimaryDomains,
    numberOfAllPages,
    isDictionaryListPage
    /*
    allSecondaryDomains,
    allLanguages */
  })
}

dictionary.dictionaryDetails = async (req, res) => {
  const { absolutePrevPath, sentFromEntryId } = req.query
  const dictId = req.params.dictionaryId
  const {
    allPrimaryDomains,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals
  } = await SFDSuggestionImporter.initialize()

  const dictionaryData = await Dictionary.fetchDictionaryBasicInfo(dictId)

  const filters = { ctxType: 'dictionary', ctxId: dictId }
  // TODO: integrate numberOfAllPages, commentCount with pug

  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const page = 1 // +req.query.p > 0 ? +req.query.p : 1
  const {
    pages_total: numberOfAllPages,
    comments,
    comment_count: commentCount
  } = await Comment.list(filters, req.user, resultsPerPage, page)

  // check if it is a local dictionary
  if (!dictionaryData.portalname && !dictionaryData.portalcode) {
    dictionaryData[0].portalname = await getInstanceSetting('portal_name')
    dictionaryData[0].portalcode = await getInstanceSetting('portal_code')
  }

  const reducedData = dictionaryData.reduce(
    (acc, x) => {
      if (acc.isbegin) {
        x.languages = [x.languagesl]
        x.subDomains = [x.domainsecondarysl]
        return x
      }
      if (!acc.languages.includes(x.languagesl)) {
        acc.languages.push(x.languagesl)
      }
      if (!acc.subDomains.includes(x.domainsecondarysl)) {
        acc.subDomains.push(x.domainsecondarysl)
      }

      return acc
    },
    { isbegin: true }
  )

  const structData = {
    prevWindowTitle: 'Nazaj',
    dictName: dictionaryData[0].dictionarysl,
    portalCode: dictionaryData[0].portalcode,
    portalName: dictionaryData[0].portalname,
    fullAuthorName: reducedData.author ? reducedData.author.join(', ') : '',
    areas: dictionaryData[0].domain_primary,
    subareas: reducedData.subDomains ? reducedData.subDomains.join(', ') : '',
    languages: reducedData.languages ? reducedData.languages.join(', ') : ''
  }

  if (reducedData.author) {
    if (reducedData.author.length > 2) {
      structData.authorLabel = 'Avtorji'
    } else if (reducedData.author.length === 2) {
      structData.authorLabel = 'Avtorja'
    } else if (reducedData.author.length === 1) {
      structData.authorLabel = 'Avtor'
    }
  }

  if (sentFromEntryId === 'dictsList') {
    structData.prevHref = `/slovarji`
  } else {
    structData.prevHref = `/termin/${sentFromEntryId}`
  }

  const finalData = {
    ...reducedData,
    ...structData
  }

  res.render('pages/search/result-detail-dictionary', {
    allPrimaryDomains,
    sourceLanguages,
    targetLanguages,
    allDictionaryNames,
    portals,
    sentFromEntryId,
    dictId,
    absolutePrevPath,
    dictionaryData,
    finalData,
    numberOfAllPages,
    comments,
    commentCount
  }) // todo
}

dictionary.importFromFile = async (req, res) => {
  try {
    await parseImportFileBody(req, res)
    // TODO return JSON error response rather then delegate to express.
    // TODO Also return proper status codes.
    // TODO File (or other form data) cound not be present. Add validation or fallback/errorhandling.

    const { dictionaryId } = req.params
    const importFilePath = req.file.path
    const { deleteExistingEntries, entryStatus, importFileFormat } = req.body

    await Dictionary.openImportFileJob(
      dictionaryId,
      deleteExistingEntries,
      importFileFormat
    )

    if (deleteExistingEntries) {
      await Entry.deleteAllFromIndex(dictionaryId)
      await Entry.deleteAll(dictionaryId)
    }

    await Dictionary.importFromFile(
      req.user.id,
      dictionaryId,
      importFilePath,
      entryStatus
    )
    // TODO Rather then waiting for success/failure, return immediately and continue processing in the background.
    // TODO Also add API endpoint for getting progress.

    await Dictionary.indexIntoSearchEngine(dictionaryId)
    // TODO Error --> import job status: (indexing) error --> User manually triggers reindex.

    debug('IMPORT SUCCESSFUL')

    const importProcessId = 'DUMMY ID' // TODO You'll get it from DB.
    res.status(202).send(importProcessId)
  } catch (error) {
    // TODO Consider writing a property on req and add an extra error handler for API errors.
    debug('IMPORT FAILED')
    debug(error)
    res.status(400).send(error)
  } finally {
    try {
      await unlink(req.file.path)
    } catch (error) {
      debug('ERROR REMOVING TEMP IMPORT FILE:')
      debug(error)
    }
  }
}

function importFileFilter(req, file, cb) {
  if (file.mimetype !== 'text/xml') return cb(Error('Invalid file type'))
  cb(null, true)
}

/*
function commaSeperationReducer(dictionaryData) {
  return dictionaryData.reduce((acc, x) => {
    if (acc === ':://') {
      return x
    } else {
      return `${acc}, ${x}`
    }
  }, ':://')
} */

module.exports = dictionary
