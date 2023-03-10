// TODO Remove no-console ignore rule once things are out of rapid dev phase.
/* eslint no-console: 0 */
/* global axios, initPagination, i18next */
const pageURL = location.pathname

window.addEventListener('load', () => {
  initComments()
})

function initComments() {
  const ce = {}
  ce.updatePager = initPagination('pagination', onPageChange)
  window.commentElements = ce
  ce.commentsCountEl = document.getElementById('comments-count')
  ce.commentsContainerEl = document.getElementById('comments-container')
  ce.commentForm = document.getElementById('comment-form')
  ce.commentReplyForm = document.getElementById('comment-reply-form')
  ce.commentMessageInput = document.getElementById('comment-message-input')
  ce.commentSubmitBtn = document.getElementById('comment-submit-btn')
  ce.commentReplyInput = document.getElementById('comment-reply-input')
  ce.commentQuoteId = document.getElementById('comment-quote-id')
  ce.commentSubmitReplyBtn = document.getElementById('comment-submit-reply-btn')
  ce.replyFormContainer = document.getElementById('reply-form-container')
  ce.replyCircle = document.getElementById('reply-circle')
  ce.commentDiv = document.querySelector('.comment-div')

  ce.commentSubmitBtn &&
    ce.commentSubmitBtn.addEventListener('click', submitComment)
  // ce.commentMessageInput.addEventListener('keydown', messageInputClick)
  ce.commentsContainerEl &&
    ce.commentsContainerEl.addEventListener('click', handleCommentClick)
  ce.commentSubmitReplyBtn &&
    ce.commentSubmitReplyBtn.addEventListener('click', submitCommentReply)
  ce.commentMessageInput &&
    ce.commentMessageInput.addEventListener('input', autoGrow)
  ce.commentReplyInput &&
    ce.commentReplyInput.addEventListener('input', autoGrow)
  // ce.commentMessageInput.addEventListener('keydown', normalizeTextAreaSize)

  window.commentSetting = {}
  window.commentSetting.localeOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }

  if (ce.commentMessageInput && ce.commentReplyInput) {
    ce.commentMessageInput.originalHeight = window.getComputedStyle(
      ce.commentMessageInput
    ).height
    ce.commentReplyInput.originalHeight = window.getComputedStyle(
      ce.commentReplyInput
    ).height
  }

  if (/\/slovarji\/\d+\/vsebina/.test(pageURL)) {
    ce.terminsList = document.getElementById('term-list')
    if (ce.terminsList) {
      ce.terminsList.addEventListener('click', displayComments)
    }
    const ctxBtns = document.getElementsByName('comments-type')
    if (ctxBtns) {
      const ctxBtnsArray = Array.from(ctxBtns)
      ctxBtnsArray.forEach(el => el.addEventListener('click', displayComments))
    }
  }
  ce.commentMessageInput && ce.commentReplyInput && clearMessageInput()
  displayComments()
}

function autoGrow({ target: inputToResize }) {
  if (!inputToResize.value) {
    inputToResize.style.height = inputToResize.originalHeight
  } else {
    inputToResize.style.height = Math.min(inputToResize.scrollHeight, 95) + 'px'
  }
}

function normalizeTextAreaSize() {
  const { commentMessageInput } = window.commentElements
  commentMessageInput.style.height = commentMessageInput.originalHeight
}

// function replyInputClick({ key }) {
//   if (key === 'Enter') {
//     const { commentSubmitReplyBtn } = window.commentElements
//     commentSubmitReplyBtn.click()
//   }
// }

async function displayComments(page) {
  // TODO Add error handler
  const comments = await fetchComments(page)
  renderComments(comments)
  return comments
}

async function fetchComments(page) {
  const ctxData = getCtxTypeId()
  let apiCall = '/api/v1/comments?ctx_type=' + ctxData.ctxType
  if (ctxData.ctxId !== undefined)
    apiCall = apiCall + '&' + 'ctx_id=' + ctxData.ctxId
  if (page) apiCall = apiCall + `&p=${page}`
  const res = await axios.get(apiCall)
  return res.data
}

function renderComments(comments) {
  const oldComments = document.querySelectorAll('.comment')
  if (oldComments.length) {
    const arrayChildren = Array.from(oldComments)
    arrayChildren.forEach(el => el.remove())
  }
  renderCommentCount(comments.commentCount)
  comments.comments.forEach(comment => appendComment(comment))
  const pagesTotalEl = document.querySelector('.pages-total')

  // TODO: Think of a better solution for buggy content pagination
  pagesTotalEl.textContent = comments.numberOfAllPages
}

