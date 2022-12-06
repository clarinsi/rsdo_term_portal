/* global termCandidates, hitsPerPage, numberOfAllPages */
{
  const resultsListEl = document.getElementById('page-results')

  const updateDemoPager = initPagination('pagination', onPageChange)

  function onPageChange(newPage) {
    const results = getDataForPage(newPage)
    removeAllChildNodes(resultsListEl)
    renderResults(results)
    updateDemoPager(newPage, numberOfAllPages)
  }

  function getDataForPage(page) {
    const sliceStart = (page - 1) * hitsPerPage
    const sliceEnd = page * hitsPerPage
    const onePageOfTermCandidates = termCandidates.slice(sliceStart, sliceEnd)
    const data = onePageOfTermCandidates.map((candidate, index) => {
      const sequentialCount = sliceStart + index + 1
      return [sequentialCount, candidate]
    })
    return data
  }

  function renderResults(results) {
    results.forEach(([sequentialCount, candidate]) => {
      const newListEl = document.createElement('li')
      newListEl.textContent = `[${sequentialCount}] ${JSON.stringify(
        candidate
      )}`
      resultsListEl.appendChild(newListEl)
    })
  }
}

// Below code is copied from scripts.js, so it will already be available on the real page. No need to copy it there also.
function initPagination(paginationRootElId, onPageChange, currentPage = 1) {
  const rootEl = document.getElementById(paginationRootElId)
  const btnFirstPage = rootEl.querySelector('.first-page')
  const btnPreviousPage = rootEl.querySelector('.previous-page')
  const btnNextPage = rootEl.querySelector('.next-page')
  const btnLastPage = rootEl.querySelector('.last-page')
  const formEl = rootEl.querySelector('form')
  const pageInputEl = formEl.querySelector('input')
  const pagesCountDisplayEl = formEl.querySelector('.pages-total')

  let reqLock = false

  rootEl.addEventListener('click', handleButtonClick)
  formEl.addEventListener('submit', handleFormSubmit)

  function handleButtonClick({ target }) {
    if (reqLock) return

    const buttonEl = target.closest(`#${paginationRootElId} button`)
    if (!buttonEl) return
    const numOfAllPages = +pagesCountDisplayEl.textContent

    if (buttonEl.classList.contains('first-page')) {
      if (currentPage === 1) return
      enableLock()
      onPageChange(1)
    } else if (buttonEl.classList.contains('previous-page')) {
      if (currentPage === 1) return
      enableLock()
      onPageChange(currentPage - 1)
    } else if (buttonEl.classList.contains('next-page')) {
      if (currentPage === numOfAllPages) return
      enableLock()
      onPageChange(currentPage + 1)
    } else if (buttonEl.classList.contains('last-page')) {
      if (currentPage === numOfAllPages) return
      enableLock()
      onPageChange(numOfAllPages)
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    if (reqLock) return

    const inputValue = +pageInputEl.value
    if (!(inputValue > 0 && inputValue <= pagesCountDisplayEl.textContent)) {
      alert('Nepravilna vrednost strani')
      pageInputEl.value = currentPage
      return
    }

    enableLock()
    onPageChange(inputValue)
  }

  function enableLock() {
    reqLock = true
    btnFirstPage.disabled = true
    btnPreviousPage.disabled = true
    btnNextPage.disabled = true
    btnLastPage.disabled = true
    pageInputEl.disabled = true
  }

  function disableLock() {
    reqLock = false
    btnFirstPage.disabled = false
    btnPreviousPage.disabled = false
    btnNextPage.disabled = false
    btnLastPage.disabled = false
    pageInputEl.disabled = false
  }

  function updatePagerUi(newCurrentPage, newNumOfAllPages) {
    disableLock()
    if (!newCurrentPage) return

    currentPage = newCurrentPage
    pageInputEl.value = newCurrentPage
    pagesCountDisplayEl.textContent = newNumOfAllPages

    if (newCurrentPage === 1) {
      btnFirstPage.disabled = true
      btnPreviousPage.disabled = true
    } else {
      btnFirstPage.disabled = false
      btnPreviousPage.disabled = false
    }

    if (newCurrentPage === newNumOfAllPages) {
      btnNextPage.disabled = true
      btnLastPage.disabled = true
    } else {
      btnNextPage.disabled = false
      btnLastPage.disabled = false
    }
  }

  return updatePagerUi
}

// Helper function to easily remove all child nodes. Useful for pagination.
function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild)
  }
}
