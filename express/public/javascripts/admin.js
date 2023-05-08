/* global $, axios, bootstrap, currentPagePath, initPagination, removeAllChildNodes, unsavedData, replaceContainer, isI18nReady, i18next, validator */

// const currentPagePath = location.pathname

let queryBattery = ''

window.addEventListener('load', () => {
  initAdmin()
})

function initAdmin() {
  const ce = {}
  window.adminElements = ce

  ce.textDescription = document.getElementById('text-description')
  ce.headerTitle = document.getElementById('site-header-title')
  ce.fixedTopSection = document.getElementById('fixed-top-section')
  ce.offsetMain = document.getElementById('offset-main')

  window.addEventListener('resize', () => {
    adjustOffsetBy()
    mobileMoveContent()
  })
  adjustOffsetBy()
  mobileMoveContent()
  window.onscroll = hideAndShowHeader

  function hideAndShowHeader() {
    const { textDescription, headerTitle } = window.adminElements
    if (document.body.clientWidth >= 1200) {
      if (document.documentElement.scrollTop < 50) {
        textDescription.style.display = 'block'
        headerTitle.style.display = 'block'
      } else {
        textDescription.style.display = 'none'
        headerTitle.style.display = 'none'
      }
    }
  }

  if (currentPagePath === '/admin/povezave/seznam') {
    const { offsetMain } = window.adminElements
    offsetMain.addEventListener('click', handleClick)
  }

  if (
    /\/admin\/povezave\/seznam\/\d+/.test(currentPagePath) ||
    currentPagePath === '/admin/povezave/slovarji'
  ) {
    const resultsListEl = document.getElementById('page-results')
    let portalId
    if (currentPagePath !== '/admin/povezave/slovarji') {
      portalId = document.getElementById('hidden-portal-id').value
    }

    const updatePager = initPagination('pagination', onPageChange)

    async function onPageChange(newPage) {
      try {
        const { page, numberOfAllPages, results } = await getDataForPage(
          newPage
        )
        removeAllChildNodes(resultsListEl)
        renderResults(results)
        updatePager(page, numberOfAllPages)
      } catch (error) {
        let message = i18next.t('Prišlo je do napake.')
        if (error.response?.data) {
          message = error.response.data
        } else if (error.request) {
          message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
        }
        alert(message)
        updatePager()
      }
    }

    async function getDataForPage(page) {
      let url
      if (currentPagePath === '/admin/povezave/slovarji') {
        url = `/api/v1/portals/listAllLinkedDicts?p=${page}`
      } else {
        url = `/api/v1/portals/${portalId}/listSelectedLinkedDicts?p=${page}`
      }
      const { data } = await axios.get(url)
      return data
    }

    function renderResults(results) {
      results.forEach(result => {
        const rowEl = document.createElement('tr')
        const td = document.createElement('td')
        const div1 = document.createElement('div')
        const input = document.createElement('input')
        const td1 = document.createElement('td')
        const tdTrans = document.createElement('td')
        td.append(div1)
        div1.append(input)
        div1.className = 'form-check form-switch d-flex align-items-center'
        input.className = 'form-check-input'
        input.type = 'checkbox'
        input.name = `isEnabled[${result.id}]`
        input.id = result.id
        input.checked = !!result.isEnabled
        td1.textContent = result.name
        tdTrans.textContent = result.code

        rowEl.append(td, td1, tdTrans)
        resultsListEl.appendChild(rowEl)
      })
    }
  }

  if (currentPagePath === '/admin/uporabniki/portal') {
    ce.formAddUser = document.getElementById('form-add-user')
    const userTable = document.getElementById('user-roles-table')
    const tableForm = document.getElementById('form-user-roles')
    userTable.addEventListener('change', enableButton)
    ce.formAddUser.addEventListener('submit', addUser)
    ce.formAddUser.addEventListener('input', enableButton)
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(tableForm, dictSideMenu)
    async function addUser(event) {
      event.preventDefault()

      const type = 'portal'
      const payload = new URLSearchParams(new FormData(event.target))
      try {
        const { data } = await axios.get(event.target.action, {
          params: payload
        })
        ifUserExists(data, type)
        event.target.reset()
      } catch (error) {
        let message = i18next.t('Prišlo je do napake.')
        if (error.response) {
          message = error.response.data
        } else if (error.request) {
          message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
        }
        console.log(message)
      }
    }
  }

  if (currentPagePath === '/admin/uporabniki/seznam') {
    isI18nReady.then(t => {
      const resultsListEl = document.getElementById('page-results')

      const updatePager = initPagination('pagination', onPageChange)

      async function onPageChange(newPage) {
        try {
          const { page, numberOfAllPages, results } = await getDataForPage(
            newPage
          )
          removeAllChildNodes(resultsListEl)
          renderResults(results)
          updatePager(page, numberOfAllPages)
        } catch (error) {
          let message = i18next.t('Prišlo je do napake.')
          if (error.response?.data) {
            message = error.response.data
          } else if (error.request) {
            message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
          }
          alert(message)
          updatePager()
        }
      }

      async function getDataForPage(page) {
        const url = `/api/v1/users/listAllUsers?p=${page}`
        const { data } = await axios.get(url)
        return data
      }

      function renderResults(results) {
        results.forEach(result => {
          const rowEl = document.createElement('tr')
          const td1 = document.createElement('td')
          const td2 = document.createElement('td')
          const td3 = document.createElement('td')
          const td4 = document.createElement('td')
          const aEl = document.createElement('a')
          const imgEl = document.createElement('img')
          const spanEl = document.createElement('span')
          td1.textContent = result.userName
          td2.textContent = result.email
          td3.textContent = t(`userStatus${result.status}`)
          aEl.classList.add('image-link')
          aEl.type = 'link'
          aEl.href = `/admin/uporabniki/${result.id}/urejanje`
          imgEl.src = '/images/u_edit-alt.svg'
          imgEl.alt = i18next.t('Uredi')
          spanEl.className = 'normal-gray ms-1'
          spanEl.textContent = i18next.t('Uredi')
          td4.append(aEl)
          aEl.append(imgEl, spanEl)
          rowEl.append(td1, td2, td3, td4)
          resultsListEl.appendChild(rowEl)
        })
      }
    })
  }

  if (currentPagePath === '/admin/slovarji') {
    const resultsListEl = document.getElementById('page-results')

    const updatePager = initPagination('pagination', onPageChange)

    async function onPageChange(newPage) {
      try {
        const { page, numberOfAllPages, results } = await getDataForPage(
          newPage
        )
        removeAllChildNodes(resultsListEl)
        renderResults(results)
        updatePager(page, numberOfAllPages)
      } catch (error) {
        let message = i18next.t('Prišlo je do napake.')
        if (error.response?.data) {
          message = error.response.data
        } else if (error.request) {
          message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
        }
        alert(message)
        updatePager()
      }
    }

    async function getDataForPage(page) {
      const url = `/api/v1/dictionaries/listAllDictionaries?p=${page}`
      const { data } = await axios.get(url)
      return data
    }

    function renderResults(results) {
      const localeOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
      results.forEach(result => {
        const rowEl = document.createElement('tr')
        const td1 = document.createElement('td')
        const td2 = document.createElement('td')
        const td3 = document.createElement('td')
        const td4 = document.createElement('td')
        const td5 = document.createElement('td')
        const td6 = document.createElement('td')
        const aEl = document.createElement('a')
        const imgEl = document.createElement('img')
        const spanEl = document.createElement('span')
        td1.textContent = result.id
        td2.textContent = result.name
        td3.textContent = result.status
        const timeCreated = new Date(result.timeCreated).toLocaleDateString(
          'sl-SL',
          localeOptions
        )
        td4.textContent = timeCreated
        const timeModified = new Date(result.timeModified).toLocaleDateString(
          'sl-SL',
          localeOptions
        )
        td5.textContent = timeModified
        aEl.classList.add('image-link')
        aEl.type = 'link'
        aEl.href = `/admin/slovarji/${result.id}/podatki`
        imgEl.src = '/images/u_edit-alt.svg'
        imgEl.alt = i18next.t('Uredi')
        spanEl.className = 'normal-gray ms-1'
        spanEl.textContent = i18next.t('Uredi')
        td6.append(aEl)
        aEl.append(imgEl, spanEl)
        rowEl.append(td1, td2, td3, td4, td5, td6)
        resultsListEl.appendChild(rowEl)
      })
    }
  }

  if (
    /\/admin\/slovarji\/\d+\/podatki/.test(currentPagePath) ||
    /\/slovarji\/\d+\/podatki/.test(currentPagePath)
  ) {
    const formEl = document.getElementById('admin-description')
    const imgTrashIcon = document.querySelectorAll('.delete-author-btn')
    const inputNewAuthorEl = document.getElementById('input-new-author')
    const inputNewAreaEl = document.getElementById('input-new-area')
    const dictSideMenu = document.querySelector('.admin-nav-content')
    $('.without-addition').on('change', enableButton)
    unsavedData(formEl, dictSideMenu)
    formEl.addEventListener('input', enableButton)
    if (imgTrashIcon !== null) {
      imgTrashIcon.forEach(el => el.addEventListener('click', deleteInput))
    }
    inputNewAuthorEl.addEventListener('click', () => {
      createNewAuthorInput(formEl)
    })
    inputNewAreaEl.addEventListener('click', () => {
      createNewAreaInput(formEl)
    })
    formEl.addEventListener('submit', event => {
      checkform()
      if (!event.target.checkValidity()) {
        event.preventDefault()
      }
      event.target.classList.add('was-validated')
    })
  }

  if (currentPagePath === '/admin/podpodrocja') {
    const { offsetMain } = window.adminElements
    offsetMain.addEventListener('click', handleAreasClick)
    ce.inputAreaEl = document.getElementById('area-input')
    ce.inputAreaEl.addEventListener('input', inputFieldsChecker)
    ce.inputTranslationEl = document.getElementById('translation-input')
    ce.inputTranslationEl.addEventListener('input', inputFieldsChecker)
    ce.domainLabelsForm = document.getElementById('dictionary-domain-labels')
    ce.domainLabelsForm.addEventListener('submit', secondaryDomainsToDb)
    const formAreas = document.getElementById('dictionary-domain-labels')
    formAreas.addEventListener('input', enableButton)
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(formAreas, dictSideMenu, secondaryDomainsToDb)
    const addAreaButtons = document.getElementById('add-area')
    addAreaButtons.addEventListener('click', enableButton)
    const useBtn = document.getElementById('modal-use-btn')
    useBtn.addEventListener('click', enableButton)

    async function secondaryDomainsToDb(event) {
      const data = secondaryDomainsForChange()
      event.preventDefault()

      try {
        await axios.post('/api/v1/dictionaries/renovateSecondaryDomains', {
          params: { payload: data }
        })
      } catch (error) {
        console.log(error)
      } finally {
        location.reload(true)
      }
    }
    {
      const resultsListEl = document.getElementById('page-results')

      const updatePager = initPagination('pagination', onPageChange)

      async function onPageChange(newPage) {
        try {
          const results = await getDataForPage(newPage)

          const numberOfAllPages = +results.headers['number-of-all-pages']
          const page = +results.headers.page

          removeAllChildNodes(resultsListEl)
          renderResults(results.data)
          updatePager(page, numberOfAllPages)
        } catch (error) {
          let message = i18next.t('Prišlo je do napake.')
          if (error.response?.data) {
            message = error.response.data
          } else if (error.request) {
            message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
          }
          alert(message)
          updatePager()
        }
      }

      async function getDataForPage(page) {
        const url = `/api/v1/dictionaries/secondaryDomains?q=${queryBattery}&p=${page}`
        return await axios.get(url)
      }

      function renderResults(results) {
        replaceContainer('page-results', results)
      }

      const updatePaginationOnFilter = axiosResult => {
        const numberOfAllPages = +axiosResult.headers['number-of-all-pages']
        const page = +axiosResult.headers.page
        // removeAllChildNodes(resultsListEl)
        // renderResults(results.data)
        // console.log(numberOfAllPages)
        // console.log(page)
        // console.log(updatePager)
        updatePager(page, numberOfAllPages)
      }

      /// / Due to unsual design, the function was moved inside
      function searchController() {
        // if (window.location.pathname.includes('podrocne-oznake')) { // No if required since already checkek above
        queryBattery = document.getElementById('input-search').value
        // console.log(queryBattery)
        axios
          .get(`/api/v1/dictionaries/secondaryDomains?q=${queryBattery}`)
          .then(result => {
            updatePaginationOnFilter(result)
            replaceContainer('page-results', result.data)
          })
        // }
      }
      const inlineSearchButton = document.getElementById('inline-search-btn')

      if (inlineSearchButton) {
        inlineSearchButton.addEventListener('click', searchController)
        $('#input-search').on('keyup', function (e) {
          if (e.code === 'Enter' || e.code === 'NumpadEnter') {
            searchController()
          }
        })
      }
    }
  }

  if (/\/slovarji\/\d+\/uporabniki/.test(currentPagePath)) {
    const { offsetMain } = window.adminElements
    offsetMain.addEventListener('click', handleAreasClick)
    ce.terminologyReviewCb = document.getElementById('terminology_review')
    ce.languageReviewCb = document.getElementById('language_review')
    ce.formDictUsers = document.getElementById('admin-dictionary-users')
    ce.formDictUsers.addEventListener('input', enableButton)
    ce.formAddUser = document.getElementById('form-add-user')
    ce.formAddUser.addEventListener('input', enableButton)
    ce.formAddUser.addEventListener('submit', addUser)
    checkUserRightsCb()
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(ce.formDictUsers, dictSideMenu)
    ce.terminologyReviewCb.addEventListener('click', () => checkUserRightsCb())
    ce.languageReviewCb.addEventListener('click', () => checkUserRightsCb())
    const adminEl = document.querySelectorAll('.administration-cb')
    const arrAdminEls = Array.from(adminEl)
    arrAdminEls.forEach(el => el.addEventListener('click', () => countAdmins()))
    countAdmins()
    const publishSwitch = document.getElementById('publish-switch')
    publishSwitch.addEventListener('input', enableButton)

    async function addUser(event) {
      event.preventDefault()
      const type = 'rights'
      const payload = new URLSearchParams(new FormData(event.target))
      try {
        const { data } = await axios.get(event.target.action, {
          params: payload
        })
        ifUserExists(data, type)
        event.target.reset()
      } catch (error) {
        const message = i18next.t('Prišlo je do napake.')
      }
    }
  }

  if (/\/admin\/uporabniki\/\d+\/urejanje/.test(currentPagePath)) {
    const formEditUser = document.getElementById('form-edit-user')
    formEditUser.addEventListener('input', enableButton)
  }

  if (currentPagePath === '/admin/nastavitve/portal') {
    const formAdminPortal = document.getElementById('admin-portal-settings')
    formAdminPortal.addEventListener('input', enableButton)
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(formAdminPortal, dictSideMenu)
  }

  if (currentPagePath === '/admin/nastavitve/slovarji') {
    const formAdminPortal = document.getElementById('admin-settings-dict')
    formAdminPortal.addEventListener('input', enableButton)
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(formAdminPortal, dictSideMenu)
  }

  if (currentPagePath === '/admin/nastavitve/svetovalnica') {
    checkConsultancyBtns()
    const { offsetMain } = window.adminElements
    offsetMain.addEventListener('click', handleClick)
    const formAdminPortal = document.getElementById('admin-settings-consult')
    formAdminPortal.addEventListener('input', enableButton)
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(formAdminPortal, dictSideMenu)
  }
  adjustOffsetBy()
}

