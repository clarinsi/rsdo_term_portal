/* global $, axios, bootstrap, i18next */

$('.pick-multiple').select2()
$('.enter-multiple').select2({
  tags: true
})

const editStopTermsLink = document.getElementById('edit-stop-terms')
const searchButton = document.getElementById('search-btn')
const searchResultEl = document.getElementById('search-result')
const taskResultEl = document.querySelector('.task')
const resultsCountEl = taskResultEl.querySelector('#results-count')
const formEl = document.getElementById('form-edit-oss')
const extractionId = +location.pathname.split('/').at(-1)
const modalSpinner = new bootstrap.Modal(
  document.getElementById('modal-spinner')
)
const modalAlert = new bootstrap.Modal(document.getElementById('alert-modal'))

editStopTermsLink.addEventListener('click', saveOssParamsFirst)
searchButton.addEventListener('click', handleSearch)
searchResultEl.addEventListener('click', handleSearchResultsClick)

async function saveOssParamsFirst() {
  const payload = new URLSearchParams(new FormData(formEl))
  navigator.sendBeacon(
    `/api/v1/extraction/${extractionId}/oss-save-params`,
    payload
  )
}

async function handleSearch() {
  modalSpinner.toggle()
  try {
    const { data } = await submitSearch()
    displaySearchResults(data)
  } catch {
    handleSearchError()
  }
  modalSpinner.toggle()
}

function handleSearchError() {
  const alertText = modalAlert._element.querySelector('#alert-text')
  alertText.textContent = i18next.t('NAPAKA pri iskanju')
  modalAlert.toggle()
}

async function submitSearch() {
  const payload = new URLSearchParams(new FormData(formEl))
  return await axios.put(
    `/api/v1/extraction/${extractionId}/oss-search`,
    payload
  )
}

function displaySearchResults({ documentCount, canSave }) {
  resultsCountEl.textContent = `${documentCount}`
  if (canSave) {
    const saveButton = taskResultEl.querySelector('.btn')
    saveButton.disabled = false
  }
  taskResultEl.classList.remove('d-none')
}

function handleSearchResultsClick({ target }) {
  if (target.closest('#save-params')) confirmParams()
}

async function confirmParams() {
  modalSpinner.toggle()
  try {
    await axios.put(`/api/v1/extraction/${extractionId}/oss-confirm-params`)
    location = '/luscenje'
  } catch {
    alert('Error saving params')
    modalSpinner.toggle()
  }
}
