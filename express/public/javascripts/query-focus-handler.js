// Note to myself: please optimize and remove the redundacy of the code written in multiple classes to achieve the same result as this

const focusOnCompletePromtBase = queryInput => {
  queryInput.focus()
  queryInput.select()
}

// Tradeoff: Declare a variable for the element to reduce duplication?
const inputQuery = document.querySelector('#search-query')
if (inputQuery) {
  focusOnCompletePromtBase(inputQuery)

  if (window.location.pathname === '/slovarji') {
    document
      .querySelector('#dicts-search-btn')
      .addEventListener('click', () => {
        focusOnCompletePromtBase(inputQuery)
      })

    document
      .querySelector('#search-in-filter-modal')
      .addEventListener('click', () => {
        focusOnCompletePromtBase(inputQuery)
      })
  }
}
