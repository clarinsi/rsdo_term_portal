/* global $, axios, currentPagePath, initPagination, removeAllChildNodes, transferText, tooltipTriggerList, tooltipList, reinitalizeDefaultTooltipSet, createTooltip */

// position correction functions

function adjustOffsetBy() {
  // const { offsetMain, fixedTopSection } = window.dictionaryElements

  const offsetMain = document.querySelector('#offset-main')
  const fixedTopSection = document.querySelector('#fixed-top-section')

  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
  // const adminNavMobile = document.getElementsByClassName('admin-nav')
  const headerPadding = document.getElementById('header-padding')

  if (document.body.clientWidth < 1200) {
    if (offsetHeaderPadding !== null) offsetMain.style.paddingTop = `0px`
  } else {
    for (let i = 0; i < offsetHeader.length; i++) {
      offsetHeader[i].style.paddingTop = `${referenceHeight}px`
    }
    if (headerPadding !== null) {
      const headerPaddingHeight = headerPadding.offsetHeight
      offsetMain.style.paddingTop = `${headerPaddingHeight}px`
    }
    if (offsetHeaderPadding !== null) {
      const offsetHeaderHeight = offsetHeaderPadding.offsetHeight
      offsetMain.style.paddingTop = `${referenceHeight + offsetHeaderHeight}px`
    }
  }
}

/*
function moveContent(adminNavClassId) {
  if (document.body.clientWidth <= 1200) {
    const adminNavMobileEl = document.getElementById(adminNavClassId)
    const mobileRightHolder = document.getElementById('mobile-right-holder')
    const headerContent = document.getElementById('offset-padding')
    const secondaryButton = headerContent.querySelector('.btn-secondary')
    const primaryButton = headerContent.querySelector('.btn-primary')
    // const siteHeading = document.getElementById('site-heading')
    // const siteHeadingTextContent = siteHeading.textContent
    // const navTitle = document.getElementById('nav-title')
    // const navTitleTextContent = navTitle.textContent
    if (secondaryButton) {
      mobileRightHolder.appendChild(secondaryButton)
      // secondaryButton.style.height = '28px'
      // secondaryButton.style.width = '99px'
      // secondaryButton.style.marginRight = '10px'
    }
    if (primaryButton) {
      // if (currentPagePath === '/admin/povezave/seznam') {
      // primaryButton.style.width = '160px'
      // } else {
      // primaryButton.style.width = '99px'
      // }
      mobileRightHolder.appendChild(primaryButton)
      adminNavMobileEl.classList.add('align-items-center')
      adminNavMobileEl.classList.add('justify-content-between')
      // primaryButton.style.height = '28px'
      // primaryButton.style.marginRight = '10px'
      primaryButton.style.whiteSpace = 'nowrap'
    }
    // navTitle.textContent = siteHeadingTextContent
    // siteHeading.style.display = 'none'
  }
}
*/

function mobileMoveContent() {
  const adminNavMobileEl = document.getElementById('admin-nav-mobile')
  const mobileRightHolder = document.getElementById('mobile-right-holder')
  const secondaryButton = document.querySelector('.header-btn-secondary')
  const primaryButton = document.querySelector('.header-btn')
  const siteHeading = document.getElementById('site-heading')
  const siteHeadingTextContent = siteHeading.textContent
  const navTitle = document.getElementById('nav-title')
  const headerContainerRight = document.querySelector(
    '.header-container-divider-right'
  )

  try {
    if (document.body.clientWidth <= 1200) {
      if (secondaryButton) {
        mobileRightHolder.appendChild(secondaryButton)
        // secondaryButton.style.height = '28px'
        // secondaryButton.style.width = '99px'
        // secondaryButton.style.marginRight = '10px'
      }
      if (primaryButton) {
        mobileRightHolder.appendChild(primaryButton)
        adminNavMobileEl.classList.add('align-items-center')
        adminNavMobileEl.classList.add('justify-content-between')
        // primaryButton.style.height = '28px'
        // primaryButton.style.width = '99px'
        // primaryButton.style.marginRight = '10px'
        primaryButton.style.whiteSpace = 'nowrap'
      }
      navTitle.textContent = siteHeadingTextContent
      siteHeading.style.display = 'none'
    }
    if (document.body.clientWidth > 1200) {
      if (secondaryButton) {
        headerContainerRight.appendChild(secondaryButton)
        secondaryButton.style.height = ''
        secondaryButton.style.width = ''
        secondaryButton.style.marginRight = ''
      }
      if (primaryButton) {
        headerContainerRight.appendChild(primaryButton)
        adminNavMobileEl.classList.remove('align-items-center')
        adminNavMobileEl.classList.remove('justify-content-between')
        primaryButton.style.height = ''
        primaryButton.style.width = ''
        primaryButton.style.marginRight = ''
        primaryButton.style.whiteSpace = ''
      }

      navTitle.textContent = 'Urejanje'
      siteHeading.style.display = 'block'
    }
  } catch (e) {}
}

