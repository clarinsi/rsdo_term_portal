/* global $, bootstrap */

const windows = ['#suggestions-root', '.advanced-search-root', '.kbd-root']

let isAdvancedSearchButtonPressedOddTimes = false
let isVirtualKeyboardPressedOddTimes = false

// Search field and virtual keyboard javascript

// ex. keyboard js
/* Render suggestion for the virtual keyboard */

// Presumably used in other files, like consultancy.js.
// eslint-disable-next-line no-unused-vars
function nthParent(element, num) {
  if (num < 1) {
    return element
  } else {
    element = element.parentNode
    return nthParent(element, num - 1)
  }
}

// TODO refactor code below
// All is a huge try block because the pages not containing any of the search items should NOT throw errors

function renderSuggestionsVK(text) {
  renderSuggestions(
    suggestions.filter(f => {
      return f.substring(0, text.length).toLowerCase() === text.toLowerCase()
    }),
    root,
    boundingBox,
    'suggestions-root'
  )
  setVisibleSuggestionsRoot(true)
}

// ex. search-field js
// Depends on -> keyboard.js

// Definitions
// const rtcnt = '.search-suggestion-container'
const rootClass = '.search-suggestion-container'
const childOfRootId = 'suggestions-root'
const root = document.querySelector(rootClass)
// const rootRect = root.getBoundingClientRect()
/* paddingSearchRoot is linked to 
.search-root-main {
  padding: 0 20px;
  ...
 } */

/* SEARCH FIELD INTERACTIONS */

/*
Intention of this file is to make tags in the advanced search.

Miha Stele 2021-12-01
*/

/* Classes */

class InputHandler {
  constructor(element) {
    this._id = element.id
    // this.nameIsVisible = true
    this.tags = []
    this.focused = false
    this.domElement = element
    this.input = '' // select2-search__field TEXTAREA
    //   element.children[0].children[1].children[1].children[0].children[0].children[1].children[0]
    this.labelText = element.children[0].children[1].children[1]
  }

  get id() {
    return this._id
  }

  addTag(value) {
    this.tags.push(value)
    return value
  }

  removeTag(value) {
    // console.log('removing ' + value)
    this.tags = this.tags.filter(e => e !== value)
  }

  labelJump() {
    // label text logic
    if (this.tags.length > 0 || this.input.value.length > 0 || this.focused) {
      this.labelText.classList = ['advanced-input-label jumped']
    } else {
      this.labelText.classList = ['advanced-input-label']
    }
  }

  /*

  evaluate press enter logic
  1. check if input value is empty
  2. if not go onward
  3. create Tag element and append it to taglist, and create an HTML dom that represnts UI of the tag
  
  ----structure as a pug file of the tag element: --------------

      .search-filter-keyword-item.pt-1.pb-1.m-1.rounded-2
        span.ps-2.pe-2= searchstring
        button.pe-2.border-0.bg-transparent
          img.text-white(src="/images/x-black.svg")

  ----------- end structure, see search-filter-keyword-item for the latest struct---

  4. edit elements and sub elements

  5. Update UI with the new DOM element

  */
}

/* Declarations */

const inputIds = [
  'area',
  'src-lang',
  'dest-lang',
  'dict',
  'source',
  'consultant'
]
const inputs = []
let activeInput = null

/* Functions */

function refreshLabels(inputs) {
  inputs.forEach(inpt => inpt.labelJump())
}

/*
function handleInputTextToTag(event, activeInput) {
  if (event.target.localName === 'input' && event.target.type === 'text') {
    activeInput.evaluatePressEnter()
  }
}


  function imageOrbuttonQuery(event) {
    return (
      event.target.localName === 'img' || event.target.localName === 'button'
    )
  }

  */