function adjustOffsetBy() {
  const { offsetMain, fixedTopSection } = window.adminElements
  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
  const headerPadding = document.getElementById('header-padding')

  if (document.body.clientWidth < 1200) {
    if (offsetHeaderPadding !== null) offsetMain.style.paddingTop = `0px`
  } else {
    for (let i = 0; i < offsetHeader.length; i++) {
      offsetHeader[i].style.paddingTop = `${referenceHeight}px`
    }
    if (headerPadding !== null) {
      const headerPaddingHeight = headerPadding.offsetHeight
      offsetMain.style.paddingTop = `${headerPaddingHeight}px`
    }
    if (offsetHeaderPadding !== null) {
      const offsetHeaderHeight = offsetHeaderPadding.offsetHeight
      offsetMain.style.paddingTop = `${referenceHeight + offsetHeaderHeight}px`
    }
  }
}

function createNewAuthorInput(pageForm) {
  const divAuthor = document.createElement('div')
  const divSubjectName = document.createElement('div')
  const spanName = document.createElement('span')
  const divRow = document.createElement('div')
  const divColSm5 = document.createElement('div')
  const inputGroup = document.createElement('div')
  const inputField = document.createElement('input')
  const spanInputGroup = document.createElement('span')
  const imgTrashIcon = document.createElement('img')
  const divColSm = document.createElement('div')
  const spanNameInfoTxt = document.createElement('span')

  divAuthor.className = 'author mt-sm-4 added-field'
  divSubjectName.className = 'subject-name'
  spanName.className = 'smaller-gray-uppercase'
  spanName.textContent = i18next.t('AVTOR')
  divRow.className = 'row align-items-center'
  divColSm5.className = 'col-sm-6'
  inputGroup.className = 'input-group'
  inputField.className = 'name-input d-inline form-control icon-trash'
  inputField.name = 'author'
  inputField.maxLength = '64'
  spanInputGroup.className = 'input-group-text delete-author-btn'
  spanInputGroup.id = 'trash-icon-btn'
  spanInputGroup.addEventListener('click', deleteInput)
  imgTrashIcon.className = 'delete-author p-0'
  imgTrashIcon.src = '/images/red-trash-icon.svg'
  imgTrashIcon.alt = 'Delete'
  divColSm.className = 'col-sm'
  spanNameInfoTxt.className =
    'd-md-inline d-block name-info-txt ms-xxl-3 ms-md-3 mt-3 mt-ms-0'
  spanNameInfoTxt.textContent = i18next.t('Dodaten avtor.')

  divAuthor.appendChild(divSubjectName)
  divSubjectName.appendChild(spanName)
  divAuthor.appendChild(divRow)
  divRow.appendChild(divColSm5)
  divColSm5.appendChild(inputGroup)
  inputGroup.appendChild(inputField)
  inputGroup.appendChild(spanInputGroup)
  spanInputGroup.appendChild(imgTrashIcon)
  divRow.appendChild(divColSm)
  divColSm.appendChild(spanNameInfoTxt)

  const addNewAuthorBtn = document.getElementById('add-new-author')

  pageForm.insertBefore(divAuthor, addNewAuthorBtn)
}

