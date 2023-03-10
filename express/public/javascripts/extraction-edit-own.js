const nameEl = document.getElementById('name')
nameEl.addEventListener('input', enableButton)

function enableButton() {
  const disabledBtn = document.getElementById('mpbtn')
  disabledBtn.classList.remove('disabled')
}
