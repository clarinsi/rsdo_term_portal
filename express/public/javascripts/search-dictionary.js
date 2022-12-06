/* global $, axios, initPagination, removeAllChildNodes, closeUtilityContainers, prepareQueryArrayForArrayWithIDs, getDataFromURLSearchParams, prepareQueryParams, focusOnCompletePrompt */

{
  /*
  $('tr').click(function (e) {
    // console.log(e)

    const id = e.currentTarget.id

    if (e.currentTarget.id) {
      window.location.href = `/slovarji/${id}/o-slovarju?sentFromEntryId=dictsList`
    }
  })

  $('tr').hover(e => $('i', e.target).toggleClass('outline'))
  */

  let orderType = 'dictName'
  let orderIndex = false // false - ASC, true - DESC
  let currentPage = 1
  let primaryDomains = []
  let qFilter = ''

  document
    .getElementById('dictionaries-search-form')
    .addEventListener('submit', e => {
      e.preventDefault()
    })

  const submitFilter = async e => {
    const search = document.getElementById('search-query').value
    const domainFilter = {}

    const pd = $('#domain-select').select2('data')

    pd.forEach(el => {
      if (domainFilter.pd) {
        domainFilter.pd.push(el.id)
      } else {
        domainFilter.pd = [el.id]
      }
    })

    if (pd) {
      domainFilter.pd = pd // Array of primary domain filter, ex. ['2', '234, '310']
    }

    primaryDomains = pd
    qFilter = search

    const preparedQuery = prepareQueryArrayForArrayWithIDs(
      1,
      search,
      domainFilter
    )
    const res = await getDataFromURLSearchParams(preparedQuery)

    const page = +res.headers.page
    currentPage = page
    const numberOfAllPages = +res.headers['number-of-all-pages']
    // const resultsMarkup = res.data

    removeAllChildNodes(resultsListEl)
    // renderResults(resultsMarkup)
    updatePager(page, numberOfAllPages)

    renderResults(res.data)

    addListenersOnRefresh()
  }

  document
    .querySelector('#search-in-filter-modal')
    .addEventListener('click', submitFilter)

  const dsb = document.querySelector('#dicts-search-btn')

  dsb.addEventListener('click', submitFilter)
  dsb.addEventListener('click', focusOnCompletePrompt)
  dsb.addEventListener('click', closeUtilityContainers)

  const resultsListEl = document.querySelector('.table-dict-list')
  const initialPage = +new URL(location).searchParams.get('p') || 1

  const updatePager = initPagination('pagination', onPageChange, initialPage)
  resultsListEl.addEventListener('click', onResultClick)

  async function onPageChange(newPage) {
    const receivedPageNumber = await changePage(newPage)
    updateUrlAndHistory(receivedPageNumber)
  }

  async function changePage(newPage) {
    try {
      const qparams = prepareQueryParams(
        {
          p: newPage,
          orderType,
          orderIndex,
          q: qFilter
        },
        { pd: primaryDomains }
      )
      const res = await getDataFromURLSearchParams(qparams)

      const page = +res.headers.page
      currentPage = page
      const numberOfAllPages = +res.headers['number-of-all-pages']
      const resultsMarkup = res.data

      removeAllChildNodes(resultsListEl)
      renderResults(resultsMarkup)
      updatePager(page, numberOfAllPages)

      // important
      addListenersOnRefresh()

      return page
    } catch (error) {
      let message = 'Prišlo je do napake.'
      if (error.response?.data) {
        message = error.response.data
      } else if (error.request) {
        message = 'Strežnik ni dosegljiv. Poskusite kasneje.'
      }
      alert(message)
      updatePager()
    }
  }

  /* TODO: think of a way to reduce redundancy of the functions below */

  async function getDataForPage(page) {
    const qParams = new URL(location).searchParams
    qParams.set('p', page)
    const url = `/api/v1/search/dictionaries?${qParams}`

    return await axios.get(url)
  }

  /*
  
  getDataForPageWithQuery
  
  inputs:
  - page: elements displayed in the page specified
  - searchQuery: search string
  - filters: filter elements o be added,
  format must be as following
  {
    FILTER_NAME_1: [FILTER_1, FILTER_2, ..., FILTER_N],
    FILTER_NAME_2: [...]
  }

  */

  function renderResults(resultsMarkup) {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = resultsMarkup
    resultsListEl.appendChild(wrapper)
  }

  function updateUrlAndHistory(page) {
    const newUrl = new URL(location)
    newUrl.searchParams.set('p', page)
    history.pushState(null, '', newUrl)
  }

  window.addEventListener('popstate', () => {
    const page = +new URL(location).searchParams.get('p') || 1
    changePage(page)
  })

  function onResultClick(e) {
    const entryEl = e.target.closest(`#${this.id} a.rl`)
    if (!entryEl) return

    const anchorId = entryEl.querySelector('.anchor').id
    const anchoredUrl = new URL(location)
    anchoredUrl.hash = anchorId
    history.replaceState(null, '', anchoredUrl)
  }

  // order type -> what to order
  // order index -> 0 - none, 1 - ASC, 2 - DESC
  async function sortQuery(orderType, orderIndex) {
    const queryParams = prepareQueryParams(
      {
        p: currentPage,
        orderType,
        orderIndex,
        q: qFilter
      },
      { pd: primaryDomains }
    )

    /// copied code, OPTIMIZE
    const res = await getDataFromURLSearchParams(queryParams)

    const page = +res.headers.page
    const numberOfAllPages = +res.headers['number-of-all-pages']
    // const resultsMarkup = res.data

    removeAllChildNodes(resultsListEl)
    // renderResults(resultsMarkup)
    updatePager(page, numberOfAllPages)

    renderResults(res.data)
  }

  // non-pure fn
  async function sortPlaceholder(name) {
    if (orderType === name) {
      orderIndex = !orderIndex
    } else {
      orderType = name
      orderIndex = false
    }

    // reset on begin

    await sortQuery(orderType, orderIndex)

    addListenersOnRefresh()

    // Ordering of code required because we apply this to the new table
    // Get the immage ref to toggle
    // const indicatorImageDict = document.getElementById('dictNameImg')
    // const indicatorImageDomain = document.getElementById('domainNameImg')
    // indicatorImageDict.className = 'invisible'
    // indicatorImageDomain.className = 'invisible'
    const indicatorImage = document.getElementById(`${name}Img`)
    if (orderIndex) {
      indicatorImage.className = ''
      indicatorImage.src = 'images/arrow_drop_up.svg'
    } else {
      indicatorImage.className = ''
      indicatorImage.src = 'images/arrow_drop_down.svg'
    }
  }

  function sortName() {
    sortPlaceholder('dictName')
  }

  function sortDomain() {
    sortPlaceholder('domainName')
  }

  function addListenersOnRefresh() {
    document.getElementById('sortByDictName').addEventListener('click', e => {
      sortName()
    })
    document.getElementById('sortByDomainName').addEventListener('click', e => {
      sortDomain()
    })
  }

  // initialize with listeners and DESC image
  const indicatorImageDict = document.getElementById('dictNameImg')
  indicatorImageDict.className = ''
  addListenersOnRefresh()
}