function createNewAreaInput(pageForm) {
  const divSmallNameArea = document.createElement('div')
  const divSubjectName = document.createElement('div')
  const spanInputNameTxtSlo = document.createElement('span')
  const spanInputNameTxtEng = document.createElement('span')
  const divRow = document.createElement('div')
  const divRow2 = document.createElement('div')
  const divColSm5 = document.createElement('div')
  const divColSm52 = document.createElement('div')
  const inputGroup = document.createElement('div')
  const inputFieldSlo = document.createElement('input')
  const inputFieldEng = document.createElement('input')
  const spanDeleteAreaBtn = document.createElement('span')
  const imgTrashIcon = document.createElement('img')
  const divColSm = document.createElement('div')
  const divColSm2 = document.createElement('div')
  const divEnglishInput = document.createElement('div')
  const spanNameInfoTxt = document.createElement('span')
  const spanNameInfoTxtEng = document.createElement('span')

  divSmallNameArea.className = 'author mt-4 added-field'
  divSubjectName.className = 'subject-name'
  spanInputNameTxtSlo.className = 'smaller-gray-uppercase'
  spanInputNameTxtSlo.textContent = i18next.t('NOVO PODPODROČJE (slovensko)')
  spanInputNameTxtEng.className = 'smaller-gray-uppercase mt-4'
  spanInputNameTxtEng.textContent = i18next.t('NOVO PODPODROČJE (angleško)')
  divRow.className = 'row align-items-center'
  divRow2.className = 'row align-items-center'
  divEnglishInput.className = 'mt-4'
  divColSm5.className = 'col-sm-6'
  divColSm52.className = 'col-sm-6'
  inputGroup.className = 'input-group d-flex'
  inputFieldSlo.className = 'name-input d-inline form-control icon-trash w-75'
  inputFieldSlo.name = 'domainSecondaryNewNameSl'
  inputFieldSlo.maxLength = '64'
  inputFieldEng.className = 'name-input form-control w-100'
  inputFieldEng.name = 'domainSecondaryNewNameEn'
  inputFieldEng.maxLength = '64'
  spanDeleteAreaBtn.className = 'input-group-text delete-author-btn'
  spanDeleteAreaBtn.id = 'trash-icon-btn'
  spanDeleteAreaBtn.addEventListener('click', deleteInput)
  imgTrashIcon.src = '/images/red-trash-icon.svg'
  imgTrashIcon.alt = 'Delete'
  divColSm.className = 'col-sm  mt-3 mt-sm-0'
  divColSm2.className = 'col-sm mt-3 mt-sm-0'
  spanNameInfoTxt.className = 'd-sm-inline name-info-txt ms-xxl-3 ms-md-3'
  spanNameInfoTxt.textContent = i18next.t(
    'Vpišite novo podpodročje. Na seznamu podpodročij bo vidno takoj po potrditvi administratorja portala.'
  )
  spanNameInfoTxtEng.className =
    'd-sm-inline name-info-txt ms-xxl-3 ms-md-3 mt-4'
  spanNameInfoTxtEng.textContent = i18next.t('Novo podpodročje (angleško).')

  divSmallNameArea.appendChild(divSubjectName)
  divSubjectName.appendChild(spanInputNameTxtSlo)
  divSmallNameArea.appendChild(divRow)
  divRow.appendChild(divColSm5)
  divColSm5.appendChild(inputGroup)
  inputGroup.appendChild(inputFieldSlo)
  inputGroup.appendChild(spanDeleteAreaBtn)
  spanDeleteAreaBtn.appendChild(imgTrashIcon)
  divSmallNameArea.appendChild(divEnglishInput)
  divEnglishInput.appendChild(spanInputNameTxtEng)
  divRow.appendChild(divColSm)
  divColSm.appendChild(spanNameInfoTxt)
  divSmallNameArea.appendChild(divRow2)
  divRow2.appendChild(divColSm52)
  divColSm52.appendChild(inputFieldEng)
  divRow2.appendChild(divColSm2)
  divColSm2.appendChild(spanNameInfoTxtEng)

  const addNewSmallAreaBtn = document.getElementById('add-new-area')

  pageForm.insertBefore(divSmallNameArea, addNewSmallAreaBtn)
}

