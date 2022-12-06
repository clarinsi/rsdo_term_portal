/* global $, inputMainSearch */

const searchButton = document.getElementById('couns-search-btn')
const advancedSearchButton = document.getElementById('search-in-filter-modal')

function routeConsultancy(searchString) {
  let url

  if (searchString) {
    url = new URL(searchString, location.protocol + '//' + location.host)
  } else {
    url = new URL(location)

    const sq = document.getElementById('search-query')
    if (sq) {
      url.searchParams.set('q', sq.value)
    }
  }
  // const qParams = new URL(location).searchParams

  // error prone code because of clear filter
  // qParams.forEach((value, key) => {
  //  if (key !== 'q') {
  //    url.searchParams.append(key, value)
  //  }
  // })
  const pds = $('.select-domain-field')
  if (pds) {
    pds.val().forEach(val => {
      url.searchParams.append('pd', val)
    })
  }

  window.location.href = url
}

function searchOnConsultancyBaseOrAdmin() {
  const isItNotAdminURL = !location.pathname.includes('/admin/')

  if (isItNotAdminURL) {
    const sq = document.getElementById('search-query')
    routeConsultancy(`/svetovanje/iskanje?q=${sq ? sq.value : ''}`)
  } else {
    // build here URL for admin sections
    routeConsultancy(null)
  }
}

function propagateFunctionalityToASearchButton(el) {
  if (el) {
    el.addEventListener('click', searchOnConsultancyBaseOrAdmin)
  }
}

if (inputMainSearch) {
  const listenForTypingOnConsultancy = function (event) {
    if (event.code === 'Enter') {
      event.preventDefault()
      searchOnConsultancyBaseOrAdmin() // here you invoke the function since it is not a listener
    }
  }

  inputMainSearch.addEventListener('keyup', listenForTypingOnConsultancy)
}

propagateFunctionalityToASearchButton(searchButton)
propagateFunctionalityToASearchButton(advancedSearchButton)
