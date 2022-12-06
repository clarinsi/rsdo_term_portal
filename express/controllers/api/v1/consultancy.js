const ConsultancyEntry = require('../../../models/consultancy-entry')
const User = require('../../../models/user')
const { promisify } = require('util')
const {
  deleteConsultancyEntryFromIndex
} = require('../../../models/search-engine')
const email = require('../../../models/email')
const helper = require('../../../models/helpers')

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

consultancy.createQuestion = async (req, res) => {
  const q = req.body
  const consultancyEntry = {}

  consultancyEntry.status = 'new'

  consultancyEntry.authorId = req.user.id

  consultancyEntry.institution = q.institution

  const { description } = q
  if (!description) {
    return res.status(400).send('description is a required parameter!')
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

  const questionId = await ConsultancyEntry.createQuestion(consultancyEntry)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  // TODO SEND EMAIL
  // TODOOOOOOOOO

  const emails = await ConsultancyEntry.fetchConsultancyAdminEmails()

  const renderAsync = promisify(req.app.render.bind(req.app))
  const emailHtml = await renderAsync('email/consultancy-creation-notify', {
    propertyToPassGoesHere: 'test1234'
  })
  await email.send({
    to: emails,
    subject: 'Ustvarjeno novo vprašanje v svetovalnici',
    html: emailHtml
  })
  /// /////////////////

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

  await email.send({
    to: emails,
    subject: 'Novo terminološko vprašanje',
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

  await email.send({
    to: emails,
    subject: 'Potrditev objave',
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

  await ConsultancyEntry.publish(questionId, answerAuthors)
  await ConsultancyEntry.indexIntoSearchEngine(questionId, true)

  res.send()
}

consultancy.updateQuestion = async (req, res) => {
  const { id, questionTitle, domain: domainId, question, answer } = req.body

  if (!id) return res.status(400).send({})

  if (questionTitle === '' || question === '' || answer === '') {
    return res.status(422).send('Polja naslov, vprašanje in mnenje so obvezna!')
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

module.exports = consultancy
