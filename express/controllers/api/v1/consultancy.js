const ConsultancyEntry = require('../../../models/consultancy-entry')
const Domain = require('../../../models/domain')
const User = require('../../../models/user')
const { promisify } = require('util')
const i18next = require('i18next')
const {
  deleteConsultancyEntryFromIndex
} = require('../../../models/search-engine')
const email = require('../../../models/email')
const helper = require('../../../models/helpers')
const { getInstanceSetting } = require('../../../models/helpers')
const { searchConsultancyEntryIndex } = require('../../../models/search-engine')
const { prepareConsultancyEntries } = require('../../../models/helpers/search')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')
const generateQuery = require('../../../models/helpers/search/generate-query')

const consultancy = {}

consultancy.listEntries = async (req, res) => {
  const consultancyEntryList = await ConsultancyEntry.fetchAll()
  const data = {}
  data.consEntryList = consultancyEntryList
  res.send(data)
}

consultancy.listNewEntries = async (req, res) => {
  const consultancyNewEntryList = await ConsultancyEntry.fetchAllNew()
  const data = {}
  data.consultancyNewEntryList = consultancyNewEntryList
  res.send(data)
}

consultancy.sendPaginationData = async (req, res) => {
  let requestType = req.query.type
  const isAdminPage = req.query.isAdmin === 'true'
  let page = +req.query.p || 1

  if (page < 1) {
    page = 1
  }

  if (isAdminPage) {
    if (
      req.user &&
      (req.user.hasRole('portal admin') ||
        req.user.hasRole('consultancy admin'))
    ) {
      // Everything is allowed, nothing to do here
    } else if (req.user && req.user.hasRole('consultant')) {
      if (!(requestType === 'in progress' || requestType === 'published')) {
        return res.status(400).send()
      }
    } else {
      // for now, public can only see published entries
      requestType = 'published'
    }
  }

  return await consultancyRequestItems(
    req,
    res,
    requestType || 'published',
    'components/consultancy/api/consultancy-item-rendered',
    isAdminPage,
    !isAdminPage, // -> In current implementation, it is just the inverse of isAdminPage
    page
  )
}

consultancy.createQuestion = async (req, res) => {
  const q = req.body
  const consultancyEntry = {}

  consultancyEntry.status = 'new'

  consultancyEntry.authorId = req.user.id

  consultancyEntry.institution = q.institution

  const { description } = q
  if (!description) {
    return res.status(400).send('Description is a required parameter!')
  }
  consultancyEntry.description = description

  consultancyEntry.domainPrimaryIdInitial = q.domainPrimary

  if (!consultancyEntry.domainPrimaryIdInitial || q.domainPrimary === '-1') {
    consultancyEntry.domainPrimaryIdInitial = null // undefined
  }
  consultancyEntry.existingSolutions = q.existing_solutions

  consultancyEntry.examplesOfUse = q.examples_of_use

  Object.keys(consultancyEntry).forEach(key => {
    consultancyEntry[key] = helper.removeHtmlTags(consultancyEntry[key]).trim()
  })

  const isOwnConsultancyEnabled =
    (await getInstanceSetting('consultancy_type')) === 'own'

  let domainNameSl
  if (consultancyEntry.domainPrimaryIdInitial) {
    domainNameSl = (
      await Domain.fetchById(consultancyEntry.domainPrimaryIdInitial)
    ).nameSl
  } else {
    domainNameSl = ''
  }

  let emails
  let subjectText
  if (isOwnConsultancyEnabled) {
    const questionId = await ConsultancyEntry.createQuestion(consultancyEntry)
    await ConsultancyEntry.indexIntoSearchEngine(questionId, true)
    subjectText = req.t('Ustvarjeno novo vprašanje v svetovalnici')
    emails = await ConsultancyEntry.fetchConsultancyAdminEmails()
  } else {
    subjectText = req.t('Novo vprašanje za Terminološko svetovalnico')
    emails = await getInstanceSetting('zrc_email')
  }

  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync('email/consultancy-creation-notify', {
    nameAndSurname: `${res.locals.user.firstName} ${res.locals.user.lastName}`,
    email: res.locals.user.email,
    domain: domainNameSl,
    institution: consultancyEntry.institution,
    question: consultancyEntry.description,
    existingSolutions: consultancyEntry.existingSolutions,
    examplesOfUse: consultancyEntry.examplesOfUse
  })
  // TODO i18n - What language are the email title and content (we already have email translated)
  await email.send({
    to: emails,
    subject: subjectText,
    html: emailHtml
  })

  res.status(201).send()
}