/*
function inputAndTextQuery(event) {
  return event.target.localName === 'input' && event.target.type === 'text'
}


  function deleteImageButtonSelectedQuery(event) {
    return (
      event.target.localName === 'img' &&
      event.target.parentNode.parentNode.id.length > 0
    )
  }


  /*
  function removeTag(event) {
    let elt = null

    if (event.target) {
      if (deleteImageButtonSelectedQuery(event)) {
        elt = event.target.parentNode.parentNode
      } else if (
        event.target.localName === 'button' &&
        event.target.parentNode.id > 0
      ) {
        elt = event.target.parentNode
      }
    } else {
      return
    }

    if (elt !== null) {
      activeInput.removeTag(elt)
    }
  }
  

  function removeTag(event) {
    if (event) activeInput.removeTag(event.target.value)
  }

  */

function selectActiveElementFromInput(eventElement) {
  if (
    eventElement.target.localName === 'select' &&
    eventElement.target.type === 'select-multiple'
  ) {
    activeInput = inputs.filter(
      e => e.id === eventElement.target.parentNode.parentNode.parentNode.id
    )[0]
  }
}

/* Logic */
let count = 0

inputIds.forEach(e => {
  try {
    const elt = document.getElementById(e)
    // elt.onclick = inputFocusedLogic
    const element = new InputHandler(elt)
    element.enumeratedId = count
    // add listener to the input element
    inputs.push(element)
    count++
  } catch (e) {
    // console.log("DEBUG: One or more elements don't exist in the list")
  }
})

/* FILTERING RESULTS */

/*
Intention of this file is to render suggestions when typing in the search bar.

Miha Stele 2021-12-01
*/

// let bodyWidth = document.getElementsByTagName('body')

const boundingBox = document.querySelector('#searchbar-main')
// const boundingBoxRect = boundingBox.getBoundingClientRect()

let init

init = false

const suggestions = [
  'cenik',
  'cepivo',
  'cisterna',
  'copat',
  'cokli',
  'miza',
  'milo',
  'mir',
  'minuta',
  'minotaver'
]

function ajustElementSettings(element, options) {
  if (element.localName === 'button') {
    element.type = 'button'
  } else if (element.type === 'a') {
    element.href = options.href
  }
}

function applyStyles(obb, styles) {
  for (let i = 0; i < styles.length; i++) {
    obb.style[Object.keys(styles[i])[0]] = styles[i][Object.keys(styles[i])[0]]
  }
}

// Creation od DOM Elements
/* RENDER SUGGESTIONS ONLY GENERATES THE LIST, NOT THE PROPER CONTAINERS... */
function renderSuggestions(
  suggestions,
  root,
  boundingBox,
  childOfRootId = 'suggestions-root',
  type = 'button',
  prepend = true,
  options = {
    css: ['d-none-weak flex-column suggestion-popup'],
    styles: [], // root styles (absolute positioning for example)
    childStyles: [] // child of root styles(relative of the absolute for example)
  }
) {
  const existingElement = document.querySelector(`#${childOfRootId}`)

  if (existingElement) {
    existingElement.parentElement.removeChild(existingElement)
  }

  const searchSuggestionElementRoot = document.createElement('div')
  searchSuggestionElementRoot.id = childOfRootId
  searchSuggestionElementRoot.classList = options.css
  /* searchSuggestionElementRoot.style.left = rootRect.left + 'px'
  searchSuggestionElementRoot.style.top = rootRect.bottom - 7 + 'px'
  searchSuggestionElementRoot.style.width = rootRect.right - rootRect.left + 'px' */
  searchSuggestionElementRoot.style['z-index'] = '1000'

  const preElement = document.createElement(type)

  ajustElementSettings(preElement, options)

  preElement.textContent = 'Za to besedo še ni podatkov.'
  preElement.disabled = true
  preElement.classList = ['w-100']
  preElement.classList += ` ${type}-sugg`
  // searchSuggestionElementRoot.appendChild(preElement)

  for (const suggestion in suggestions) {
    const currElement = document.createElement(type)

    ajustElementSettings(currElement, options)

    currElement.textContent = suggestions[suggestion]
    currElement.classList = ['w-100']
    currElement.classList += ` ${type}-sugg`
    searchSuggestionElementRoot.append(currElement)
  }
  if (suggestions.length < 1) {
    searchSuggestionElementRoot.append(preElement)
  }

  applyStyles(root, options.styles)

  applyStyles(searchSuggestionElementRoot, options.childStyles)

  /*
  for (let i = 0; i < options.styles.length; i++) {
    root.style[Object.keys(options.styles[i])[0]] =
      options.styles[i][Object.keys(options.styles[i])[0]]
  }
  */

  if (prepend) {
    root.prepend(searchSuggestionElementRoot)
  } else {
    root.append(searchSuggestionElementRoot)
  }

  // updatePopupDimensions(rootCont, boundingBox)

  return searchSuggestionElementRoot
}