const resultsListEl = document.getElementById('results-data')
if (resultsListEl) {
  resultsListEl.addEventListener('click', onResultClick)
}
const initialPage = +new URL(location).searchParams.get('p') || 1
const updatePager = initPagination('pagination', onPageChange, initialPage)

async function onPageChange(newPage) {
  const receivedPageNumber = await changePage(newPage)
  updateUrlAndHistory(receivedPageNumber)
}

async function changePage(newPage) {
  try {
    const res = await getDataForPage(newPage)

    const page = +res.headers.page
    const numberOfAllPages = +res.headers['number-of-all-pages']
    const resultsMarkup = res.data

    removeAllChildNodes(resultsListEl)
    renderResults(resultsMarkup)
    updatePager(page, numberOfAllPages)
    reinitalizeDefaultTooltipSet()

    /*
      try {
        textsScreenManager.manageResize()
      } catch (e) {
        console.log(
          'textsScreenManager not initialized or there is an internal error'
        )
      } */

    return page
  } catch (error) {
    // console.log(error)
    let message = 'Prišlo je do napake.'
    if (error.response?.data) {
      message = error.response.data
    } else if (error.request) {
      return // return to bypass error caused (assumed) by popstate on iOS/MacOS
      message = 'Strežnik ni dosegljiv. Poskusite kasneje.'
    }
    alert(message)
    updatePager()
  }
}

async function getDataForPage(page) {
  const qParams = new URL(location).searchParams
  qParams.set('p', page)
  const url = `/api/v1/search/main?${qParams}`

  return await axios.get(url)
}

function renderResults(resultsMarkup) {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = resultsMarkup
  resultsListEl.appendChild(wrapper)
}

function updateUrlAndHistory(page) {
  const newUrl = new URL(location)
  newUrl.searchParams.set('p', page)
  history.pushState(null, '', newUrl)
}

window.addEventListener('popstate', () => {
  const page = +new URL(location).searchParams.get('p') || 1
  changePage(page)
})

function onResultClick(e) {
  const entryEl = e.target.closest(`#${this.id} a.rl`)
  if (!entryEl) return

  const anchorId = entryEl.querySelector('.anchor').id
  const anchoredUrl = new URL(location)
  anchoredUrl.hash = anchorId
  history.replaceState(null, '', anchoredUrl)
}

try {
  if (tooltipTriggerList.length > 0) {
    // initialize tooltips
    tooltipList(null, 'gray-tooltip') // ADD for tooltip debug in the end -> [0].show()
  }
} catch (e) {}

