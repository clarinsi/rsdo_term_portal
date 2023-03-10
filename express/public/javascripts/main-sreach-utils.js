/* global $, refreshLabels, setVisibleSuggestionsRoot, closeUtilityContainers, sfm,
   inputs */

const dcw = document.documentElement.clientWidth
const SMALLER_THAN_MDEIUM_SCREEN = () => {
  const dynamicDcw = document.documentElement.clientWidth
  return dynamicDcw < 768
}

const searchFilterDOM = {
  pd: $('.select-domain-field'), // legacy word used for domain
  sl: $('.select-src-lang-field'),
  tl: $('.select-dest-lang-field'),
  d: $('.select-dict-field'),
  s: $('.select-source-field')
}

// Get the input field
// click on enter and focused on enter classes are not used anymore
const buttonMainSearch = document.querySelector('#search-button-main')
const inputMainSearch = document.querySelector('#search-query')

// Execute a function when the user presses a key on the keyboard
if (buttonMainSearch && inputMainSearch) {
  inputMainSearch.addEventListener('keypress', function (event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === 'Enter') {
      // Cancel the default action, if needed
      event.preventDefault()
      // Trigger the button element with a click
      buttonMainSearch.click()
    }
  })
}

/// Secondary searchbar search logic (for asmall search screens)
// A lot of DUPLICATE code, enhance later

// search implementation functions

// Also used in search field
// function calibrateWithDelay() {
//  setTimeout(() => {
//    moveContainer(rootClass, boundingBoxRect)
// updatePopupDimensions(rootCont, boundingBox)
//  }, 20)
// }

function bindKeys(bindTo) {
  const bindToElement = document.querySelector(bindTo)
  document.querySelectorAll('.kbd-key').forEach(e => {
    e.addEventListener('click', function (e) {
      const oldFocusIndex = bindToElement.selectionStart
      bindToElement.value = `${bindToElement.value.substring(
        0,
        bindToElement.selectionStart
      )}${e.target.textContent}${bindToElement.value.substring(
        bindToElement.selectionEnd
      )}`
      bindToElement.focus()
      bindToElement.selectionStart = oldFocusIndex + 1
      bindToElement.selectionEnd = oldFocusIndex + 1

      // setTimeout(() => {
      //   // calibrateWithDelay()
      //   renderSuggestionsVK(bindToElement.value)
      // }, 10)
    })
  })
}

const listenForTyping = function (event) {
  // moveContainer(rootClass, boundingBox)
  // updatePopupDimensions(rootCont, boundingBox)
  if (event.code === 'Enter') {
    event.preventDefault()
    closeUtilityContainers()
  }

  /* ************************* suggestions code below ************************* */
  // if (init) {
  //   removeSuggestions(root, childOfRootId)
  // } else {
  //   init = true
  // }

  // renderSuggestions(
  //   suggestions.filter(f => {
  //     /* if (event.target.value.length === 1) {
  //     return f[0] === event.target.value
  //   } */

  //     return (
  //       f.substring(0, event.target.value.length).toLowerCase() ===
  //       event.target.value.toLowerCase()
  //     )
  //   }),
  //   root,
  //   boundingBox,
  //   'suggestions-root'
  // ) // .filter(event.target), rect, rt)
  // setVisibleSuggestionsRoot(true)

  // Below code is just calibration of the popup windows
  // calibrateWithDelay()
}

const inputQueryMain = document.getElementById('search-query')
const inputQuerySecondary = document.getElementById('search-query-sec')

if (inputQueryMain) {
  inputQueryMain.addEventListener('keyup', listenForTyping)
}

if (inputQuerySecondary) {
  inputQuerySecondary.addEventListener('keyup', listenForTyping)
}

/*
searchQuery
- searchString - search string provided in the search input
- REMOVED: queryParams - parameters such as filters, etc. "q" is not allowed as query param since search string reserves the q parameter
- searchFilterDOM - jQuery DOM elements due to variable reusability. There will be converted to querparams

*/
function searchQuery(searchString, searchFilterDOM = {}) {
  const stringBuilder = `/iskanje?q=${searchString}`

  const url = new URL(stringBuilder, location.protocol + '//' + location.host)

  // Map filter DOM elements to query parameters
  Object.entries(searchFilterDOM).forEach(([k, v]) => {
    /* queryParams[k] = v.val().reduce((acc, el, index) => {
      if(index == 0)
    }) */

    if (v) {
      v.val().forEach(val => {
        url.searchParams.append(k, val)
      })
    }
  })

  /*
  // Todo - map query names if required
  Object.keys(queryParams).forEach(key => {
    if (key !== 'q') {
      // stringBuilder = `${stringBuilder}&${key}=${queryParams[key]}`
      url.searchParams.append(key, queryParams[key])
    }
  })
  */

  document.location.href = url
}

