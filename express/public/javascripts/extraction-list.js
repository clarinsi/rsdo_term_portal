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
      // TODO This (page refresh) is an unneeded workaround for an otherwise simple user friendlier solution.
      location.reload()
    })
  } else if (target.closest('.btn-begin')) {
    const extractionEl = target.closest('.task')
    const extractionId = extractionEl.dataset.id
    await axios.put(`/api/v1/extraction/${extractionId}/begin`)
    const beginExtractionModalEl = document.getElementById('begin-response')
    const responseModal = new bootstrap.Modal(beginExtractionModalEl)
    responseModal.toggle()
    // TODO This (page refresh) is a temporary hack. Replace with proper UI updating logic.
    beginExtractionModalEl.addEventListener('hide.bs.modal', () =>
      location.reload()
    )
  } else if (target.classList.contains('btn-duplicate')) {
    const extractionEl = target.closest('.task')
    const extractionId = extractionEl.dataset.id
    await axios.post(`/api/v1/extraction/${extractionId}/duplicate`)
  }
}