/*
  // refresh: bool
  function largeStringsOnSmallScreen(alwaysRefresh) {
    let headwordTexts
    let translationWords
    let synonymWords
    function init() {
      headwordTexts = [...$('.rihw')]
      translationWords = [...$('.term-h')].map(e => {
        return e.children[0]
      })
      synonymWords = [...$('.syn-h'), ...$('.risy')]
    }

    function setupToolTips() {
      setDynamicTooltipList([])
      if (headwordTexts) {
        headwordTexts.map(ttElement =>
          createTooltip(ttElement, ttElement.innerHTML, '')
        )
        // setDynamicTooltipList([...dynamicTooltipList, ...tt])
      }
      if (translationWords) {
        translationWords.map(ttElement =>
          createTooltip(ttElement, ttElement.innerHTML, '')
        )
        // setDynamicTooltipList([...dynamicTooltipList, ...tt])
      }
      if (synonymWords) {
        synonymWords.map(ttElement =>
          createTooltip(ttElement, ttElement.innerHTML, '')
        )
        // setDynamicTooltipList([...dynamicTooltipList, ...tt])
      }
      // console.log(dynamicTooltipList)
    }

    if (!headwordTexts || !translationWords || !synonymWords || alwaysRefresh) {
      init()
    }

    function initTooltips() {
      try {
        // if (dynamicTooltipList.length || alwaysRefresh) {
        setupToolTips()
        // }
      } catch (e) {}
    }

    function removeTooltips() {
      try {
        $('.rihw').tooltip('dispose')
        $('.term-h').children().tooltip('dispose')
        $('.syn-h').tooltip('dispose')
        $('.risy').tooltip('dispose')
      } catch (e) {}
    }

    function manageResize() {
      const tmpTerms = [...$('.term-h')].map(e => {
        return e.children[0]
      })
      const elements = [...tmpTerms, ...$('.syn-h')]
      // console.log(document.documentElement.clientWidth)

      const dcw = document.documentElement.clientWidth
      const checkBorders = (dcw > 991 && dcw < 1600) || dcw < 370
      if (checkBorders) {
        const TEXT_LIMIT = 17
        elements.forEach(el => {
          el.dataset.textStore = el.innerHTML.includes('...')
            ? el.dataset.textStore
            : el.innerHTML
          el.innerHTML = `${el.innerHTML.slice(0, TEXT_LIMIT)}${
            el.innerHTML.length > TEXT_LIMIT ? '...' : ''
          }`
        })

        initTooltips()
      } else {
        elements.forEach(el => {
          if (el.dataset.textStore) {
            el.innerHTML = el.dataset.textStore
          }
        })
        removeTooltips()
      }
    }

    return {
      init: function () {
        init()
      },
      refresh: function () {
        init()
        try {
          setupToolTips()
        } catch (e) {}
      },
      manageResize: manageResize
    }
  }
  const textsScreenManager = largeStringsOnSmallScreen(true)

  textsScreenManager.manageResize()

  window.onresize = textsScreenManager.manageResize
  */