function removeSuggestions(root, childOfRootId) {
  root.removeChild(document.getElementById(childOfRootId))
  // updatePopupDimensions(rootCont, boundingBox)
}

/* UPDATE POSITIONING IN CASE SCROLLER GIVES AN UNUSUAL OFFSET TO THE SUGGESTION POPUP  */
// function updatePopupDimensions(rootCont, boundingBox) {
// const boundingBoxRect = boundingBox.getBoundingClientRect()

// const offset = 0

// if (
//  document.getElementsByTagName('body').clientWidth > bodyWidth.clientWidth
// ) {
// bodyWidth = document.getElementsByTagName('Body')
// offset = bodyWidth.offsetWidth - bodyWidth.clientWidth
// }

/* rootCont.style.position = 'absolute' */
/*     rootCont.style.left = `${boundingBoxRect.left - offset / 2}px`
    rootCont.style.right = `${boundingBoxRect.right - offset / 2}px`
    rootCont.style.top = `${boundingBoxRect.bottom - 5}px`
    rootCont.style.width = `${boundingBoxRect.right - boundingBoxRect.left}px` */
// }

// function moveContainer(rootClass, boundingBoxRect) {
// move suggestions container borders
// const rootCont = document.querySelector(rootClass)
/* rootCont.style.position = 'absolute' */
/*  rootCont.style.left = `${boundingBoxRect.left}px`
    rootCont.style.right = `${boundingBoxRect.right}px`
    rootCont.style.top = `${boundingBoxRect.bottom - 5}px`
    rootCont.style.width = `${boundingBoxRect.right - boundingBoxRect.left}px`
 */
// return rootCont
// }

// const rootCont = moveContainer(rootClass, boundingBox)

/* Handler for each input on the advanced window (deprecated?) */

// functions and listeners

/*
document.querySelector('.dropdown-btn').addEventListener('click', function () {
  isAdvancedSearchButtonPressedOddTimes = !isAdvancedSearchButtonPressedOddTimes
})

document
.querySelector('.search-button-keyboard')
.addEventListener('click', function () {
  isVirtualKeyboardPressedOddTimes = !isVirtualKeyboardPressedOddTimes
})

*/
/* visibilty updated to display to change the viewport */

/* search-field-interction.js logic visibility */
function setVisibleAdvancedSearch(isVisible) {
  isVisible
    ? (document.querySelector(windows[1]).style.display = 'flex')
    : (document.querySelector(windows[1]).style.display = 'none')
}

function setVisibleVirtualKeyboard(isVisible) {
  isVisible
    ? (document.querySelector(windows[2]).style.display = 'flex')
    : (document.querySelector(windows[2]).style.display = 'none')
}

/* search-field-filtering-results.js logic visibility */
function setVisibleSuggestionsRoot(isVisible) {
  if (document.querySelector(windows[0])) {
    isVisible
      ? (document.querySelector(windows[0]).style.display = 'flex')
      : (document.querySelector(windows[0]).style.display = 'none')
  }
}

/* DECLARATIONS */

// MOVED FUNCTIONS BECAUSE OF REQUIREMENT OF COMMON LOGIC

function virtualKeyboardCheck(keyboardButtonElement) {
  if (keyboardButtonElement) {
    keyboardButtonElement.addEventListener('click', () => {
      isVirtualKeyboardPressedOddTimes = !isVirtualKeyboardPressedOddTimes
      setVisibleVirtualKeyboard(isVirtualKeyboardPressedOddTimes)
    })
  }
}

const kbdBtn = document.querySelector('#keyboard')
virtualKeyboardCheck(kbdBtn)

const kbdBtnSmall = document.querySelector('#keyboard-sec')
virtualKeyboardCheck(kbdBtnSmall)

