const Dictionary = require('../models/dictionary')
const ConsultancyEntry = require('../models/consultancy-entry')
const Domain = require('../models/domain')
const User = require('../models/user')
const utils = require('../utils')
// const helpers = require('../models/helpers')
const { DEFAULT_HITS_PER_PAGE } = require('../config/settings')
const generateQuery = require('../models/helpers/search/generate-query')
const { searchConsultancyEntryIndex } = require('../models/search-engine')
const { prepareConsultancyEntries } = require('../models/helpers/search')
const { getInstanceSetting, intoDbArray } = require('../models/helpers')
// const { minEntriesRequirementCheckAndAct } = require('./helpers/dictionary')

const consultancy = {}
const consultancyAdmin = {}

consultancy.index = async (req, res) => {
  req.indexHitPageAmount = '5'

  res.locals.isOwnConsultancyEnabled =
    (await getInstanceSetting('consultancy_type')) === 'own'

  return await consultancyRequest(
    req,
    res,
    'published',
    'pages/consultancy/index'
  )
}

consultancy.search = async (req, res) => {
  res.locals.isOwnConsultancyEnabled =
    (await getInstanceSetting('consultancy_type')) === 'own'

  res.locals.queryKey = req.query.q

  return await consultancyRequest(
    req,
    res,
    'published',
    'pages/consultancy/search',
    req.t('Odgovori')
  )
}

consultancy.specificQuestion = async (req, res) => {
  const { id } = req.params

  // TODO i18n TIME FORMAT
  const entry = await ConsultancyEntry.fetchByIdWithFormattedTime(id)
  // const author = await User.fetchUser(entry.authorId)

  const allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()

  entry.answerAuthors = entry.answerAuthors.filter(author => author !== '')

  let authorString
  // TODO I18n
  if (entry.answerAuthors.length === 1) {
    authorString = req.t('Avtor')
  } else if (entry.answerAuthors.length === 2) {
    authorString = req.t('Avtorja')
  } else {
    authorString = req.t('Avtorji')
  }

  entry.domain = allPrimaryDomains.filter(
    filt => filt.id === entry.domainPrimaryId
  )

  if (entry.domain.length > 0) {
    entry.domain = entry.domain[0].nameSl
  } else {
    entry.domain = false
  }

  res.locals.isOwnConsultancyEnabled =
    (await getInstanceSetting('consultancy_type')) === 'own'

  res.render('pages/consultancy/item-details', {
    allPrimaryDomains,
    authorString,
    entry,
    title: req.t('Odgovor')
  })
}

consultancy.new = async (req, res) => {
  const allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()

  res.locals.isOwnConsultancyEnabled =
    (await getInstanceSetting('consultancy_type')) === 'own'

  res.render('pages/consultancy/ask', {
    allPrimaryDomains,
    title: req.t('Novo vprašanje')
  })
}

consultancyAdmin.new = async (req, res) => {
  return await consultancyRequest(
    req,
    res,
    'new',
    'pages/consultancy/admin/index',
    req.t('Novo'),
    true,
    false
  )
}

consultancyAdmin.users = async (req, res) => {
  const allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()

  const users = await User.fetchConsultants()

  res.render('pages/consultancy/admin/users', {
    allPrimaryDomains,
    users,
    title: req.t('Svetovalci')
  })
}

consultancyAdmin.rejected = async (req, res) => {
  return await consultancyRequest(
    req,
    res,
    'rejected',
    'pages/consultancy/admin/rejected',
    req.t('Zavrnjeno'),
    true,
    false
  )
}

consultancyAdmin.published = async (req, res) => {
  return await consultancyRequest(
    req,
    res,
    'published',
    'pages/consultancy/admin/published',
    req.t('Objavljeno'),
    true,
    false,
    'published'
  )
}

consultancyAdmin.prepared = async (req, res) => {
  return await consultancyRequest(
    req,
    res,
    'review',
    'pages/consultancy/admin/prepared',
    req.t('Pripravljeno'),
    true,
    false
  )
}

