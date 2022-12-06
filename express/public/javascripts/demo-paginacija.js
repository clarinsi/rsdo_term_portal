/* global axios */

// Priporočam uporabo block scopa okoli paginacijske logike za čimvečjo izolacijo.
{
  // Referenca na element, kamor se izrisuje seznam rezultatov.
  const resultsListEl = document.getElementById('page-results')

  // Paginacijo inicializiraš s klicem funkcije initPagination:
  // 1. parameter: id pager elementa. V demo-paginacija.pug je to #pagination.
  // 2. parameter: callback funkcijo, ki jo pager pokliče vsakič, ko uporabnik zahteva novo stran. Poliče jo s številko zahtevane strani.
  // vrnjena vrednost: funkcija, ki jo (kasneje) kličeš za posodobitev pagerja. Tu jo poimenujem updateDemoPager.
  const updateDemoPager = initPagination('pagination', onPageChange)

  // Fukncija, prejme številko nove strani in naj:
  // 1. Pridobi podatke nove strani.
  // 2. Izriše seznam elementov te strani.
  // 3. Posodobi pager, tako, da kliče funkcijo, ki jo je vrnil klic initPagination (updateDemoPager) z novo stranjo in številom vseh strani.
  async function onPageChange(newPage) {
    try {
      const { page, numberOfAllPages, results } = await getDataForPage(newPage)
      removeAllChildNodes(resultsListEl)
      renderResults(results)
      updateDemoPager(page, numberOfAllPages)
    } catch (error) {
      let message = 'Prišlo je do napake.'
      if (error.response?.data) {
        message = error.response.data
      } else if (error.request) {
        message = 'Strežnik ni dosegljiv. Poskusite kasneje.'
      }
      alert(message)
      updateDemoPager()
    }
  }

  // Primer helper funkcije za pridobitev podatkov želene strani.
  async function getDataForPage(page) {
    const url = `/api/v1/demo-paginacija/list?p=${page}`
    const { data } = await axios.get(url)
    return data
  }

  // Primer helper funkcije za izris seznama novih podatkov.
  function renderResults(results) {
    results.forEach(result => {
      const newListEl = document.createElement('li')
      const textNode1 = document.createTextNode('Zanimiva vrednost: ')
      const boldedEl = document.createElement('b')
      boldedEl.textContent = result.zanimivo
      const textNode2 = document.createTextNode(
        `. Totalno nezanimivo: ${result.nezanimivo1} in ${result.nezanimivo2}`
      )

      newListEl.append(textNode1, boldedEl, textNode2)
      resultsListEl.appendChild(newListEl)
    })
  }
}

/** ****************************************************************************************************************************************** **\
 * Koda od tu navzdol za vaju ni relevantna. Tu je, da dela zgornja koda. Za realno uporabo sem je skopiral tudi v public/javascripts/scripts.js *
 *                          Na vsaki strani, kjer bo paginacija, jo inicializiraj in uporabljaj po zgledu zgornje kode.                          *
\** ****************************************************************************************************************************************** **/

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
