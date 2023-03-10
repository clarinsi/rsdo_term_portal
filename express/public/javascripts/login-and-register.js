/* global axios, validator, $, i18next */

/*

Design logic implementation
Miha Stele, 2022

*/

// helper.js

const regBtn = document.querySelector('#regbtn')
const logintBtn = document.querySelector('#loginbtn')
const regForm = document.querySelector('#register-form')
const loginForm = document.querySelector('#login-form')
const regHeader = document.querySelector('.regtitle')
const loginHeader = document.querySelector('.logintitle')
const regDescription = document.querySelector('.regdesc')
const loginDescription = document.querySelector('.logindesc')

const listenRegisterBtn = event => {
  logintBtn.className = logintBtn.className.replace('d-none', '')
  regBtn.className = regBtn.className + ' d-none'
  regForm.className = regForm.className.replace('d-none', '')
  loginForm.className = loginForm.className + ' d-none'
  regHeader.className = regHeader.className.replace('d-none', '')
  loginHeader.className = loginHeader.className + ' d-none'
  regDescription.className = regDescription.className.replace('d-none', '')
  loginDescription.className = loginDescription.className + ' d-none'
  clearErrorView()
}

const listenLoginBtn = event => {
  regBtn.className = regBtn.className.replace('d-none', '')
  logintBtn.className = logintBtn.className + ' d-none'
  loginForm.className = loginForm.className.replace('d-none', '')
  regForm.className = regForm.className + ' d-none'
  loginHeader.className = loginHeader.className.replace('d-none', '')
  regHeader.className = regHeader.className + ' d-none'
  loginDescription.className = loginDescription.className.replace('d-none', '')
  regDescription.className = regDescription.className + ' d-none'
  clearErrorView()
}

regBtn.addEventListener('click', listenRegisterBtn)
logintBtn.addEventListener('click', listenLoginBtn)

/* validation */

// const loginErrorIconList = document.querySelector('.error-login-icon')

/* Note: Below 2 constant label arrays are in order */
const registerErrorLabels = [
  'error-username',
  'error-name',
  'error-surname',
  'error-email',
  'error-password',
  'error-password-repeat'
]

const registerInputLabels = [
  'register-username',
  'register-name',
  'register-surname',
  'register-email',
  'register-password',
  'register-password-repeat'
]
const registerErrorIndicatorpairs = {}

registerErrorLabels.forEach(errorLabel => {
  registerErrorIndicatorpairs[errorLabel] = []
  registerErrorIndicatorpairs[errorLabel].push(
    document.querySelector(`#${errorLabel}`)
  )
  registerErrorIndicatorpairs[errorLabel].push(
    document.querySelector(`.${errorLabel}`)
  )
})

/*
updateLoginRegisterErrorView

Shows and hides X icons and error labels of specific inputs in register error view

errorLabel - refrerence of the input label
fail - determines if input is valid, if fail is equal to true, input is invalid
input - id of the input, query selector is used in code. Should be a ref to <p> element
description - optional description to add to the <p> error description

*/

function updateLoginRegisterErrorView(
  errorLabel,
  fail = true,
  description = ''
) {
  if (fail) {
    registerErrorIndicatorpairs[errorLabel][0].style.visibility = 'visible' // <p>
    registerErrorIndicatorpairs[errorLabel][1].style.visibility = 'visible' // <img>
  } else {
    registerErrorIndicatorpairs[errorLabel][0].style.visibility = 'hidden'
    registerErrorIndicatorpairs[errorLabel][1].style.visibility = 'hidden'
  }
  if (description.length > 0) {
    registerErrorIndicatorpairs[errorLabel][0].textContent = description
  }
}

function clearErrorView() {
  Object.keys(registerErrorIndicatorpairs).forEach(key => {
    registerErrorIndicatorpairs[key][0].style.visibility = 'hidden'
    registerErrorIndicatorpairs[key][1].style.visibility = 'hidden'
  })

  document.querySelectorAll('.error-login-icon').forEach(e => {
    e.style.visibility = 'hidden'
  })

  document.querySelector('.error-text').style.visibility = 'hidden'

  document.getElementById('login-remember').checked = false
  document.getElementById('terms-of-use').checked = false
  document.getElementById('privacy-policy').checked = false
}

/*
Show error message from the label that represents the error returned from the server
Includes error X icons for login
*/
function showErrorReturnedFromServer(
  errorLabel,
  exception,
  description = '',
  isLogin = false
) {
  const elt = document.getElementById(errorLabel)
  if (exception) {
    if (description.length > 0) {
      elt.textContent = description
    }
    elt.style.visibility = 'visible'
    if (isLogin) {
      document.querySelectorAll('.error-login-icon').forEach(e => {
        e.style.visibility = 'visible'
      })
    }
  } else {
    elt.style.visibility = 'hidden'
    if (isLogin) {
      document.querySelectorAll('.error-login-icon').forEach(e => {
        e.style.visibility = 'hidden'
      })
    }
  }
}