// REMOVED AFTER REBASE keyboardInit('#keyboard')
// REMOVED AFTER REBASE keyboardInit('#keyboard-sec')

const toggleShowHideFilterModal = () => {
  isAdvancedSearchButtonPressedOddTimes = !isAdvancedSearchButtonPressedOddTimes
  setVisibleAdvancedSearch(isAdvancedSearchButtonPressedOddTimes)
}

const advSrch = document.querySelector('#advanced-search')

if (advSrch) {
  advSrch.addEventListener('click', toggleShowHideFilterModal)
}

function initAdvancedSearch(ASQueryElt) {
  const el = document.querySelector(ASQueryElt)
  if (el) {
    el.addEventListener('click', toggleShowHideFilterModal)
  }
}

initAdvancedSearch('#advanced-search')
initAdvancedSearch('#advanced-search-sec')

// close advanced search and virtual keyboard
function closeUtilityContainers() {
  isAdvancedSearchButtonPressedOddTimes = false
  setVisibleAdvancedSearch(isAdvancedSearchButtonPressedOddTimes)
  isVirtualKeyboardPressedOddTimes = false
  setVisibleVirtualKeyboard(isVirtualKeyboardPressedOddTimes)
}

// document.addEventListener('click', event => {
//   try {
//     // selectActiveElementFromAll(event)

//     // moveContainer(rootClass, boundingBox)
//     // updatePopupDimensions(rootCont, boundingBox)

//     /*
//       // remove the Tag node logic if clicked on delete
//       if (
//         event &&
//         event.pointerType &&
//         event.pointerType.length > 0 &&
//         imageOrbuttonQuery(event) &&
//         event.target.parentNode.parentNode.id &&
//         event.target.parentNode.parentNode.id !== 'keyboard'
//       ) {
//         removeTag(event.target.value)
//       }
//       */

//     refreshLabels(inputs)

//     // console.log(event)
//     if (event.target.classList[1].slice(-5) === '-sugg') {
//       document.querySelector('#search-query.search-input').value =
//         event.target.textContent
//     }

//     // updatePopupDimensions(rootCont, boundingBox)
//   } catch (e) {
//     // console.log(e)
//     // console.log(e)
//   }
//   setVisibleSuggestionsRoot(false)

//   // Below code is just calibration of the popup windows
//   // moveContainer(rootClass, boundingBoxRect)
//   // updatePopupDimensions(rootCont, boundingBox)
// })

if (advSrch) {
  setVisibleAdvancedSearch(false)
}

if (kbdBtn) {
  setVisibleVirtualKeyboard(false)
}

if (kbdBtnSmall) {
  setVisibleVirtualKeyboard(false)
}

if (activeInput) {
  activeInput.labelJump()
}

// TODO Uncomment when used.

let opened = false
const navButton = document.getElementById('nav-button')
const navContentButton = document.getElementById('nav-content-button')
if (navButton !== null)
  navButton.addEventListener('click', () => {
    toggleNav('slidable')
  })

if (navContentButton !== null)
  navContentButton.addEventListener('click', () => {
    toggleNav('content-nav-content')
  })

function openNav(classname) {
  // document.getElementById(classname).style.right = "0px";
  // document.getElementsByClassName(classname)[0].style.left = "0px";
  document.getElementsByClassName(classname)[0].classList.add('opened')
  document.getElementsByClassName(classname)[0].classList.remove('closed')

  document
    .getElementById('burger-menu-img')
    .setAttribute('src', '/images/left-arrow.svg')
}

function closeNav(classname) {
  // document.getElementById(classname).style.width = "400px";
  // document.getElementsByClassName(classname)[0].style.left = "-320px";
  document.getElementsByClassName(classname)[0].classList.add('closed')
  document.getElementsByClassName(classname)[0].classList.remove('opened')
  document
    .getElementById('burger-menu-img')
    .setAttribute('src', '/images/burger-menu-button-icon.svg')
}

function toggleNav(classname) {
  if (opened) {
    closeNav(classname)
  } else {
    openNav(classname)
  }
  opened = !opened
}

// jump-label-common.js

