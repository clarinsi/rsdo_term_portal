/* global $, axios, i18next */

// Function to verify password and repeat password
function verifyPassword() {
  const password = document.getElementById('reset-password').value
  const repeatPassword = document.getElementById('reset-password-repeat').value
  if (password !== repeatPassword) {
    alert(i18next.t('Gesli se ne ujemata')) // 'Passwords do not match')
    return false
  }
  return true
}

// Handle submit event
document
  .querySelector('#reset-and-redirect')
  .addEventListener('submit', event => {
    event.preventDefault()
    if (verifyPassword()) {
      const password = document.getElementById('reset-password').value
      const repeatPassword = document.getElementById(
        'reset-password-repeat'
      ).value
      const token = document.getElementById('token').value
      // const email = document.getElementById('email').value
      // const data = { password, repeatPassword, token, email }
      axios
        .post('/api/v1/users/reset-passwordPLACEHOLDER_URL', {
          password,
          repeatPassword,
          token
        })
        .then(response => {
          if (response.data.success) {
            $('#reset-pass-info').modal('show')
            // window.location = '/'
          } else {
            alert(response.data.message)
          }
        })
        .catch(error => {
          // Very unlikely, but can happen
          alert(i18next.t('Napaka na strežniku'))
          console.log(error)
          // DEBUG SUCCESS DUE TO NO ENDPOINT $('#reset-pass-info').modal('show') <<- REMOVE
        })
    }
  })

// Handle cancel event
document.querySelector('#cancel-btn').addEventListener('click', event => {
  event.preventDefault()
  window.location = '/'
})

// Handle redirect on success
document.querySelector('#modal-fp-info-close').addEventListener('click', () => {
  window.location = '/'
})
