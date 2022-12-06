/* global axios */

const fileUploadForm = document.forms['upload-files']
const fileInputEl = fileUploadForm.querySelector('input[type="file"]')
const messageContainerEl = document.getElementById('messages')
const filesListEl = document.getElementById('files-list')

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

  displaySpinner()

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
  hideSpinner()
}

function displaySpinner() {
  const messageEl = document.createElement('li')
  messageEl.textContent = 'Spinner on'
  messageContainerEl.appendChild(messageEl)
}

function hideSpinner() {
  const messageEl = document.createElement('li')
  messageEl.textContent = 'Spinner off'
  messageContainerEl.appendChild(messageEl)
}

function updateFilesList(files) {
  removeAllChildNodes(filesListEl)
  files.forEach(({ filename, size, timeModified }) => {
    const fileEl = document.createElement('li')
    const filenameSpanEl = document.createElement('span')
    filenameSpanEl.className = 'filename'
    filenameSpanEl.textContent = filename
    const formattedDate = new Date(timeModified).toLocaleDateString('sl-SL')
    const deleteButtonEl = document.createElement('a')
    deleteButtonEl.className = 'delete-file'
    deleteButtonEl.href = '#'
    deleteButtonEl.textContent = 'BRIŠI'
    fileEl.append(
      'DATOTEKA - Ime: ',
      filenameSpanEl,
      `, velikost: ${size}, datum: ${formattedDate} `,
      deleteButtonEl
    )
    filesListEl.appendChild(fileEl)
  })
}

function displayFailedUploads(failedUploads) {
  failedUploads.forEach(({ filename, message }) => {
    const messageEl = document.createElement('li')
    messageEl.textContent = `NAPAKA - Ime datoteke: ${filename}, razlog: ${message}`
    messageContainerEl.appendChild(messageEl)
  })
}

async function handleFileClick(e) {
  if (e.target.closest('.delete-file')) {
    const fileEl = e.target.closest('li')
    const filename = fileEl.querySelector('.filename').textContent
    try {
      await axios.delete(`${apiEndpointBase}/${filename}`)
      fileEl.remove()
    } catch {
      alert('Pri brisanju datoteke je prišlo do napake.')
    }
  }
}

// Don't copy this one into final JS. It's already defined in scripts.js
function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild)
  }
}