consultancy.updateDomain = async (req, res) => {
  const { id, value } = req.body

  if (!id) return res.status(400).send()

  await User.updateConsultancyDomains(id, value)
  res.status(204).send()
}

consultancy.insertConsultantAndHisDomainsByUsername = async (req, res) => {
  const { username, domains } = req.body

  if (!username) {
    return res.status(400).send()
  }

  await User.insertNewConsultantWithDomainByUsername(username, domains)
  res.status(204).send()
}

consultancy.removeConsultant = async (req, res) => {
  const { id } = req.body

  if (!id) return res.status(400).send()

  await User.removeConsultant(id)

  res.send()
}

consultancy.getSharedAuthors = async (req, res) => {
  const { id } = req.query

  if (!id) return res.status(400).send()

  const authors = await ConsultancyEntry.getSharedAuthorsArray(id)

  res.send(authors)
}

consultancy.insertNonModerator = async (req, res) => {
  const userId = req.body.user_id
  const entryId = req.body.entry_id

  if (!userId || !entryId) return res.status(400).send()

  await ConsultancyEntry.insertNonModerator(entryId, userId)
  await ConsultancyEntry.indexIntoSearchEngine(entryId, true)

  res.status(201).send()
}

consultancy.getSharedAuthorsBeforePublish = async (req, res) => {
  const { id } = req.query

  if (!id) return res.status(400).send()

  const authors = await ConsultancyEntry.getSharedAuthorsArrayBeforePublish(id)

  res.send(authors)
}

consultancy.updateSharedAuthors = async (req, res) => {
  const { id, authors } = req.body

  if (!id || !authors.length) return res.status(400).send()

  await ConsultancyEntry.updateSharedAuthorsArray(id, authors)
  await ConsultancyEntry.indexIntoSearchEngine(id, true)

  res.send({})
}

/* 
function assign - assigns from any state of the consultancy
question to work in-progress

inputs:
id -> id of the question
*/
consultancy.assign = async (req, res) => {
  const questionId = req.body.question_id
  let userId = req.body.user_id

  if (!questionId) return res.status(400).send()

  if (!userId) {
    const user = await ConsultancyEntry.getModerator(questionId)
    userId = user.id
    if (!userId) return res.status(400).send({})
  }

  await ConsultancyEntry.assignWorkInProgress(questionId, userId)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  // TODO SEND MAIL TO MODERATOR
  /*
    Skrbnik svetovalnice vam je v urejanje dodelil novo terminološko vprašanje.
  */

  const emails = await ConsultancyEntry.fetchModeratorEmail(questionId)

  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync('email/consultancy-assigned')

  // TODO i18n - What language are the email title and content (we already have email translated)
  await email.send({
    to: emails,
    subject: req.t('Novo terminološko vprašanje'),
    html: emailHtml
  })

  res.send()
}

consultancy.reject = async (req, res) => {
  const questionId = req.body.question_id

  if (!questionId) return res.status(400).send()

  await ConsultancyEntry.rejectEntry(questionId)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  res.send()
}

consultancy.sendToReview = async (req, res) => {
  const questionId = req.body.question_id

  if (!questionId) return res.status(400).send()

  await ConsultancyEntry.sendToReview(questionId)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  /* SEND MAIL TO ALL CONSULTANCY ADMINS 
  Za potrditev objave ste prejeli novo terminološko vprašanje.


  const allEmailsSet = new Set([...adminEmails, ...dictionariesAdminEmails])
    const allEmails = []
    for (const email of allEmailsSet) allEmails.push(email)

    const type = 'delete'
    const renderAsync = promisify(appRef.render.bind(appRef))
    const emailHtml = await renderAsync('email/dictionary-status-change', {
      type,
      nameSl
    })

    await email.send({
      to: allEmails,
      subject: 'Obvestilo o številu gesel',
      html: emailHtml
    })
  */

  const emails = await ConsultancyEntry.fetchConsultancyAdminEmails()

  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync('email/consultancy-item-review')

  // TODO i18n - What language are the email title and content (we already have email translated)
  await email.send({
    to: emails,
    subject: req.t('Potrditev objave'),
    html: emailHtml
  })

  res.send()
}

