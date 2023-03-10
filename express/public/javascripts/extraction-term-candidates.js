/* global termCandidates, hitsPerPage, numberOfAllPages, initPagination, removeAllChildNodes */
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
}
