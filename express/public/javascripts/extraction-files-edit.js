/* global axios, removeAllChildNodes, bootstrap, i18next */

const fileUploadContainerEl = document.getElementById('upload-files-container')
const fileUploadForm = document.forms['upload-files']
const fileInputEl = fileUploadForm.querySelector('input[type="file"]')
const filesListEl = document.getElementById('files-list')
const dropArea = document.querySelector('.drag-area')
const dragButton = dropArea.querySelector('button')
const dragInput = dropArea.querySelector('input')
const modalAlert = new bootstrap.Modal(document.getElementById('alert-modal'))
let file
let fileListElCount = filesListEl.childElementCount
let isUploadInProgress = false
let isDeletionInProgress = false
const existingFileNames = [...filesListEl.children].map(
  fileListEl => fileListEl.querySelector('.file-name').textContent
)

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
  if (isUploadInProgress) return
  isUploadInProgress = true
  fileUploadContainerEl.hidden = true
  const MAX_FILE_SIZE = 10 ** 9 // 1 GB
  const filesToUpload = []
  const failedUploads = []
  const succeededFileListEls = []
  let didRemoveAnyFileListEls = false

  for (const file of fileInputEl.files) {
    const filename = file.name

    const indexOfSameNamed = existingFileNames.indexOf(filename)
    if (indexOfSameNamed !== -1) {
      filesListEl.children[indexOfSameNamed].remove()
      existingFileNames.splice(indexOfSameNamed, 1)
      didRemoveAnyFileListEls = true
    }

    const fileListEl = createFileListEl(filename)
    filesListEl.appendChild(fileListEl)
    existingFileNames.push(filename)

    if (file.size > MAX_FILE_SIZE) {
      const failedUpload = {
        filename,
        message: 'File too large. Must not be over 1 GB.'
      }
      failedUploads.push(failedUpload)
      updateFileListEl(fileListEl, { status: 'failed' })
      continue
    }

    filesToUpload.push([file, fileListEl])
  }

  if (didRemoveAnyFileListEls) reindexFileListEls()

  for (const [file, fileListEl] of filesToUpload) {
    try {
      const payload = new FormData()
      payload.set(fileInputEl.name, file)
      const { data: fileStats } = await axios.put(apiEndpointBase, payload, {
        onUploadProgress: displayUploadProgress(fileListEl)
      })
      succeededFileListEls.push(fileListEl)
      updateFileListEl(fileListEl, { status: 'success', fileStats })
    } catch (error) {
      const failedUpload = {
        filename: file.name,
        message: error.response.data
      }
      failedUploads.push(failedUpload)
      updateFileListEl(fileListEl, { status: 'failed' })
    }
  }

  fileInputEl.value = ''
  succeededFileListEls.forEach(el => updateFileListEl(el, { status: 'done' }))
  if (failedUploads.length) displayFailedUploads(failedUploads)
  isUploadInProgress = false
  fileUploadContainerEl.hidden = false
}

function createFileListEl(filename) {
  const indexEl = document.createElement('td')
  indexEl.className = 'file-index'
  indexEl.textContent = ++fileListElCount

  const nameEl = document.createElement('td')
  nameEl.className = 'file-name'
  nameEl.textContent = filename

  const sizeEl = document.createElement('td')
  sizeEl.className = 'file-size'

  const dateEl = document.createElement('td')
  dateEl.className = 'file-date-modified'

  const progressBarId = `progress-bar-${fileListElCount}`
  const progressLabelEl = document.createElement('label')
  progressLabelEl.className = 'me-1'
  progressLabelEl.for = progressBarId
  progressLabelEl.textContent = '0%'
  const progressBarEl = document.createElement('progress')
  progressBarEl.id = progressBarId
  progressBarEl.className = 'upload-progress'
  progressBarEl.value = 0
  progressBarEl.max = 100
  const lastEl = document.createElement('td')
  lastEl.className = 'file-last-cell'
  lastEl.append(progressLabelEl, progressBarEl)

  const fileListEl = document.createElement('tr')
  fileListEl.append(indexEl, nameEl, sizeEl, dateEl, lastEl)

  return fileListEl
}

