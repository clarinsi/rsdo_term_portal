/* global bootstrap */
window.addEventListener('resize', () => {
  adjustOffsetBy()
  changeSubareasGroup()
})
adjustOffsetBy()

function adjustOffsetBy() {
  const fixedTopSection = document.getElementById('fixed-top-section')
  const offsetMain = document.getElementById('offset-main')
  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
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

window.addEventListener('scroll', () => changeSubareasGroup())
window.addEventListener('load', () => changeSubareasGroup())

function changeSubareasGroup() {
  const subareaLinks = document.querySelectorAll('.subarea-link')
  subareaLinks.forEach(el => {
    const x = el.closest('.active')
    if (x !== null) {
      const sublinkSelected = x.closest('.help-links-subgroup')
      sublinkSelected.classList.add('active-subgroup')
      if (el.nextElementSibling !== null)
        el.nextSibling.style.maxHeight = 'fit-content'
    } else {
      if (el.nextElementSibling !== null) el.nextSibling.style.maxHeight = null
      if (el.parentElement.classList.contains('active-subgroup'))
        el.parentElement.classList.remove('active-subgroup')
    }
  })
}

const navigation = document.getElementById('help-nav-scrollspy')
navigation.addEventListener('click', e => closeIfMobile(e))

function closeIfMobile(e) {
  const sideMenu = navigation.parentElement
  if (sideMenu.classList.contains('opened')) {
    if (e.target.tagName === 'A')
      // Call generic function for mobile menu closure from scripts.js
      toggleNav('slidable')
  }
}

// eslint-disable-next-line no-unused-vars
const scrollSpy = new bootstrap.ScrollSpy(document.body, {
  target: '#help-nav-scrollspy',
  offset: 180
})

const collapsibleElements = document.querySelectorAll('.help-collapsible')
collapsibleElements.forEach(el =>
  el.addEventListener('click', () => {
    const elem = el.nextSibling
    if (elem.style.maxHeight && !el.classList.contains('active')) {
      elem.style.maxHeight = null
    } else {
      elem.style.maxHeight = 'fit-content'
    }
  })
)