function countAdmins() {
  const allAdmins = document.querySelectorAll('.administration-cb:checked')
  if (allAdmins.length === 1) {
    const row = allAdmins[0].parentElement.parentElement.parentElement
    row.querySelector('.delete-row').classList.add('disabled-input')
    allAdmins[0].classList.add('disabled-input')
  } else {
    const disabledDelete = document.querySelector(
      '.delete-user-btn.disabled-input'
    )
    if (disabledDelete !== null) {
      disabledDelete.classList.remove('disabled-input')
    }
    const arrAllAdmins = Array.from(allAdmins)
    arrAllAdmins.forEach(el => el.classList.remove('disabled-input'))
  }
}

function handleClick({ target }) {
  const deleteTask = target.closest('.delete-task')
  const btnGrp = target.closest('.btn-group')
  if (deleteTask) deleteField(deleteTask)
  if (btnGrp) checkConsultancyBtns()
}

function deleteField(ele) {
  const element = ele.closest('.task')
  const modalUseBtn = document.getElementById('modal-use-btn')
  modalUseBtn.addEventListener('click', () => {
    element.remove()
  })
  // element.remove()
}

function checkConsultancyBtns() {
  const checked = document.querySelector(
    'input[name="consultancyType"]:checked'
  ).value
  const emailEl = document.getElementById('zrc-email')
  const urlEl = document.getElementById('zrc-url')
  if (checked === 'own') {
    emailEl.classList.add('disabled-input')
    urlEl.classList.add('disabled-input')
  } else {
    emailEl.classList.remove('disabled-input')
    urlEl.classList.remove('disabled-input')
  }
}