consultancyAdmin.inProgress = async (req, res) => {
  // TODO Below is an example use of consultancy search implemented using search engine.
  // TODO Adjust and use it everywhere it's needed and delete these comments.
  // *************************************** EXAMPLE START ***************************************

  return await consultancyRequest(
    req,
    res,
    'in progress',
    'pages/consultancy/admin/in-progress',
    req.t('V delu'),
    true,
    false
  )
}

consultancyAdmin.statistics = async (req, res) => {
  const allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()

  res.render('pages/consultancy/admin/statistics', {
    allPrimaryDomains
  })
}

consultancyAdmin.edit = async (req, res) => {
  const { id } = req.params
  const key = req.query.sentFrom
  const sentFrom = {}
  sentFrom[key] = true

  const moderator = await ConsultancyEntry.getModerator(id)
  const editors = await ConsultancyEntry.getEditors(id)
  if (
    req.user.hasRole('consultancy admin') ||
    req.user.hasRole('portal admin')
  ) {
    console.log('Editor guard omitted due to being administrator')
  } else if (editors.filter(editors => editors.id === req.user.id) < 1) {
    return res.send('You do not have permsisions to edit this answer')
  }
  // TODO i18n TIME FORMAT
  const entry = await ConsultancyEntry.fetchByIdWithFormattedTime(id)
  const allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()
  const author = await User.fetchUser(entry.authorId)

  const isPublished = entry.status === 'published'

  res.render('pages/consultancy/admin/edit', {
    id,
    sentFrom: key,
    entry: entry,
    allPrimaryDomains,
    moderator,
    author,
    isPublished,
    // TODO Luka: I suspect this will not work as intended on staging or production environments. Test.
    urlPrefix: req.protocol + '://' + req.get('host'),
    title: req.t('Urejanje')
  })
}

function dateMap(obj) {
  if (!obj.formattedTimeCreated) {
    obj.formattedTimeCreated = obj.timeCreated
  }

  return obj
}

async function mapDomainIdToDomainNameSlovene(obj, t) {
  try {
    const area = await Domain.fetchById(
      obj.domainPrimaryId ? obj.domainPrimaryId : obj.domainPrimaryIdInitial
    )
    obj.area = area.nameSl
  } catch {
    obj.area = t('Ni področja')
  }

  return obj
}

function mapInitialValuesAsEmpty(obj) {
  if (!obj.authors) {
    obj.authors = []
  }

  if (!obj.title) {
    obj.title = ''
  }

  if (!obj.numShared) {
    obj.numShared = 0
  }

  return obj
}

async function mapEntryList(list, t) {
  return await Promise.all(
    list.map(entry => {
      let entity = utils.compose(dateMap, mapInitialValuesAsEmpty)(entry)

      // TODO Each mapDomainIdToDomainNameSlovene call leads to one DB query.
      // TODO Test if and what scenarios can lead to too many calls and how it can be avoided.
      entity = utils.composeAsync(mapDomainIdToDomainNameSlovene)(entry, t)

      return entity
    })
  )
}

function summaryDisplay(str) {
  if (str.split('\n').length > 3) {
    return splitLine(str, 3)
  } else {
    return cropLongString(str)
  }
}

function splitLine(str, countLines) {
  if (!str) {
    return str
  }
  if (countLines <= 0) {
    return ''
  }
  let nlIndex = -1
  let newLinesFound = 0
  while (newLinesFound < countLines) {
    const nextIndex = str.indexOf('\n', nlIndex + 1)
    if (nextIndex === -1) {
      return str
    }
    nlIndex = nextIndex
    newLinesFound++
  }

  const nextIndex = str.indexOf('\n', nlIndex + 1)
  return str.slice(0, nlIndex) + (nextIndex !== -1 ? '...' : '')
}

function cropLongString(str) {
  if (str.length > 500) {
    return str.slice(0, 500) + '...'
  }
  return str
}

