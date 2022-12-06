/* global axios, removeAllChildNodes, bootstrap */

const fileUploadForm = document.forms['upload-files']
const fileInputEl = fileUploadForm.querySelector('input[type="file"]')
const filesListEl = document.getElementById('files-list')
const dropArea = document.querySelector('.drag-area')
const dragButton = dropArea.querySelector('button')
const dragInput = dropArea.querySelector('input')
const modalSpinner = new bootstrap.Modal(
  document.getElementById('modal-spinner')
)
const modalAlert = new bootstrap.Modal(document.getElementById('alert-modal'))
let file

dragButton.onclick = () => {
  dragInput.click()
}

dragInput.addEventListener('change', function () {
  file = this.files[0]
  dropArea.classList.add('active')
  // showFile(file)
})

dropArea.addEventListener('dragover', event => {
  event.preventDefault()
})

dropArea.addEventListener('dragleave', () => {})

dropArea.addEventListener('drop', event => {
  event.preventDefault()
  fileInputEl.files = event.dataTransfer.files
  submitFiles()
})

// offsetMain.addEventListener('click', handleClick)

// function handleClick({ target }) {
//   const row = target.closest('.delete-btn-table')
//   if (row) {
//     deleteRow(row)
//   }

//   function deleteRow(ele) {
//     // console.log(ele)
//     const element = ele.closest('tr')
//     element.remove()
//   }
// }

const extractionId = +fileUploadForm.extractionId.value
let apiEndpointBase
switch (location.pathname.split('/').at(-1)) {
  case 'besedila':
    apiEndpointBase = `/api/v1/extraction/${extractionId}/documents`
    break

  case 'stop-termini':
    apiEndpointBase = `/api/v1/extraction/${extractionId}/stop-terms`
    break

  default:
    throw Error("apiEndpointBase couldn't be determined")
}

fileInputEl.addEventListener('change', submitFiles)
filesListEl.addEventListener('click', handleFileClick)

async function submitFiles() {
  // TODO Lock additional submits for the duration of this function execution?
  const MAX_FILE_SIZE = 10 ** 9 // 1 GB
  const failedUploads = []

  modalSpinner.toggle()

  for (const file of fileInputEl.files) {
    if (file.size > MAX_FILE_SIZE) {
      const failedUpload = {
        filename: file.name,
        message: 'File too large. Must not be over 1 GB.'
      }
      failedUploads.push(failedUpload)
      continue
    }

    const payload = new FormData()
    payload.set(fileInputEl.name, file)
    try {
      await axios.put(apiEndpointBase, payload)
    } catch (error) {
      const failedUpload = {
        filename: file.name,
        message: error.response.data
      }
      failedUploads.push(failedUpload)
    }
  }

  try {
    const { data: files } = await axios.get(apiEndpointBase)
    updateFilesList(files)
  } catch {
    alert('Pri posodobljanju seznama naloženih datotek je prišlo do napake.')
  }

  fileInputEl.value = ''
  displayFailedUploads(failedUploads)
  modalSpinner.toggle()
}

function updateFilesList(files) {
  removeAllChildNodes(filesListEl)
  files.forEach(({ filename, size, timeModified }, index) => {
    const rowEl = document.createElement('tr')
    const tdId = document.createElement('td')
    const tdName = document.createElement('td')
    const tdSize = document.createElement('td')
    const tdDate = document.createElement('td')
    const tdDelete = document.createElement('td')
    tdId.textContent = index + 1
    tdName.textContent = filename
    tdName.className = 'filename'
    tdSize.textContent = size
    const formattedDate = new Date(timeModified).toLocaleDateString('sl-SL')
    tdDate.textContent = formattedDate
    const delBtn = document.createElement('button')
    delBtn.className = 'p-0 delete-file delete-btn-table'
    delBtn.type = 'button'
    const deleteImg = document.createElement('img')
    deleteImg.src = '/images/red-trash-icon.svg'
    deleteImg.alt = 'Izbriši'
    const delSpan = document.createElement('span')
    delSpan.className = 'ms-2'
    delSpan.textContent = 'Briši'
    delBtn.appendChild(deleteImg)
    delBtn.appendChild(delSpan)
    tdDelete.appendChild(delBtn)
    rowEl.append(tdId, tdName, tdSize, tdDate, tdDelete)
    filesListEl.appendChild(rowEl)
  })
}

function displayFailedUploads(failedUploads) {
  failedUploads.forEach(({ filename, message }) => {
    const alertText = modalAlert.querySelector('#alert-text')
    alertText.textContent = `NAPAKA - Ime datoteke: ${filename}, razlog: ${message}`
    modalAlert.toggle()
  })
}

async function handleFileClick(e) {
  if (e.target.closest('.delete-file')) {
    const fileEl = e.target.closest('tr')
    const filename = fileEl.querySelector('.filename').textContent
    try {
      await axios.delete(`${apiEndpointBase}/${filename}`)
      fileEl.remove()
    } catch {
      alert('Pri brisanju datoteke je prišlo do napake.')
    }
  }
}
