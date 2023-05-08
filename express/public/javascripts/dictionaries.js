/* global $, axios, bootstrap, currentPagePath, initPagination, removeAllChildNodes, unsavedData, replaceContainer, i18next */

// Temporary workaround (use of currentPagePath).

window.addEventListener('load', () => {
  initDictionaries()
})

let queryBattery = ''

function initDictionaries() {
  const ce = {}
  window.dictionaryElements = ce
  ce.textDescription = document.getElementById('text-description')
  ce.headerTitle = document.getElementById('site-header-title')
  ce.fixedTopSection = document.getElementById('fixed-top-section')
  ce.offsetMain = document.getElementById('offset-main')

  window.addEventListener('resize', () => {
    adjustOffsetBy()
    mobileMoveContent()
  })
  mobileMoveContent()
  adjustOffsetBy()
  window.onscroll = hideAndShowHeader
  if (
    /\/slovarji\/\d+\/podatki/.test(currentPagePath) ||
    currentPagePath === '/slovarji/nov'
  ) {
    ce.inputNewAuthor = document.getElementById('input-new-author')
    ce.inputNewArea = document.getElementById('input-new-area')
  }

  if (currentPagePath === '/slovarji/nov') {
    changePreview()
    ce.newDictionaryForm = document.getElementById('form-dictionary-new')
    ce.checkLanguageGroup = document.getElementById('language-group')
    ce.languagesInput = document.getElementById('languages-input')

    ce.terminLanguageSubgroup = document.getElementById(
      'termin-language-subgroup'
    )
    ce.definitionLanguageSubgroup = document.getElementById(
      'definition-language-subgroup'
    )
    ce.synonymLanguageSubgroup = document.getElementById(
      'synonym-language-subgroup'
    )
    ce.definitionCheckBox = document.getElementById('definition-check-box')
    ce.submitDictionaryBtn = document.getElementById('submit-dictionary-btn')
    ce.checkLanguageGroup.addEventListener('click', checkBoxLanguageChecker)
    ce.definitionCheckBox.addEventListener('click', checkBoxDefinitionChecker)
    const switchForm = document.querySelector('.switch-forms')
    switchForm.addEventListener('click', () => changePreview())

    ce.inputNewAuthor.addEventListener('click', () => {
      addField(ce.newDictionaryForm, ce.inputNewAuthor)
    })

    ce.inputNewArea.addEventListener('click', () => {
      createNewAreaInput(ce.newDictionaryForm)
    })

    ce.newDictionaryForm.addEventListener('submit', event => {
      // checkform()
      checkLanguages()
      if (!event.target.checkValidity()) {
        event.preventDefault()
      }
      event.target.classList.add('was-validated')
    })
  }

  if (/\/slovarji\/\d+\/struktura/.test(currentPagePath)) {
    changePreview()
    const switchForm = document.querySelector('.switch-forms')
    switchForm.addEventListener('click', () => changePreview())
    ce.dictionaryStructureForm = document.getElementById(
      'form-dictionary-structure'
    )
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(ce.dictionaryStructureForm, dictSideMenu)
    ce.checkLanguageGroup = document.getElementById('language-group')
    ce.languagesInput = document.getElementById('languages-input')
    ce.terminLanguageSubgroup = document.getElementById(
      'termin-language-subgroup'
    )
    ce.definitionLanguageSubgroup = document.getElementById(
      'definition-language-subgroup'
    )
    ce.synonymLanguageSubgroup = document.getElementById(
      'synonym-language-subgroup'
    )

    // jquery event listener for a select2 field
    $('.multiple').on('change', enableButton)

    ce.dictionaryStructureForm.addEventListener('input', enableButton)
    ce.definitionCheckBox = document.getElementById('definition-check-box')
    ce.submitDictionaryBtn = document.getElementById('submit-dictionary-btn')
    ce.checkLanguageGroup.addEventListener('click', checkBoxLanguageChecker)
    ce.definitionCheckBox.addEventListener('click', checkBoxDefinitionChecker)

    ce.dictionaryStructureForm.addEventListener('submit', event => {
      // checkform()
      checkLanguages()
      if (!event.target.checkValidity()) {
        event.preventDefault()
      }
      event.target.classList.add('was-validated')
    })
  }

  if (/\/slovarji\/\d+\/podatki/.test(currentPagePath)) {
    ce.descriptionDictionaryForm = document.getElementById(
      'form-dictionary-description'
    )
    ce.descriptionDictionaryForm.addEventListener('input', enableButton)
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(ce.descriptionDictionaryForm, dictSideMenu)
    ce.inputElements = document.querySelectorAll('input')
    ce.imgTrashIcon = document.querySelectorAll('.delete-author-btn')
    ce.inputElements.forEach(el => el.addEventListener('input', enableButton))
    ce.inputElements.forEach(el => el.addEventListener('change', enableButton))
    ce.inputNewAuthor.addEventListener('click', () => {
      addField(ce.descriptionDictionaryForm, ce.inputNewAuthor)
    })
    ce.inputNewAuthor.addEventListener('click', enableButton)
    ce.inputNewArea.addEventListener('click', () => {
      createNewAreaInput(ce.descriptionDictionaryForm)
    })
    ce.inputNewArea.addEventListener('click', enableButton)
    if (ce.imgTrashIcon !== null) {
      ce.imgTrashIcon.forEach(el => el.addEventListener('click', deleteField))
      ce.imgTrashIcon.forEach(el => el.addEventListener('click', enableButton))
    }

    // jquery event listener for select2 fields
    $('.without-addition').on('change', enableButton)
    $('.multiple').on('change', enableButton)

    // JQuery for summernote text editor
    $('.summernote').on('summernote.change', enableButton)

    ce.descriptionDictionaryForm.addEventListener('submit', event => {
      // checkform()
      if (!event.target.checkValidity()) {
        event.preventDefault()
      }
      event.target.classList.add('was-validated')
    })
  }

  if (/\/slovarji\/\d+\/uvoz\/datoteka/.test(currentPagePath)) {
    ce.fileUploadInput = document.getElementById('upload')
    const btnImportEl = document.getElementById('button-import')
    btnImportEl.addEventListener('click', () => ce.fileUploadInput.click())
    const fileUploadInputValue = ce.fileUploadInput.value
    const chosenFile = document.getElementById('chosen-file')
    const fileTypeSelectionContainer = document.getElementById(
      'file-type-selection'
    )
    ce.fileImportForm = document.getElementById('file-import-form')

    ce.fileUploadInput.addEventListener('change', function () {
      if (chosenFile.textContent !== fileUploadInputValue) {
        chosenFile.textContent = ''
        if (ce.fileUploadInput.files.item(0) !== null)
          chosenFile.textContent = ce.fileUploadInput.files.item(0).name
        else {
          chosenFile.textContent = i18next.t('Izberi datoteko')
        }
      }
    })

    fileTypeSelectionContainer.addEventListener(
      'change',
      updateAcceptedFileTypes
    )

    ce.fileImportForm.addEventListener('submit', submitFormMultipart)

    async function submitFormMultipart(event) {
      try {
        event.preventDefault()
        const payload = new FormData(event.target)

        await axios.post(event.target.action, payload)

        alert(i18next.t('SLOVAR UVOŽEN'))
      } catch (error) {
        alert(i18next.t('NAPAKA V UVOZU'))
      }
    }

    {
      const resultsListEl = document.getElementById('page-results')
      const dictionaryId = document.getElementById('dictionary-id').value

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
        const url = `/api/v1/dictionaries/${dictionaryId}/showImportFromFileForm?p=${page}`
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
          const date = new Date(result.time_started).toLocaleDateString(
            'sl-SL',
            localeOptions
          )
          td1.textContent = date
          td2.textContent = result.file_format
          td3.textContent = result.count_valid_entries
          td4.textContent = result.status
          rowEl.append(td1, td2, td3, td4)
          resultsListEl.appendChild(rowEl)
        })
      }
    }
  }

  if (/\/slovarji\/\d+\/izvoz/.test(currentPagePath)) {
    const resultsListEl = document.getElementById('page-results')
    const dictionaryId = document.getElementById('dictionary-id').value

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
      const url = `/api/v1/dictionaries/${dictionaryId}/showExportToFileForm?p=${page}`
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
        const date = new Date(result.time_created).toLocaleDateString(
          'sl-SL',
          localeOptions
        )
        td1.textContent = date
        td2.textContent = result.export_file_format
        td3.textContent = result.entry_count
        if (result.status === 'finished') {
          const aEl = document.createElement('a')
          aEl.href = `/slovarji/export-download/${result.id}`
          aEl.textContent = i18next.t('Shrani')
          aEl.className = 'btn btn-primary'
          td4.append(aEl)
        } else td4.textContent = ''

        rowEl.append(td1, td2, td3, td4)
        resultsListEl.appendChild(rowEl)
      })
    }
  }

  if (/\/slovarji\/\d+\/vsebina/.test(currentPagePath)) {
    ce.formEditContent = document.getElementById('form-edit-content')
    ce.formEditContent.addEventListener('submit', updateEntry)
    ce.previewBtnEl = document.getElementById('content-preview')
    ce.editBtnEl = document.getElementById('content-edit')
    ce.commentsBtnEl = document.getElementById('content-comments')
    ce.previewButtonsGroup = document.getElementById('preview-buttons')
    ce.commentsButtonsGroup = document.getElementById('comments-buttons')
    ce.previewSection = document.getElementById('preview-section')
    ce.editSection = document.getElementById('edit-section')
    ce.commentsSection = document.getElementById('comments-section')
    ce.goLeftBtn = document.getElementById('go-left')
    ce.goRightBtn = document.getElementById('go-right')
    ce.dateListContainer = document.getElementById('date-list')
    ce.dateSection = document.getElementById('date-section')
    ce.showDates = document.getElementById('show-dates')
    ce.selectAllDates = document.querySelectorAll('input[name=date]')
    ce.classicOverview = document.getElementById('classic-overview')
    // ce.selectedOverview = document.getElementById('selected-date-overview')
    ce.btnSaveIcon = document.getElementById('btn-save-icon')
    ce.filterCheckBoxes = document.querySelectorAll('.indeterminate-cbox')
    ce.showFilterBtn = document.getElementById('show-filter')
    ce.explanationField = document.getElementById('explanation-field')
    ce.definitionField = document.getElementById('definition-field')
    ce.termInputField = document.getElementById('term-name')
    ce.newHeadwordGroupBtn = document.getElementById('btn-new-headword-grp')
    ce.headerwordTable = document.getElementById('headword-table')
    ce.newConnectionBtn = document.getElementById('input-new-connection')
    ce.newImageBtn = document.getElementById('input-new-image')
    ce.newAudioBtn = document.getElementById('input-new-audio')
    ce.newVideoBtn = document.getElementById('input-new-video')
    ce.foreignDefinitionField = document.querySelectorAll(
      '.foreign-definition-field'
    )
    ce.entryPreviewSection = document.getElementById('entry-preview-section')
    ce.noEntriesText = document.getElementById('no-entries-text')
    ce.newEntryBtn = document.getElementById('new-entry-btn')
    ce.deleteEntryBtn = document.getElementById('delete-entry')
    ce.searchInput = document.querySelector('.input-search')
    ce.clearSearchInput = document.querySelector('.clear-search-input')
    ce.collapsablePart = document.querySelectorAll('.collapsable-entry-part')
    ce.scrollEl = document.querySelector('.content-nav-content')
    $('.multiple').on('select2:select', enableButton)
    ce.collapsablePart.forEach(el => {
      el.addEventListener('hide.bs.collapse', () =>
        changePageContent('collapse-hidden')
      )
    })
    ce.collapsablePart.forEach(el => {
      el.addEventListener('shown.bs.collapse', () =>
        changePageContent('collapse-shown')
      )
    })
    ce.collapsablePart.forEach(el => {
      el.addEventListener('show.bs.collapse', () =>
        changePageContent('collapse-show')
      )
    })
    const filterSelect = document.querySelector('.filter-select')
    ce.clearSearchInput.addEventListener('click', () => {
      filterSelect.value = 'term'
      ce.searchInput.value = ''
      ce.filterCheckBoxes.forEach(el => (el.checked = false))
      useSearchEngine()
    })
    ce.statusEditEl = document.getElementById('status-edit')
    // ce.deleteEntryBtn.addEventListener('click', () => ajaxDeleteEntry())
    ce.newEntryBtn.addEventListener('click', e => {
      ce.formEditContent.reset()
      changePageContent('new-entry-btn')
    })
    const duplicateEntry = document.getElementById('duplicate-entry')
    duplicateEntry.addEventListener('click', () =>
      changePageContent('duplicate-entry')
    )
    if (ce.foreignDefinitionField) {
      ce.foreignDefinitionField.forEach(el =>
        el.addEventListener('input', autoResize)
      )
    }
    ce.previewBtnEl.addEventListener('click', () =>
      changePageContent('content-preview')
    )
    ce.editBtnEl.addEventListener('click', () =>
      changePageContent('content-edit')
    )
    ce.commentsBtnEl.addEventListener('click', () =>
      changePageContent('content-comments')
    )
    ce.goLeftBtn.addEventListener('click', () => letsScroll(ce.goLeftBtn))
    ce.goRightBtn.addEventListener('click', () => letsScroll(ce.goRightBtn))
    ce.showDates.addEventListener('click', () =>
      changePageContent(ce.showDates.id)
    )
    ce.selectAllDates.forEach(el =>
      el.addEventListener('click', () => showSelectedDateData(el))
    )
    ce.filterCheckBoxes.forEach(el =>
      el.addEventListener('click', () => indeterminateTheBox(el))
    )
    ce.showFilterBtn.addEventListener('click', () =>
      changePageContent(ce.showFilterBtn.getAttribute('aria-expanded'))
    )
    ce.formEditContent.addEventListener('input', enableButton)
    ce.resizeFields = document.querySelectorAll('.explanation-field')
    if (ce.resizeFields.length) {
      ce.resizeFields.forEach(el =>
        el.addEventListener('input', () => autoResize(el))
      )
    }
    const eventText = document.createEvent('Event')
    eventText.initEvent('input', true, true)
    ce.resizeFields.forEach(el => el.dispatchEvent(eventText))
    const mcBtnsGrp = document.querySelectorAll('.mc-buttons-group')
    if (mcBtnsGrp.length) {
      mcBtnsGrp.forEach(e => e.addEventListener('click', enableButton))
    }
    if (ce.newHeadwordGroupBtn)
      ce.newHeadwordGroupBtn.addEventListener('click', createHeadword)
    if (ce.newConnectionBtn)
      ce.newConnectionBtn.addEventListener('click', () =>
        addConnectionField(ce.formEditContent, ce.newConnectionBtn)
      )
    if (ce.newImageBtn)
      ce.newImageBtn.addEventListener('click', () =>
        addField(ce.formEditContent, ce.newImageBtn)
      )
    if (ce.newAudioBtn)
      ce.newAudioBtn.addEventListener('click', () =>
        addField(ce.formEditContent, ce.newAudioBtn)
      )
    if (ce.newVideoBtn)
      ce.newVideoBtn.addEventListener('click', () =>
        addField(ce.formEditContent, ce.newVideoBtn)
      )
    ce.statusEditEl.addEventListener('change', () => checkIfValid())
    ce.termInputField.addEventListener('input', () => checkIfValid())
    if (ce.definitionField !== null)
      ce.definitionField.addEventListener('input', () => checkIfValid())
    ce.authorEl = document.getElementById('edit-name-el')
    ce.versionEl = document.getElementById('edit-version-el')
    ce.previewVersion = document.getElementById('preview-version')
    ce.previewAuthor = document.getElementById('preview-author')
    $('.foreign-term-el').on('change', checkIfValid)
    const searchBtn = document.getElementById('inline-search-btn')
    searchBtn.addEventListener('click', e => {
      e.preventDefault()
      useSearchEngine()
    })
    const dateScrollerEl = document.querySelector('.date-scroller')
    dateScrollerEl.addEventListener('change', handleClick)
    ce.scrollEl.addEventListener('keydown', e => {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'PageUp' ||
        e.key === 'PageDown'
      )
        e.preventDefault()
    })
    const termListMenu = document.getElementById('term-list')
    termListMenu.addEventListener('keydown', throttle(onKeyDownNavigation, 80))
    termListMenu.addEventListener(
      'keydown',
      throttle(onPageUpDownNavigation, 600)
    )
    // Coppied from https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_throttle
    function throttle(func, timeFrame) {
      let lastTime = 0
      return function (...args) {
        const now = new Date()
        if (now - lastTime >= timeFrame) {
          func(...args)
          lastTime = now
        }
      }
    }
    termListMenu.addEventListener('keyup', onKeyUpLoad)
    disableButton()
    termListMenu.addEventListener('mouseover', e => showTitle(e))
    termListMenu.addEventListener('mouseout', e => hideTitle(e))

    async function useSearchEngine() {
      const { searchInput } = window.dictionaryElements
      const payload = new URLSearchParams()
      const searchQuery = searchInput.value
      const filterSelect = document.querySelector('.filter-select')
      const filterSelectValue = filterSelect.value

      payload.append('q', searchQuery)
      payload.append('field', filterSelectValue)
      const filteredSection = document.querySelectorAll('.indeterminate-cbox')
      filteredSection.forEach(el => {
        if (el.indeterminate && !el.checked) payload.append(el.name, 'false')
        if (el.checked) payload.append(el.name, 'on')
      })
      const hiddenEl = document.getElementById('hidden-dictionary-id')
      const dictionaryId = hiddenEl.value
      const url = `/api/v1/search/editor/${dictionaryId}?` + payload.toString()
      try {
        const { data } = await axios.get(url)
        renderTerms(data)
        if (data.length) {
          const termListLabels = termListMenu.querySelectorAll('label')
          termListLabels[0].click()
        }
      } catch (error) {
        alert(error)
      }
    }

    let unsaved = false
    ce.deleteEntryBtn.addEventListener('click', handleClick)
    // Ajax render entry data
    const messageContainer = document.querySelectorAll('.message-container')
    termListMenu.addEventListener('click', handleClick)

    if (termListMenu.childElementCount > 1) {
      const termListLabels = termListMenu.querySelectorAll('label')
      if (termListLabels.length) termListLabels[0].click()
    }

    function handleClick({ target }) {
      const term = target.closest('.terms-label')
      const versionEl = target.closest('.date-element')
      const deleteEntryEl = target.closest('#delete-entry')
      if (term) {
        if (unsaved) {
          const modalUseBtn = document.getElementById('modal-use-btn')
          const modalCnclBtn = document.getElementById('modal-cancel-btn')
          const modalMain = document.getElementById('alert-text')
          const okBtnText = modalUseBtn.textContent
          const cnclBtnTxt = modalCnclBtn.textContent
          const modalMainTxt = modalMain.textContent
          modalUseBtn.textContent = i18next.t('Shrani')
          modalCnclBtn.textContent = i18next.t('Ne shrani')
          modalMain.textContent = i18next.t(
            'Imate neshranjene spremembe. Ali jih želite shraniti?'
          )
          const alertModal = new bootstrap.Modal(
            document.getElementById('alert-modal')
          )
          alertModal.toggle()

          modalUseBtn.addEventListener('click', () => {
            const termId = term.getAttribute('data-term-id')
            updateEntry(event, termId)
            renderTermData(termId, event)
            activateMe(term)
            disableButton()
            term.classList.add('selected-term-btn')
            modalUseBtn.textContent = okBtnText
            modalCnclBtn.textContent = cnclBtnTxt
            modalMain.textContent = modalMainTxt
          })
          modalCnclBtn.addEventListener('click', () => {
            const termId = term.getAttribute('data-term-id')
            renderTermData(termId, event)
            activateMe(term)
            disableButton()
            term.classList.add('selected-term-btn')
            modalUseBtn.textContent = okBtnText
            modalCnclBtn.textContent = cnclBtnTxt
            modalMain.textContent = modalMainTxt
          })
        } else {
          const termId = term.getAttribute('data-term-id')
          renderTermData(termId, event)
          activateMe(term)
          disableButton()
          term.classList.add('selected-term-btn')
        }
      }
      if (versionEl) {
        const versionId = document.querySelector(
          'input[name="date"]:checked'
        ).value
        const entryEl = document.querySelector('.selected-term-btn')
        const entryId = entryEl.getAttribute('data-term-id')
        if (versionId !== 'latest-version') {
          fetchEntryVersionData(entryId, versionId)
        } else {
          const selectedBtnEl = document.querySelector('.selected-term-btn')
          const termId = selectedBtnEl.getAttribute('data-term-id')
          renderTermData(termId)
        }
      }
      if (deleteEntryEl) {
        const modalUseBtn = document.getElementById('modal-del-btn')
        const modalCnclBtn = document.getElementById('cancel-btn')
        modalUseBtn.textContent = i18next.t('Izbriši')
        modalCnclBtn.textContent = i18next.t('Ne izbriši')
        const alertModal = new bootstrap.Modal(
          document.getElementById('delete-modal')
        )
        alertModal.toggle()

        modalUseBtn.addEventListener('click', () => {
          ajaxDeleteEntry()
        })
      }
    }

    async function fetchEntryVersionData(entryId, versionId) {
      const { formEditContent } = window.dictionaryElements
      try {
        const { data } = await axios.get(
          `/api/v1/entries/${entryId}/version-snapshots/${versionId}`
        )
        const payload = { entry: data.data }
        insertTermData(entryId, payload, data.author)
        const isPublishedEl = payload.entry.is_published
        const info = new FormData(formEditContent)
        info.append('isPublishedEl', isPublishedEl)
        loadPreview(info)
      } catch (error) {
        console.log(error)
        alert('Prišlo je do napake.')
      }
    }

    async function renderTermData(entryId, event) {
      const {
        formEditContent,
        resizeFields,
        previewBtnEl,
        commentsBtnEl,
        showDates
      } = window.dictionaryElements
      event?.preventDefault()
      const dictionaryIdElem = document.getElementById('hidden-dictionary-id')
      const dictctionaryId = dictionaryIdElem.value
      const deleteEntry = document.getElementById('delete-entry')
      try {
        const { data } = await axios.get('/api/v1/entries', {
          params: { id: entryId, dictctionaryId: dictctionaryId }
        })
        insertTermData(entryId, data)
        const isPublishedEl = data.entry.is_published
        const info = new FormData(formEditContent)
        info.append('isPublishedEl', isPublishedEl)
        loadPreview(info)
        changeVersionList(data.entry.versions)
        setLatestVersion(data.entry)
        ce.formEditContent.addEventListener('input', () => (unsaved = true))
        formEditContent.dataset.entryId = entryId
        formEditContent.action = '/api/v1/entries/update'
        previewBtnEl.disabled = false
        previewBtnEl.classList.remove('disabled')
        commentsBtnEl.disabled = false
        commentsBtnEl.classList.remove('disabled')
        formEditContent.action = '/api/v1/entries/update'
        showDates.disabled = false
        duplicateEntry.disabled = false
        deleteEntry.disabled = false
        changeCollapsedContent()
        checkIfValid()
        unsaved = false
      } catch (error) {
        console.log(error)
      } finally {
        resizeFields.forEach(el => autoResize(el))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    function insertTermData(entryId, data, vAuthor) {
      const { newConnectionBtn } = window.dictionaryElements
      const localeOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
      const termName = document.getElementById('term-name')
      const domainsSecondary = $('#domain-secondary')
      const label = document.getElementById('explanation-field')
      const definition = document.getElementById('definition-field')
      const otherField = document.getElementById('other-field')
      const synonym = $('#synonyms-input')
      const linkRow = document.querySelector('.link-row')
      const image = document.getElementById('image-input-field')
      const video = document.getElementById('video-input-field')
      const audio = document.getElementById('audio-input-field')
      const listForeignDefinitions = document.querySelectorAll(
        '.foreign-definition-el'
      )
      const listForeignTerms = document.querySelectorAll('.foreign-term-el')
      const listForeignSynonyms = document.querySelectorAll(
        '.foreign-synonym-el'
      )
      const foreignContentData = data.entry.foreign_entries
      const termIdText = document.getElementsByClassName('term-id')
      const statusEl = document.getElementById('status-edit')
      const publishedCbox = document.getElementById('published-cbox')
      const terminologyCbox = document.getElementById('terminology-cbox')
      const languageCbox = document.getElementById('language-cbox')
      const languageGroup = document.getElementsByClassName('language')
      const homonymSort = document.getElementById('homonym-sort')
      const latestVersionLabel = document.getElementById('latest-version-label')
      deleteContentData(
        domainsSecondary,
        synonym,
        listForeignDefinitions,
        listForeignTerms,
        listForeignSynonyms,
        image,
        audio,
        video,
        linkRow
      )
      if (data.entry.time_modified) {
        const dateModified = new Date(
          data.entry.time_modified
        ).toLocaleDateString('sl-SL', localeOptions)
        latestVersionLabel.textContent = dateModified
      }
      if (entryId)
        for (let i = 0; i < termIdText.length; i++) {
          termIdText[i].textContent = `ID:${entryId}`
        }
      else
        for (let i = 0; i < termIdText.length; i++) {
          termIdText[i].textContent = i18next.t('ID: Ni idja')
        }
      if (vAuthor) {
        ce.authorEl.textContent = vAuthor
        ce.previewAuthor.textContent = vAuthor
      } else {
        ce.authorEl.textContent = data.entry.version_author
        ce.previewAuthor.textContent = data.entry.version_author
      }
      // ce.versionEl.textContent = `Verzija ${data.entry.version}`
      ce.versionEl.textContent = i18next.t('Verzija') + `${data.entry.version}`
      // ce.previewVersion.textContent = `Verzija ${data.entry.version}`
      ce.previewVersion.textContent =
        i18next.t('Verzija') + `${data.entry.version}`
      termName.value = data.entry.term
        ? data.entry.term.replace(/&quot;/g, '"')
        : ''
      if (data.entry.status) {
        if (data.entry.status === 'in_edit') statusEl.value = 'in_edit'
        if (data.entry.status === 'complete') statusEl.value = 'complete'
      }
      if (data.entry.is_published) publishedCbox.checked = true
      else publishedCbox.checked = false
      if (data.entry.is_terminology_reviewed) terminologyCbox.checked = true
      if (!data.entry.is_terminology_reviewed) terminologyCbox.checked = false
      if (data.entry.is_language_reviewed) languageCbox.checked = true
      if (!data.entry.is_language_reviewed) languageCbox.checked = false
      if (data.entry.homonym_sort) homonymSort.value = data.entry.homonym_sort
      if (!data.entry.homonym_sort) homonymSort.value = ''
      if (data.allDomainLabels) {
        data.allDomainLabels.forEach(el => {
          const newOption = new Option(el.name, el.name)
          domainsSecondary.append(newOption).trigger('change')
        })
        if (data.entry.domain_labels) {
          domainsSecondary.val(data.entry.domain_labels)
          domainsSecondary.trigger('change')
        }
      }
      if (label) label.value = data.entry.label ? data.entry.label : ''
      if (definition) {
        definition.value = data.entry.definition ? data.entry.definition : ''
      }
      if (otherField) {
        otherField.value = data.entry.other ? data.entry.other : ''
      }
      if (data.entry.synonyms) {
        data.entry.synonyms.forEach(element => {
          if (element.length) {
            const option = new Option(element, element, true, true)
            synonym.append(option).trigger('change')
          }
        })
      }
      if (data.entry.links) {
        data.entry.links.forEach((el, index) => {
          if (index > 0) {
            addConnectionField(ce.formEditContent, newConnectionBtn, el)
          } else {
            const linkType = linkRow.querySelector('.form-select')
            const linkText = linkRow.querySelector('.mc-field')
            linkType.value = el.type
            linkText.value = el.link
          }
        })
      }
      Array.prototype.forEach.call(languageGroup, child => {
        const childLangId = child.dataset.langaugeId
        if (foreignContentData)
          if (foreignContentData.length) {
            foreignContentData.forEach((el, index) => {
              if (parseInt(el.language_id) === parseInt(childLangId)) {
                if (listForeignDefinitions.length) {
                  const eleToChange = child.querySelector(
                    '.foreign-definition-el'
                  )
                  if (el.definition) {
                    eleToChange.value = el.definition
                  } else {
                    eleToChange.value = ''
                  }
                }
                if (listForeignTerms.length) {
                  if (el.term !== undefined) {
                    el.term.forEach(element => {
                      if (element.length) {
                        // eslint-disable-next-line
                        var selectTerm = $(
                          `[name="foreign[${el.language_id}][term]"]`
                        )
                        const newOption = new Option(
                          element,
                          element,
                          true,
                          true
                        )
                        selectTerm.append(newOption).trigger('change')
                      }
                    })
                  }
                }
                if (listForeignSynonyms.length) {
                  if (el.synonym != null) {
                    el.synonym.forEach(element => {
                      if (element.length) {
                        // eslint-disable-next-line
                        var selectSyn = $(
                          `[name="foreign[${el.language_id}][synonym]"]`
                        )
                        const newOption = new Option(
                          element,
                          element,
                          true,
                          true
                        )
                        selectSyn.append(newOption).trigger('change')
                      }
                    })
                  }
                }
              }
            })
          }
      })

      if (image)
        if (data.entry.image) {
          data.entry.image.forEach((el, index) => {
            if (index > 0) addField(ce.formEditContent, ce.newImageBtn, el)
            else image.value = el
          })
        } else image.value = ''
      if (video)
        if (data.entry.video) {
          data.entry.video.forEach((el, index) => {
            if (index > 0) addField(ce.formEditContent, ce.newVideoBtn, el)
            else video.value = el
          })
        } else video.value = ''
      if (audio)
        if (data.entry.audio) {
          data.entry.audio.forEach((el, index) => {
            if (index > 0) addField(ce.formEditContent, ce.newAudioBtn, el)
            else audio.value = el
          })
        } else audio.value = ''
    }

    async function updateEntry(event, id) {
      const spinnerEl = document.querySelector('.lds-default')
      const saveBtn = document.querySelector('#disabled-submit-btn')
      if (ce.formEditContent.hasAttribute('data-entry-id')) {
        event.preventDefault()
        let entryId = ce.formEditContent.getAttribute('data-entry-id')
        const payload = new URLSearchParams(new FormData(ce.formEditContent))
        payload.set('entryId', entryId)
        try {
          saveBtn.textContent = i18next.t('Shranjujem ...')
          await axios.post(ce.formEditContent.action, payload)
          spinnerEl.classList.remove('d-none')
          saveBtn.classList.add('saved-entry-btn')
          saveBtn.textContent = i18next.t('Shranjeno')
          if (id != null) entryId = id
          ajaxSideMenu(entryId)
        } catch (error) {
          let message = i18next.t('Prišlo je do napake.')
          if (error.response) {
            message = error.response.data
          } else if (error.request) {
            message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
          }
          messageContainer.textContent = message
        }
      } else {
        event.preventDefault()
        const payload = new URLSearchParams(new FormData(ce.formEditContent))
        try {
          saveBtn.textContent = i18next.t('Shranjujem ...')
          const res = await axios.post(ce.formEditContent.action, payload)
          spinnerEl.classList.remove('d-none')
          saveBtn.classList.add('saved-entry-btn')
          saveBtn.textContent = i18next.t('Shranjeno')
          let entryId = res.data.entryId
          if (id != null) entryId = id
          ajaxSideMenu(entryId)
        } catch (error) {
          let message = i18next.t('Prišlo je do napake.')
          if (error.response) {
            message = error.response.data
          } else if (error.request) {
            message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
          }
          messageContainer.textContent = message
        } finally {
          changePageContent('first')
        }
      }
    }

    async function ajaxSideMenu(entryId) {
      const hiddenEl = document.getElementById('hidden-dictionary-id')
      const dictionaryId = hiddenEl.value
      try {
        const { data } = await axios.get('/api/v1/entries/fetch-terms', {
          params: { id: dictionaryId }
        })
        renderTerms(data, entryId)
      } catch (error) {
        let message = i18next.t('Prišlo je do napake.')
        if (error.response) {
          message = error.response.data
        } else if (error.request) {
          message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
        }
        messageContainer.textContent = message
      }
    }

    async function ajaxDeleteEntry() {
      const formData = document.getElementById('form-edit-content')
      const entryId = formData.getAttribute('data-entry-id')
      const selectedEntryEl = document.querySelector('.selected-term-btn')
      const selectedIndex = selectedEntryEl.dataset.index
      try {
        await axios.delete('/api/v1/entries/delete-entry', {
          params: { entryId: entryId }
        })
        await ajaxSideMenu()
        selectNextEntry(selectedIndex)
      } catch (error) {
        console.log(error)
        const message = i18next.t('Prišlo je do napake.')
        messageContainer.textContent = message
      }
    }

    function renderTerms(data, id) {
      const termListMenu = document.getElementById('term-list')
      const linkLabel = document.querySelectorAll(
        '.d-flex .justify-content-between'
      )
      const spinnerEl = document.querySelector('.lds-default')
      spinnerEl.classList.add('d-none')
      const pagination = document.getElementById('data-length')
      linkLabel.forEach(el => el.remove())
      const allTerms = data

      pagination.textContent = data.length
      const paginationEl = document.getElementById('pagination-content')

      allTerms.forEach((el, index) => {
        const divEl = document.createElement('div')
        const labelElement = document.createElement('label')
        const spanStatusEl = document.createElement('span')
        labelElement.tabIndex = '0'
        labelElement.title = ''
        labelElement.dataset.bsCustomClass = 'label-tooltip'
        labelElement.dataset.bsOriginalTitle = ''
        divEl.className = 'd-flex justify-content-between'
        spanStatusEl.className = 'me-4'
        spanStatusEl.textContent = el.commentActivityIndicator
        labelElement.dataset.index = index
        const sloTerm = el.term ? el.term.replace(/&quot;/g, '"') : ''
        if (!el.term) {
          labelElement.className =
            'terms-label not-valid-not-published btn p-2 ms-2 me-3 text-truncate justify-content-start d-inline-block'
          if (el.foreignTerm) {
            if (el.foreignTerm.length) {
              labelElement.textContent = `#${el.foreignTerm.replace(
                /&quot;/g,
                '"'
              )}`
            } else labelElement.textContent = i18next.t('[ni termina]')
          } else labelElement.textContent = i18next.t('[ni termina]')
        } else {
          if (el.isValid) {
            if (el.isPublished) {
              labelElement.textContent = `${sloTerm} ${
                el.homonymSort ? '(' + el.homonymSort + ')' : ''
              }`
              labelElement.className =
                'terms-label term-good-btn btn p-2 ms-2 me-3 text-truncate justify-content-start d-inline-block'
            } else {
              labelElement.className =
                'terms-label btn p-2 ms-2 me-3 text-truncate justify-content-start d-inline-block'
              labelElement.textContent = `${sloTerm} ${
                el.homonymSort ? '(' + el.homonymSort + ')' : ''
              }`
            }
          } else {
            labelElement.textContent = `${sloTerm} ${
              el.homonymSort ? '(' + el.homonymSort + ')' : ''
            }`
            labelElement.className =
              'terms-label not-valid-not-published btn p-2 ms-2 me-3 text-truncate justify-content-start d-inline-block'
          }
        }

        labelElement.dataset.termId = el.id
        divEl.appendChild(labelElement)
        divEl.appendChild(spanStatusEl)
        termListMenu.insertBefore(divEl, paginationEl)
      })
      if (id != null) {
        const termListChildren = document.querySelectorAll('.terms-label')
        termListChildren.forEach(el => {
          if (parseInt(id) === parseInt(el.getAttribute('data-term-id'))) {
            activateMe(el)
            return renderTermData(id)
          }
        })
      }
    }
  }

  if (/\/slovarji\/\d+\/podrocne-oznake/.test(currentPagePath)) {
    const { offsetMain } = window.dictionaryElements
    const noSubareas = document.getElementById('no-subareas-section')
    offsetMain.addEventListener('click', handleAreasClick)
    ce.inputAreaEl = document.getElementById('subarea-input')
    ce.inputAreaEl.addEventListener('input', inputFieldsChecker)
    ce.domainLabelsForm = document.getElementById('dictionary-domain-labels')
    ce.domainLabelsForm.addEventListener('submit', domainLabelsToDb)
    const addAreaBtn = document.getElementById('add-area')
    addAreaBtn.addEventListener('click', () => subareasContent(noSubareas))
    addAreaBtn.addEventListener('click', enableButton)
    const formLabes = document.getElementById('dictionary-domain-labels')
    formLabes.addEventListener('input', enableButton)
    const useBtn = document.getElementById('modal-use-btn')
    useBtn.addEventListener('click', enableButton)
    const dictSideMenu = document.querySelector('.admin-nav-content')
    unsavedData(ce.domainLabelsForm, dictSideMenu, domainLabelsToDb)
    async function domainLabelsToDb(event) {
      const data = domainLabelsForChange()
      const idEl = document.getElementById('subareas-dict-id')
      const id = idEl.value
      event.preventDefault()

      try {
        await axios.post('/api/v1/dictionaries/update-domain-labels', {
          params: { payload: data, dictionaryId: id }
        })
      } catch (error) {
        console.log(error)
      } finally {
        location.reload(true)
      }
    }

    function subareasContent(el) {
      const subareasInfo = document.getElementById('subareas-info')
      if (el) {
        if (subareasInfo) subareasInfo.classList.add('d-none')
        el.classList.remove('d-none')
      }
    }

    const resultsListEl = document.getElementById('page-results')
    const dictionaryId = document.getElementById('subareas-dict-id').value

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
      // const url = `/api/v1/dictionaries/${dictionaryId}/listDomainLabels?p=${page}`
      const url = `/api/v1/dictionaries/${dictionaryId}/domainLabels?q=${queryBattery}&p=${page}`
      // const { data } = await axios.get(url)
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
      if (window.location.pathname.includes('podrocne-oznake')) {
        queryBattery = document.getElementById('input-search').value
        // console.log(queryBattery)
        axios
          .get(
            `/api/v1/dictionaries/${
              window.location.pathname.split('/')[2]
            }/domainLabels?q=${queryBattery}&p=${1}`
          )
          .then(result => {
            updatePaginationOnFilter(result)
            replaceContainer('page-results', result.data)
          })
      }
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
    /// //
  }

  if (/\/slovarji\/\d+\/napredno/.test(currentPagePath)) {
    const dictionaryId = document.getElementById('adv-dictionary-id').value
    const indexEntriesBtn = document.getElementById('index-entries-btn')
    const deleteAllEntriesBtn = document.getElementById(
      'adv-delete-all-entries'
    )
    const deleteDictionaryBtn = document.getElementById('adv-delete-dictionary')
    const publishAllEntriesBtn = document.getElementById(
      'adv-publish-all-entries'
    )
    if (document.getElementById('index-entries')) {
      const indexEntries = new bootstrap.Modal(
        document.getElementById('index-entries')
      )
    }
    const deleteEntriesModal = new bootstrap.Modal(
      document.getElementById('delete-entries')
    )
    const deleteDictionaryModal = new bootstrap.Modal(
      document.getElementById('delete-dictionary')
    )
    const publishEntriesModal = new bootstrap.Modal(
      document.getElementById('publish-entries')
    )
    const modalUseBtns = document.querySelectorAll('.modal-use-btn')

    const deleteEntriesRes = new bootstrap.Modal(
      document.getElementById('delete-entries-res')
    )
    const deleteDictionaryRes = new bootstrap.Modal(
      document.getElementById('delete-dict-res')
    )
    const publishEntriesRes = new bootstrap.Modal(
      document.getElementById('publish-entries-res')
    )

    let reqUrl, reqMethod, resType

    // TODO: Aljaž to Luka: Section down below is where index API will be called. (From pug: express/views/pages/admin/dictionary-advanced.pug)
    // indexEntriesBtn.addEventListener('click', () =>
    //   showConfirmation(`url`, 'index', indexEntries)
    // )
    deleteAllEntriesBtn.addEventListener('click', () =>
      showConfirmation(
        `/api/v1/dictionaries/${dictionaryId}/entries/all`,
        'delete',
        deleteEntriesModal,
        deleteEntriesRes
      )
    )
    deleteDictionaryBtn.addEventListener('click', () =>
      showConfirmation(
        `/api/v1/dictionaries/${dictionaryId}`,
        'delete',
        deleteDictionaryModal,
        deleteDictionaryRes
      )
    )
    publishAllEntriesBtn.addEventListener('click', () =>
      showConfirmation(
        `/api/v1/dictionaries/${dictionaryId}/entries/all/publish`,
        'put',
        publishEntriesModal,
        publishEntriesRes
      )
    )

    function showConfirmation(url, method, alertType, responseType) {
      reqUrl = url
      reqMethod = method
      alertType.show()
      resType = responseType
    }

    modalUseBtns.forEach(el => el.addEventListener('click', sendAjaxReq))

    async function sendAjaxReq() {
      const modalSpinner = new bootstrap.Modal(
        document.getElementById('modal-spinner')
      )
      try {
        modalSpinner.toggle()
        await axios[reqMethod](reqUrl)
        resType.show()
        modalSpinner.hide()
      } catch (error) {
        console.log(error)
      }
    }
  }
}

