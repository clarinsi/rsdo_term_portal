/* global $, currentPagePath, i18next */

// const currentPagePath = location.pathname

window.addEventListener('load', () => {
  initSelect()
})

function initSelect() {
  const ce = {}
  window.adminElements = ce

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
    const { textDescription, headerTitle } = window.adminElements
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

  if (currentPagePath === '/admin/povezave/seznam') {
    const { offsetMain } = window.adminElements
    offsetMain.addEventListener('click', handleClick)
  }

  if (currentPagePath === '/admin/uporabniki/id_uporabnika/urejanje') {
    ce.userPasswordEl = document.getElementById('user-password')
    ce.userConfirmationPassEl = document.getElementById('user-conf-password')
    ce.buttonSaveEl = document.querySelectorAll('.btn-primary')
    ce.buttonSaveEl.forEach(el =>
      el.addEventListener('click', passwordMatchCheck)
    )
    // ce.buttonSaveEl.addEventListener('click', passwordMatchCheck)

    function passwordMatchCheck() {
      const userPassword1 = ce.userPasswordEl.value
      const userPassword2 = ce.userConfirmationPassEl.value

      if (userPassword1 === '') {
        alert(i18next.t('Prosim, vnesite geslo'))
      } else if (userPassword2 === '') {
        alert(i18next.t('Prosim, ponovno vnesite geslo'))
      } else if (userPassword1 !== userPassword2) {
        alert(i18next.t('Gesli se ne ujemata'))
      } else {
        alert(i18next.t('Gesli se ujemata!'))
      }
    }
  }
  adjustOffsetBy()
}

function adjustOffsetBy() {
  const { offsetMain, fixedTopSection } = window.adminElements
  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
  const adminNavMobile = document.getElementsByClassName('admin-nav')
  const headerPadding = document.getElementById('header-padding')
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
    offsetMain.style.paddingTop = `${referenceHeight + 110}px`
  }
}

function handleClick({ target }) {
  const deleteTask = target.closest('.delete-task')
  if (deleteTask) {
    deleteField(deleteTask)
  }
}

function deleteField(ele) {
  const element = ele.closest('.task')
  element.remove()
}

// Summernote

$('.summernote').summernote({
  placeholder: i18next.t('Na kratko opišite zasnovo in namen slovarja.'),
  height: 300,
  minheight: 150,
  toolbar: [
    ['style', ['style', 'bold', 'italic', 'underline']],
    ['font', ['superscript', 'subscript']],
    ['link', ['linkDialogShow']],
    ['para', ['ul', 'ol']],
    ['table', ['table']],
    ['insert', ['picture']]
  ],
  styleTags: ['p', 'h3', 'h4']
})

// ELEMENT DEFINITIONS

const cbox = document.createElement('input')
cbox.setAttribute('type', 'checkbox')
cbox.checked = true
const arrow = document.createElement('img')
arrow.setAttribute('src', 'images/chevron-right.svg')
// let clicked = false
let clickedId = 'none'

// END ELEMENT DEFINITIONS

/// FUNCTION DEFINITIONS
const createCheckBox = () => {
  const cbox = document.createElement('input')
  cbox.setAttribute('type', 'checkbox')
  cbox.checked = true
  return cbox
}

const createArrowImg = () => {
  const arrow = document.createElement('img')
  arrow.setAttribute('src', 'images/chevron-right.svg')
  return arrow
}

// const clickLanguageSelectSimple = e => {
//   // https://stackoverflow.com/questions/38861601/how-to-only-trigger-parent-click-event-when-a-child-is-clicked/38861760
//   const child = e.currentTarget.childNodes[0].childNodes[0]

//   if (clicked) {
//     e.currentTarget.childNodes[0].replaceChild(arrow, child)
//   } else {
//     e.currentTarget.childNodes[0].replaceChild(cbox, child)
//   }
//   console.log(e.currentTarget.children[0][0])
//   clicked = !clicked
// }

const clickLanguageSelect = e => {
  const target = e.currentTarget
  const child = target.childNodes[0].childNodes[0]
  // console.log(`rootchild: ${child}`)

  if (clickedId === 'none') {
    // console.log(`child: ${child}`)
    target.childNodes[0].replaceChild(createCheckBox(), child)
    clickedId = target.id
  } else if (clickedId === target.id) {
    // console.log(`child: ${child}`)
    target.childNodes[0].replaceChild(createArrowImg(), child)
    clickedId = 'none'
  } else {
    const curr = document.getElementById(clickedId)
    const currchild = curr.childNodes[0].childNodes[0]
    curr.childNodes[0].replaceChild(createArrowImg(), currchild)
    target.childNodes[0].replaceChild(createCheckBox(), child)
    clickedId = target.id
    // console.log(`curr: ${currchild}`)
    // console.log(`child: ${child}`)
  }
}

/// END FUNCTION DEFINITION

// TESTS

const siEltTEST = document.getElementById('sl')
siEltTEST.onclick = clickLanguageSelect

const hrElttest = document.getElementById('hr')
hrElttest.onclick = clickLanguageSelect

const itEltTEST = document.getElementById('it')
itEltTEST.onclick = clickLanguageSelect