consultancy.publish = async (req, res) => {
  const questionId = req.body.question_id
  const answerAuthors = req.body.answer_authors

  if (!questionId) return res.status(400).send()

  const entry = await ConsultancyEntry.fetchById(questionId)

  if (!entry.title) {
    return res.status(400).send('Answer not completed')
  }
  const author = await User.fetchUser(entry.authorId)
  const portalName = await getInstanceSetting(`portal_name_${author.language}`)
  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync('email/consultancy-publish-notify', {
    portalName
  })
  await email.send({
    to: author.email,
    subject: i18next.t('Objava terminološkega vprašanja', {
      lng: author.language
    }),
    html: emailHtml
  })

  await ConsultancyEntry.publish(questionId, answerAuthors)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  res.send()
}

consultancy.updateQuestion = async (req, res) => {
  const { id, questionTitle, domain: domainId, question, answer } = req.body

  if (!id) return res.status(400).send({})

  if (questionTitle === '' || question === '' || answer === '') {
    return res
      .status(422)
      .send(req.t('Polja naslov, vprašanje in mnenje so obvezna!'))
  }

  const entry = await ConsultancyEntry.fetchById(id)
  entry.domainPrimaryId = domainId > 0 ? domainId : null
  entry.question = question
  entry.answer = answer // helper.removeHtmlTags(answer).trim()
  entry.title = questionTitle

  // TODO Luka: Miha, update only fields that were updated.
  await ConsultancyEntry.updateQuestion(entry)
  await ConsultancyEntry.indexIntoSearchEngine(id, true)

  res.send({})
}

consultancy.insertNonModerator = async (req, res) => {
  const questionId = req.body.question_id
  const userId = req.body.user_id

  if (!questionId || !userId) return res.status(400).send()

  await ConsultancyEntry.insertNonModerator(questionId, userId)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  res.send({})
}

consultancy.deleteConsultantForEntry = async (req, res) => {
  const questionId = req.body.question_id
  const userId = req.body.user_id

  if (!questionId || !userId) return res.status(400).send()

  await ConsultancyEntry.removeConsultantForEntry(questionId, userId)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  res.send({})
}

consultancy.deleteQuestion = async (req, res) => {
  const { id } = req.body // question/entry id

  if (!id) return res.status(400).send()

  await ConsultancyEntry.removeEntry(id)
  await deleteConsultancyEntryFromIndex(id, true)

  res.send()
}

async function consultancyRequestItems(
  req,
  res,
  type,
  url,
  isAdminPage = false,
  privilegeToSeAll = true, // this method seperates consultancy main from admin, so all results get visible TO ALL REGISTERED USERS, not just admins
  page
) {
  const searchString = req.query.q?.trim() ?? ''

  /// //////////////////////////////////////////
  // let allPrimaryDomains = await Dictionary.fetchAllPrimaryDomains()

  /// filter selected domains for the prompt ///
  // Not duplicates of this code arise...
  // const pdList = intoDbArray(req.query.pd, 'always')

  // allPrimaryDomains = allPrimaryDomains.map(entry => {
  //  if (pdList.includes(`${entry.id}`)) {
  //    entry.selected = true
  //  }
  //  return entry
  // })
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

  const hitsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  // const page = +req.query.p > 0 ? +req.query.p : 1

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
      // TODO i18n date format
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

  res.append('page', page)
  res.append('number-of-all-pages', numberOfAllPages)
  res.render(url, {
    entries, // entryList,
    userList,
    numberOfAllPages,
    isAdminPage,
    section: consultancyAdminPageMapper(type),
    queryCount: numberOfAllHits
  })
}

// mapping required due to the inconsistent naming convention
function consultancyAdminPageMapper(type) {
  if (type === 'in progress') {
    return { inProgress: true }
  }
  if (type === 'review') {
    return { prepared: true }
  }

  return { type: true }
}

module.exports = consultancy
