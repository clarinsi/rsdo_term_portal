/* global $, axios */

$('.pick-multiple').select2()
$('.enter-multiple').select2({
  tags: true
})

const editStopTermsLink = document.getElementById('edit-stop-terms')
const searchButton = document.getElementById('search-btn')
const searchResultEl = document.getElementById('search-result')
const messageContainerEl = document.getElementById('messages')
const formEl = document.forms[0]
const extractionId = +location.pathname.split('/').at(-1)

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
  displaySpinner()
  try {
    const { data } = await submitSearch()
    displaySearchResults(data)
  } catch {
    handleSearchError()
  }
  hideSpinner()
}

function displaySpinner() {
  const messageEl = document.createElement('li')
  messageEl.textContent = 'Spinner on'
  messageContainerEl.appendChild(messageEl)
}

function hideSpinner() {
  const messageEl = document.createElement('li')
  messageEl.textContent = 'Spinner off'
  messageContainerEl.appendChild(messageEl)
}

function handleSearchError() {
  const messageEl = document.createElement('li')
  messageEl.textContent = 'Notify the user of error that occured during search'
  messageContainerEl.appendChild(messageEl)
}

async function submitSearch() {
  const payload = new URLSearchParams(new FormData(formEl))
  return await axios.put(
    `/api/v1/extraction/${extractionId}/oss-search`,
    payload
  )
}

function displaySearchResults({ documentCount, canSave }) {
  removeAllChildNodes(searchResultEl)
  searchResultEl.textContent = `Število dokumentov: ${documentCount}`
  if (canSave) {
    const saveButton = document.createElement('button')
    saveButton.id = 'save-params'
    saveButton.textContent = 'Shrani'
    searchResultEl.append(saveButton)
  }
}

function handleSearchResultsClick({ target }) {
  if (target.closest('#save-params')) confirmParams()
}

async function confirmParams() {
  displaySpinner()
  try {
    await axios.put(`/api/v1/extraction/${extractionId}/oss-confirm-params`)
    location = '../poc'
  } catch {
    alert('Error saving params')
    hideSpinner()
  }
}

// Don't copy this one into final JS. It's already defined in scripts.js
function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild)
  }
}
