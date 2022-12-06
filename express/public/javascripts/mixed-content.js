const allMixedContentFields = document.querySelectorAll('.mc-field')

allMixedContentFields.forEach(el =>
  el.addEventListener('focusin', () => showMCButtons(el))
)

document.addEventListener('keypress', e => {
  if (e.key === 'Enter' && e.target.classList.contains('dispatch-tab')) {
    const form = event.target.form
    const index = Array.prototype.indexOf.call(form, e.target)
    form.elements[index + 1]?.focus()
    e.preventDefault()
  }
})

function showMCButtons(element) {
  const parent = element.parentElement.parentElement.parentElement
  const btnGrp = parent.querySelector('.mc-buttons-group')
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
  document.addEventListener('click', function (event) {
    if (parent !== event.target && !parent.contains(event.target)) {
      btnGrp.classList.add('d-none')
    }
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
      '</b> ' +
      inputText.substring(selectedEnd)
  }

  if (el.classList.contains('mc-italic') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<i>' +
      inputText.substring(selectedStart, selectedEnd) +
      '</i> ' +
      inputText.substring(selectedEnd)
  }

  if (el.classList.contains('mc-supscript') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<sup>' +
      inputText.substring(selectedStart, selectedEnd) +
      '</sup> ' +
      inputText.substring(selectedEnd)
  }

  if (el.classList.contains('mc-subscript') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<sub>' +
      inputText.substring(selectedStart, selectedEnd) +
      '</sub> ' +
      inputText.substring(selectedEnd)
  }

  if (el.classList.contains('mc-hyperlink') && selectedText.length) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<link url="">' +
      inputText.substring(selectedStart, selectedEnd) +
      '</link> ' +
      inputText.substring(selectedEnd)
  }

  if (el.classList.contains('mc-line-break')) {
    selectedEl.value =
      inputText.substring(0, selectedStart) +
      '<br />' +
      inputText.substring(selectedEnd)
    el.removeEventListener('click', () => addMixedContentInput, false)
  }

  // selectedEl.focus()
  // selectedEl.setSelectionRange(selectedStart, selectedEnd)
}
