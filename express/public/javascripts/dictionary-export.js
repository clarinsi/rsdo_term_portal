/* globals axios, i18next */

const exportForm = document.forms['dictionary-export']

exportForm.addEventListener('submit', async event => {
  event.preventDefault()

  const payload = Object.fromEntries(new FormData(event.target))

  try {
    await axios.post(event.target.action, payload)
    // TODO This (page refresh) is a temporary hack. Replace with proper UI updating logic.
    location.reload()
  } catch (error) {
    let message = i18next.t('Prišlo je do napake.')
    if (error.response) {
      message = error.response.data
    } else if (error.request) {
      message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
    }

    alert(message)
  }
})