function deleteInput({ target }) {
  const element = target.closest('.added-field')
  const alertModal = new bootstrap.Modal(document.getElementById('alert-modal'))
  alertModal.toggle()
  const modalUseBtn = document.getElementById('modal-use-btn')
  modalUseBtn.addEventListener('click', () => {
    element.remove()
    alertModal.hide()
    enableButton()
  })
}

function enableButton() {
  const disabledBtn = document.getElementById('disabled-submit-btn')
  disabledBtn.disabled = false
}

function handleAreasClick({ target }) {
  const editRow = target.closest('.edit-row-btn')
  const deleteRow = target.closest('.delete-row-btn')
  const tableButtons = target.closest('.table-buttons')
  const addAreaBtn = target.closest('#add-area')
  const deleteUserRow = target.closest('.delete-user-btn')
  const adminCbox = target.closest('.administration-cb')
  if (adminCbox) {
    if (adminCbox.checked) {
      const getRow = adminCbox.parentElement.parentElement.parentElement
      const editCbox = getRow.querySelector('.edit-cb')
      editCbox.checked = 'true'
    }
  }
  if (deleteUserRow) {
    enableButton()
    const getRow = deleteUserRow.parentElement.parentElement
    const modalUseBtn = document.getElementById('modal-use-btn')
    modalUseBtn.addEventListener('click', () => {
      getRow.remove()
    })
  }
  if (deleteRow) {
    const getRow = deleteRow.parentElement.parentElement.parentElement
    const modalUseBtn = document.getElementById('modal-use-btn')
    modalUseBtn.addEventListener('click', () => {
      getRow.remove()
    })
    const rowId = getRow.firstChild.value
    const tempId = getRow.dataset.tempId
    if (tempId) {
      let arr = secondaryDomainsForChange()
      arr = arr.filter(el => el.tempId !== parseInt(tempId))
      secondaryDomainsForChange(arr)
    } else {
      const data = { id: rowId, type: 'removeArea' }
      secondaryDomainsForChange(data)
    }
  }
  if (editRow) {
    const getRow = editRow.parentElement.parentElement.parentElement
    const visibilityEl = getRow.querySelector('.form-check')
    visibilityEl.disabled = false
    getRow.className = 'selected-row'
    tableButtons.style.display = 'none'
    const tDataArea = getRow.querySelector('.tdata-area')
    const tDataTranslation = getRow.querySelector('.tdata-translation')
    const tDataButtons = getRow.querySelector('.buttons-group')
    const tDataAreaText = tDataArea.textContent
    const tDataTranslationText = tDataTranslation.textContent
    const tdArea = document.createElement('td')
    const inputArea = document.createElement('input')
    inputArea.className = 'form-control w-50'
    inputArea.value = tDataAreaText
    tdArea.appendChild(inputArea)
    const tdTranslation = document.createElement('td')
    const inputTranslation = document.createElement('input')
    inputTranslation.className = 'form-control w-50'
    inputTranslation.value = tDataTranslationText
    tdTranslation.appendChild(inputTranslation)
    // tDataArea.remove()
    tDataArea.style.display = 'none'
    getRow.insertBefore(tdArea, tDataTranslation)
    // tDataTranslation.remove()
    tDataTranslation.style.display = 'none'
    getRow.insertBefore(tdTranslation, tDataButtons)
    const buttonsGroup = getRow.querySelector('.buttons-group')
    const newButtonGroup = document.createElement('div')
    const cancelButton = document.createElement('button')
    const saveButton = document.createElement('button')
    cancelButton.textContent = i18next.t('Prekliči')
    cancelButton.type = 'button'
    cancelButton.className = 'btn btn-secondary me-2'
    cancelButton.style.height = '33px'
    cancelButton.style.width = '105px'
    cancelButton.addEventListener('click', () =>
      abortEditing(newButtonGroup, tableButtons, tDataArea, tDataTranslation)
    )
    saveButton.textContent = i18next.t('POTRDI')
    saveButton.type = 'button'
    saveButton.className = 'btn btn-primary'
    saveButton.style.height = '33px'
    saveButton.style.width = '105px'
    saveButton.addEventListener('click', () =>
      saveChanges(
        newButtonGroup,
        inputArea,
        inputTranslation,
        tableButtons,
        tDataArea,
        tDataTranslation
      )
    )
    newButtonGroup.className = 'd-flex justify-content-end me-3'
    newButtonGroup.appendChild(cancelButton)
    newButtonGroup.appendChild(saveButton)
    buttonsGroup.insertBefore(newButtonGroup, tableButtons)
  }
  if (addAreaBtn) {
    const areaInput = document.getElementById('area-input')
    const translationInput = document.getElementById('translation-input')
    const areaInputValue = areaInput.value
    const translationInputValue = translationInput.value
    if (areaInputValue.length && translationInputValue.length) {
      const allAreasTable = document.getElementById('all-areas-table')
      const row = allAreasTable.insertRow(-1)
      row.dataset.tempId = tempCounter(true)
      const cell1 = row.insertCell(0)
      const cell2 = row.insertCell(1)
      const cell3 = row.insertCell(2)
      const cell4 = row.insertCell(3)
      cell1.innerHTML =
        '<input class="form-check checkbox-table" type="checkbox" name="isVisible" checked disabled>'
      cell2.textContent = areaInputValue
      cell2.classList.add('tdata-area')
      cell3.textContent = translationInputValue
      cell3.classList.add('tdata-translation')
      cell4.innerHTML =
        '<div class="table-buttons"><button class="p-0 table-button-grp me-3 edit-row-btn" type="button"><img src="/images/u_edit-alt.svg" alt=""></button><button class="p-0 table-button-grp delete-row-btn" data-bs-target="#alert-modal" data-bs-toggle="modal" type="button"><img src="/images/red-trash-icon.svg" alt=""></button></div>'
      cell4.classList.add('buttons-group')
      areaInput.value = ''
      translationInput.value = ''
      addAreaBtn.disabled = true
      const data = {
        tempId: tempCounter(),
        nameSl: areaInputValue,
        nameEn: translationInputValue,
        type: 'addArea'
      }
      secondaryDomainsForChange(data)
    }
  }
}