function renderCommentCount(commentCount) {
  const { commentsCountEl } = window.commentElements

  let displayText = `${commentCount} `

  // TODO Let a i18n library handle the following logic.
  // TODO I18n
  switch (commentCount % 100) {
    case 1:
      displayText += i18next.t('komentar')
      break
    case 2:
      displayText += i18next.t('komentarja')
      break
    case 3:
    case 4:
      displayText += i18next.t('komentarji')
      break

    default:
      displayText += i18next.t('komentarjev')
      break
  }

  commentsCountEl.textContent = displayText
}

function appendComment(comment) {
  const { commentsContainerEl, commentDiv } = window.commentElements
  const { localeOptions } = window.commentSetting

  const {
    message,
    author: { firstName: authorFirstName, lastName: authorLastName },
    timeCreated,
    status,
    quote
  } = comment

  let tstamp = new Date(timeCreated).toLocaleTimeString('sl-SL', localeOptions)

  tstamp = `• ${tstamp}`
  const divText = document.createElement('div')
  const divTextComment = document.createElement('div')
  const divRow = document.createElement('div')
  const divRowHead = document.createElement('div')
  const liCommentContainer = document.createElement('li')
  const divCircle = document.createElement('div')
  const spanDate = document.createElement('span')
  const spanName = document.createElement('span')
  const spanInitials = document.createElement('span')
  const divCol = document.createElement('div')
  const aReply = document.createElement('button')
  const imgReplyBtn = document.createElement('img')
  const horizontalRowContainer = document.createElement('div')
  const horizontalRow = document.createElement('hr')

  divTextComment.className = 'comment-text-2'

  divRow.className = 'row'

  divRowHead.className = 'row'

  divText.className = 'comment-text'

  liCommentContainer.className = 'comment'
  liCommentContainer.dataObject = comment

  divCircle.className = 'comment-initials-container'

  spanInitials.className = 'test'

  divCol.className = 'comment-col col'

  spanName.className = 'comment-author-name'

  spanDate.className = 'comment-date'

  aReply.className = 'comment-reply-btn'
  imgReplyBtn.src = '/images/fi_corner-down-left.svg'
  imgReplyBtn.alt = 'Reply'

  horizontalRowContainer.className = 'horizontal-row-container container-l'
  horizontalRow.className = 'comment-hr comment-line'

  const firstNameInitial = authorFirstName.slice(0, 1)
  const lastNameInitial = authorLastName.slice(0, 1)

  const initialLetters = `${firstNameInitial}${lastNameInitial}`
  spanInitials.textContent = initialLetters

  spanDate.textContent = tstamp

  const authorName = `${authorFirstName} ${authorLastName}`
  spanName.textContent = authorName

  divTextComment.textContent = message

  if (quote) {
    const {
      message,
      author: { firstName: authorFirstName, lastName: authorLastName },
      timeCreated
    } = quote

    let tstamp = new Date(timeCreated).toLocaleTimeString(
      'sl-SL',
      localeOptions
    )

    tstamp = `• ${tstamp}`

    const quoteText = document.createElement('div')
    const imgQuotemarks = document.createElement('img')
    const spanQuoteName = document.createElement('span')
    const spanQuoteDate = document.createElement('span')
    const divQuotedText = document.createElement('div')
    const quotehr = document.createElement('hr')

    quoteText.className = 'comment-text-2'

    imgQuotemarks.src = '/images/quote-marks.svg'

    spanQuoteName.className = 'comment-quotename'

    spanQuoteDate.className = 'comment-quotedate'

    divQuotedText.className = 'comment-quotedtext'

    quotehr.className = 'comment-quotehr'

    spanQuoteDate.innerText = tstamp

    const authorName = `${authorFirstName} ${authorLastName}`

    spanQuoteName.textContent = authorName

    divQuotedText.textContent = message

    divText.appendChild(quoteText)
    quoteText.appendChild(imgQuotemarks)
    quoteText.appendChild(spanQuoteName)
    quoteText.appendChild(spanQuoteDate)
    quoteText.appendChild(divQuotedText)
    divQuotedText.appendChild(quotehr)
  }
  commentsContainerEl.insertBefore(liCommentContainer, commentDiv)
  liCommentContainer.appendChild(divRowHead)
  divRowHead.appendChild(divCircle)
  divCircle.appendChild(spanInitials)
  divRowHead.appendChild(divCol)
  divCol.appendChild(spanName)
  divCol.appendChild(spanDate)
  divCol.appendChild(aReply)
  aReply.appendChild(imgReplyBtn)
  liCommentContainer.appendChild(divRow)
  divRow.appendChild(divText)
  divText.appendChild(divTextComment)
  divRow.appendChild(horizontalRowContainer)
  horizontalRowContainer.appendChild(horizontalRow)
  if (comment.showEye) {
    const btnSeen = document.createElement('button')
    const imgSeen = document.createElement('img')

    divCol.appendChild(btnSeen)
    btnSeen.appendChild(imgSeen)
    if (status === 'visible') {
      btnSeen.className = 'comment-seen-btn me-2'
      imgSeen.src = '/images/eye.svg'
      imgSeen.alt = 'Viden'
    } else {
      btnSeen.className = 'comment-eye-off-btn me-2'
      imgSeen.src = '/images/eye-off.svg'
      imgSeen.alt = 'Skrit'
    }
  }
  if (status === 'hidden') whitenCommentText(liCommentContainer)
  else normalCommentColors(liCommentContainer)
}