function adjustOffsetBy() {
  const { offsetMain, fixedTopSection } = window.dictionaryElements
  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
  // const adminNavMobile = document.getElementsByClassName('admin-nav')
  const headerPadding = document.getElementById('header-padding')
  if (
    (!/\/slovarji\/\d+\/vsebina/.test(currentPagePath) &&
      document.body.clientWidth < 1200) ||
    (/\/slovarji\/\d+\/vsebina/.test(currentPagePath) &&
      document.body.clientWidth < 768)
  ) {
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
      offsetMain.style.paddingTop = `${
        referenceHeight + offsetHeaderHeight - 10
      }px`
    }
  }
}

function hideAndShowHeader() {
  const { textDescription, headerTitle } = window.dictionaryElements
  if (!/\/slovarji\/\d+\/vsebina/.test(currentPagePath)) {
    if (document.documentElement.scrollTop < 50) {
      textDescription.style.display = 'block'
      headerTitle.style.display = 'block'
    } else {
      textDescription.style.display = 'none'
      headerTitle.style.display = 'none'
    }
  }
}

function mobileMoveContent() {
  if (!/\/slovarji\/\d+\/vsebina/.test(currentPagePath)) {
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
        mobileRightHolder.appendChild(primaryButton)
        adminNavMobileEl.classList.add('align-items-center')
        adminNavMobileEl.classList.add('justify-content-between')
        // primaryButton.style.height = '28px'
        // primaryButton.style.width = '99px'
        // primaryButton.style.marginRight = '10px'
        primaryButton.style.whiteSpace = 'nowrap'
      }
      navTitle.textContent = siteHeadingTextContent
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

      if (
        currentPagePath.includes('slovarji') &&
        !currentPagePath.includes('admin')
      )
        navTitle.textContent = i18next.t('Urejanje')
      else navTitle.textContent = i18next.t('Administracija')
      siteHeading.style.display = 'block'
    }
  }
}

