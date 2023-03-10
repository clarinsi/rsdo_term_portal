/* global isI18nReady */

isI18nReady.then(t => {
  const alertText = document.querySelector('#alert-text')
  alertText.textContent = t(
    'Ali želite zbrisati ta profil. S tem bodo izbrisani vsi podatki, ki ste jih ustvarili'
  )
})

const redConfirm = document.querySelector('#modal-use-btn')
redConfirm.style.backgroundColor = '#AC7171'