function addJumpLogic(element, labelElement) {
  if (!labelElement.className.includes(' jumped-common'))
    labelElement.className += ' jumped-common'
}

function removeJumpLogic(element, labelElement) {
  // console.log(element.value.length)
  if (element.value.length < 1) {
    labelElement.className = labelElement.className.replace(
      ' jumped-common',
      ''
    )
  }
}

function addJumpLogicListener(element, labelElement) {
  return function (event) {
    addJumpLogic(element, labelElement)
  }
}

function removeJumpLogicListener(element, labelElement) {
  return function (event) {
    removeJumpLogic(element, labelElement)
  }
}

/*
function removeJumpLogicListenerIfNotEmpty(
  element,
  labelElement,
  notEmptyCondition
) {
  return function (event) {
    removeJumpLogic(element, labelElement)
  }
}
*/

const sfm = document.querySelector('#search-in-filter-modal')
if (sfm) {
  sfm.addEventListener('click', toggleShowHideFilterModal)

  sfm.addEventListener('click', () => {
    isVirtualKeyboardPressedOddTimes = false
    setVisibleVirtualKeyboard(isVirtualKeyboardPressedOddTimes)
  })
}

// LOGIN AND REGISTER LOGIC

document.querySelectorAll('.loginregisterlabel').forEach(label => {
  const inputEltRelated = label.parentElement.children[1]
  inputEltRelated.addEventListener(
    'focus',
    addJumpLogicListener(inputEltRelated, label)
  )
  inputEltRelated.addEventListener(
    'blur',
    removeJumpLogicListener(inputEltRelated, label)
  )
})

// PAGINATION LOGIC. Used on all pages with pagination.
/* eslint-disable no-unused-vars */
/**
 * Enables pagination logic for the specified pager UI.
 *
 * @param {string} paginationRootElId - Pager element id.
 * @param {function} onPageChange - Gets called with the number of the page the user requested.
 * @returns {function} - Call it with (newCurrentPage, newNumOfAllPages) to update the ui. Or without arguments, after handling a potential error.
 */
function initPagination(paginationRootElId, onPageChange, currentPage = 1) {
  const rootEl = document.getElementById(paginationRootElId)
  const btnFirstPage = rootEl.querySelector('.first-page')
  const btnPreviousPage = rootEl.querySelector('.previous-page')
  const btnNextPage = rootEl.querySelector('.next-page')
  const btnLastPage = rootEl.querySelector('.last-page')
  const formEl = rootEl.querySelector('form')
  const pageInputEl = formEl.querySelector('input')
  const pagesCountDisplayEl = formEl.querySelector('.pages-total')

  let reqLock = false

  rootEl.addEventListener('click', handleButtonClick)
  formEl.addEventListener('submit', handleFormSubmit)

  function handleButtonClick({ target }) {
    if (reqLock) return

    const buttonEl = target.closest(`#${paginationRootElId} button`)
    if (!buttonEl) return
    const numOfAllPages = +pagesCountDisplayEl.textContent

    if (buttonEl.classList.contains('first-page')) {
      if (currentPage === 1) return
      enableLock()
      onPageChange(1)
    } else if (buttonEl.classList.contains('previous-page')) {
      if (currentPage === 1) return
      enableLock()
      onPageChange(currentPage - 1)
    } else if (buttonEl.classList.contains('next-page')) {
      if (currentPage === numOfAllPages) return
      enableLock()
      onPageChange(currentPage + 1)
    } else if (buttonEl.classList.contains('last-page')) {
      if (currentPage === numOfAllPages) return
      enableLock()
      onPageChange(numOfAllPages)
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    if (reqLock) return

    const inputValue = +pageInputEl.value
    if (!(inputValue > 0 && inputValue <= pagesCountDisplayEl.textContent)) {
      alert('Nepravilna vrednost strani')
      pageInputEl.value = currentPage
      return
    }

    enableLock()
    onPageChange(inputValue)
  }

  function enableLock() {
    reqLock = true
    btnFirstPage.disabled = true
    btnPreviousPage.disabled = true
    btnNextPage.disabled = true
    btnLastPage.disabled = true
    pageInputEl.disabled = true
  }

  function disableLock() {
    reqLock = false
    btnFirstPage.disabled = false
    btnPreviousPage.disabled = false
    btnNextPage.disabled = false
    btnLastPage.disabled = false
    pageInputEl.disabled = false
  }

  function updatePagerUi(newCurrentPage, newNumOfAllPages) {
    disableLock()
    if (!newCurrentPage) return

    currentPage = newCurrentPage
    pageInputEl.value = newCurrentPage
    pagesCountDisplayEl.textContent = newNumOfAllPages

    if (newCurrentPage === 1) {
      btnFirstPage.disabled = true
      btnPreviousPage.disabled = true
    } else {
      btnFirstPage.disabled = false
      btnPreviousPage.disabled = false
    }

    if (newCurrentPage === newNumOfAllPages) {
      btnNextPage.disabled = true
      btnLastPage.disabled = true
    } else {
      btnNextPage.disabled = false
      btnLastPage.disabled = false
    }
  }

  return updatePagerUi
}

// Helper function to easily remove all child nodes. Useful for pagination.
function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild)
  }
}
/* eslint-enable no-unused-vars */