function saveChanges(
  btnGrp,
  inputArea,
  inputTranslation,
  oldButtons,
  tDataArea,
  tDataTranslation
) {
  const inputAreaNewValue = inputArea.value
  const inputTranslationNewValue = inputTranslation.value
  btnGrp.className = 'd-none'
  oldButtons.style.display = 'block'
  const getRow = btnGrp.parentElement.parentElement
  const tempId = getRow.dataset.tempId
  getRow.classList.remove('selected-row')
  inputArea.parentElement.remove()
  inputTranslation.parentElement.remove()
  tDataArea.style.display = 'table-cell'
  tDataArea.textContent = inputAreaNewValue
  tDataTranslation.style.display = 'table-cell'
  tDataTranslation.textContent = inputTranslationNewValue
  const visibilityEl = getRow.querySelector('.form-check')
  const visibility = visibilityEl.checked
  if (tempId) {
    const arr = secondaryDomainsForChange()
    const found = arr.find(el => el.tempId === parseInt(tempId))
    found.nameSl = inputAreaNewValue
    found.nameEn = inputTranslationNewValue
  } else {
    const changed = {
      id: getRow.firstChild.value,
      nameSl: inputAreaNewValue,
      nameEn: inputTranslationNewValue,
      isApproved: visibility,
      type: 'changeArea'
    }
    secondaryDomainsForChange(changed)
  }
  visibilityEl.disabled = true
}

function initSecondaryDomainsForChange() {
  let tempArray = []
  return function (element) {
    if (Array.isArray(element)) tempArray = element
    else if (element) tempArray.push(element)
    return tempArray
  }
}

const secondaryDomainsForChange = initSecondaryDomainsForChange()

function initTempCounter() {
  let counter = 0
  return function (el) {
    if (el) counter += 1
    return counter
  }
}

const tempCounter = initTempCounter()

function inputFieldsChecker() {
  const { inputAreaEl, inputTranslationEl } = window.adminElements
  const addAreaButton = document.getElementById('add-area')
  if (inputAreaEl.value.length && inputTranslationEl.value.length) {
    addAreaButton.disabled = false
  } else {
    addAreaButton.disabled = true
  }
}

function abortEditing(btnGrp, oldButtons, areaEl, translationEl) {
  btnGrp.className = 'd-none'
  oldButtons.style.display = 'block'
  const getRow = btnGrp.parentElement.parentElement
  getRow.classList.remove('selected-row')
  const getInputs = getRow.querySelectorAll('.w-50')
  getInputs.forEach(el => el.parentElement.remove())
  areaEl.style.display = 'table-cell'
  translationEl.style.display = 'table-cell'
  const visibilityEl = getRow.querySelector('.form-check')
  visibilityEl.disabled = true
}

function mobileMoveContent() {
  const adminNavMobileEl = document.getElementById('admin-nav-mobile')
  const mobileRightHolder = document.getElementById('mobile-right-holder')
  const secondaryButton = document.querySelector('.header-btn-secondary')
  const primaryButton = document.querySelector('.header-btn')
  const siteHeading = document.getElementById('site-heading')
  const siteHeadingTextContent = siteHeading.textContent
  const navTitle = document.getElementById('nav-title')
  const headerContainerRight = document.querySelector(
    '.header-container-divider-right'
  )
  if (document.body.clientWidth <= 1200) {
    if (secondaryButton) {
      mobileRightHolder.appendChild(secondaryButton)
      secondaryButton.style.height = '28px'
      // secondaryButton.style.width = '99px'
      secondaryButton.style.marginRight = '10px'
    }
    if (primaryButton) {
      // if (currentPagePath === '/admin/povezave/seznam') {
      // primaryButton.style.width = '160px'
      // } else {
      // primaryButton.style.width = '99px'
      // }
      mobileRightHolder.appendChild(primaryButton)
      adminNavMobileEl.classList.add('align-items-center')
      adminNavMobileEl.classList.add('justify-content-between')
      // primaryButton.style.height = '28px'
      // primaryButton.style.marginRight = '10px'
      primaryButton.style.whiteSpace = 'nowrap'
    }
    if (navTitle) navTitle.textContent = siteHeadingTextContent
    siteHeading.style.display = 'none'
  }
  if (document.body.clientWidth > 1200) {
    if (secondaryButton) {
      headerContainerRight.appendChild(secondaryButton)
      secondaryButton.style.height = ''
      secondaryButton.style.width = ''
      secondaryButton.style.marginRight = ''
    }
    if (primaryButton) {
      headerContainerRight.appendChild(primaryButton)
      adminNavMobileEl.classList.remove('align-items-center')
      adminNavMobileEl.classList.remove('justify-content-between')
      primaryButton.style.height = ''
      primaryButton.style.width = ''
      primaryButton.style.marginRight = ''
      primaryButton.style.whiteSpace = ''
    }

    if (navTitle) {
      if (
        currentPagePath.includes('slovarji') &&
        !currentPagePath.includes('admin')
      )
        navTitle.textContent = i18next.t('Urejanje')
      else navTitle.textContent = i18next.t('Administracija')
    }
    siteHeading.style.display = 'block'
  }
}

