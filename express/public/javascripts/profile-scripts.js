/* global isI18nReady, i18next, $, axios */

isI18nReady.then(t => {
  const alertText = document.querySelector('#alert-text')
  alertText.textContent = t(
    'Ali res želite izbrisati svoj račun? S tem boste trajno izgubili dostop do podatkov, ki ste jih ustvarili.'
  )
})

const redConfirm = document.querySelector('#modal-use-btn')
redConfirm.style.backgroundColor = '#AC7171'
document.querySelector('#modal-alert-label').style.color = '#AC7171'

redConfirm.addEventListener('click', async () => {
  // TODO: Optimize, create a common helper function for example
  function displayError(error) {
    let message = i18next.t('Prišlo je do napake.')
    if (error.response) {
      message = error.response.data
    } else if (error.request) {
      message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
    }

    document.querySelector('#info-text').textContent = message
    $('#info-modal').modal('show')
  }

  try {
    await axios.delete('/api/v1/users/current')
    window.location = '/'
  } catch (error) {
    displayError(error)
  }
})
