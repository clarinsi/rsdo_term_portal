/* global axios */

function autoGrow(element) {
  element.style.height = '5px'
  element.style.height = element.scrollHeight + 'px'
}

// FIREFOX ISSUE FIX
const firefoxIssueyBoi = document.querySelector('.institution-input')
if (firefoxIssueyBoi) autoGrow(firefoxIssueyBoi)
// END FIREFOX ISSUE FIX

function autoGrowListener(e) {
  autoGrow(e.target)
}

// (Lineheight) (measurement) * #lines + (padding) (measurementforpadding)
function minHeightCalcRem(
  lineheightSize,
  numberOfLines,
  paddingTopAndBottomSize,
  lineheightSizeMeasurement = 'rem',
  paddingTopAndBottomSizeMeasurement = 'px'
) {
  return `calc(${lineheightSize}${lineheightSizeMeasurement}*${numberOfLines} + ${paddingTopAndBottomSize}${paddingTopAndBottomSizeMeasurement})`
}

// COMMENTED CODE IS THE INITIAL STRUCTURE BEFORE PATCHING
/*
function abortEditing(
  btnGrp,
  oldButtons,
  areaEl,
  translationEl,
  removeSpecifics = []
) {
  btnGrp.className = 'd-none'
  oldButtons.style.display = 'block'
  const getRow = btnGrp.parentElement.parentElement
  getRow.classList.remove('selected-row')
  const getInputs = getRow.querySelectorAll('.w-50')
  removeSpecifics.forEach(el => el.remove())
  getInputs.forEach(el => el.parentElement.remove())
  areaEl.style.display = 'table-cell'
  translationEl.style.display = 'table-cell'
}
*/

function abortConsultancyUserEditing(fieldInfo) {
  fieldInfo.newButtonGroup.className = 'd-none'
  fieldInfo.tableButtons.style.display = 'block'
  const getRow = fieldInfo.newButtonGroup.parentElement.parentElement
  getRow.classList.remove('selected-row')
  const getInputs = getRow.querySelectorAll('.w-50')
  fieldInfo.tdName.remove()
  getInputs.forEach(el => el.parentElement.remove())
  fieldInfo.tDataDomain.style.display = 'table-cell'
  fieldInfo.tDataName.style.display = 'table-cell'
}

/*
function saveChanges(
  btnGrp,
  inputDomain,
  inputTranslation,
  oldButtons,
  tDataDomain,
  tDataTranslation
) {
  const inputDomainNewValue = inputDomain.value
  const inputTranslationNewValue = inputTranslation.value
  btnGrp.className = 'd-none'
  oldButtons.style.display = 'block'
  const getRow = btnGrp.parentElement.parentElement
  getRow.classList.remove('selected-row')
  inputDomain.parentElement.remove()
  inputTranslation.parentElement.remove()
  tDataDomain.style.display = 'table-cell'
  tDataDomain.textContent = inputDomainNewValue
  tDataTranslation.style.display = 'table-cell'
  tDataTranslation.textContent = inputTranslationNewValue
}

*/

// Presumably used in other files, like consultancy.js.
// eslint-disable-next-line no-unused-vars
function inputFieldsChecker() {
  const { inputDomainEl, inputTranslationEl } = window.adminElements
  const addAreaButton = document.getElementById('add-area')
  if (inputDomainEl.value.length && inputTranslationEl.value.length) {
    addAreaButton.disabled = false
  } else {
    addAreaButton.disabled = true
  }
}

function saveConsultantFrontend(fieldInfo) {
  // Please optimize this patched code in further dev
  fieldInfo.tDataDomain.innerHTML = fieldInfo.inputDomain.value
    ? fieldInfo.inputDomain.value
    : ''
  abortConsultancyUserEditing(fieldInfo)
}

function saveConsultantDomain(fieldInfo) {
  const data = {
    id: fieldInfo.tDataName.parentElement.id,
    value: fieldInfo.inputDomain.value
  }

  // procedure to store DB changes
  axios
    .put('/api/v1/consultancy/update-consultant-domain', data)
    .then(() => {
      // On success, update frontend
      saveConsultantFrontend(fieldInfo)
    })
    .catch(err => {
      console.log(err)
    })
}

