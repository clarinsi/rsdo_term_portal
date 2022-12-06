// const currentPagePath = location.pathname

window.addEventListener('load', () => {
  init()
})

function init() {
  const ce = {}
  window.resultElements = ce

  ce.textDescription = document.getElementById('text-description')
  ce.headerTitle = document.getElementById('site-header-title')
  ce.fixedTopSection = document.getElementById('fixed-top-section')
  ce.offsetMain = document.getElementById('offset-main')

  window.addEventListener('resize', () => {
    adjustOffsetBy()
    hideAndShowHeader()
  })
  window.onscroll = hideAndShowHeader

  function hideAndShowHeader() {
    const { textDescription, headerTitle } = window.resultElements
    const offsetHeaderPadding = document.getElementById('offset-padding')

    if (document.body.clientWidth > 1200) {
      if (document.documentElement.scrollTop < 50) {
        textDescription.style.display = 'block'
        headerTitle.style.display = 'block'
        if (offsetHeaderPadding !== null)
          offsetHeaderPadding.className = 'header-section-root pb-0'
      } else {
        textDescription.style.display = 'none'
        headerTitle.style.display = 'none'
        if (offsetHeaderPadding !== null)
          offsetHeaderPadding.className =
            'header-section-root offset-padding pb-0'
      }
    }
  }

  adjustOffsetBy()
}

function adjustOffsetBy() {
  const { offsetMain, fixedTopSection } = window.resultElements
  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
  const adminNavMobile = document.getElementsByClassName('admin-nav')
  const headerPadding = document.getElementById('header-padding')
  const keyboard = document.getElementsByClassName('kbd')[0]

  const width = document.body.offsetWidth

  let offsetKbdConstant = 21
  if (width > 1500) {
    offsetKbdConstant = 20
  } else if (width < 837) {
    if (width > 766) {
      /* todo */
      offsetKbdConstant = 10
      keyboard.style.width = keyboard.style.width * 0.7
    }
  }

  const kbdoffset = width / 2 - keyboard.offsetWidth / 2 - offsetKbdConstant

  if (width < 767) {
    keyboard.style.left = 0
    keyboard.style.top = '125px'
    keyboard.style.width = '100%'
  } else {
    keyboard.style.left = `${kbdoffset}px`
  }

  keyboard.style.height = 'auto'

  if (document.body.clientWidth < 1200) {
    for (let i = 0; i < adminNavMobile.length; i++) {
      adminNavMobile[i].style.paddingTop = `${referenceHeight}px`
      // offsetHeaderPadding.style.padding = '40px'
      // offsetMain.style.paddingTop = `${referenceHeight + 40}px`
    }
    if (offsetHeaderPadding !== null)
      offsetHeaderPadding.style.paddingTop = '20px'

    if (headerPadding !== null) headerPadding.style.paddingTop = '60px'
    offsetMain.style.paddingTop = `0px`
  } else {
    for (let i = 0; i < offsetHeader.length; i++) {
      offsetHeader[i].style.paddingTop = `${referenceHeight}px`
    }
    if (headerPadding !== null) headerPadding.style.paddingTop = '60px'
    offsetMain.style.paddingTop = `${referenceHeight}px`
  }
}
