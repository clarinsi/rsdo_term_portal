/* global axios, initPagination, removeAllChildNodes */
{
  const selectorEl = document.getElementById('select-extraction-name')
  selectorEl.addEventListener('change', () => loadCandidates(selectorEl.value))
  const resultsListEl = document.getElementById('page-results')
  let termCandidates
  let hitsPerPage
  let numberOfAllPages
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
      tdDate.textContent = candidate.pogostostpojavljanja
      rowEl.append(tdId, tdName, tdSize, tdDate)
      resultsListEl.appendChild(rowEl)
    })
  }
}
