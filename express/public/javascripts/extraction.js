/* global currentPagePath, i18next */

// const currentPagePath = location.pathname

// Temporary workaround (use of currentPagePath).

window.addEventListener('load', () => {
  initExtraction()
})

function initExtraction() {
  const ce = {}
  window.extractionElements = ce
  ce.textDescription = document.getElementById('text-description')
  ce.headerTitle = document.getElementById('site-header-title')
  ce.headerRoot = document.getElementById('header-root')
  ce.fixedTopSection = document.getElementById('fixed-top-section')
  ce.topContainer = document.getElementsByClassName('top-container')[0]
  ce.offsetMain = document.getElementById('offset-main')

  window.addEventListener('resize', () => {
    adjustOffsetBy()
    mobileMoveContent()
  })
  mobileMoveContent()
  adjustOffsetBy()
  window.onscroll = hideAndShowHeader

  function hideAndShowHeader() {
    const { textDescription, headerTitle } = window.extractionElements

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
  if (
    currentPagePath === '/luscenje' ||
    currentPagePath === '/luscenje/id_luscenja/oss'
  ) {
    const { offsetMain } = window.extractionElements
    offsetMain.addEventListener('click', handleClick)

    function handleClick({ target }) {
      const editTask = target.closest('.edit-task')
      const deleteTask = target.closest('.delete-task')
      const doubleTask = target.closest('.double-task')
      if (editTask) {
        // alert('Greš na drug page...')
      } else if (deleteTask) {
        // deleteField(deleteTask)
      } else if (doubleTask) {
        duplicateTask(doubleTask)
      }
    }

    function duplicateTask(ele) {
      const element = ele.closest('.task')
      const taskName = element.children[0].children[0].children[0].textContent
      const duplicateName = taskName + ' ' + 'copy'
      const taskCerif = element.children[0].children[0].children[1].textContent

      // Create elements
      const taskNewContainer = document.createElement('div')
      const divSmFlex = document.createElement('div')
      const divSmGrid = document.createElement('div')
      const spanTaskName = document.createElement('span')
      const spanCerif = document.createElement('span')
      const divSmFlexAC = document.createElement('div')
      const btnStart = document.createElement('button')
      const btnImg = document.createElement('img')
      const btnSpan = document.createElement('span')
      const hr = document.createElement('hr')
      const divSmFlex2 = document.createElement('div')
      const divSmFlexACMb = document.createElement('div')
      const imgAlertCircle = document.createElement('img')
      const spanNew = document.createElement('span')
      const divSmFlexACMbMe = document.createElement('div')
      const divEditTask = document.createElement('div')
      const imgEditAlt = document.createElement('img')
      const spanEdit = document.createElement('span')
      const divDeleteTask = document.createElement('div')
      const imgDeleteAlt = document.createElement('img')
      const spanDelete = document.createElement('span')

      taskNewContainer.className = 'container-fluid task task-new p-3 mb-4'
      divSmFlex.className = 'd-sm-flex justify-content-between'
      divSmGrid.className = 'd-sm-grid'

      spanTaskName.className = 'bold-weight-black'
      spanTaskName.textContent = duplicateName

      spanCerif.className = 'normal-gray mt-2 mb-2'
      spanCerif.textContent = taskCerif

      divSmFlexAC.className = 'd-sm-flex align-items-center'
      btnStart.className = 'btn btn-secondary align-items-center d-flex'
      btnStart.type = 'button'
      btnImg.src = '/images/fi_arrow-right-circle.svg'
      btnSpan.className = 'ms-1'
      btnSpan.textContent = i18next.t('Začni')
      hr.className = 'mt-2 mb-3'
      divSmFlex2.className = 'd-flex justify-content-between'
      divSmFlexACMb.className = 'd-sm-flex align-items-center mb-0'
      imgAlertCircle.src = '/images/alert-circle.svg'
      spanNew.className = 'normal-gray ms-1'
      spanNew.textContent = i18next.t('Nov')
      divSmFlexACMbMe.className = 'd-sm-flex align-content-center mb-0 me-3'
      divEditTask.className = 'align-items-center me-3 edit-task'
      imgEditAlt.src = '/images/u_edit-alt.svg'
      spanEdit.className = 'ms-1 normal-gray'
      spanEdit.textContent = i18next.t('Uredi')
      divDeleteTask.className = 'ms-3 align-items-center delete-task'
      imgDeleteAlt.src = '/images/red-trash-icon.svg'
      spanDelete.className = 'ms-1 normal-gray'
      spanDelete.textContent = i18next.t('Briši')

      taskNewContainer.appendChild(divSmFlex)
      divSmFlex.appendChild(divSmGrid)
      divSmGrid.appendChild(spanTaskName)
      divSmGrid.appendChild(spanCerif)
      divSmFlex.appendChild(divSmFlexAC)
      divSmFlexAC.appendChild(btnStart)
      btnStart.appendChild(btnImg)
      btnStart.appendChild(btnSpan)
      taskNewContainer.appendChild(hr)
      taskNewContainer.appendChild(divSmFlex2)
      divSmFlex2.appendChild(divSmFlexACMb)
      divSmFlexACMb.appendChild(imgAlertCircle)
      divSmFlexACMb.appendChild(spanNew)
      divSmFlex2.appendChild(divSmFlexACMbMe)
      divSmFlexACMbMe.appendChild(divEditTask)
      divEditTask.appendChild(imgEditAlt)
      divEditTask.appendChild(spanEdit)
      divSmFlexACMbMe.appendChild(divDeleteTask)
      divDeleteTask.appendChild(imgDeleteAlt)
      divDeleteTask.appendChild(spanDelete)

      const allTasksEl = document.getElementById('all-tasks')

      allTasksEl.insertBefore(taskNewContainer, allTasksEl.firstChild)
    }
  }

  // function deleteField(ele) {
  //   const element = ele.closest('.task')
  //   const modalUseBtn = document.getElementById('modal-use-btn')
  //   modalUseBtn.addEventListener('click', () => {
  //     element.remove()
  //   })
  // element.remove()
  // }

  adjustOffsetBy()
}

function adjustOffsetBy() {
  const { offsetMain, fixedTopSection } = window.extractionElements
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
      adminNavMobileEl.classList.add('align-items-center')
      adminNavMobileEl.classList.add('justify-content-between')
      mobileRightHolder.appendChild(secondaryButton)
      secondaryButton.style.height = '28px'
      secondaryButton.style.width = '99px'
      secondaryButton.style.marginRight = '10px'
    }
    if (primaryButton) {
      mobileRightHolder.appendChild(primaryButton)
      adminNavMobileEl.classList.add('align-items-center')
      adminNavMobileEl.classList.add('justify-content-between')
      primaryButton.style.height = '28px'
      primaryButton.style.width = '99px'
      primaryButton.style.marginRight = '10px'
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

    navTitle.textContent = i18next.t('Urejanje')
    siteHeading.style.display = 'block'
  }
}