function checkIfValid() {
  const { formEditContent } = window.dictionaryElements
  const entryId = formEditContent.getAttribute('data-entry-id')
  if (entryId) {
    const info = new FormData(formEditContent)
    const langList = []
    const termList = []
    let isValid
    let hasForeignTerm = false
    info.forEach(function (value, key) {
      if (key.startsWith('foreign') && key.endsWith('[code]'))
        langList.push(key)
      if (key.startsWith('foreign') && key.endsWith('[term]'))
        termList.push(key)
    })
    if (langList.length) {
      termList.forEach(el => {
        if (info.get(el).length) {
          hasForeignTerm = true
        }
      })
    }
    const messageContainer = document.querySelectorAll('.message-container')
    const errorType1 = document.querySelectorAll('.error-type-1')
    const errorType2 = document.querySelectorAll('.error-type-2')
    const noteSectionLine = document.querySelector('.note-section-line')
    const termLength = !!info.get('term').length
    let defLength
    if (info.has('definition')) defLength = !!info.get('definition').length
    if (termLength && (defLength || hasForeignTerm)) {
      messageContainer.forEach(el => el.classList.add('d-none'))
      isValid = true
      noteSectionLine.classList.remove('d-none')
      enablePublishBtn(isValid)
    } else {
      messageContainer.forEach(el => el.classList.remove('d-none'))
      isValid = false
      noteSectionLine.classList.add('d-none')
      enablePublishBtn(isValid)
    }
    if (!termLength) errorType1.forEach(el => el.classList.remove('d-none'))
    else errorType1.forEach(el => el.classList.add('d-none'))
    if (defLength || hasForeignTerm)
      errorType2.forEach(el => el.classList.add('d-none'))
    else errorType2.forEach(el => el.classList.remove('d-none'))
  }
}