function submitComment() {
  const { commentMessageInput } = window.commentElements

  const message = commentMessageInput.value
  const ctxData = getCtxTypeId()
  const ctxType = ctxData.ctxType
  let ctxId = null
  if (ctxData.ctxId !== undefined) ctxId = ctxData.ctxId
  if (!message) {
    alert(i18next.t('Vaš komentar je brez vsebine.'))
  } else {
    const payload = { message, ctxType, ctxId, quoteId: null }
    createComment(payload)
  }
  normalizeTextAreaSize()
}

function submitCommentReply() {
  const { commentReplyInput, commentQuoteId } = window.commentElements
  const message = commentReplyInput.value
  const ctxData = getCtxTypeId()
  const ctxType = ctxData.ctxType
  const quoteId = commentQuoteId.value
  let ctxId = null
  if (ctxData.ctxId !== undefined) ctxId = ctxData.ctxId
  if (!message) {
    alert(i18next.t('Vaš komentar je brez vsebine.'))
  } else {
    const payload = { message, ctxType, ctxId, quoteId }
    createComment(payload)
  }
}

async function createComment(comment) {
  const { updatePager } = window.commentElements
  try {
    const res = await axios.post('/api/v1/comments', comment)
    const { comments, pagesTotal } = res.data
    handleCommentSubmissionSuccess(comments)
    updatePager(pagesTotal, pagesTotal)
  } catch (e) {
    console.log(e)
    handleCommentSubmissionError()
  }
}

function handleCommentSubmissionSuccess(comments) {
  const { commentForm, replyFormContainer } = window.commentElements

  commentForm.classList.remove('hide')
  replyFormContainer.classList.add('hide')
  clearMessageInput()
  const commentQuoteContent = document.getElementById('comment-quote-content')
  if (commentQuoteContent) commentQuoteContent.remove()
  const oldComments = document.querySelectorAll('.comment')
  if (oldComments.length) {
    const arrayChildren = Array.from(oldComments)
    arrayChildren.forEach(el => el.remove())
  }
  // renderCommentCount(comments.comments.length)
  comments.forEach(comment => appendComment(comment))
}

function clearMessageInput() {
  const { commentMessageInput, commentReplyInput } = window.commentElements

  commentMessageInput.value = ''
  commentReplyInput.value = ''
}

function handleCommentSubmissionError() {
  console.error("Comment couldn't be saved. Handle appropriately")
}

function handleCommentClick({ target }) {
  const replyButtonEl = target.closest('.comment-reply-btn')
  const btnSeenEl = target.closest('.comment-seen-btn')
  const btnEyeOffEl = target.closest('.comment-eye-off-btn')
  const commentData = target.closest('.comment')?.dataObject
  let status
  if (replyButtonEl) {
    prepareReplyForm(commentData)
  } else if (btnSeenEl) {
    const commentText = target.closest('.comment')
    whitenCommentText(commentText, btnSeenEl)
    status = 'hidden'
    commentVisibility(commentData.id, status)
  } else if (btnEyeOffEl) {
    const commentText = target.closest('.comment')
    normalCommentColors(commentText, btnEyeOffEl)
    status = 'visible'
    commentVisibility(commentData.id, status)
  }
}

