/* global axios */

const extractionListEl = document.getElementById('extraction-list')

extractionListEl.addEventListener('click', onListClick)

async function onListClick({ target }) {
  if (target.classList.contains('btn-delete')) {
    const extractionEl = target.closest('li')
    const extractionId = extractionEl.dataset.id
    await axios.delete(`/api/v1/extraction/${extractionId}`)
    extractionEl.remove()
  } else if (target.classList.contains('btn-begin')) {
    const extractionEl = target.closest('li')
    const extractionId = extractionEl.dataset.id
    await axios.put(`/api/v1/extraction/${extractionId}/begin`)
  } else if (target.classList.contains('btn-duplicate')) {
    const extractionEl = target.closest('li')
    const extractionId = extractionEl.dataset.id
    await axios.post(`/api/v1/extraction/${extractionId}/duplicate`)
  }
}