function enablePublishBtn(isValid) {
  const publishedCbox = document.getElementById('published-cbox')
  const canPublishEl = document.getElementById('can-publish-entries-in-edit')
  const canPublishElValue = canPublishEl.checked
  const statusEl = document.getElementById('status-edit')
  const statusElValue = statusEl.value
  if (statusElValue === 'in_edit')
    if (canPublishElValue && isValid) publishedCbox.disabled = false
    else publishedCbox.disabled = true
  if (statusElValue === 'complete')
    if (isValid) publishedCbox.disabled = false
    else publishedCbox.disabled = true
  if (statusElValue === 'suggestion') publishedCbox.disabled = true
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
  spanInputNameTxtSlo.className = 'input-name-txt'
  spanInputNameTxtSlo.textContent = i18next.t('NOVO PODPODROČJE (slovensko)')
  spanInputNameTxtEng.className = 'input-name-txt mt-4'
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
  spanDeleteAreaBtn.addEventListener('click', deleteField)
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

function deleteField({ target }) {
  const element = target.closest('.added-field')
  const alertModal = new bootstrap.Modal(document.getElementById('alert-modal'))
  alertModal.toggle()
  const modalUseBtn = document.getElementById('modal-use-btn')
  modalUseBtn.addEventListener('click', () => {
    element.remove()
    alertModal.hide()
  })
}

function checkBoxLanguageChecker() {
  const {
    checkLanguageGroup,
    languagesInput,
    definitionLanguageSubgroup,
    terminLanguageSubgroup,
    synonymLanguageSubgroup,
    definitionCheckBox
  } = window.dictionaryElements

  if (checkLanguageGroup.checked) {
    languagesInput.disabled = false
    terminLanguageSubgroup.checked = true
    definitionLanguageSubgroup.classList.remove('disabled-input')
    synonymLanguageSubgroup.classList.remove('disabled-input')
    definitionCheckBox.classList.remove('disabled-input')
  } else {
    $('.without-addition').val(null).trigger('change')
    languagesInput.disabled = true
    terminLanguageSubgroup.checked = false
    definitionLanguageSubgroup.checked = false
    definitionLanguageSubgroup.classList.add('disabled-input')
    synonymLanguageSubgroup.checked = false
    synonymLanguageSubgroup.classList.add('disabled-input')
    definitionCheckBox.classList.add('disabled-input')
  }
}

function checkBoxDefinitionChecker() {
  const { checkLanguageGroup, definitionCheckBox } = window.dictionaryElements

  if (definitionCheckBox.checked === false) {
    checkLanguageGroup.classList.add('disabled-input')
  }

  if (definitionCheckBox.checked === true) {
    checkLanguageGroup.classList.remove('disabled-input')
  }
}

function enableButton() {
  const disabledBtn = document.getElementById('disabled-submit-btn')
  disabledBtn.disabled = false
  if (disabledBtn.classList.contains('saved-entry-btn')) {
    disabledBtn.classList.remove('saved-entry-btn')
    disabledBtn.textContent = 'Shrani'
  }
}

function disableButton() {
  const disabledBtn = document.getElementById('disabled-submit-btn')
  disabledBtn.disabled = true
  if (disabledBtn.classList.contains('saved-entry-btn')) {
    disabledBtn.classList.remove('saved-entry-btn')
    disabledBtn.textContent = 'Shrani'
  }
}

function changePageContent(el) {
  const {
    previewBtnEl,
    editBtnEl,
    commentsBtnEl,
    commentsButtonsGroup,
    previewButtonsGroup,
    showDates,
    previewSection,
    editSection,
    commentsSection,
    classicOverview,
    // selectedOverview,
    selectAllDates,
    btnSaveIcon,
    formEditContent,
    noEntriesText,
    newEntryBtn,
    entryPreviewSection,
    resizeFields,
    authorEl,
    versionEl,
    previewVersion,
    previewAuthor,
    termInputField
  } = window.dictionaryElements
  const info = new FormData(formEditContent)
  const spanFilterText = document.getElementById('span-filter')
  const duplicateEntry = document.getElementById('duplicate-entry')
  const deleteEntry = document.getElementById('delete-entry')
  const termIdText = document.querySelectorAll('.term-id')
  const selectedEntry = document.querySelector('.selected-term-btn')
  const collapsedText = document.querySelectorAll('.collapsed-text')
  const collapsableBtn = document.querySelectorAll('.collapsable-entry-btn')
  const addedFields = document.querySelectorAll('.added-field')
  const collapsibleData = document.querySelectorAll('.collapsible-data')
  const responseModal = new bootstrap.Modal(
    document.getElementById('duplicate-modal'),
    { keyboard: false }
  )
  switch (el) {
    case 'content-preview':
      loadPreview(info)
      previewBtnEl.classList.add('active-site-link')
      editBtnEl.classList.remove('active-site-link')
      commentsBtnEl.classList.remove('active-site-link')
      previewButtonsGroup.classList.remove('d-none')
      commentsButtonsGroup.classList.add('d-none')
      previewSection.classList.remove('d-none')
      editSection.classList.add('d-none')
      commentsSection.classList.add('d-none')
      break
    case 'content-edit':
      editBtnEl.classList.add('active-site-link')
      previewBtnEl.classList.remove('active-site-link')
      commentsBtnEl.classList.remove('active-site-link')
      previewButtonsGroup.classList.remove('d-none')
      commentsButtonsGroup.classList.add('d-none')
      previewSection.classList.add('d-none')
      editSection.classList.remove('d-none')
      commentsSection.classList.add('d-none')
      resizeFields.forEach(el => autoResize(el))
      break
    case 'content-comments':
      commentsBtnEl.classList.add('active-site-link')
      editBtnEl.classList.remove('active-site-link')
      previewBtnEl.classList.remove('active-site-link')
      previewButtonsGroup.classList.add('d-none')
      commentsButtonsGroup.classList.remove('d-none')
      previewSection.classList.add('d-none')
      editSection.classList.add('d-none')
      commentsSection.classList.remove('d-none')
      break
    case 'show-dates':
      window.scrollTo({ top: 0, behavior: 'smooth' })
      showDates.classList.remove('btn-secondary')
      showDates.classList.add('btn-primary')
      showDates.firstChild.src = '/images/fi_calendar-white.svg'
      showDates.id = 'hide-dates'
      showDates.children[0].setAttribute(
        'data-bs-original-title',
        'Skrij verzije'
      )
      break
    case 'hide-dates':
      showDates.classList.remove('btn-primary')
      showDates.classList.add('btn-secondary')
      showDates.children[0].setAttribute(
        'data-bs-original-title',
        'Prikaži verzije'
      )
      // selectedOverview.classList.add('d-none')
      classicOverview.classList.remove('d-none')
      selectAllDates.forEach(el => (el.checked = false))
      showDates.firstChild.src = '/images/fi_blue-calendar.svg'
      showDates.id = 'show-dates'
      btnSaveIcon.firstChild.src = '/images/fi_save.svg'
      btnSaveIcon.children[1].textContent = 'Shrani'
      btnSaveIcon.id = 'btn-save-icon'
      break
    case 'new-entry-btn': {
      // formEditContent.reset()

      formEditContent.removeAttribute('data-entry-id')
      formEditContent.action = '/api/v1/entries/create'
      if (editSection.classList.contains('d-none'))
        editSection.classList.remove('d-none')
      if (noEntriesText)
        if (!noEntriesText.classList.contains('d-none'))
          noEntriesText.classList.add('d-none')
      if (editBtnEl.classList.contains('disabled')) {
        editBtnEl.classList.remove('disabled')
        editBtnEl.disabled = false
      }
      if (newEntryBtn.dataset.term) {
        previewBtnEl.classList.add('disabled')
        previewBtnEl.disabled = true
        delete newEntryBtn.dataset.term
      }
      // editBtnEl.click()
      editBtnEl.classList.add('active-site-link')
      previewBtnEl.classList.remove('active-site-link')
      commentsBtnEl.classList.remove('active-site-link')
      previewButtonsGroup.classList.remove('d-none')
      commentsButtonsGroup.classList.add('d-none')
      previewSection.classList.add('d-none')
      editSection.classList.remove('d-none')
      commentsSection.classList.add('d-none')
      resizeFields.forEach(el => autoResize(el))
      authorEl.textContent = ''
      versionEl.textContent = 'Verzija 1'
      previewAuthor.textContent = ''
      previewVersion.textContent = 'Verzija 1'
      termIdText.forEach(el => (el.textContent = 'ID:'))
      commentsBtnEl.disabled = true
      commentsBtnEl.classList.add('disabled')
      showDates.disabled = true
      duplicateEntry.disabled = true
      deleteEntry.disabled = true
      changeCollapsedContent()
      if (addedFields.length) addedFields.forEach(el => el.remove())
      const messageContainer = document.querySelectorAll('.message-container')
      messageContainer.forEach(el => el.classList.add('d-none'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      selectedEntry.classList.remove('selected-term-btn')
      $('.multiple').val(null).trigger('change')
      $('.without-dropdown').val(null).trigger('change')
      // editBtnEl.click()
      // termInputField.addEventListener('focus', () =>
      //   showMCButtons(termInputField, 'link')
      // )
      termInputField.focus()
      termInputField.click()

      break
    }
    case 'first':
      if (entryPreviewSection)
        if (entryPreviewSection.classList.contains('d-none'))
          entryPreviewSection.classList.remove('d-none')
      if (!previewBtnEl.classList.contains('d-none'))
        previewBtnEl.classList.remove('d-none')
      previewBtnEl.disabled = false
      previewBtnEl.classList.remove('disabled')
      commentsBtnEl.disabled = false
      commentsBtnEl.classList.remove('disabled')
      formEditContent.action = '/api/v1/entries/update'
      showDates.disabled = false
      duplicateEntry.disabled = false
      deleteEntry.disabled = false
      previewBtnEl.click()
      break
    case 'duplicate-entry':
      formEditContent.removeAttribute('data-entry-id')
      formEditContent.action = '/api/v1/entries/create'
      if (editSection.classList.contains('d-none'))
        editSection.classList.remove('d-none')
      if (noEntriesText)
        if (!noEntriesText.classList.contains('d-none'))
          noEntriesText.classList.add('d-none')
      if (editBtnEl.classList.contains('disabled')) {
        editBtnEl.classList.remove('disabled')
        editBtnEl.disabled = false
      }
      if (newEntryBtn.dataset.term) {
        previewBtnEl.classList.add('disabled')
        previewBtnEl.disabled = true
        delete newEntryBtn.dataset.term
      }
      authorEl.textContent = ''
      versionEl.textContent = 'Verzija 1'
      previewAuthor.textContent = ''
      previewVersion.textContent = 'Verzija 1'
      termIdText.forEach(el => (el.textContent = 'ID:'))
      commentsBtnEl.disabled = true
      commentsBtnEl.classList.add('disabled')
      showDates.disabled = true
      deleteEntry.disabled = true
      changeCollapsedContent()
      editBtnEl.click()
      termInputField.focus()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      selectedEntry.classList.remove('selected-term-btn')
      editBtnEl.click()
      responseModal.toggle()
      duplicateEntry.disabled = true
      break
    case 'true':
      spanFilterText.classList.remove('normal-gray-label')
      spanFilterText.classList.add('small-blue-text')
      break
    case 'false':
      spanFilterText.classList.remove('small-blue-text')
      spanFilterText.classList.add('normal-gray-label')
      break
    case 'collapse-hidden':
      collapsibleData.forEach(e => e.classList.remove('opened-row-data'))
      collapsedText.forEach(el => el.classList.remove('d-none'))
      changeCollapsedContent()
      collapsableBtn.forEach(el => el.classList.remove('entry-uncollapsed'))
      collapsableBtn.forEach(el => el.classList.add('entry-collapsed'))
      break
    case 'collapse-shown':
      collapsibleData.forEach(e => e.classList.add('opened-row-data'))
      collapsableBtn.forEach(el => el.classList.remove('entry-collapsed'))
      collapsableBtn.forEach(el => el.classList.add('entry-uncollapsed'))
      break
    case 'collapse-show':
      collapsibleData.forEach(e => e.classList.add('opened-row-data'))
      collapsedText.forEach(el => el.classList.add('d-none'))
      break
  }
}

function loadPreview(info) {
  const previewDomainSec = document.getElementById('preview-domain-secondary')
  const previewLabel = document.getElementById('preview-label')
  const previewDefinition = document.getElementById('preview-definition')
  const previewSynonym = document.getElementById('preview-synonym')
  const previewLinkedTerms = document.getElementById('preview-linked-term')
  const previewOther = document.getElementById('preview-other-field')
  const selectedOther = document.getElementById('selected-other-field')
  const previewImages = document.getElementById('preview-images')
  const previewAudio = document.getElementById('preview-audio')
  const previewVideos = document.getElementById('preview-video')
  const selectedTerm = document.getElementById('selected-term')
  const selectedDomainSec = document.getElementById('selected-domain-secondary')
  const selectedLabel = document.getElementById('selected-label')
  const selectedDef = document.getElementById('selected-definition')
  const selectedSynonyms = document.getElementById('selected-synonyms')
  const linkedTerms = document.getElementById('linked-terms')
  const listForeignTerm = document.querySelectorAll('.preview-f-term')
  const listForeignDefinitions = document.querySelectorAll('.preview-f-def')
  const listForeignSynonyms = document.querySelectorAll('.preview-f-synonym')
  const selectedImages = document.getElementById('selected-images')
  const selectedAudio = document.getElementById('selected-audio')
  const selectedVideo = document.getElementById('selected-video')
  const selectedStatus = document.getElementById('status-overview')
  const publishedOverview = document.getElementById('published-overview')
  const terminologyOverview = document.getElementById('terminology-overview')
  const languageOverview = document.getElementById('language-overview')
  const previewHomonym = document.getElementById('preview-homonym')
  const data = {}
  for (const [key, value] of info.entries()) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      data[key] = value
      continue
    }
    if (!Array.isArray(data[key])) {
      data[key] = [data[key]]
    }
    data[key].push(value)
  }
  const foreignTerm = Object.keys(data).filter(
    k => k.startsWith('foreign') && k.endsWith('[term]')
  )
  const foreignDef = Object.keys(data).filter(
    k => k.startsWith('foreign') && k.endsWith('[definition]')
  )
  const foreignSyn = Object.keys(data).filter(
    k => k.startsWith('foreign') && k.endsWith('[synonym]')
  )
  if (data.links) linkedTerms.innerHTML = ''
  removeOldMedia(selectedImages, selectedAudio, selectedVideo)
  if (data.status) {
    if (data.status === 'in_edit') {
      selectedStatus.value = 'in-editing'
    }
    if (data.status === 'complete') {
      selectedStatus.value = 'edited'
    }
  }
  if (data.isPublishedEl === 'true') publishedOverview.checked = true
  if (data.isPublishedEl === 'false') publishedOverview.checked = false
  if (data.isTerminologyReviewed) terminologyOverview.checked = true
  if (!data.isTerminologyReviewed) terminologyOverview.checked = false
  if (data.isLanguageReviewed) languageOverview.checked = true
  if (!data.isLanguageReviewed) languageOverview.checked = false
  if (data.term.length > 0) selectedTerm.innerHTML = data.term
  else selectedTerm.innerHTML = ''
  if (data.homonymSort) {
    previewHomonym.value = `${data.homonymSort}`
  } else {
    previewHomonym.value = ''
  }
  if (previewLabel)
    if (data.label.length) {
      changeClasses(previewLabel, 'show')
      // selectedLabel.textContent = data.label
      selectedLabel.innerHTML = data.label
    } else changeClasses(previewLabel, 'hide')
  if (previewOther)
    if (data.other) {
      if (data.other.length) {
        changeClasses(previewOther, 'show')
        // selectedLabel.textContent = data.label
        selectedOther.innerHTML = data.other
      }
    } else changeClasses(previewOther, 'hide')
  if (previewDefinition)
    if (data.definition) {
      changeClasses(previewDefinition, 'show')
      // selectedDef.textContent = data.definition
      selectedDef.innerHTML = data.definition
    } else changeClasses(previewDefinition, 'hide')
  if (previewDomainSec)
    if (data.domainLabels) {
      changeClasses(previewDomainSec, 'show')
      let items
      if (!Array.isArray(data.domainLabels)) items = [data.domainLabels]
      else items = data.domainLabels
      selectedDomainSec.textContent = `${items.join(', ')}`
    } else changeClasses(previewDomainSec, 'hide')
  if (previewSynonym)
    if (data.synonyms) {
      changeClasses(previewSynonym, 'show')
      let items
      if (!Array.isArray(data.synonyms)) items = [data.synonyms]
      else items = data.synonyms
      selectedSynonyms.innerHTML = `${items.join(', ')}`
    } else changeClasses(previewSynonym, 'hide')
  if (previewImages)
    if (data.image) {
      if (typeof data.image === 'object') {
        data.image.forEach((el, index) => {
          if (index === data.image.length - 1) {
            renderLinks(selectedImages, el, 'last')
          } else renderLinks(selectedImages, el)
        })
      } else renderLinks(selectedImages, data.image, 'last')
      changeClasses(previewImages, 'show')
    } else changeClasses(previewImages, 'hide')
  if (previewAudio)
    if (data.audio) {
      if (typeof data.audio === 'object') {
        data.audio.forEach((el, index) => {
          if (index === data.audio.length - 1) {
            renderLinks(selectedAudio, el, 'last')
          } else renderLinks(selectedAudio, el)
        })
      } else renderLinks(selectedAudio, data.audio, 'last')
      changeClasses(previewAudio, 'show')
    } else changeClasses(previewAudio, 'hide')
  if (previewVideos)
    if (data.video) {
      if (typeof data.video === 'object') {
        data.video.forEach((el, index) => {
          if (index === data.video.length - 1) {
            renderLinks(selectedVideo, el, 'last')
          } else renderLinks(selectedVideo, el)
        })
      } else renderLinks(selectedVideo, data.video, 'last')
      changeClasses(previewVideos, 'show')
    } else changeClasses(previewVideos, 'hide')
  if (previewLinkedTerms)
    if (data.links) {
      changeClasses(previewLinkedTerms, 'show')
      const linksArr = createLinksObj(data.type, data.links)
      for (const i in linksArr) {
        for (const key in linksArr[i]) {
          const keyTxt =
            linksArr[i][key] === 'narrow'
              ? 'NT:'
              : linksArr[i][key] === 'broader'
              ? 'BT:'
              : ''
          linkedTerms.innerHTML += keyTxt + ' ' + key
          if (parseInt(i) !== linksArr.length - 1) linkedTerms.innerHTML += ', '
          else linkedTerms.innerHTML += ' '
        }
      }
    } else changeClasses(previewLinkedTerms, 'hide')

  if (foreignTerm) {
    listForeignTerm.forEach(el => (el.textContent = ''))
    foreignTerm.forEach(el => {
      if (listForeignTerm.length) {
        listForeignTerm.forEach((element, index) => {
          if (el === element.id) {
            let items
            if (!Array.isArray(data[el])) items = [data[el]]
            else items = data[el]
            element.innerHTML = `${items.join(', ')}`
          }
        })
      }
    })
    listForeignTerm.forEach(el => {
      if (el.textContent.length)
        changeClasses(el.parentElement.parentElement, 'show')
      else changeClasses(el.parentElement.parentElement, 'hide')
    })
  }
  if (foreignDef) {
    listForeignDefinitions.forEach(el => (el.textContent = ''))
    foreignDef.forEach(el => {
      if (listForeignDefinitions.length) {
        listForeignDefinitions.forEach((element, index) => {
          if (el === element.id) {
            element.innerHTML = data[el]
          }
        })
      }
    })
    listForeignDefinitions.forEach(el => {
      if (el.textContent.length)
        changeClasses(el.parentElement.parentElement, 'show')
      else changeClasses(el.parentElement.parentElement, 'hide')
    })
  }

  if (foreignSyn) {
    listForeignSynonyms.forEach(el => (el.textContent = ''))
    foreignSyn.forEach(el => {
      if (listForeignSynonyms.length) {
        listForeignSynonyms.forEach((element, index) => {
          if (el === element.id) {
            let items
            if (!Array.isArray(data[el])) items = [data[el]]
            else items = data[el]
            element.innerHTML = `${items.join(', ')}`
          }
        })
      }
    })
    listForeignSynonyms.forEach(el => {
      if (el.textContent.length)
        changeClasses(el.parentElement.parentElement, 'show')
      else changeClasses(el.parentElement.parentElement, 'hide')
    })
  }

  const languageContainers = document.querySelectorAll('.preview-one-language')
  const langLine = document.querySelector('.start-line')
  if (languageContainers) {
    const arrLang = Array.from(languageContainers)
    arrLang.forEach(el => {
      const arrChildren = Array.from(el.children)
      if (arrChildren.filter(e => e.classList.contains('d-none')).length > 2) {
        el.classList.add('d-none')
      } else el.classList.remove('d-none')
    })
    if (
      arrLang.filter(el => el.classList.contains('d-none')).length >=
      arrLang.length
    ) {
      langLine.classList.add('d-none')
    } else langLine.classList.remove('d-none')
  }
  changeCollapsedContent()
}

function createLinksObj(type, links) {
  let dataTypeArr = []
  let linkArr = []
  if (Array.isArray(type)) dataTypeArr = type
  else dataTypeArr.push(type)
  if (Array.isArray(links)) linkArr = links
  else linkArr.push(links)

  const linksArr = dataTypeArr.map(function (obj, index) {
    const myobj = {}
    myobj[linkArr[index]] = obj
    return myobj
  })
  return linksArr
}

function changeVersionList(versions) {
  const allDatesEl = document.querySelector('.btn-dates-group')
  const allDatesArr = Array.from(allDatesEl.children)
  allDatesArr.forEach(el => {
    if (!el.classList.contains('latest-version-el')) {
      el.remove()
    }
  })
  const localeOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }
  if (versions.length) {
    versions
      .slice()
      .reverse()
      .forEach(el => {
        const dateRadio = document.createElement('input')
        const dateLabel = document.createElement('label')
        dateRadio.className = 'btn-check date-element'
        dateRadio.type = 'radio'
        dateRadio.name = 'date'
        dateLabel.className = 'btn-outline-dates btn ms-0 date-element'
        dateLabel.dataset.bsCustomClass = 'dark-gray-tooltip'
        dateLabel.dataset.bsPlacement = 'bottom'
        dateLabel.dataset.bsToggle = 'tooltip'
        dateLabel.dataset.bsHtml = 'true'
        const date = new Date(el.version_time).toLocaleDateString(
          'sl-SL',
          localeOptions
        )
        dateLabel.textContent = date
        dateRadio.id = `date${el.version}`
        dateRadio.value = `${el.version}`
        dateLabel.htmlFor = `date${el.version}`
        // new bootstrap.Tooltip(dateLabel, {
        //   title: `Verzija ${el.version} <br> Avtor: ${el.version_author}`
        // })
        // eslint-disable-next-line
        new bootstrap.Tooltip(dateLabel, {
          title:
            i18next.t('Verzija:') +
            ` ${el.version} <br>` +
            i18next.t('Avtor:') +
            ` ${el.version_author}`
        })
        allDatesEl.append(dateRadio)
        allDatesEl.appendChild(dateLabel)
      })
  }
}

