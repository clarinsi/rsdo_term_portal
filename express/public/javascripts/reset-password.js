/* global $, axios, validator, i18next */

// Function to verify password and repeat password
function verifyPassword() {
  const password = document.getElementById('reset-password').value
  const repeatPassword = document.getElementById('reset-password-repeat').value

  if (password !== repeatPassword) {
    // alert(i18next.t('Gesli se ne ujemata')) // 'Passwords do not match')
    document.querySelector('#reset-password-error').textContent = i18next.t(
      'Gesli se ne ujemata'
    )
    document.querySelector('#reset-password-error').style.visibility = 'visible'
    return false
  }

  if (!validator.isLength(password, { min: 8 })) {
    // alert(i18next.t('Geslo je prekratko')) // 'Passwords do not match')
    document.querySelector('#reset-password-error').textContent =
      i18next.t('Geslo je prekratko')
    document.querySelector('#reset-password-error').style.visibility = 'visible'
    return false
  }

  document.querySelector('#reset-password-error').style.visibility = 'invisible'
  return true
}

// Handle submit event
document
  .querySelector('#reset-and-redirect')
  .addEventListener('submit', async event => {
    event.preventDefault()
    if (verifyPassword()) {
      const token = document.getElementById('token').value
      const password = document.getElementById('reset-password').value
      const passwordRepeat = document.getElementById(
        'reset-password-repeat'
      ).value
      // const email = document.getElementById('email').value
      // const data = { password, repeatPassword, token, email }
      try {
        await axios.post('/api/v1/users/reset-password-submit', {
          token,
          password,
          passwordRepeat
        })

        window.location = '/'
      } catch (error) {
        displayError(error)
      }
    }
  })

function displayError(error) {
  let message = i18next.t('Prišlo je do napake.')
  if (error.response) {
    message = error.response.data
  } else if (error.request) {
    message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
  }

  document.querySelector('#fpi-text.normal-gray').textContent = message
  $('#reset-pass-info').modal('show')
}
