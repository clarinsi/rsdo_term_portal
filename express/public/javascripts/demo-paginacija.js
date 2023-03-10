/* global axios */

// Priporočam uporabo block scopa okoli paginacijske logike za čimvečjo izolacijo.
{
  // Referenca na element, kamor se izrisuje seznam rezultatov.
  const resultsListEl = document.getElementById('page-results')

  // Paginacijo inicializiraš s klicem funkcije initPagination:
  // 1. parameter: id pager elementa. V demo-paginacija.pug je to #pagination.
  //    UPDATE: Sedaj sprejme tudi array idjev, če je pager kontrolerjev več (npr. en zgoraj (#pagination-top), en spodaj (#pagination-bottom)).
  // 2. parameter: callback funkcijo, ki jo pager pokliče vsakič, ko uporabnik zahteva novo stran. Poliče jo s številko zahtevane strani.
  // vrnjena vrednost: funkcija, ki jo (kasneje) kličeš za posodobitev pagerja. Tu jo poimenujem updateDemoPager.
  const updateDemoPager = initPagination(
    ['pagination-top', 'pagination-bottom'],
    onPageChange
  )
  // Za samo en kontroler je bilo:
  // const updateDemoPager = initPagination('pagination', onPageChange)

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

function initPagination(paginationRootElIds, onPageChange, currentPage = 1) {
  let reqLock = false
  let numOfAllPages
  const backwardBtnEls = []
  const forwardBtnEls = []
  const pageInputEls = []
  const pagesCountDisplayEls = []

  if (Array.isArray(paginationRootElIds)) {
    paginationRootElIds.forEach(id => initControls(id))
  } else {
    initControls(paginationRootElIds)
  }
  const allControlEls = [...backwardBtnEls, ...forwardBtnEls, ...pageInputEls]

  function initControls(paginationRootElId) {
    const rootEl = document.getElementById(paginationRootElId)
    const btnFirstPage = rootEl.querySelector('.first-page')
    const btnPreviousPage = rootEl.querySelector('.previous-page')
    const btnNextPage = rootEl.querySelector('.next-page')
    const btnLastPage = rootEl.querySelector('.last-page')
    const formEl = rootEl.querySelector('form')
    const pageInputEl = formEl.querySelector('input')
    const pagesCountDisplayEl = formEl.querySelector('.pages-total')

    numOfAllPages = +pagesCountDisplayEl.textContent

    backwardBtnEls.push(btnFirstPage, btnPreviousPage)
    forwardBtnEls.push(btnNextPage, btnLastPage)
    pageInputEls.push(pageInputEl)
    pagesCountDisplayEls.push(pagesCountDisplayEl)

    rootEl.addEventListener('click', e => {
      handleButtonClick(e, paginationRootElId)
    })
    formEl.addEventListener('submit', e => handleFormSubmit(e, pageInputEl))
  }

  function handleButtonClick({ target }, paginationRootElId) {
    if (reqLock) return

    const buttonEl = target.closest(`#${paginationRootElId} button`)
    if (!buttonEl) return

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

  function handleFormSubmit(e, pageInputEl) {
    e.preventDefault()
    if (reqLock) return

    const inputValue = +pageInputEl.value
    if (!(inputValue > 0 && inputValue <= numOfAllPages)) {
      alert('Nepravilna vrednost strani')
      pageInputEl.value = currentPage
      return
    }

    enableLock()
    onPageChange(inputValue)
  }

  function enableLock() {
    reqLock = true
    allControlEls.forEach(el => (el.disabled = true))
  }

  function disableLock() {
    reqLock = false
    allControlEls.forEach(el => (el.disabled = false))
  }

  function updatePagerUi(newCurrentPage, newNumOfAllPages) {
    disableLock()
    if (!newCurrentPage) return

    currentPage = newCurrentPage
    pageInputEls.forEach(el => (el.value = newCurrentPage))
    pagesCountDisplayEls.forEach(el => (el.textContent = newNumOfAllPages))

    if (newCurrentPage === 1) {
      backwardBtnEls.forEach(el => (el.disabled = true))
    } else {
      backwardBtnEls.forEach(el => (el.disabled = false))
    }

    if (newCurrentPage === newNumOfAllPages) {
      forwardBtnEls.forEach(el => (el.disabled = true))
    } else {
      forwardBtnEls.forEach(el => (el.disabled = false))
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