function setLatestVersion(data) {
  const latestVersionLabel = document.getElementById('latest-version-label')
  // const tooltip = new bootstrap.Tooltip(latestVersionLabel, {
  //   title: `Verzija: ${data.version} <br> Avtor: ${data.version_author}`,
  //   customClass: 'dark-gray-tooltip',
  //   html: true,
  //   placement: 'bottom'
  // })
  // eslint-disable-next-line
  const tooltip = new bootstrap.Tooltip(latestVersionLabel, {
    title:
      i18next.t('Verzija:') +
      ` ${data.version} <br>` +
      i18next.t('Avtor:') +
      ` ${data.version_author}`,
    customClass: 'dark-gray-tooltip',
    html: true,
    placement: 'bottom'
  })
  // Can't think of any better solution for the not disapearing label bug
  const dateArea = document.querySelector('.date-scroller')
  dateArea.addEventListener('click', () => tooltip.hide())
}

function removeOldMedia(images, audio, video) {
  if (images !== null || audio !== null || video !== null) {
    const media = [images, audio, video]
    media.forEach(el => {
      const arrChildren = Array.from(el.childNodes)
      arrChildren.forEach(el => {
        el.remove()
      })
    })
  }
}

function changeClasses(el, elClass) {
  if (elClass === 'show') {
    if (el.classList.contains('d-none')) el.classList.remove('d-none')
    if (!el.classList.contains('d-flex')) el.classList.add('d-flex')
  }

  if (elClass === 'hide') {
    if (el.classList.contains('d-flex')) el.classList.remove('d-flex')
    if (!el.classList.contains('d-none')) el.classList.add('d-none')
  }
}

