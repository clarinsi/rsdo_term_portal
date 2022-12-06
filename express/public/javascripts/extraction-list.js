/* global axios, bootstrap */

const extractionListEl = document.getElementById('extraction-list')

extractionListEl.addEventListener('click', onListClick)

async function onListClick({ target }) {
  if (target.closest('.btn-delete')) {
    const extractionEl = target.closest('.task')
    const extractionId = extractionEl.dataset.id
    const alertModal = new bootstrap.Modal(
      document.getElementById('alert-modal')
    )
    alertModal.toggle()
    const modalUseBtn = document.getElementById('modal-use-btn')
    modalUseBtn.addEventListener('click', async () => {
      await axios.delete(`/api/v1/extraction/${extractionId}`)
      extractionEl.remove()
    })
  } else if (target.classList.contains('btn-begin')) {
    const extractionEl = target.closest('.task')
    const extractionId = extractionEl.dataset.id
    await axios.put(`/api/v1/extraction/${extractionId}/begin`)
    const responseModal = new bootstrap.Modal(
      document.getElementById('begin-response')
    )
    responseModal.toggle()
  } else if (target.classList.contains('btn-duplicate')) {
    const extractionEl = target.closest('.task')
    const extractionId = extractionEl.dataset.id
    await axios.post(`/api/v1/extraction/${extractionId}/duplicate`)
  }
}