function checkUserRightsCb(el) {
  const { terminologyReviewCb, languageReviewCb } = window.adminElements
  const termRevCbs = document.querySelectorAll('.terminology-review-cb')
  const langRevCbs = document.querySelectorAll('.language-review-cb')
  const termRevTxt = document.getElementById('txt-term-rev')
  const langRevTxt = document.getElementById('txt-lang-rev')
  if (!terminologyReviewCb.checked) {
    termRevTxt.classList.add('text-black-50')
    termRevCbs.forEach(el => (el.checked = false))
    termRevCbs.forEach(el => el.classList.add('disabled-input'))
  } else {
    termRevTxt.classList.remove('text-black-50')
    termRevCbs.forEach(el => el.classList.remove('disabled-input'))
  }
  if (!languageReviewCb.checked) {
    langRevTxt.classList.add('text-black-50')
    langRevCbs.forEach(el => (el.checked = false))
    langRevCbs.forEach(el => el.classList.add('disabled-input'))
  } else {
    langRevTxt.classList.remove('text-black-50')
    langRevCbs.forEach(el => el.classList.remove('disabled-input'))
  }
}

function checkform() {
  const selectionInput = $('#cerif')
    .find('span')
    .find('.select2-selection.select2-selection--multiple')
  if ($('#select-cerif').val().length < 1) {
    selectionInput.addClass('select2-validation')
    selectionInput.addClass('select2-validation:focus')
    $('#invalid-section').removeClass('hidden-section')
  } else {
    selectionInput.removeClass('select2-validation')
    selectionInput.removeClass('select2-validation:focus')
    $('#invalid-section').addClass('hidden-section')
  }
}

function ifUserExists(data, type) {
  const userIds = document.querySelectorAll('.hidden-user-id')
  const modalEl = new bootstrap.Modal(document.getElementById('response-modal'))
  const modalText = document.getElementById('response-modal-text')
  if (data[0] !== undefined) {
    if (userIds.length) {
      let bool = false
      for (let i = 0; i < userIds.length; i++) {
        const el = userIds[i]
        if (parseInt(el.value) === data[0].id) {
          bool = true
        }
      }
      if (bool === true && data[0] !== undefined) {
        // modalText.textContent = `Uporabnik ${data[0].username} je že v tabeli.`
        modalText.textContent =
          i18next.t('Uporabnik') +
          `${data[0].username}` +
          i18next.t('je že v tabeli.')
        modalEl.toggle()
      } else createNewUserArea(data, type)
    } else createNewUserArea(data, type)
  } else {
    modalText.textContent = i18next.t(
      'Preverite, če ste pravilno vpisali uporabniško ime. Bodite pozorni na velike in male črke.'
    )
    modalEl.toggle()
  }
}

function createNewUserArea(data, type) {
  const table = document.getElementById('user-roles-table')
  const tBody = document.createElement('tbody')
  const tr = document.createElement('tr')
  const hiddenId = document.createElement('input')
  const td = document.createElement('td')
  const spanUserName = document.createElement('span')
  const spanEmail = document.createElement('div')
  const tdPortAdminOrAdmin = document.createElement('td')
  const divPortAdminOrAdmin = document.createElement('div')
  const inputPortAdminOrAdmin = document.createElement('input')
  const tdDictAdmin = document.createElement('td')
  const divDictAdmin = document.createElement('div')
  const inputDictAdmin = document.createElement('input')
  const tdConsultAdmin = document.createElement('td')
  const divConsultAdmin = document.createElement('div')
  const inputConsultAdmin = document.createElement('input')
  const tdLanguageRev = document.createElement('td')
  const divLanguageRev = document.createElement('div')
  const inputLanguageRev = document.createElement('input')
  const tdDeleteRow = document.createElement('td')
  const imgDelete = document.createElement('img')

  if (data[0] !== undefined) {
    tBody.id = 'user-data-table'
    tBody.className = 'user-data pb-xl-2'
    hiddenId.className = 'hidden-user-id'
    hiddenId.type = 'hidden'
    hiddenId.value = data[0].id
    hiddenId.name = 'userId'
    td.className =
      'user-information d-grid justify-content-left justify-content-xl-center'
    spanUserName.className = 'user-name-last-name'
    spanUserName.textContent = data[0].username
    spanEmail.className = 'user-email'
    spanEmail.textContent = data[0].email
    tdPortAdminOrAdmin.className = 'pt-1 pb-1'
    divPortAdminOrAdmin.className =
      'form-check d-flex justify-content-left justify-content-xl-center'
    inputPortAdminOrAdmin.className = 'form-check-input'
    inputPortAdminOrAdmin.type = 'checkbox'
    tdDictAdmin.className = 'pt-1 pb-1'
    divDictAdmin.className =
      'form-check d-flex justify-content-left justify-content-xl-center'
    inputDictAdmin.className = 'form-check-input'
    inputDictAdmin.type = 'checkbox'
    tdConsultAdmin.className = 'pt-1 pb-1'
    divConsultAdmin.className =
      'form-check d-flex justify-content-left justify-content-xl-center'
    inputConsultAdmin.className = 'form-check-input'
    inputConsultAdmin.type = 'checkbox'

    if (type === 'portal') {
      tdPortAdminOrAdmin.dataset.label = i18next.t('Skrbnik portala')
      inputPortAdminOrAdmin.name = `rolesPerUser['${data[0].id}'][isPortalAdmin]`
      tdDictAdmin.dataset.label = i18next.t('Skrbnik slovarjev')
      inputDictAdmin.name = `rolesPerUser['${data[0].id}'][isDictionariesAdmin]`
      tdConsultAdmin.dataset.label = i18next.t('Skrbnik svetovalnice')
      inputConsultAdmin.name = `rolesPerUser['${data[0].id}'][isConsultancyAdmin]`
    } else {
      tdPortAdminOrAdmin.dataset.label = i18next.t('Administrator')
      inputPortAdminOrAdmin.classList.add('administration-cb')
      inputPortAdminOrAdmin.name = `rightsPerUser['${data[0].id}'][isAdministration]`
      tdDictAdmin.dataset.label = i18next.t('Urejanje')
      inputDictAdmin.name = `rightsPerUser['${data[0].id}'][isEditing]`
      inputDictAdmin.classList.add('edit-cb')
      tdConsultAdmin.dataset.label = i18next.t('Strokovni pregled')
      inputConsultAdmin.classList.add('terminology-review-cb')
      inputConsultAdmin.name = `rightsPerUser['${data[0].id}'][isTerminologyReview]`
      tdLanguageRev.className = 'pt-1 pb-1'
      tdLanguageRev.dataset.label = i18next.t('Jezikovni pregled')
      divLanguageRev.className =
        'form-check d-flex justify-content-left justify-content-xl-center'
      inputLanguageRev.className = 'language-review-cb form-check-input'
      inputLanguageRev.type = 'checkbox'
      inputLanguageRev.name = `rightsPerUser['${data[0].id}'][isLanguageReview]`
    }

    tdDeleteRow.className = 'delete-user-btn pt-3 delete-row'
    tdDeleteRow.dataset.bsTarget = '#alert-modal'
    tdDeleteRow.dataset.bsToggle = 'modal'
    imgDelete.src = '/images/red-trash-icon.svg'
    imgDelete.alt = 'Delete'
    imgDelete.className = 'icon-trash-delete'

    tBody.appendChild(tr)
    tr.appendChild(hiddenId)
    tr.appendChild(td)
    td.appendChild(spanUserName)
    td.appendChild(spanEmail)
    tr.appendChild(tdPortAdminOrAdmin)
    tdPortAdminOrAdmin.appendChild(divPortAdminOrAdmin)
    divPortAdminOrAdmin.appendChild(inputPortAdminOrAdmin)
    tr.appendChild(tdDictAdmin)
    tdDictAdmin.appendChild(divDictAdmin)
    divDictAdmin.appendChild(inputDictAdmin)
    tr.appendChild(tdConsultAdmin)
    tdConsultAdmin.appendChild(divConsultAdmin)
    divConsultAdmin.appendChild(inputConsultAdmin)

    if (type === 'rights') {
      tr.appendChild(tdLanguageRev)
      tdLanguageRev.appendChild(divLanguageRev)
      divLanguageRev.appendChild(inputLanguageRev)
    }
    tr.appendChild(tdDeleteRow)
    tdDeleteRow.appendChild(imgDelete)

    table.appendChild(tBody)
    checkUserRightsCb()
  }
}