function renderLinks(targetEl, link, isLast) {
  const aElement = document.createElement('a')
  aElement.href = link
  aElement.textContent = link
  aElement.target = '_blank'
  targetEl.append(aElement)
  if (!isLast) {
    const commaEl = document.createElement('span')
    commaEl.classList.add('me-2')
    commaEl.textContent = ','
    targetEl.append(commaEl)
  }
}

function letsScroll(btn) {
  const { goRightBtn, goLeftBtn, dateListContainer } = window.dictionaryElements
  switch (btn) {
    case goRightBtn:
      dateListContainer.scrollLeft += 80
      break
    case goLeftBtn:
      dateListContainer.scrollLeft -= 80
      break
  }
}

function showSelectedDateData(date) {
  const { btnSaveIcon } = window.dictionaryElements

  // classicOverview.classList.add('d-none')
  // selectedOverview.classList.remove('d-none')
  btnSaveIcon.firstChild.src = '/images/u_redo.svg'
  btnSaveIcon.children[1].textContent = i18next.t('Obnovi')
  btnSaveIcon.id = 'redo-action'
}

function indeterminateTheBox(checkbox) {
  if (checkbox.readOnly) checkbox.checked = checkbox.readOnly = false
  else if (!checkbox.checked) checkbox.readOnly = checkbox.indeterminate = true
}

function changeCollapsedContent() {
  const statusCollapsed = document.querySelectorAll('.status-collapsed')
  const publishCollapsed = document.querySelectorAll('.published-collapsed')
  const terminoCollapsed = document.querySelectorAll('.terminology-collapsed')
  const langCollapsed = document.querySelectorAll('.lang-collapsed')
  const homonimCollapsed = document.querySelectorAll('.homonim-collapsed')
  const homonymDiv = document.querySelectorAll('.homonim-collapse-div')
  const statusEl = document.getElementById('status-edit')
  const publishedCbox = document.getElementById('published-cbox')
  const terminologyCbox = document.getElementById('terminology-cbox')
  const languageCbox = document.getElementById('language-cbox')
  const homonymSort = document.getElementById('homonym-sort')
  const selectedOptTxt = statusEl.options[statusEl.selectedIndex].text
  statusCollapsed.forEach(el => (el.textContent = selectedOptTxt))
  if (publishedCbox.checked) {
    publishCollapsed.forEach(el => el.classList.remove('d-none'))
  } else publishCollapsed.forEach(el => el.classList.add('d-none'))
  if (terminologyCbox.checked) {
    terminoCollapsed.forEach(el => el.classList.remove('d-none'))
  } else terminoCollapsed.forEach(el => el.classList.add('d-none'))
  if (languageCbox.checked) {
    langCollapsed.forEach(el => el.classList.remove('d-none'))
  } else langCollapsed.forEach(el => el.classList.add('d-none'))
  if (homonymSort.value !== '') {
    homonymDiv.forEach(el => el.classList.remove('d-none'))
    homonimCollapsed.forEach(el => (el.textContent = homonymSort.value))
  } else homonymDiv.forEach(el => el.classList.add('d-none'))
}

function createHeadword() {
  const { termInputField, headerwordTable } = window.dictionaryElements
  if (!termInputField.value.length) alert(i18next.t('Vnesti morate termin'))
  else {
    const createHeadwordGroup = document.getElementById('create-headword-group')
    const createdHeadwordGroup = document.getElementById(
      'created-headword-group'
    )
    const termKeyEl = document.getElementById('term-key')
    termKeyEl.textContent = termInputField.value
    let termKeys = termInputField.value.split(' ')
    termKeys = termKeys.reverse()
    termKeys.forEach(el => {
      const row = headerwordTable.insertRow(1)
      const cell = row.insertCell(0)
      row.insertCell(1)
      row.insertCell(2)
      row.insertCell(3)
      cell.innerHTML = el
    })
    createHeadwordGroup.classList.add('d-none')
    createdHeadwordGroup.classList.remove('d-none')
  }
}