function prepareReplyForm(repliedCommentData) {
  const {
    id: quoteId,
    message: quoteMessage,
    author: { firstName: quoteAuthorFirstName, lastName: quoteAuthorLastName },
    timeCreated: quotetimeCreated
  } = repliedCommentData

  window.scrollTo(0, document.body.scrollHeight)
  const { commentForm, commentReplyForm, commentQuoteId, replyFormContainer } =
    window.commentElements
  const { localeOptions } = window.commentSetting

  commentQuoteId.value = quoteId

  const oldQuotePreview = document.getElementById('comment-quote-content')
  if (oldQuotePreview) oldQuotePreview.remove()

  commentForm.classList.add('hide')
  replyFormContainer.classList.remove('hide')

  const quotePreview = document.createElement('div')
  quotePreview.id = 'comment-quote-content'

  const quoteMarksEl = document.createElement('img')
  quoteMarksEl.src = '/images/quote-marks.svg'
  quoteMarksEl.id = 'quote-marks'
  quotePreview.appendChild(quoteMarksEl)

  const quoteAuthorFirstNameEl = document.createElement('p')
  quoteAuthorFirstNameEl.className = 'comment-quote-author-fname'
  quoteAuthorFirstNameEl.textContent = quoteAuthorFirstName
  quotePreview.appendChild(quoteAuthorFirstNameEl)

  const quoteAuthorLastNameEl = document.createElement('p')
  quoteAuthorLastNameEl.className = 'comment-quote-author-lname'
  quoteAuthorLastNameEl.textContent = quoteAuthorLastName
  quotePreview.appendChild(quoteAuthorLastNameEl)

  let tstamp = new Date(quotetimeCreated).toLocaleTimeString(
    'sl-SL',
    localeOptions
  )

  tstamp = `• ${tstamp}`
  const quotetimeCreatedEl = document.createElement('p')
  quotetimeCreatedEl.className = 'comment-quote-time-created'
  quotetimeCreatedEl.textContent = tstamp
  quotePreview.appendChild(quotetimeCreatedEl)

  const shortenQuoteMessage = quoteMessage.substring(0, 175)
  const quoteMessageEl = document.createElement('p')
  quoteMessageEl.className = 'comment-quote-message'
  quoteMessageEl.textContent = shortenQuoteMessage
  quotePreview.appendChild(quoteMessageEl)

  const horizontalLineEl = document.createElement('hr')
  horizontalLineEl.className = 'comment-reply-line'

  quotePreview.appendChild(horizontalLineEl)

  // commentReplyForm.insertBefore(quotePreview, commentReplyInput)
  replyFormContainer.insertBefore(quotePreview, commentReplyForm)

  const commentReplyInputEl = document.getElementById('comment-reply-input')
  commentReplyInputEl.focus()
  commentReplyInputEl.select()
}

async function commentVisibility(id, status) {
  try {
    await axios.post('/api/v1/comments/updateStatus', {
      params: { id, status }
    })
  } catch (e) {
    console.log(e)
    handleCommentSubmissionError()
  }
}

function whitenCommentText(selectedText, btnSeenEl) {
  if (btnSeenEl) {
    const imgEyeEl = btnSeenEl.lastElementChild
    imgEyeEl.src = '/images/eye-off.svg'
    btnSeenEl.classList.remove('comment-seen-btn')
    btnSeenEl.classList.add('comment-eye-off-btn')
  }
  selectedText.classList.add('comment-white-text')
}

function normalCommentColors(selectedText, btnEyeOffEl) {
  if (btnEyeOffEl) {
    const imgEyeEl = btnEyeOffEl.lastElementChild
    imgEyeEl.src = '/images/eye.svg'
    btnEyeOffEl.classList.add('comment-seen-btn')
    btnEyeOffEl.classList.remove('comment-eye-off')
  }
  selectedText.classList.remove('comment-white-text')
}

// function getCtxId({ target }) {
//   console.log(target)
//   const termBtn = target.closest('.terms-label')
//   console.log(termBtn)
//   if (termBtn) {
//     console.log(termBtn)
//     displayComments()
//   }
// }

const ctxBtns = document.getElementsByName('comments-type')
const commentsTab = document.getElementById('content-comments')
if (ctxBtns) {
  const ctxBtnsArray = Array.from(ctxBtns)
  ctxBtnsArray.forEach(el => el.addEventListener('click', displayComments))
}
if (commentsTab) {
  commentsTab.addEventListener('click', displayComments)
}

