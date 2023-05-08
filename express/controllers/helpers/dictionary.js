/* global __ */

const { getInstanceSetting } = require('../../models/helpers')
const Dictionary = require('../../models/dictionary')
const cache = require('../../models/cache')
const { promisify } = require('util')
const email = require('../../models/email')

const MIN_ENTRIES_MAIL_NAMESPACE = 'below_min_entries_mail_sent'

// Helper object for minEntries below. Defines operations on anti-spam bookmarks.
const minEntriesEmailBookmark = {
  // Checks whether the anti-spam bookmark (still) exists.
  async exists(dictionaryId) {
    const bookMarkName = `${MIN_ENTRIES_MAIL_NAMESPACE}:${dictionaryId}`
    return !!(await cache.exists(bookMarkName))
  },

  // Sets the anti-spam bookmark for given dictionary.
  async set(dictionaryId) {
    const bookMarkName = `${MIN_ENTRIES_MAIL_NAMESPACE}:${dictionaryId}`
    await cache.set(bookMarkName, true)
  },

  // Removes the anti-spam bookmark for given dictionary if conditions are met.
  async update(dictionaryId) {
    const doesBookmarkExist = await this.exists(dictionaryId)
    if (!doesBookmarkExist) return
    const minEntries = await getInstanceSetting('min_entries_per_dictionary')
    const isBelowMinEntriesThreshold = await checkIfBelowMinEntriesThreshold(
      dictionaryId,
      minEntries
    )

    if (isBelowMinEntriesThreshold) return

    const bookMarkName = `${MIN_ENTRIES_MAIL_NAMESPACE}:${dictionaryId}`
    await cache.unlink(bookMarkName)
  }
}

// Exports actions related to checking and acting on minimum entries per dictionary setting.
exports.minEntriesRequirementCheckAndAct = {
  // Checks required criteria and sends notifications emails if required.
  async onDelete(dictionaryId, appRef, determinedLanguage) {
    const minEntries = await getInstanceSetting('min_entries_per_dictionary')

    // Only proceed if a valid and positive minimum entries per dictionary setting is set.
    if (!(+minEntries > 0)) return

    const [isBelowMinEntriesThreshold, wasEmailAlreadySent] = await Promise.all(
      [
        checkIfBelowMinEntriesThreshold(dictionaryId, minEntries),
        minEntriesEmailBookmark.exists(dictionaryId)
      ]
    )

    if (!isBelowMinEntriesThreshold || wasEmailAlreadySent) return

    // Prepare and send notification emails.
    const [name, adminEmails, dictionariesAdminEmails] = await Promise.all([
      Dictionary.fetchName(dictionaryId, determinedLanguage),
      Dictionary.fetchAdminEmails(dictionaryId),
      Dictionary.fetchDictionariesAdminEmails()
    ])

    const allEmailsSet = new Set([...adminEmails, ...dictionariesAdminEmails])
    const allEmails = []
    for (const email of allEmailsSet) allEmails.push(email)

    const type = 'delete'
    const renderAsync = promisify(appRef.render.bind(appRef))
    const emailHtml = await renderAsync('email/dictionary-status-change', {
      type,
      name
    })

    // TODO i18n - What language are the email title and content (we already have email translated)
    await email.send({
      to: allEmails,
      subject: __('Obvestilo o številu gesel'),
      html: emailHtml
    })

    await minEntriesEmailBookmark.set(dictionaryId)
  },

  // Use this method after any entry updating operations to release potential anti-spam bookmarks.
  onUpdate: minEntriesEmailBookmark.update.bind(minEntriesEmailBookmark)
}

// Helper function to check if a given (published) dictionary has less entries than provided minEntries parameter.
async function checkIfBelowMinEntriesThreshold(dictionaryId, minEntries) {
  const [publishedEntries, dictionaryStatus] = await Promise.all([
    Dictionary.countPublishedEntries(dictionaryId),
    Dictionary.fetchStatus(dictionaryId)
  ])

  const isBelowMinEntriesThreshold =
    +publishedEntries < +minEntries && dictionaryStatus === 'published'

  return isBelowMinEntriesThreshold
}

// Determine new dictionary status based on dictionary_publish_approval setting.
exports.determineNewStatus = async isPublished => {
  const publishApproval = await getInstanceSetting(
    'dictionary_publish_approval'
  )

  let newStatus
  if (publishApproval === 'F') {
    newStatus = isPublished ? 'published' : 'closed'
  } else {
    newStatus = isPublished ? 'reviewed' : 'closed'
  }

  return newStatus
}

// Exports actions related to checking and acting on dictionary status changes.
exports.statusChangeCheckAndAct = {
  // Notify dictionaries admins by email on dictionary status changes.
  async updateUsers(
    dictionaryId,
    isPublishedNew,
    oldDictStatus,
    name,
    appRef,
    user
  ) {
    const isPublishedOld = oldDictStatus === 'published'

    // Published: on -> off.
    if (!isPublishedNew && isPublishedOld) {
      const dictionariesAdminEmails =
        await Dictionary.fetchDictionariesAdminEmails()
      const type = 'unpublish'
      await renderAndSendStatusChangeEmails(
        appRef,
        type,
        user.email,
        name,
        dictionariesAdminEmails
      )

      // Published: off -> on.
    } else if (isPublishedNew && !isPublishedOld) {
      const [isApprovalRequired, dictionariesAdminEmails] = await Promise.all([
        getInstanceSetting('dictionary_publish_approval'),
        Dictionary.fetchDictionariesAdminEmails()
      ])
      const type =
        isApprovalRequired === 'T' ? 'publish-approval' : 'publish-no-approval'

      await renderAndSendStatusChangeEmails(
        appRef,
        type,
        user.email,
        name,
        dictionariesAdminEmails
      )
    }
  },

  // Notify dictionary admins by email after dictionaries admins
  // change dictionary status from reviewed to either closed or published.
  async updateAdminDescription(
    dictionaryId,
    statusNew,
    statusOld,
    appRef,
    determinedLanguage,
    user
  ) {
    if (statusOld === 'reviewed' && statusNew !== 'reviewed') {
      const [name, adminEmails] = await Promise.all([
        Dictionary.fetchName(dictionaryId, determinedLanguage),
        Dictionary.fetchAdminEmails(dictionaryId)
      ])
      const type = 'status'

      await renderAndSendStatusChangeEmails(
        appRef,
        type,
        user.email,
        name,
        adminEmails
      )
    }
  }
}

// Helper function used by statusChangeCheckAndAct methods.
async function renderAndSendStatusChangeEmails(
  appRef,
  type,
  changerEmail,
  name,
  targetEmails
) {
  const renderAsync = promisify(appRef.render.bind(appRef))
  const emailHtml = await renderAsync('email/dictionary-status-change', {
    type,
    changerEmail,
    name
  })

  // TODO i18n - What language are the email title and content (we already have email translated)
  await email.send({
    to: targetEmails,
    subject: __('Sprememba stanja slovarja'),
    html: emailHtml
  })
}
