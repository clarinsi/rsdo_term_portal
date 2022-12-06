/* global axios, bootstrap */
const mainContainer = document.getElementById('offset-main')
mainContainer.addEventListener('click', clickHandler)

function clickHandler({ target }) {
  const createPortalBtn = target.closest('.create-portal-btn')
  const linkPortalBtn = target.closest('.link-portal-btn')
  const syncPortalBtn = target.closest('.sync-portal-btn')
  const portalEnableSwitch = target.closest('.portal-enable-switch')
  const deleteTaskBtn = target.closest('.delete-task')
  if (createPortalBtn) {
    const indexURLEl = document.getElementById('index-url')
    const indexURL = indexURLEl.value
    createPortal(indexURL)
  }
  if (linkPortalBtn) {
    const linkedPortalId = linkPortalBtn.getAttribute('data-link-id')
    const closestTask = linkPortalBtn.closest('.task-declined')
    linkPortal(linkedPortalId, closestTask)
  }
  if (syncPortalBtn) {
    const linkedPortalId = syncPortalBtn.getAttribute('data-link-id')
    syncPortal(linkedPortalId)
  }
  if (portalEnableSwitch) {
    const portalId = portalEnableSwitch.getAttribute('data-portal-id')
    const isEnabled =
      portalEnableSwitch.querySelector('.form-check-input').checked
    updatePortalStatus(portalId, isEnabled)
  }
  if (deleteTaskBtn) {
    const alertModal = new bootstrap.Modal(
      document.getElementById('alert-modal')
    )
    alertModal.toggle()
    const taskId = deleteTaskBtn.getAttribute('data-link-id')
    const modalUseBtn = document.getElementById('modal-use-btn')
    modalUseBtn.addEventListener('click', deleteConnection(taskId))
  }
}

async function createPortal(indexURL) {
  event.preventDefault()
  const form = document.getElementById('form-connection-new')
  const payload = new URLSearchParams(new FormData(form))
  try {
    const id = await axios.post('/api/v1/portals/createPortal', payload)
    await linkPortal(id.data[0].id)
  } catch (error) {
    console.log(error)
  } finally {
    window.location.href = '../../../admin/povezave/seznam'
  }
}

async function deleteConnection(id) {
  try {
    await axios.delete(`/api/v1/portals/${id}/deleteLinkedDictionary`)
    alertModal.hide()
  } catch (error) {
    console.log(error)
  }
}

async function linkPortal(linkedPortalId, type) {
  try {
    const r = await axios.put(`/api/v1/portals/${linkedPortalId}/dictionaries`)
    // if (data.length) {
    //   await insertPortalDictionaries(data, linkedPortalId)
    //   if (type) {
    //     changeContent(data, type)
    //   }
    // }
    console.log(r)
  } catch (error) {
    console.log(error)
  }
}

async function insertPortalDictionaries(data, portalId) {
  data.forEach(el => (el.linkedPortalId = portalId))
  try {
    // Ta enpoint je bil odstranjen, ker je itak nepotreben. Tudi ta funkcija je nepotrebna.
    // TODO Odstrani to funkcijo in prilagodi lokacije, kjer je sedaj klicana.
    // await axios.post('/api/v1/portals/insertDictionaries', {
    //   params: { data }
    // })
  } catch (error) {
    console.log(error)
  }
}

async function syncPortal(linkedPortalId) {
  event.preventDefault()
  const responseModal = new bootstrap.Modal(
    document.getElementById('response-modal')
  )
  const responseModalText = document.getElementById('response-modal-text')
  try {
    axios
      .all([
        axios.put(`/api/v1/portals/${linkedPortalId}/dictionaries`),
        axios.get('/api/v1/portals/getMyDictionaries', {
          params: { id: linkedPortalId }
        })
      ])
      .then(
        axios.spread((obj1, obj2) => {
          const theirDict = obj1.data
          const myDict = obj2.data

          const results = theirDict.filter(
            ({ id: id1 }) =>
              !myDict.some(({ target_dictionary_id: id2 }) => id2 === id1)
          )

          responseModalText.textContent = `Spremenjenih je bilo ${results.length} slovarjev.`
          if (results.length) {
            insertPortalDictionaries(results, linkedPortalId)
            responseModal.toggle()
          } else {
            responseModal.toggle()
          }
        })
      )
  } catch (error) {
    console.log(error)
  }
}