function updateFileListEl(fileListEl, { status, fileStats, index }) {
  if (status === 'success') {
    const nameEl = fileListEl.querySelector('.file-name')
    nameEl.textContent = fileStats.filename

    const sizeEl = fileListEl.querySelector('.file-size')
    sizeEl.textContent = fileStats.size

    const dateEl = fileListEl.querySelector('.file-date-modified')
    const formattedDate = new Date(fileStats.timeModified).toLocaleDateString(
      'sl-SL'
    )
    dateEl.textContent = formattedDate

    const successImgEl = document.createElement('img')
    successImgEl.src = '/images/valid.svg'
    successImgEl.alt = i18next.t('Datoteka uspešno naložena')
    const lastEl = fileListEl.querySelector('.file-last-cell')
    removeAllChildNodes(lastEl)
    lastEl.append(successImgEl)
  } else if (status === 'done') {
    const deleteImgEl = document.createElement('img')
    deleteImgEl.src = '/images/red-trash-icon.svg'
    deleteImgEl.alt = ''
    const deleteSpanEl = document.createElement('span')
    deleteSpanEl.className = 'ms-2'
    deleteSpanEl.textContent = 'Briši'
    const deleteButtonEl = document.createElement('button')
    deleteButtonEl.className = 'p-0 delete-file delete-btn-table'
    deleteButtonEl.append(deleteImgEl, deleteSpanEl)
    const lastEl = fileListEl.querySelector('.file-last-cell')
    removeAllChildNodes(lastEl)
    lastEl.append(deleteButtonEl)
  } else if (status === 'reindex') {
    const indexEl = fileListEl.querySelector('.file-index')
    indexEl.textContent = index + 1
  } else if (status === 'failed') {
    const failImgEl = document.createElement('img')
    failImgEl.src = '/images/x_red.svg'
    failImgEl.alt = i18next.t('Napaka pri nalaganju datoteke')
    const lastEl = fileListEl.querySelector('.file-last-cell')
    removeAllChildNodes(lastEl)
    lastEl.append(failImgEl)
  }
}

function displayFailedUploads(failedUploads) {
  const modalContentEl = modalAlert._element.querySelector(
    '.modal-alert-content'
  )
  modalContentEl.classList.remove('d-flex')

  const descriptionEl = modalAlert._element.querySelector('#alert-text')
  descriptionEl.textContent = i18next.t(
    'Naslednje datoteke niso bile naložene zaradi navedenih razlogov:'
  )

  modalContentEl.querySelector('ul')?.remove()

  const listEl = document.createElement('ul')
  modalContentEl.append(listEl)

  failedUploads.forEach(({ filename, message }) => {
    const bulletEl = document.createElement('li')
    bulletEl.textContent = `${filename} - ${message}`
    listEl.appendChild(bulletEl)
  })

  modalAlert.toggle()
}

async function handleFileClick(e) {
  if (e.target.closest('.delete-file')) {
    if (isUploadInProgress) {
      alert(
        i18next.t('Brisanje je onemogočeno, doker se nalagajo nove datoteke.')
      )
      return
    }
    if (isDeletionInProgress) {
      alert(i18next.t('Brisanje je onemogočeno, saj je eno še v procesu.'))
      return
    }
    isDeletionInProgress = true
    const fileEl = e.target.closest('tr')
    const filename = fileEl.querySelector('.file-name').textContent
    try {
      await axios.delete(`${apiEndpointBase}/${filename}`)
      fileEl.remove()
      existingFileNames.splice(existingFileNames.indexOf(filename), 1)
      reindexFileListEls()
      isDeletionInProgress = false
    } catch {
      alert(i18next.t('Pri brisanju datoteke je prišlo do napake.'))
    }
  }
}

function displayUploadProgress(fileListEl) {
  const progressEl = fileListEl.querySelector('.upload-progress')
  return function ({ loaded, total }) {
    const percentCompleted = Math.round((loaded / total) * 100)
    progressEl.setAttribute('value', percentCompleted)
    progressEl.previousElementSibling.textContent = `${percentCompleted}%`
  }
}

function reindexFileListEls() {
  fileListElCount = filesListEl.childElementCount
  for (let i = 0; i < fileListElCount; i++) {
    const fileListEl = filesListEl.children[i]
    updateFileListEl(fileListEl, { status: 'reindex', index: i })
  }
}