{
  // Rewrite "back" link URLs to referrer value if its host is the same as current page's.
  const { referrer } = document
  const currentPageHost = location.host
  const previousPageHost = referrer.split('/')[2]

  if (previousPageHost === currentPageHost) {
    const backLinks = document.getElementsByClassName('link-back')
    for (const link of backLinks) link.href = referrer
  }
}

// Redundant function, but required to do so because of the form structure
function displayTheLoginScreen() {
  const regBtn = document.querySelector('#regbtn')
  const logintBtn = document.querySelector('#loginbtn')
  const regForm = document.querySelector('#register-form')
  const loginForm = document.querySelector('#login-form')
  const regHeader = document.querySelector('.regtitle')
  const loginHeader = document.querySelector('.logintitle')
  const regDescription = document.querySelector('.regdesc')
  const loginDescription = document.querySelector('.logindesc')

  // Reset the values
  const lUE = document.querySelector('#login-username-or-email')
  lUE.value = ''
  removeJumpLogic(lUE, lUE.parentElement.children[0])

  const lPL = document.querySelector('#login-password')
  lPL.value = ''
  removeJumpLogic(lPL, lPL.parentElement.children[0])

  const lUR = document.querySelector('#register-username')
  lUR.value = ''
  removeJumpLogic(lUR, lUR.parentElement.children[0])

  const lRN = document.querySelector('#register-name')
  lRN.value = ''
  removeJumpLogic(lRN, lRN.parentElement.children[0])

  const lRS = document.querySelector('#register-surname')
  lRS.value = ''
  removeJumpLogic(lRS, lRS.parentElement.children[0])

  const lRE = document.querySelector('#register-email')
  lRE.value = ''
  removeJumpLogic(lRE, lRE.parentElement.children[0])

  const lRP = document.querySelector('#register-password')
  lRP.value = ''
  removeJumpLogic(lRP, lRP.parentElement.children[0])

  const lRPR = document.querySelector('#register-password-repeat')
  lRPR.value = ''
  removeJumpLogic(lRPR, lRPR.parentElement.children[0])

  if (window.getComputedStyle(loginForm, null).display === 'none') {
    regBtn.className = regBtn.className.replace('d-none', '')
    logintBtn.className = logintBtn.className + ' d-none'
    loginForm.className = loginForm.className.replace('d-none', '')
    regForm.className = regForm.className + ' d-none'
    loginHeader.className = loginHeader.className.replace('d-none', '')
    regHeader.className = regHeader.className + ' d-none'
    loginDescription.className = loginDescription.className.replace(
      'd-none',
      ''
    )
    regDescription.className = regDescription.className + ' d-none'
  }
}

