/* global axios, initPagination, removeAllChildNodes, i18next, dictionaryId */
{
  const selectorEl = document.getElementById('select-extraction-name')
  selectorEl.addEventListener('change', () => loadCandidates(selectorEl.value))
  const resultsListEl = document.getElementById('page-results')
  const importFormEl = document.getElementById('import-form')
  const importButtonEl = document.getElementById('import-btn')
  let termCandidates
  let hitsPerPage
  let numberOfAllPages

  importFormEl.addEventListener('submit', submitForm)

  async function loadCandidates(id) {
    try {
      const { data } = await axios.get(
        `/api/v1/extraction/${id}/term-candidates`
      )
      termCandidates = data.termCandidates
      hitsPerPage = data.hitsPerPage
      numberOfAllPages = data.numberOfAllPages
      removeAllChildNodes(resultsListEl)
      const results = getDataForFirstPage(data)
      renderResults(results)
      updateDemoPager(1, numberOfAllPages)
      importFormEl.action = `/api/v1/dictionaries/${dictionaryId}/import-extraction/${id}`
      importButtonEl.disabled = false
    } catch (error) {
      console.log(error)
    }
  }

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

  function getDataForFirstPage() {
    const sliceStart = (1 - 1) * hitsPerPage
    const sliceEnd = 1 * hitsPerPage
    const onePageOfTermCandidates = termCandidates.slice(sliceStart, sliceEnd)
    const data = onePageOfTermCandidates.map((candidate, index) => {
      const sequentialCount = sliceStart + index + 1
      return [sequentialCount, candidate]
    })
    return data
  }

  function renderResults(results) {
    results.forEach(([sequentialCount, candidate]) => {
      const rowEl = document.createElement('tr')
      const tdId = document.createElement('td')
      const tdName = document.createElement('td')
      const tdSize = document.createElement('td')
      const tdDate = document.createElement('td')
      tdId.textContent = sequentialCount
      tdName.textContent = candidate.kanonicnaoblika
      tdSize.textContent = candidate.ranking
      tdDate.textContent = candidate.pogostostpojavljanja[0]
      rowEl.append(tdId, tdName, tdSize, tdDate)
      resultsListEl.appendChild(rowEl)
    })
  }

  async function submitForm(event) {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.target))

    try {
      await axios.post(event.target.action, payload)
      alert(i18next.t('SLOVAR UVOŽEN'))
    } catch (error) {
      let message = i18next.t('Prišlo je do napake.')
      if (error.response) {
        message = error.response.data
      } else if (error.request) {
        message = i18next.t('Strežnik ni dosegljiv. Poskusite kasneje.')
      }
      alert(message)
    }
  }
}