// refresh: bool
function largeStringsOnSmallScreen(alwaysRefresh) {
  let headwordTexts
  let translationWords
  let synonymWords
  function init() {
    headwordTexts = [...$('.rihw')]
    translationWords = [...$('.term-h')].map(e => {
      return e.children[0]
    })
    synonymWords = [...$('.syn-h'), ...$('.risy')]
  }

  /*
    function setupToolTips() {
      setDynamicTooltipList([])
      if (headwordTexts) {
        headwordTexts.map(ttElement =>
          createTooltip(ttElement, ttElement.innerHTML, '')
        )
        // setDynamicTooltipList([...dynamicTooltipList, ...tt])
      }
      if (translationWords) {
        translationWords.map(ttElement =>
          createTooltip(ttElement, ttElement.innerHTML, '')
        )
        // setDynamicTooltipList([...dynamicTooltipList, ...tt])
      }
      if (synonymWords) {
        synonymWords.map(ttElement =>
          createTooltip(ttElement, ttElement.innerHTML, '')
        )
        // setDynamicTooltipList([...dynamicTooltipList, ...tt])
      }
      // console.log(dynamicTooltipList)
    } */

  if (!headwordTexts || !translationWords || !synonymWords || alwaysRefresh) {
    init()
  }

  function createTooltipEl(ttElement, styles) {
    // setDynamicTooltipList([])

    try {
      createTooltip(ttElement, ttElement.innerHTML, styles)
    } catch (e) {
      console.log(e)
    }
  }

  function removeTooltip(ttElement) {
    try {
      ttElement.tooltip('dispose')
    } catch (e) {}
  }

  /*
    function initTooltips() {
      try {
        // if (dynamicTooltipList.length || alwaysRefresh) {
        setupToolTips()
        // }
      } catch (e) {}
    }

    function removeTooltips() {
      try {
        $('.rihw').tooltip('dispose')
        $('.term-h').children().tooltip('dispose')
        $('.syn-h').tooltip('dispose')
        $('.risy').tooltip('dispose')
      } catch (e) {}
    }
    */

  /*     let OLD_TEXT_LIMIT = 5000 // Guard to not prevent overdisposing
    function manageResize() {
      const tmpTerms = [...$('.term-h')].map(e => {
        return e.children[0]
      })
      const elements = [...tmpTerms, ...$('.syn-h')]
      // console.log(document.documentElement.clientWidth) */

  /*
      $('.word-constraint').each((i, element) => {
        // WRONG const wordBr = $(`.word-constraint:nth-child(${i}) > .word-breakable`)
        const wordList = $(element).find('.word-breakable')

        wordList.each((i, wordElement) => {
          // console.log(wordElement.innerText)

          if (
            wordElement.clientWidth > element.clientWidth &&
            wordElement.innerText.split(' ').length <= 1
          ) {
            console.log('Lion')
            createTooltip($(wordElement))
            wordElement.classList.push('text-ellipsis')
          } else {
            removeTooltip($(wordElement))
            // console.log(wordElement.classList)
            wordElement.className = Array.from(wordElement.classList)
              .filter(e => e !== 'text-ellipsis')
              .join(' ')
            // console.log(wordElement.classList)
          }
        })
        // console.log(wordBr)
      })
      */

  /*       const dcw = document.documentElement.clientWidth
      // const checkBorders = (dcw > 420 && dcw < 750) || dcw < 370

      let borderIndex

      // check _common.scc long-text-strip and make sure the widths are aligned
      if (dcw < 420) {
        borderIndex = 0 // width = 8 chars (<420)
      } else if (dcw < 750 || (dcw > 990 && dcw < 1750)) {
        borderIndex = 1 // width = 12 chars (420 - 750, 990-1750)
      } else if (dcw > 1750) {
        borderIndex = 3 // width = 100% (>1759)
      } else {
        borderIndex = 2 // width = 25 chars (750-990)
      }

      let TEXT_LIMIT
      if (borderIndex === 0) {
        TEXT_LIMIT = 8
      } else if (borderIndex === 1) {
        TEXT_LIMIT = 12
      } else if (borderIndex === 2) {
        TEXT_LIMIT = 25
      } else {
        TEXT_LIMIT = null
      }

      if (OLD_TEXT_LIMIT !== TEXT_LIMIT) {
        elements.forEach(el => {
          // console.log(el.innerHTML)
          if (TEXT_LIMIT && el.innerHTML.length > TEXT_LIMIT) {
            console.log(`DEBUG TEXT LIMIT: ${TEXT_LIMIT}`)
            console.log(`DEBUG EL LEN: ${el.innerHTML.length}`)
            console.log(`DEBUG EL TEXT: ${el.innerHTML}`)
            console.log('TOOLTIP CREATED')
            createTooltipEl(el, 'gray-tooltip')
          } else {
            removeTooltip($(el))
          }
        })
      }

      OLD_TEXT_LIMIT = TEXT_LIMIT */

  /*
      if (checkBorders) {
        console.log('HEYOO')
        const TEXT_LIMIT = 17
        elements.forEach(el => {
          el.dataset.textStore = el.innerHTML.includes('...')
            ? el.dataset.textStore
            : el.innerHTML
          el.innerHTML = `${el.innerHTML.slice(0, TEXT_LIMIT)}${
            el.innerHTML.length > TEXT_LIMIT ? '...' : ''
          }`
        })

        initTooltips()
      } else {
        elements.forEach(el => {
          if (el.dataset.textStore) {
            el.innerHTML = el.dataset.textStore
          }
        })
        removeTooltips()
      }

      */
  /* }

    return {
      init: function () {
        init()
      },
      refresh: function () {
        init()
      },
      manageResize: manageResize
    } */
}

// const textsScreenManager = largeStringsOnSmallScreen(true)

// textsScreenManager.manageResize()

// window.onresize = textsScreenManager.manageResize

/*
function transferText(sideMenuText) {
  const siteHeading = document.getElementById('site-heading')
  const siteHeadingTextContent = siteHeading.textContent
  const navTitle = document.getElementById('nav-title')

  if (document.body.clientWidth <= 1200) {
    navTitle.textContent = siteHeadingTextContent
    siteHeading.style.display = 'none'
  } else {
    navTitle.textContent = sideMenuText
  }
}
*/

function handleProperTextDisplay() {
  if (/\/iskanje/.test(currentPagePath)) {
    transferText('Iskanje po slovarjih', true)
  } else if (/\/termin/.test(currentPagePath)) {
    transferText('', true)
  }
}

window.addEventListener('resize', () => {
  handleProperTextDisplay()
  adjustOffsetBy()
})

handleProperTextDisplay()