function focusOnTheLoginRegisterPrompt() {
  const registerForm = document.getElementById('register-form')
  const loginForm = document.getElementById('login-form')
  const loginUsernameField = document.getElementById('login-username-or-email')
  const registerUsernameField = document.getElementById('register-username')

  // element.style.display === 'block' only works for inline style CSS
  if (
    loginUsernameField &&
    window.getComputedStyle(registerForm, null).display === 'none'
  ) {
    loginUsernameField.focus()
  } else if (
    registerUsernameField &&
    window.getComputedStyle(loginForm, null).display
  ) {
    registerUsernameField.focus()
  }
}

const myModal = document.getElementById('staticBackdrop')

myModal.addEventListener('show.bs.modal', displayTheLoginScreen)
myModal.addEventListener('shown.bs.modal', focusOnTheLoginRegisterPrompt)

const loginSwitchBtn = document.getElementById('loginbtn')
const registerSwithcButton = document.getElementById('regbtn')

if (loginSwitchBtn) {
  loginSwitchBtn.addEventListener('click', focusOnTheLoginRegisterPrompt)
}
if (registerSwithcButton) {
  registerSwithcButton.addEventListener('click', focusOnTheLoginRegisterPrompt)
}

{
  let unsaved = false
  function unsavedData(form, sideMenu, ajaxFunction) {
    form.addEventListener('input', () => {
      unsaved = true
    })
    $('.without-addition').on('change.select2', () => {
      unsaved = true
    })
    sideMenu.addEventListener('click', () =>
      handleMenuClick(form, event, ajaxFunction)
    )
  }

  /* SELECT 2 */

  function evaluateAlerModalTarget(pf, form, ajaxFunction) {
    if (unsaved) {
      event.preventDefault()
      openUnsavedMixin(form, pf, ajaxFunction)
    }
  }

  function handleMenuClick(form, event, ajaxFunction) {
    // alert(event.target.tagName)
    // alert(event.target.href)
    if (event.target.tagName === 'A') {
      evaluateAlerModalTarget(event.target.href, form, ajaxFunction)
    } else if (event.target.tagName === 'P') {
      evaluateAlerModalTarget(
        event.target.parentElement.href,
        form,
        ajaxFunction
      )
    }
  }

  function openUnsavedMixin(form, goToHref, ajaxFunction) {
    const unsavedModal = new bootstrap.Modal(
      document.getElementById('unsaved-data')
    )
    unsavedModal.show()
    const acceptBtn = document.getElementById('modal-save-btn')
    if (ajaxFunction) {
      acceptBtn.addEventListener('click', () => ajaxFunction(event))
    } else acceptBtn.addEventListener('click', () => form.submit())
    const dontSaveBtn = document.getElementById('modal-dont-save-btn')
    dontSaveBtn.addEventListener(
      'click',
      () => (window.location.href = goToHref)
    )
  }

  /* SELECT 2 */

  function initSelect2(querySelector, placeholder) {
    $(querySelector).select2({
      allowClear: true,
      placeholder: placeholder
    })

    $(querySelector).val(null).trigger('change')
  }

  $(document).ready(function () {
    // TODO refactor wth specific select2
    $('.select-search-field').select2({})

    initSelect2('.select-domain-field', 'Področje')
    initSelect2('.select-src-lang-field', 'Izvorni jezik')
    initSelect2('.select-dest-lang-field', 'Ciljni jezik')
    initSelect2('.select-dict-field', 'Slovar')
    initSelect2('.select-source-field', 'Vir')

    $('b[role="presentation"]').hide()
    $('.select2-selection__arrow').append(
      '<img src="/images/chevron-down-darker.svg" alt="V"></img>'
    )

    $('.select-search-field').on('select2:select', function (e) {
      selectActiveElementFromInput(e)
      // console.log(activeInput)
      // console.log(e.target.parentNode.children[2])
      // const label = e.target.parentNode.children[2]

      // console.log(activeInput)
      // console.log(activeInput)
      activeInput.addTag(e.params.data._resultId)
      activeInput.labelJump()
    })

    $('.select-search-field').on('select2:unselect', function (e) {
      selectActiveElementFromInput(e)
      // console.log(activeInput)
      // console.log(activeInput)
      activeInput.removeTag(e.params.data._resultId)
      activeInput.labelJump()
      // console.log('DELETED ' + e)
    })

    inputs.forEach(e => {
      e.input = e.domElement.querySelector('.select2-search__field')
    })
  })

  /* TODO REMOVE OTHER SCRIPTS WHEN YOU FINISH MODULARIZING THINGS THAT COULD BE MODULARIZED */

  $(document).ready(function () {
    // TODO refactor wth specific select2
    $('.select-search-field').select2({})

    initSelect2('.select-domain-field', 'Področje')
    initSelect2('.select-src-lang-field', 'Izvorni jezik')
    initSelect2('.select-dest-lang-field', 'Ciljni jezik')
    initSelect2('.select-dict-field', 'Slovar')
    initSelect2('.select-source-field', 'Vir')

    $('b[role="presentation"]').hide()
    $('.select2-selection__arrow').append(
      '<img src="/images/chevron-down-darker.svg" alt="V"></img>'
    )

    $('.select-search-field').on('select2:select', function (e) {
      selectActiveElementFromInput(e)
      // console.log(activeInput)
      // console.log(e.target.parentNode.children[2])
      // const label = e.target.parentNode.children[2]

      // console.log(activeInput)
      // console.log(activeInput)
      activeInput.addTag(e.params.data._resultId)
      activeInput.labelJump()
    })

    $('.select-search-field').on('select2:unselect', function (e) {
      selectActiveElementFromInput(e)
      // console.log(activeInput)
      // console.log(activeInput)
      activeInput.removeTag(e.params.data._resultId)
      activeInput.labelJump()
      // console.log('DELETED ' + e)
    })

    inputs.forEach(e => {
      e.input = e.domElement.querySelector('.select2-search__field')
    })
  })

  /* TODO REMOVE OTHER SCRIPTS WHEN YOU FINISH MODULARIZING THINGS THAT COULD BE MODULARIZED */

  /*   window.addEventListener('resize', () => {
    moveContainer(rootClass, boundingBoxRect)
    // updatePopupDimensions(rootCont, boundingBox)
  }) */

  // select2.utils

  inputs.forEach(e => {
    $(`#${e.id}`).on('select2:open', function () {
      e.focused = true
      e.labelJump()
    })

    $(`#${e.id}`).on('select2:close', function () {
      e.focused = false
      e.labelJump()
    })
  })

  try {
    // Jquery for Select2

    /*
  $('#select-cerif').select2({
    maximumSelectionLength: 1,
    language: {
      maximumSelected: function (e) {
        return 'Izberete lahko največ 1 področje.'
      }
    }
  })
  */

    $('.multiple').select2({
      minimumResultsForSearch: Infinity,
      tags: true
    })

    $('.without-addition').select2({
      minimumResultsForSearch: Infinity,
      language: {
        noResults: function () {
          return 'Ni zadetkov.'
        }
      }
    })

    $('.without-addition').on('select2:select', function (evt) {
      const element = evt.params.data.element
      const $element = $(element)
      $element.detach()
      $(this).append($element)
      $(this).trigger('change')
    })

    $('.without-dropdown').select2({
      minimumResultsForSearch: Infinity,
      tags: true,
      dropdownCssClass: 'hide-dropdown'
    })
  } catch (e) {
    // console.log(e)
  }
}

function removeDisposableBreakOnSmallScreens() {
  const optionalBreak = document.getElementById('disposable-break')
  if (document.body.clientWidth <= 1200) {
    optionalBreak.style.display = 'none'
  } else {
    optionalBreak.style.display = 'block'
  }
}

function transferText(sideMenuText, removeOptionalBreak = false) {
  const siteHeading = document.getElementById('site-heading')
  const siteHeadingTextContent = siteHeading.textContent
  const navTitle = document.getElementById('nav-title')

  const optionalBreak = document.getElementById('disposable-break')

  if (document.body.clientWidth <= 1200) {
    navTitle.textContent = siteHeadingTextContent
    siteHeading.style.display = 'none'
    if (removeOptionalBreak) {
      removeDisposableBreakOnSmallScreens()
    }
  } else {
    navTitle.textContent = sideMenuText
    siteHeading.style.display = 'block'
    if (removeOptionalBreak) {
      removeDisposableBreakOnSmallScreens()
    }
  }
}