// Summernote

$('.summernote').summernote({
  placeholder: i18next.t('Na kratko opišite zasnovo in namen slovarja.'),
  height: 300,
  minheight: 150,
  toolbar: [
    ['style', ['style', 'bold', 'italic', 'underline']],
    ['font', ['superscript', 'subscript']],
    ['link', ['linkDialogShow']],
    ['para', ['ul', 'ol']],
    ['table', ['table']],
    ['insert', ['picture']]
  ],
  styleTags: ['p', 'h3', 'h4']
})

// profile settings
{
  const profileForm = document.getElementById('profileForm')

  if (profileForm) {
    profileForm.addEventListener('input', e => {
      enableButton()
    })

    profileForm.addEventListener('submit', async e => {
      e.preventDefault()

      const data = Object.fromEntries(new FormData(e.target))

      const notifyAction = () => {
        document.getElementById('fpi-text').innerHTML = i18next.t(
          'Izpolnite vsa prazna polja.'
        )
        $('#reset-pass-info').modal('show')
      }

      if (data.numberOfHits) {
        await handleUpdateHitsPerPage(data.numberOfHits)
      }

      if (data.firstName && data.lastName && data.email) {
        await handleUpdateBasicData(data)
      } else if (location.pathname === '/moj-racun') {
        // if missing the required data on endpoint /moj-racun, notify!
        notifyAction()
        return
      }

      if (data.passwordOld && data.passwordNew && data.passwordNewRepeat) {
        await handleUpdatePassword(data)
      } else if (location.pathname === '/spremeni-geslo') {
        // if missing the required data on endpoint /spremeni-geslo, notify!
        notifyAction()
      }

      // console.log(data)
    })
  }

  async function handleUpdateHitsPerPage(hitAmount) {
    try {
      await axios.post('/api/v1/users/hitsPerPage', { hitAmount })
      location.reload(true)
    } catch (error) {
      displayError(error)
    }
  }

  async function handleUpdateBasicData(payload) {
    try {
      if (!validator.isEmail(payload.email)) {
        document.getElementById('fpi-text').innerHTML =
          i18next.t('Neveljavna e-pošta')
        $('#reset-pass-info').modal('show')
        return
      }
      await axios.post('/api/v1/users/basic-data', payload)
      location.reload(true)
    } catch (error) {
      displayError(error)
    }
  }

  async function handleUpdatePassword(payload) {
    try {
      if (payload.passwordNew !== payload.passwordNewRepeat) {
        document.getElementById('fpi-text').innerHTML = i18next.t(
          'Gesli se ne ujemata'
        )
        $('#reset-pass-info').modal('show')
        return
      }

      if (!validator.isLength(payload.passwordNew, { min: 8 })) {
        document.getElementById('fpi-text').innerHTML =
          i18next.t('Geslo je prekratko')
        $('#reset-pass-info').modal('show')
        return
      }

      await axios.post('/api/v1/users/password', payload)
      location.reload(true)
    } catch (error) {
      displayError(error)
    }
  }

  function displayError(error) {
    let message = i18next.t('Prišlo je do napake.')
    if (error.response) {
      message = error.response.data
    } else if (error.request) {
      message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
    }

    document.getElementById('fpi-text').textContent = message
    $('#reset-pass-info').modal('show')
  }
}