async function updatePortalStatus(portalId, isEnabled) {
  try {
    await axios.post('/api/v1/portals/updatePortalStatus', {
      params: { id: portalId, isEnabled: isEnabled }
    })
  } catch (error) {
    console.log(error)
  }
}

function changeContent(data, type) {
  const nameEl = document.querySelector('.bold-weight-black')
  const name = nameEl.textContent
  const indexURLEl = document.querySelector('.link-url')
  const indexURL = indexURLEl.textContent
  const imageLinkEl = document.querySelector('.link-portal-btn')
  const id = imageLinkEl.getAttribute('data-link-id')
  const syncedDiv = document.getElementById('synced-terms-div')
  const contaner2 = document.createElement('div')
  contaner2.className = 'd-sm-flex justify-content-sm-between d-grid'
  const gridEl = document.createElement('div')
  gridEl.className = 'd-grid'
  const spanCode = document.createElement('span')
  spanCode.className = 'bold-weight-black'
  spanCode.textContent = name
  const spanURL = document.createElement('span')
  spanURL.className = 'normal-gray mt-2.mb-2'
  spanURL.textContent = indexURL
  const centerDiv = document.createElement('div')
  centerDiv.className = 'd-flex align-items-center justify-content-sm-end'
  const btnDict = document.createElement('button')
  btnDict.className = 'btn btn-secondary align-items-center d-flex'
  const imgDict = document.createElement('img')
  const spanDict = document.createElement('span')
  spanDict.className = 'ms-1'
  const hr = document.createElement('hr')
  hr.className = 'mt-2 mb-3'
  const betweenEl = document.createElement('div')
  betweenEl.className = 'd-sm-flex justify-content-between'
  const alignCntEl = document.createElement('div')
  const alertDiv = document.createElement('div')
  alertDiv.className = 'd-flex align-content-center mb-0 me-3 mt-2 mt-sm-0'
  const alertmargin = document.createElement('div')
  alertmargin.className = 'ms-3'
  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'p-0 btn delete-task'
  const deleteImg = document.createElement('img')
  deleteImg.src = '/images/red-trash-icon.svg'
  const spanDelete = document.createElement('span')
  spanDelete.className = 'normal-gray ms-2'
  spanDelete.textContent = 'Odstrani'

  if (data.length) {
    const container = document.createElement('div')
    container.className = 'container-fluid task task-completed p-3 mb-4'
    const aDictEl = document.createElement('a')
    aDictEl.className = 'btn btn-secondary align-items-center d-flex'
    aDictEl.href = `/admin/povezave/seznam/${id}`
    imgDict.src = '/images/book-colorized.svg'
    spanDict.textContent = 'Slovarji'
    alignCntEl.className =
      'd-sm-flex align-items-center mb-0 form-check form-switch'
    const switchEl = document.createElement('input')
    switchEl.className = 'form-check-input'
    switchEl.type = 'checkbox'
    switchEl.name = 'isEnabled'
    switchEl.id = 'checkbox' + id
    const spanSwitch = document.createElement('span')
    spanSwitch.className = 'normal-gray ms-1 mt-1'
    spanSwitch.textContent = 'Omogočeno'

    container.appendChild(contaner2)
    contaner2.appendChild(gridEl)
    gridEl.appendChild(spanCode)
    contaner2.appendChild(centerDiv)
    centerDiv.appendChild(aDictEl)
    aDictEl.appendChild(imgDict)
    aDictEl.appendChild(spanDict)
    container.appendChild(hr)
    container.appendChild(betweenEl)
    betweenEl.appendChild(alignCntEl)
    alignCntEl.appendChild(switchEl)
    alignCntEl.appendChild(spanSwitch)
    betweenEl.appendChild(alertDiv)
    alertDiv.appendChild(alertmargin)
    alertmargin.appendChild(deleteBtn)
    deleteBtn.appendChild(deleteImg)
    deleteBtn.appendChild(spanDelete)
    syncedDiv.appendChild(container)
    type.remove()
  }
}