function getCtxTypeId(type) {
  const { terminsList } = window.commentElements
  let ctxType
  let ctxId
  const splitURL = pageURL.split('/')
  if (location.pathname !== '/') {
    if (!pageURL.match('admin/komentarji')) ctxId = pageURL.match(/\d+/)[0]
    if (type) ctxId = type
  }
  splitURL.forEach(el => {
    if (el === 'slovarji') {
      ctxType = 'dictionary'
    }
    if (el === 'admin') {
      ctxType = 'portal'
    }
    /* "vebina" -> in case this endpoint is used anywhere in the future,
     delete this legacy endpint matching otherwise */
    if (el === 'vsebina') {
      const selected = checkButton('intext')
      if (selected === 'internal') ctxType = 'entry_dict_int'
      if (selected === 'external') ctxType = 'entry_dict_ext'
      const selectedTerm = checkButton(terminsList)
      ctxId = selectedTerm
    }
    if (el === 'termin') {
      ctxType = 'entry_dict_ext'
      ctxId = checkButtonModular('returnFromEntryDetail')
    }
    if (el === 'urejanje') {
      ctxType = 'entry_consult_int'
      ctxId = checkButtonModular('returnFromCosnultancyInternal')
    }
  })
  if (location.pathname === '/') {
    ctxType = 'portal'
    ctxId = null
  }

  return { ctxType: ctxType, ctxId: ctxId }
}

function checkButton(type) {
  let checked
  if (type === 'intext') {
    checked = document.querySelector('input[name="comments-type"]:checked').id
  } else {
    const term = document.querySelector('.selected-term-btn')
    if (term) {
      const termId = term.getAttribute('data-term-id')
      checked = termId
    }
  }
  return checked
}

async function onPageChange(newPage) {
  const { updatePager } = window.commentElements
  try {
    const { page, numberOfAllPages } = await displayComments(newPage)
    updatePager(page, numberOfAllPages)
  } catch (error) {
    let message = i18next.t('Prišlo je do napake.')
    if (error.response?.data) {
      message = error.response.data
    } else if (error.request) {
      message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
    }
    alert(message)
    updatePager()
  }
}

/**
 * improved version of checkButton function
 *
 * @param {*} type
 *  Parameter that checks whether the selector should choose:
 *  -> if 'intext' -> returns internal or external comment type
 *  -> if namePattern = returnFrom[Dictionary | Entry | OtherName]Detail
 *     | -> returns context ID from URL depending on its location
 *  -> else -> returns the context ID of the selected TERM (also known as entry)
 * (previous fn compatible)
 * @param {*} selectorExternal
 *  Parameter that defines from which element to read the ID in case type
 *  isn't "intext". Please notice that the attribute for id is not id, but
 *  data-term-id
 * @param {*} selectorInternal
 *  Parameter that defines where to read the string "internal" or "external"
 *  in case of type being "intext"
 * @returns
 *
 * #Note to the author of the fn: Please define function such that
 * one function only does one job, not nested into different logic
 * based on a string.
 */
function checkButtonModular(
  type,
  selectorExternal = '.selected-term-btn',
  selectorInternal = 'input[name="comments-type"]:checked'
) {
  let checked
  if (type === 'intext') {
    checked = document.querySelector(selectorInternal).id
  } else if (type === 'returnFromEntryDetail') {
    checked = returnCommentCTXFromParsedURL(type)
  } else if (type === 'returnFromCosnultancyInternal') {
    checked = returnCommentCTXFromParsedURL(type)
  } else {
    const term = document.querySelector(selectorExternal)
    if (term) {
      const termId = term.getAttribute('data-term-id')
      checked = termId
    }
  }
  return checked
}

function returnCommentCTXFromParsedURL(typeOfURL) {
  let retString = 'Undefined - please check your code'
  if (typeOfURL === 'returnFromEntryDetail') {
    const splitStringBat = window.location.href.split('/')
    retString = splitStringBat[splitStringBat.length - 1]
  } else if (typeOfURL === 'returnFromDictionaryDetail') {
    const splitStringBat = window.location.href.split('/')
    retString = splitStringBat[splitStringBat.length - 2]
  } else if (typeOfURL === 'returnFromCosnultancyInternal') {
    const splitStringBat = window.location.href.split('/')
    retString = splitStringBat[splitStringBat.length - 1].split('?')[0]
  }

  // console.log('ID: ' + retString)
  return retString
}