async function consultancyRequest(
  req,
  res,
  type,
  url,
  title = req.t('Svetovanje'),
  isAdminPage = false,
  privilegeToSeAll = true // this method seperates consultancy main from admin, so all results get visible TO ALL REGISTERED USERS, not just admins
) {
  const searchString = req.query.q?.trim() ?? ''

  let allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()

  /// filter selected domains for the prompt ///
  // Not duplicates of this code arise...
  const pdList = intoDbArray(req.query.pd, 'always')

  allPrimaryDomains = allPrimaryDomains.map(entry => {
    if (pdList.includes(`${entry.id}`)) {
      entry.selected = true
    }
    return entry
  })
  /// //////////////////////////////////////////

  let assignedConsultant

  if (
    !privilegeToSeAll &&
    req.user &&
    !(req.user.hasRole('portal admin') || req.user.hasRole('consultancy admin'))
  ) {
    assignedConsultant = req.user.id
  } else {
    assignedConsultant = undefined
  }

  const filters = {
    status: type,
    assignedConsultant,
    primaryDomain: req.query.pd
  }

  if (!isAdminPage) {
    filters.assignedConsultant = undefined
    filters.status = 'published' // guard
  }

  let hitsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  if (req.indexHitPageAmount) {
    hitsPerPage = req.indexHitPageAmount
  }

  const page = +req.query.p > 0 ? +req.query.p : 1

  const hitsQuery = generateQuery.consultancy(
    searchString,
    filters,
    hitsPerPage,
    page
  )

  const hits = await searchConsultancyEntryIndex(hitsQuery)

  const numberOfAllHits = hits.body.hits.total.value
  const numberOfAllPages = Math.ceil(numberOfAllHits / hitsPerPage)

  let entries = prepareConsultancyEntries(hits)
  // console.log({ entries, numberOfAllHits, numberOfAllPages })
  // TODO I18n - nameSl
  entries = entries.map(entry => {
    entry.primaryDomain = entry.primaryDomain
      ? entry.primaryDomain.nameSl
      : req.t('nedefinirano')

    if (entry.assignedConsultants) {
      entry.firstName = entry.assignedConsultants[0]?.firstName
      entry.lastName = entry.assignedConsultants[0]?.lastName
    }

    if (entry.assignedConsultants && entry.assignedConsultants.length > 1) {
      entry.sharedAuthors = []
      for (let i = 1; i < entry.assignedConsultants.length; i++) {
        // skip first element (moderator)
        entry.sharedAuthors.push(
          `${entry.assignedConsultants[i].firstName} ${entry.assignedConsultants[i].lastName}`
        )
      }
    }

    if (entry.timeCreated) {
      const date = new Date(entry.timeCreated)

      entry.formattedTimeCreated = `${date.getDate()}. ${
        date.getMonth() + 1
      }. ${date.getFullYear()}`
    }

    return entry
  })

  // const entryList = await mapEntryList(inProgressEntryList)
  const userList = await User.fetchConsultants()

  if (!isAdminPage) {
    entries.map(entry => {
      const MAX_CHARACTER_LENGTH = 200
      let appendAnswer = ''
      let appendQuestion = ''
      if (entry.answer && entry.answer.length > MAX_CHARACTER_LENGTH) {
        appendAnswer = '...'
      }
      if (entry.question && entry.question.length > MAX_CHARACTER_LENGTH) {
        appendQuestion = '...'
      }

      entry.answerSummary = `${entry.answer.slice(
        0,
        MAX_CHARACTER_LENGTH
      )}${appendAnswer}`

      entry.question = `${entry.question.slice(
        0,
        MAX_CHARACTER_LENGTH
      )}${appendQuestion}`

      return entry
    })
  }

  res.render(url, {
    allPrimaryDomains,
    entries, // entryList,
    userList,
    numberOfAllPages,
    queryCount: numberOfAllHits,
    consultancyPageType: type,
    title
  })
}

module.exports = { consultancy, consultancyAdmin }