function editRowBodyForConsultancy(fieldInfo) {
  fieldInfo.getRow.className = 'selected-row'
  fieldInfo.tableButtons.style.display = 'none'

  fieldInfo.inputDomain.className = 'form-control w-50'
  fieldInfo.inputDomain.value = fieldInfo.tDataDomainText

  fieldInfo.tdName.innerHTML = fieldInfo.tDataNameText
  // tDataDomain.remove()
  fieldInfo.tDataDomain.style.display = 'none'

  // Please optimize this patched code in further dev
  if (fieldInfo.tdDomain.parentElement !== fieldInfo.getRow) {
    fieldInfo.tdDomain.appendChild(fieldInfo.inputDomain)
    fieldInfo.getRow.insertBefore(fieldInfo.tdDomain, fieldInfo.tDataButtons)
  } else {
    fieldInfo.tDataButtons.style.display = 'table-cell'
  }

  if (fieldInfo.tdName.parentElement !== fieldInfo.getRow) {
    fieldInfo.getRow.insertBefore(fieldInfo.tdName, fieldInfo.tDataName)
  } else {
    fieldInfo.tDataName.style.display = 'table-cell'
  }

  // tDataTranslation.remove()
  fieldInfo.tDataName.style.display = 'none'
  const buttonsGroup = fieldInfo.getRow.querySelector('.buttons-group')
  const newButtonGroup = document.createElement('div')
  const cancelButton = document.createElement('button')
  const saveButton = document.createElement('button')
  fieldInfo.buttonsGroup = buttonsGroup
  fieldInfo.newButtonGroup = newButtonGroup
  fieldInfo.cancelButton = cancelButton
  fieldInfo.saveButton = saveButton
  cancelButton.textContent = 'Prekliči'
  cancelButton.className = 'btn btn-secondary me-2'
  cancelButton.style.height = '33px'
  cancelButton.style.width = '105px'
  cancelButton.addEventListener('click', () =>
    abortConsultancyUserEditing(fieldInfo)
  )
  saveButton.textContent = 'POTRDI'
  saveButton.className = 'btn btn-primary'
  saveButton.style.height = '33px'
  saveButton.style.width = '105px'
  saveButton.addEventListener('click', () => saveConsultantDomain(fieldInfo))
  newButtonGroup.className = 'd-flex justify-content-end me-3'
  newButtonGroup.appendChild(cancelButton)
  newButtonGroup.appendChild(saveButton)
  buttonsGroup.insertBefore(newButtonGroup, fieldInfo.tableButtons)
}

// Presumably used in other files, like consultancy.js.
// eslint-disable-next-line no-unused-vars
function handleDomainsClickForConsultancy({ target }) {
  const editRow = target.closest('.edit-row-btn')
  const deleteRow = target.closest('.delete-row-btn')
  const tableButtons = target.closest('.table-buttons')
  if (deleteRow) {
    const getRow = deleteRow.parentElement.parentElement.parentElement
    const body = { data: { id: getRow.id } }
    const modalUseBtn = document.getElementById('modal-use-btn')
    modalUseBtn.addEventListener('click', () => {
      axios
        .delete('/api/v1/consultancy/delete-consultant', body)
        .then(() => {
          getRow.remove()
        })
        .catch(err => {
          console.log('Cannot delete entry, reason: ' + err)
        })
    })
  }
  if (editRow) {
    const getRow = editRow.parentElement.parentElement.parentElement
    const tDataDomain = getRow.querySelector('.tdata-area')
    const tDataName = getRow.querySelector('.tdata-name')
    const tDataButtons = getRow.querySelector('.buttons-group')
    const tDataDomainText = tDataDomain.textContent
    const tDataNameText = tDataName.textContent
    const tdDomain = document.createElement('td')
    const inputDomain = document.createElement('input')
    const tdName = document.createElement('td')

    const fieldInfo = {
      editRow,
      deleteRow,
      tableButtons,
      getRow,
      tDataDomain,
      tDataName,
      tDataButtons,
      tDataDomainText,
      tDataNameText,
      tdDomain,
      inputDomain,
      tdName
    }

    editRowBodyForConsultancy(fieldInfo)

    /*
    console.log(`${editRow} ${deleteRow} ${tableButtons}
    - ${tDataDomain} 
    - ${getRow} ${tDataName} ${tDataButtons} 
    - ${tDataDomainText} ${tDataNameText} ${tdDomain} 
    - ${inputDomain} ${inputDomain} ${tdName} 
    `)
    */
  }
}

/* ========= specific pages logic ========= */

// pages/consultancy/ask.pug

try {
  document.querySelectorAll('.r-3').forEach(element => {
    element.style.minHeight = minHeightCalcRem(1.5, 3, 12) // calculation of 16px(1rem) for 3 lines -> 3 * 24 (line height 24px -> 1.5rem) + 12 (padding bot + top)
    element.addEventListener('input', autoGrowListener)
  })

  const elt = document.querySelector('.institution-input')
  elt.style.minHeight = minHeightCalcRem(1.5, 1, 12) // calculation of 16px(1rem) for 1 line -> 1 * 24 (line height 24px -> 1.5rem) + 12 (padding bot + top)
  elt.addEventListener('input', autoGrowListener)
} catch (e) {
  // other than ask.pug file is probably going to error out here
}

// end pages/consultancy/ask.pug

try {
  const elt = document.querySelector('#opinion')
  elt.style.minHeight = minHeightCalcRem(1.5, 4, 12) // calculation of 16px(1rem) for 1 line -> 1 * 24 (line height 24px -> 1.5rem) + 12 (padding bot + top)
} catch (e) {}