function changePreview() {
  const switchDomainLabel = document.getElementById('domain-labels')
  const switchLabel = document.getElementById('label-checkbox')
  const switchDefinition = document.getElementById('definition-check-box')
  const switchSynonym = document.getElementById('synonyms')
  const switchLink = document.getElementById('links')
  const switchForeignLang = document.getElementById('language-group')
  const switchForeignTerm = document.getElementById('termin-language-subgroup')
  const switchForeignDef = document.getElementById(
    'definition-language-subgroup'
  )
  const switchForeignSyn = document.getElementById('synonym-language-subgroup')
  const switchImage = document.getElementById('images')
  const switchAudio = document.getElementById('audio')
  const switchVideo = document.getElementById('video')
  const switchOther = document.getElementById('other')
  const previewDomainSecondary = document.querySelector(
    '.preview-domain-secondary'
  )
  const selectedLabel = document.querySelector('.preview-label')
  const selectedDef = document.querySelector('.preview-definition')
  const selectedSynonyms = document.querySelector('.preview-synonym')
  const linkedTerms = document.querySelector('.preview-linked-terms')
  const foreignLanguages = document.querySelector(
    '.preview-languages-container'
  )
  const listForeignTerm = document.querySelector('.preview-f-term')
  const listForeignDefinitions = document.querySelector(
    '.preview-foreign-definition'
  )
  const foreignSynonyms = document.querySelector('.preview-foreign-synonyms')
  const selectedImages = document.querySelector('.preview-images')
  const selectedAudio = document.querySelector('.preview-audio')
  const selectedVideo = document.querySelector('.preview-video')
  const selectedOther = document.querySelector('.preview-other-field')

  if (!switchDomainLabel.checked) {
    previewDomainSecondary.classList.add('hide-preview')
  } else previewDomainSecondary.classList.remove('hide-preview')
  if (!switchLabel.checked) selectedLabel.classList.add('hide-preview')
  else selectedLabel.classList.remove('hide-preview')
  if (!switchDefinition.checked) selectedDef.classList.add('hide-preview')
  else selectedDef.classList.remove('hide-preview')
  if (!switchSynonym.checked) selectedSynonyms.classList.add('hide-preview')
  else selectedSynonyms.classList.remove('hide-preview')
  if (!switchLink.checked) linkedTerms.classList.add('hide-preview')
  else linkedTerms.classList.remove('hide-preview')
  if (!switchForeignLang.checked) foreignLanguages.classList.add('hide-preview')
  else foreignLanguages.classList.remove('hide-preview')
  if (!switchForeignSyn.checked) foreignSynonyms.classList.add('hide-preview')
  else foreignSynonyms.classList.remove('hide-preview')
  if (!switchForeignTerm.checked) listForeignTerm.classList.add('hide-preview')
  else listForeignTerm.classList.remove('hide-preview')
  if (!switchForeignDef.checked)
    listForeignDefinitions.classList.add('hide-preview')
  else listForeignDefinitions.classList.remove('hide-preview')
  if (!switchOther.checked) selectedOther.classList.add('hide-preview')
  else selectedOther.classList.remove('hide-preview')
  if (!switchImage.checked) selectedImages.classList.add('hide-preview')
  else selectedImages.classList.remove('hide-preview')
  if (!switchAudio.checked) selectedAudio.classList.add('hide-preview')
  else selectedAudio.classList.remove('hide-preview')
  if (!switchVideo.checked) selectedVideo.classList.add('hide-preview')
  else selectedVideo.classList.remove('hide-preview')
}

function autoResize(el) {
  if (el.style) {
    el.style.height = 42 + 'px'
    el.style.height = `${el.scrollHeight}px`
  }
}

function addField(form, element, content) {
  const { formEditContent, newImageBtn, newAudioBtn, newVideoBtn } =
    window.dictionaryElements
  const divMarginTop = document.createElement('div')
  const divSubjectName = document.createElement('div')
  const spanName = document.createElement('label')
  const divRow = document.createElement('div')
  const divColSm6 = document.createElement('div')
  const inputGroup = document.createElement('div')
  const inputField = document.createElement('input')
  const spanInputGroup = document.createElement('span')
  const imgTrashIcon = document.createElement('img')
  const divColSm = document.createElement('div')
  const spanNameInfoTxt = document.createElement('span')
  const multimediaSection = document.querySelector('.multimedia-section')

  divMarginTop.appendChild(divSubjectName)
  divSubjectName.appendChild(spanName)
  divMarginTop.appendChild(divRow)
  divRow.appendChild(divColSm6)
  divColSm6.appendChild(inputGroup)
  inputGroup.appendChild(inputField)
  inputGroup.appendChild(spanInputGroup)
  spanInputGroup.appendChild(imgTrashIcon)
  divRow.appendChild(divColSm)
  divColSm.appendChild(spanNameInfoTxt)

  divMarginTop.className = 'mt-4 added-field'
  divSubjectName.className = 'subject-name'
  spanName.className = 'input-name-txt'
  divRow.className = 'row align-items-center'
  inputGroup.className = 'input-group'
  inputField.className = 'name-input d-inline form-control icon-trash'
  divColSm6.className = 'col-sm-6'
  spanInputGroup.className = 'input-group-text delete-author-btn'
  spanInputGroup.id = 'trash-icon-btn'
  spanInputGroup.addEventListener('click', deleteField)
  imgTrashIcon.className = 'delete-author p-0'
  imgTrashIcon.src = '/images/red-trash-icon.svg'
  imgTrashIcon.alt = 'Delete'
  divColSm.className = 'col-sm'
  spanNameInfoTxt.className =
    'd-md-inline d-block name-info-txt ms-xxl-3 ms-md-3 mt-3 mt-sm-0'

  if (formEditContent) {
    switch (element) {
      case newImageBtn:
        spanName.textContent = i18next.t('SLIKA')
        inputField.name = 'image'
        spanNameInfoTxt.textContent = i18next.t('Nova slika.')
        if (content) inputField.value = content
        break
      case newAudioBtn:
        spanName.textContent = i18next.t('ZVOK')
        inputField.name = 'audio'
        spanNameInfoTxt.textContent = i18next.t('Nov zvok.')
        if (content) inputField.value = content
        break
      case newVideoBtn:
        spanName.textContent = i18next.t('VIDEO')
        inputField.name = 'video'
        spanNameInfoTxt.textContent = i18next.t('Nov video.')
        if (content) inputField.value = content
        break
    }
    multimediaSection.insertBefore(
      divMarginTop,
      element.parentElement.parentElement.parentElement
    )
  } else {
    spanName.textContent = i18next.t('AVTOR')
    inputField.name = 'author'
    spanNameInfoTxt.textContent = i18next.t(
      'Dodajte ime in priimek naslednjega avtorja slovarja.'
    )
    form.insertBefore(
      divMarginTop,
      element.parentElement.parentElement.parentElement
    )
  }
  inputField.select()
}

function addConnectionField(form, element, data) {
  const { formEditContent } = window.dictionaryElements
  const divMarginTop = document.createElement('div')
  const divSubjectName = document.createElement('div')
  const spanName = document.createElement('label')
  const divRow = document.createElement('div')
  const divColLg2 = document.createElement('div')
  const divColLg4 = document.createElement('div')
  const colLg2Input = document.createElement('select')
  const inputGroup = document.createElement('div')
  const inputField = document.createElement('input')
  const spanInputGroup = document.createElement('span')
  const imgTrashIcon = document.createElement('img')
  const divColSm = document.createElement('div')
  const spanNameInfoTxt = document.createElement('span')
  const opt = document.createElement('option')
  const opt2 = document.createElement('option')
  const opt3 = document.createElement('option')

  divMarginTop.appendChild(divSubjectName)
  divSubjectName.appendChild(spanName)
  divMarginTop.appendChild(divRow)
  divRow.appendChild(divColLg2)
  divColLg2.appendChild(colLg2Input)
  colLg2Input.appendChild(opt)
  divRow.appendChild(divColLg4)
  divColLg4.appendChild(inputGroup)
  inputGroup.appendChild(inputField)
  inputGroup.appendChild(spanInputGroup)
  spanInputGroup.appendChild(imgTrashIcon)
  divRow.appendChild(divColSm)
  divColSm.appendChild(spanNameInfoTxt)

  divMarginTop.className = 'mt-4 added-field'
  divSubjectName.className =
    'subject-name col-sm-6 d-flex justify-content-between'
  spanName.className = 'input-name-txt'
  divRow.className = 'row align-items-center'
  divColLg2.className = 'col-xl-2 col-4'
  divColLg4.className = 'col-8 col-xl-6 col-xxl-4'
  colLg2Input.className = 'name-input form-select d-inline'
  colLg2Input.name = 'type'
  inputGroup.className = 'input-group'
  inputField.className =
    'name-input d-inline form-control icon-trash mc-field dispatch-tab'
  spanInputGroup.className = 'input-group-text delete-author-btn'
  spanInputGroup.id = 'trash-icon-btn'
  spanInputGroup.addEventListener('click', deleteField)
  imgTrashIcon.className = 'delete-author p-0'
  imgTrashIcon.src = '/images/red-trash-icon.svg'
  imgTrashIcon.alt = 'Delete'
  divColSm.className = 'col d-none d-xl-flex align-items-center'
  spanNameInfoTxt.className = 'd-md-inline d-block name-info-txt mt-3 mt-sm-0'
  spanNameInfoTxt.textContent = i18next.t('Nov povezan termin.')
  spanName.textContent = i18next.t('POVEZANI TERMIN')
  inputField.name = 'links'
  opt.value = 'broader'
  opt.text = i18next.t('Širši')
  opt2.value = 'related'
  opt3.value = 'narrow'
  opt2.text = i18next.t('Sorodni')
  opt3.text = i18next.t('Ožji')
  colLg2Input.add(opt2)
  colLg2Input.add(opt)
  colLg2Input.add(opt3)
  colLg2Input.value = 'related'
  formEditContent.insertBefore(
    divMarginTop,
    element.parentElement.parentElement.parentElement
  )

  // Create mixed content buttons above input field
  const mcDiv = document.createElement('div')
  const supscriptBtn = document.createElement('button')
  const subscriptBtn = document.createElement('button')
  const supImg = document.createElement('img')
  const subImg = document.createElement('img')

  mcDiv.appendChild(supscriptBtn)
  mcDiv.appendChild(subscriptBtn)
  supscriptBtn.appendChild(supImg)
  subscriptBtn.appendChild(subImg)

  mcDiv.className = 'mc-buttons-group d-none'
  supscriptBtn.className = 'mc-button mc-supscript'
  supscriptBtn.type = 'button'
  subscriptBtn.className = 'mc-button mc-subscript'
  subscriptBtn.type = 'button'
  supImg.src = '/images/superscript.svg'
  supImg.className = 'mc-center-img'
  subImg.className = 'mc-center-img'
  subImg.src = '/images/subscript.svg'

  divSubjectName.appendChild(mcDiv)
  // eslint-disable-next-line
  inputField.addEventListener('focus', () => showMCButtons(inputField, 'link'))
  if (data) {
    inputField.value = data.link
    colLg2Input.value = data.type
  }
}

