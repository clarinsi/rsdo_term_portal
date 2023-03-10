/* global $, axios, currentPagePath, initPagination,
 removeAllChildNodes, transferText, tooltipTriggerList,
  tooltipList, createTooltip, resetTooltipTriggerList,
  transferTextExtended, i18next */

// position correction functions

function adjustOffsetBy() {
  // const { offsetMain, fixedTopSection } = window.dictionaryElements

  const BROWSER_UNUSUAL_OFFSET = 17 // computer from chrome

  const offsetMain = document.querySelector('#offset-main')
  const fixedTopSection = document.querySelector('#fixed-top-section')

  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
  // const adminNavMobile = document.getElementsByClassName('admin-nav')
  const headerPadding = document.getElementById('header-padding')

  if (document.body.clientWidth + BROWSER_UNUSUAL_OFFSET < 1200) {
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

  // let actualInnerWidth = $("body").prop("clientWidth"); // El. width minus scrollbar width
  // let actualInnerWidth = $("body").prop("scrollWidth"); // El. width minus scrollbar width

  // const BROWSER_UNUSUAL_OFFSET = 17 // computer from chrome

  // console.log($('body').innerWidth() + BROWSER_UNUSUAL_OFFSET)
  try {
    if (window.innerWidth < 1200) {
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
      // siteHeading.style.display = 'none'

      siteHeading.style.display = 'inline' // I know this is hacky, but sadly due to design this is mandatory in order to fix the bug
    }
    if (window.innerWidth >= 1200) {
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

      navTitle.textContent = i18next.t('Urejanje')
      siteHeading.style.display = 'block'
    }
  } catch (e) {}
}

const resultsListEl = document.getElementById('results-data')
if (resultsListEl) {
  resultsListEl.addEventListener('click', onResultClick)
}
const initialPage = +new URL(location).searchParams.get('p') || 1
const updatePager = initPagination(
  ['pagination-top', 'pagination-bottom'],
  onPageChange,
  initialPage
)

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
    // reinitalizeDefaultTooltipSet()
    // console.log($('[data-toggle="tooltip"]'))
    // $('[data-toggle="tooltip"]').tooltip()

    // toltip reinitialization after moving a page
    resetTooltipTriggerList()
    if (tooltipTriggerList.length > 0) {
      // initialize tooltips
      tooltipList(null, 'dark-gray-tooltip') // ADD for tooltip debug in the end -> [0].show()
    }

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
    let message = i18next.t('Prišlo je do napake.')
    if (error.response?.data) {
      message = error.response.data
    } else if (error.request) {
      return // return to bypass error caused (assumed) by popstate on iOS/MacOS
      message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
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
    tooltipList(null, 'dark-gray-tooltip') // ADD for tooltip debug in the end -> [0].show()
  }
} catch (e) {}

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
}

window.addEventListener('load', () => {
  $('[data-toggle="tooltip"]').tooltip()
})

function handleProperTextDisplay() {
  // const BROWSER_UNUSUAL_OFFSET = 17
  if (/\/iskanje/.test(currentPagePath)) {
    transferText('Iskanje po slovarjih', true, 'site-heading') //,
    // BROWSER_UNUSUAL_OFFSET
    // )
  } else if (/\/termin/.test(currentPagePath)) {
    transferText('', true, 'site-heading') // , BROWSER_UNUSUAL_OFFSET)
  }
}

window.addEventListener('resize', () => {
  handleProperTextDisplay()
  adjustOffsetBy()
})

handleProperTextDisplay()
