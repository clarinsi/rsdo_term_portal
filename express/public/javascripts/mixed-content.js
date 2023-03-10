const allMixedContentFields = document.querySelectorAll('.mc-field')

allMixedContentFields.forEach(el =>
  el.addEventListener('focus', () => showMCButtons(el))
)

document.addEventListener('keypress', e => {
  if (e.key === 'Enter' && e.target.classList.contains('dispatch-tab')) {
    e.preventDefault()
    const currentNode = e.target
    const allElements = document.querySelectorAll('input, select, textarea')
    const currentIndex = [...allElements].findIndex(el =>
      currentNode.isEqualNode(el)
    )
    const targetIndex = (currentIndex + 1) % allElements.length
    allElements[targetIndex].focus()
  }
})

function showMCButtons(element, linkTerm) {
  let parent
  if (linkTerm) {
    parent = element.parentElement.parentElement.parentElement.parentElement
  } else {
    parent = element.parentElement.parentElement.parentElement
  }
  const mainContent = document.getElementById('offset-main')
  const sideMenu = document.querySelector('.content-nav-content')
  const btnGrp = parent.querySelector('.mc-buttons-group')
  // Warning, do not touch *_*
  document.addEventListener('click', function (event) {
    if (mainContent.contains(event.target) || sideMenu.contains(event.target)) {
      if (element !== event.target && document.activeElement !== element) {
        if (!parent.contains(event.target)) {
          btnGrp.classList.add('d-none')
        }
      }
    }
  })
  btnGrp.classList.remove('d-none')
  const btnGrpChildren = btnGrp.children
  const childrenBtns = Array.from(btnGrpChildren)
  childrenBtns.forEach(el =>
    el.addEventListener(
      'click',
      () => {
        addMixedContentInput(el, element)
      },
      // TODO Possibly a dirty hack. Look into it at a later time.
      { once: true }
    )
  )

  document.addEventListener('keyup', function (e) {
    const selectedEl = document.activeElement
    if (!parent.contains(selectedEl)) btnGrp.classList.add('d-none')
  })
}

function addMixedContentInput(el, selectedEl) {
  const inputText = selectedEl.value
  const selectedStart = selectedEl.selectionStart
  const selectedEnd = selectedEl.selectionEnd
  const selectedText = inputText.slice(
    selectedEl.selectionStart,
    selectedEl.selectionEnd
  )

  if (el.classList.contains('mc-bold') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<b>' +
      inputText.substring(selectedStart, selectedEnd) +
      '</b>' +
      inputText.substring(selectedEnd)
    placeCaret(selectedEl, selectedEnd + 7)
  }

  if (el.classList.contains('mc-italic') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<i>' +
      inputText.substring(selectedStart, selectedEnd) +
      '</i>' +
      inputText.substring(selectedEnd)
    placeCaret(selectedEl, selectedEnd + 7)
  }

  if (el.classList.contains('mc-supscript') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<sup>' +
      inputText.substring(selectedStart, selectedEnd) +
      '</sup>' +
      inputText.substring(selectedEnd)
    placeCaret(selectedEl, selectedEnd + 11)
  }

  if (el.classList.contains('mc-subscript') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<sub>' +
      inputText.substring(selectedStart, selectedEnd) +
      '</sub>' +
      inputText.substring(selectedEnd)
    placeCaret(selectedEl, selectedEnd + 11)
  }

  if (el.classList.contains('mc-hyperlink') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<a href="">' +
      inputText.substring(selectedStart, selectedEnd) +
      '</a>' +
      inputText.substring(selectedEnd)
  }

  if (el.classList.contains('mc-line-break')) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<br/>' +
      inputText.substring(selectedEnd)
    placeCaret(selectedEl, selectedEnd + 5)
    el.removeEventListener('click', () => addMixedContentInput, false)
  }
}

function placeCaret(elem, caretPos) {
  if (elem != null) {
    if (elem.createTextRange) {
      const range = elem.createTextRange()
      range.move('character', caretPos)
      range.select()
    } else {
      if (elem.selectionStart) {
        elem.focus()
        elem.setSelectionRange(caretPos, caretPos)
      } else elem.focus()
    }
  }
}