function handleAreasClick({ target }) {
  const editRow = target.closest('.edit-row-btn')
  const deleteRow = target.closest('.delete-row-btn')
  const tableButtons = target.closest('.table-buttons')
  const addAreaBtn = target.closest('#add-area')
  if (deleteRow) {
    const getRow = deleteRow.parentElement.parentElement.parentElement
    const modalUseBtn = document.getElementById('modal-use-btn')
    modalUseBtn.addEventListener('click', () => {
      getRow.remove()
    })
    const rowId = getRow.firstChild.value
    const tempId = getRow.dataset.tempId
    if (tempId) {
      let arr = domainLabelsForChange()
      arr = arr.filter(el => el.tempId !== parseInt(tempId))
      domainLabelsForChange(arr)
    } else {
      const data = { id: rowId, type: 'removeArea' }
      domainLabelsForChange(data)
    }
  }
  if (editRow) {
    const getRow = editRow.parentElement.parentElement.parentElement
    const visibilityEl = getRow.querySelector('.form-check')
    visibilityEl.disabled = false
    getRow.className = 'selected-row'
    tableButtons.style.display = 'none'
    const tDataArea = getRow.querySelector('.tdata-area')
    const tDataButtons = getRow.querySelector('.buttons-group')
    const tDataAreaText = tDataArea.textContent
    const tdArea = document.createElement('td')
    const inputArea = document.createElement('input')
    inputArea.className = 'form-control w-100'
    inputArea.value = tDataAreaText
    tdArea.appendChild(inputArea)
    tDataArea.style.display = 'none'
    getRow.insertBefore(tdArea, tDataButtons)
    const buttonsGroup = getRow.querySelector('.buttons-group')
    const newButtonGroup = document.createElement('div')
    const cancelButton = document.createElement('button')
    const saveButton = document.createElement('button')
    saveButton.type = 'button'
    cancelButton.type = 'button'
    cancelButton.textContent = i18next.t('Prekliči')
    cancelButton.className = 'btn btn-secondary me-2'
    cancelButton.style.height = '33px'
    cancelButton.style.width = '105px'
    cancelButton.addEventListener('click', () =>
      abortEditing(newButtonGroup, tableButtons, tDataArea)
    )
    saveButton.textContent = i18next.t('POTRDI')
    saveButton.type = 'button'
    saveButton.className = 'btn btn-primary'
    saveButton.style.height = '33px'
    saveButton.style.width = '105px'
    saveButton.addEventListener('click', () =>
      saveChanges(newButtonGroup, inputArea, tableButtons, tDataArea)
    )
    newButtonGroup.className = 'd-flex justify-content-end me-3'
    newButtonGroup.appendChild(cancelButton)
    newButtonGroup.appendChild(saveButton)
    buttonsGroup.insertBefore(newButtonGroup, tableButtons)
  }
  if (addAreaBtn) {
    const areaInput = document.getElementById('subarea-input')
    const areaInputValue = areaInput.value
    if (areaInputValue.length) {
      const allAreasTable = document.getElementById('all-areas-table')
      const row = allAreasTable.insertRow(-1)
      row.dataset.tempId = tempCounter(true)
      const cell1 = row.insertCell(0)
      const cell2 = row.insertCell(1)
      const cell3 = row.insertCell(2)
      cell1.innerHTML =
        '<input class="form-check checkbox-table" type="checkbox" name="isVisible" checked disabled>'
      cell2.textContent = areaInputValue
      cell2.classList.add('tdata-area')
      cell3.innerHTML =
        '<div class="table-buttons"><button class="p-0 table-button-grp me-3 edit-row-btn" type="button"><img src="/images/u_edit-alt.svg" alt=""></button><button class="p-0 table-button-grp delete-row-btn" data-bs-target="#alert-modal" data-bs-toggle="modal" type="button"><img src="/images/red-trash-icon.svg" alt=""></button></div>'
      cell3.classList.add('buttons-group')
      areaInput.value = ''
      addAreaBtn.disabled = true
      const data = {
        tempId: tempCounter(),
        name: areaInputValue,
        type: 'addArea'
      }
      domainLabelsForChange(data)
    }
  }
}

function onKeyDownNavigation(e) {
  const { scrollEl } = window.dictionaryElements
  const activeElement = document.activeElement
  const parentEl = activeElement.parentElement
  switch (e.key) {
    case 'ArrowDown': {
      e.preventDefault()
      const nextDiv = parentEl.nextElementSibling
      const nextEl = nextDiv?.querySelector('.terms-label')
      nextEl?.focus()
      if (nextEl) {
        const offset = nextEl?.offsetTop
        scrollEl.scrollTop = offset
      }
      break
    }
    case 'ArrowUp': {
      e.preventDefault()
      const previousDiv = parentEl.previousElementSibling
      const previousEl = previousDiv?.querySelector('.terms-label')
      previousEl?.focus()
      if (previousEl) {
        const offset = previousEl?.offsetTop
        scrollEl.scrollTop = offset
      }
      break
    }
    case 'Home': {
      const hopedEl = document.querySelector(`[data-index='0']`)
      hopedEl?.focus()
      if (hopedEl) {
        const offset = hopedEl?.offsetTop
        scrollEl.scrollTop = offset
      }
      break
    }
    case 'End': {
      const dataLength = document.getElementById('data-length').textContent
      const intDataLen = parseInt(dataLength) - 1
      const hopedEl = document.querySelector(`[data-index='${intDataLen}']`)
      hopedEl?.focus()
      if (hopedEl) {
        const offset = hopedEl?.offsetTop
        scrollEl.scrollTop = offset
      }
      break
    }
  }
}

function onPageUpDownNavigation(e) {
  const { scrollEl } = window.dictionaryElements
  const activeElement = document.activeElement
  const calcIndex = 52
  switch (e.key) {
    case 'PageDown': {
      e.preventDefault()
      const activeIndex = activeElement.dataset.index
      const dataLength = document.getElementById('data-length').textContent
      const intDataLen = parseInt(dataLength) - 1
      const calcHops = Math.round(parseInt(scrollEl.clientHeight) / calcIndex)
      const hopToIndex = parseInt(activeIndex) + calcHops
      const hopedEl = document.querySelector(`[data-index='${hopToIndex}']`)
        ? document.querySelector(`[data-index='${hopToIndex}']`)
        : document.querySelector(`[data-index='${intDataLen}']`)
      hopedEl?.focus()
      const offset = hopedEl?.offsetTop
      scrollEl.scrollTop = offset
      break
    }
    case 'PageUp': {
      e.preventDefault()
      const activeIndex = activeElement.dataset.index
      const calcHops = Math.round(parseInt(scrollEl.clientHeight) / calcIndex)
      const hopToIndex = parseInt(activeIndex) - calcHops
      const hopedEl = document.querySelector(`[data-index='${hopToIndex}']`)
        ? document.querySelector(`[data-index='${hopToIndex}']`)
        : document.querySelector(`[data-index='0']`)
      hopedEl?.focus()
      const offset = hopedEl?.offsetTop
      scrollEl.scrollTop = offset
      break
    }
  }
}

function onKeyUpLoad() {
  const parentEl = document.activeElement
  parentEl.click()
}

function selectNextEntry(elem) {
  const allLabels = document.querySelectorAll('.terms-label')
  const arrAllLabels = Array.from(allLabels)
  let found
  found = arrAllLabels.find(el => el.dataset.index === elem)
  if (!found) {
    found = arrAllLabels.find(
      el => parseInt(el.dataset.index) === parseInt(elem) - 1
    )
    if (!found) {
      changePageContent('new-entry-btn')
    }
  }
  if (found) found.click()
}

function inputFieldsChecker() {
  const { inputAreaEl } = window.dictionaryElements
  const addAreaButton = document.getElementById('add-area')
  if (inputAreaEl.value.length) {
    addAreaButton.disabled = false
  } else {
    addAreaButton.disabled = true
  }
}

function abortEditing(btnGrp, oldButtons, areaEl) {
  btnGrp.className = 'd-none'
  oldButtons.style.display = 'block'
  const getRow = btnGrp.parentElement.parentElement
  getRow.classList.remove('selected-row')
  const getInputs = getRow.querySelectorAll('.w-100')
  getInputs.forEach(el => el.parentElement.remove())
  areaEl.style.display = 'table-cell'
  const visibilityEl = getRow.querySelector('.form-check')
  visibilityEl.disabled = true
}

function saveChanges(btnGrp, inputArea, oldButtons, tDataArea) {
  const inputAreaNewValue = inputArea.value
  btnGrp.className = 'd-none'
  oldButtons.style.display = 'block'
  const getRow = btnGrp.parentElement.parentElement
  const tempId = getRow.dataset.tempId
  getRow.classList.remove('selected-row')
  inputArea.parentElement.remove()
  tDataArea.style.display = 'table-cell'
  tDataArea.textContent = inputAreaNewValue
  const visibilityEl = getRow.querySelector('.form-check')
  const visibility = visibilityEl.checked
  if (tempId) {
    const arr = domainLabelsForChange()
    const found = arr.find(el => el.tempId === parseInt(tempId))
    found.nameSl = inputAreaNewValue
  } else {
    const changed = {
      id: getRow.firstChild.value,
      name: inputAreaNewValue,
      isVisible: visibility,
      type: 'changeArea'
    }
    domainLabelsForChange(changed)
  }
  visibilityEl.disabled = true
}

function initDomainLabelsForChange() {
  let tempArray = []
  return function (element) {
    if (Array.isArray(element)) tempArray = element
    else if (element) tempArray.push(element)
    return tempArray
  }
}

const domainLabelsForChange = initDomainLabelsForChange()

function initTempCounter() {
  let counter = 0
  return function (el) {
    if (el) counter += 1
    return counter
  }
}

const tempCounter = initTempCounter()

function deleteContentData(
  domainLabels,
  synonym,
  listForeignDefinitions,
  listForeignTerms,
  listForeignSynonyms,
  images,
  audio,
  video,
  linkRow
) {
  const addedFields = document.querySelectorAll('.added-field')
  if (addedFields.length) addedFields.forEach(el => el.remove())
  if (domainLabels) domainLabels.val(null).trigger('change')
  if (domainLabels) domainLabels.empty().trigger('change')
  if (synonym) synonym.val(null).trigger('change')
  if (synonym) synonym.empty().trigger('change')
  if (listForeignTerms) $('.foreign-term-el').val(null).trigger('change')
  if (listForeignTerms) $('.foreign-term-el').empty().trigger('change')
  if (listForeignSynonyms) $('.foreign-synonym-el').val(null).trigger('change')
  if (listForeignSynonyms) $('.foreign-synonym-el').empty().trigger('change')
  if (images) images.value = ''
  if (audio) audio.value = ''
  if (video) video.value = ''
  if (linkRow) {
    const linkType = linkRow.querySelector('.form-select')
    const linkText = linkRow.querySelector('.mc-field')
    linkType.value = 'related'
    linkText.value = ''
  }
  if (listForeignDefinitions) {
    const foreignDefinitionsFields = document.querySelectorAll(
      '.foreign-definition-el'
    )
    foreignDefinitionsFields.forEach(el => (el.value = ''))
  }
}

function activateMe(term) {
  if (document.querySelector('.selected-term-btn') !== null) {
    document
      .querySelector('.selected-term-btn')
      .classList.remove('selected-term-btn')
  }
  term.classList.add('selected-term-btn')
}

function showTitle(e) {
  const target = e.target
  if (target.tagName === 'LABEL') {
    const title =
      target.title ||
      target.getAttribute('data-bs-original-title') ||
      target.textContent
    const overflowed = target.scrollWidth > target.clientWidth
    target.dataset.bsOriginalTitle = overflowed ? title : ''
    const bsTooltip = new bootstrap.Tooltip(target, {
      placement: 'right',
      trigger: 'hover'
    })
    bsTooltip.show()
  }
}

function hideTitle(e) {
  const target = e.target
  if (target.tagName === 'LABEL') {
    const bsTooltip = new bootstrap.Tooltip(target)
    bsTooltip.dispose()
  }
}

// function checkform() {
//   const selectionInput = $('#cerif')
//     .find('span')
//     .find('.select2-selection.select2-selection--multiple')
//   if ($('#select-cerif').val().length < 1) {
//     selectionInput.addClass('select2-validation')
//     selectionInput.addClass('select2-validation:focus')
//     $('#invalid-section').removeClass('hidden-section')
//   } else {
//     selectionInput.removeClass('select2-validation')
//     selectionInput.removeClass('select2-validation:focus')
//     $('#invalid-section').addClass('hidden-section')
//   }
// }

function checkLanguages() {
  const { checkLanguageGroup } = window.dictionaryElements
  const selectLanguages = $('#select-languages')
    .find('span')
    .find('.select2-selection.select2-selection--multiple')
  if (checkLanguageGroup.checked) {
    if (
      $('#languages-input').val().length < 1 &&
      !$('language-input').prop('disabled')
    ) {
      selectLanguages.addClass('select2-validation')
      selectLanguages.addClass('select2-validation:focus')
      $('#invalid-language-section').removeClass('hidden-section')
    } else {
      selectLanguages.removeClass('select2-validation')
      selectLanguages.removeClass('select2-validation:focus')
      $('#invalid-language-section').addClass('hidden-section')
    }
  }
}

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

function updateAcceptedFileTypes() {
  const { fileImportForm, fileUploadInput } = window.dictionaryElements

  const selectedFileFormat = fileImportForm.importFileFormat.value
  fileUploadInput.accept = `.${selectedFileFormat}`
}

// Activate BS5 tooltips

const tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
)
tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})