function searchQueryWithExistingFilters(searchString) {
  const stringBuilder = `/iskanje?q=${searchString}`
  const thisUrl = new URL(location)
  const url = new URL(stringBuilder, location.protocol + '//' + location.host)

  thisUrl.searchParams.forEach((value, key, parent) => {
    // console.log(`VALUE: ${value}`)
    if (!(key === 'q' || key === 'p')) {
      url.searchParams.append(key, value)
    }
  })

  document.location.href = url
}

// end search implementation functions

// search filter functions
function sbmFn(sbm) {
  if (sbm) {
    sbm.addEventListener('click', e => {
      let inputString
      if (inputQuerySecondary && SMALLER_THAN_MDEIUM_SCREEN()) {
        inputString = inputQuerySecondary.value
      } else {
        inputString = inputQueryMain.value
      }

      // TODO fill query parameters below for the core search example: domain, dictionary, ...

      if (inputString === '') {
        inputString = '*'
      }

      if (sbm === document.querySelector('.search-btn-a')) {
        searchQuery(inputString, searchFilterDOM)
      } else {
        searchQueryWithExistingFilters(inputString)
      }
    })
  }
}

//
function handleSSCLocation() {
  /*
  function removeSSCChild(elt) {
    if (elt) {
      elt.innerHMTL = ''
    }
  }
  */

  function swapContainer(cnt, rmCnt, elt) {
    if (cnt) {
      cnt.appendChild(elt)
    }
    // removeSSCChild(rmCnt)
  }

  const SSCSmallContainerHolder = document.getElementById('SSCSec')
  const SSCContainerHolder = document.getElementById('SSC')
  const SSCContainer = document.querySelector('.search-suggestion-container')

  if (SMALLER_THAN_MDEIUM_SCREEN()) {
    swapContainer(SSCSmallContainerHolder, SSCContainerHolder, SSCContainer)
  } else {
    swapContainer(SSCContainerHolder, SSCSmallContainerHolder, SSCContainer)
  }
}

const focusOnCompletePromptForSmallDevices = () => {
  focusOnCompletePromtBase(inputQuerySecondary)
}

const focusOnCompletePrompt = () => {
  focusOnCompletePromtBase(inputQueryMain)
}

const focusOnCompletePromtBase = queryInput => {
  queryInput.focus()
  queryInput.select()
}

// Get the input field
const buttonOnSmallScreen = document.querySelector('#search-button-main-sec')

// Execute a function when the user presses a key on the keyboard
if (buttonOnSmallScreen && inputQuerySecondary) {
  inputQuerySecondary.addEventListener('keypress', function (event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === 'Enter') {
      // Cancel the default action, if needed
      event.preventDefault()
      // Trigger the buttonOnSmallScreen element with a click
      buttonOnSmallScreen.click()
    }
  })
}

function submitForSSCButtons(btnQuery, isOnce = true) {
  sbmFn(document.querySelector(btnQuery))
  if (document.querySelector(btnQuery) && isOnce) {
    sbmFn(document.querySelector('.search-btn-a'))
  }
}

submitForSSCButtons('#search-button-main')
submitForSSCButtons('#search-button-main-sec', false)

/*
    sbmFn(document.querySelector('#search-button-main'))
    if (document.querySelector('#search-button-main')) {
      sbmFn(document.querySelector('.search-btn-a'))
    } */

if (inputQueryMain) {
  bindKeys('#search-query')
}

if (inputQuerySecondary) {
  bindKeys('#search-query-sec')
}

document.querySelector('.clear-f')?.addEventListener('click', e => {
  if (inputQueryMain) {
    inputQueryMain.value = ''
  }

  if (inputQuerySecondary) {
    inputQuerySecondary.value = ''
  }

  Object.values(searchFilterDOM).forEach(element => {
    if (element) {
      element.val(null).trigger('change')
    }
  })
})

document.addEventListener('click', event => {
  try {
    refreshLabels(inputs)

    const specificSQMQuery = document.querySelector(
      '#search-query.search-input'
    )
    // console.log(event)
    if (event.target.classList[1].slice(-5) === '-sugg') {
      specificSQMQuery.value = event.target.textContent
    }

    // updatePopupDimensions(rootCont, boundingBox)
  } catch (e) {
    // console.log(e)
    // console.log(e)
  }
  setVisibleSuggestionsRoot(false)

  // Below code is just calibration of the popup windows
  // moveContainer(rootClass, boundingBoxRect)
  // updatePopupDimensions(rootCont, boundingBox)
})

if (sfm) {
  sfm.addEventListener('click', focusOnCompletePrompt)
  sfm.addEventListener('click', () => {
    if (SMALLER_THAN_MDEIUM_SCREEN()) {
      focusOnCompletePromptForSmallDevices()
    }
  })
}

// inital focus on searchbars script closure
// focus on login/register

if (inputQueryMain) {
  focusOnCompletePrompt()
  if (SMALLER_THAN_MDEIUM_SCREEN()) {
    focusOnCompletePromptForSmallDevices()
  }
}

window.addEventListener('resize', () => {
  handleSSCLocation()
})

$(document).ready(function () {
  handleSSCLocation()
})