function updateRegisterWindowOnSuccess(
  modalBodyIdRef,
  modalFooterIdRef,
  name,
  surname,
  days = 7
) {
  const body = document.getElementById(modalBodyIdRef)
  const footer = document.getElementById(modalFooterIdRef)

  body.removeChild(document.querySelector('.pspelogsig-5'))
  footer.removeChild(footer.firstElementChild)
  footer.appendChild(document.createElement('button'))
  const btn = footer.firstElementChild
  btn.classList = 'btn btn-secondary text-secondary'
  btn.textContent = i18next.t('ZAPRI')
  btn.ariaLabel = 'Close'
  btn.dataset.bsDismiss = 'modal'
  const successDescriptionPararaph = body.children[1]

  // successDescriptionPararaph.textContent = `Pozdravljeni ${name} ${surname},
  // na vaš elektronski naslov smo vam poslali sporočilo s povezavo, s katero boste potrdili svoj uporabniški račun na Terminološkem portalu.
  // Povezava za potrditev je veljavna ${days} dni.`

  successDescriptionPararaph.textContent =
    i18next.t('Pozdravljeni ') +
    `${name} ${surname}, ` +
    i18next.t(
      'na vaš elektronski naslov smo vam poslali sporočilo s povezavo, s katero boste potrdili svoj uporabniški račun na Terminološkem portalu. Povezava za potrditev je veljavna '
    ) +
    `${days} ` +
    i18next.t('dni.')
}

// login and register

{
  const loginForm = document.getElementById('login-form')
  loginForm.messageBind = document.getElementById('error-description')
  const registerForm = document.getElementById('register-form')
  registerForm.messageBind = document.getElementById(
    'register-message-container'
  )
  // const messageContainer = document.getElementById('message-container')

  loginForm.addEventListener('submit', submitForm)
  registerForm.addEventListener('submit', submitForm)

  // TODO Function name is very general. Make sure it doesn't conflict, override or
  // TODO get overriden by any other function later and rename or generalize as needed.
  async function submitForm(event) {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.target))
    const isRegister = event.target.action.includes('/register')
    let failFrontendValidation = false

    // console.log(payload)

    try {
      if (isRegister) {
        // validation empty inputs for register
        const inputs = []
        let iterator = 0
        registerInputLabels.forEach(label => {
          const curr = document.querySelector(`#${label}`)
          inputs.push(curr)

          if (curr.value.length < 1) {
            updateLoginRegisterErrorView(
              registerErrorLabels[iterator],
              true,
              i18next.t('Prazno obvezno polje')
            )
            failFrontendValidation = true
          } else {
            updateLoginRegisterErrorView(registerErrorLabels[iterator], false)
          }
          iterator++
        })
        // end validation for empty inputs in register

        // other register validators
        if (!validator.isEmail(payload.email)) {
          failFrontendValidation = true
          updateLoginRegisterErrorView(
            'error-email',
            true,
            i18next.t('Neveljavna e-pošta')
          )
        } else {
          updateLoginRegisterErrorView('error-email', false)
        }

        if (!validator.isLength(payload.password, { min: 8 })) {
          failFrontendValidation = true
          updateLoginRegisterErrorView(
            'error-password',
            true,
            i18next.t('Geslo je prekratko')
          )
        } else {
          updateLoginRegisterErrorView('error-password', false)
        }

        if (!validator.equals(payload.password, payload.passwordRepeat)) {
          failFrontendValidation = true
          updateLoginRegisterErrorView(
            'error-password-repeat',
            true,
            i18next.t('Geslo se ne ujema')
          )
        }
      }

      if (!failFrontendValidation) {
        const { data } = await axios.post(event.target.action, payload)

        console.log(data)

        // TODO HANDLE TRUE OR FALSE USERNAME BELOW

        if (isRegister) {
          updateRegisterWindowOnSuccess(
            'logreg-mb',
            'logreg-mf',
            payload.firstName,
            payload.lastName
          )
        } else {
          window.location.href = '/'
        }
      }

      // event.target.messageBind.textContent = data
    } catch (error) {
      let message = i18next.t('Prišlo je do napake.')
      if (error.response) {
        message = error.response.data
      } else if (error.request) {
        message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
      }

      showErrorReturnedFromServer(
        event.target.messageBind.id,
        true,
        message,
        !isRegister
      )
    }
  }
}

function registerConditions() {
  // Requirement 1: Terms of Use Checkbox checked
  const requirement1 = document.getElementById('terms-of-use')
  // Requirement 2: Privacy Policy checked
  const requirement2 = document.getElementById('privacy-policy')

  const registerButton = document.getElementById('regbtnmain')
  if (requirement1.checked && requirement2.checked) {
    registerButton.disabled = false
  } else {
    registerButton.disabled = true
  }
}

document
  .getElementById('terms-of-use')
  .addEventListener('change', registerConditions)
document
  .getElementById('privacy-policy')
  .addEventListener('change', registerConditions)

$('#staticBackdrop').on('hidden.bs.modal', function () {
  clearErrorView()
})
