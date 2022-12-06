/* global axios */

/* async function getDataForPageWithQueryForArrayByID(
  page,
  searchQuery,
  filters = {}
) {
  const qParams = new URL(location).searchParams
  qParams.set('p', page)
  qParams.set('q', searchQuery)

  // console.log(filters)
  Object.entries(filters).forEach(([k, v]) => {
    // console.log(`k=${k}`)
    // console.log(`v=${v}`)
    v.forEach(element => {
      if (qParams.has(k)) {
        qParams.append(k, element.id)
      } else {
        qParams.set(k, element.id)
      }
    })
  })

  const url = `/api/v1/search/dictionaries?${qParams}`

  return await axios.get(url)
} */

function prepareQueryArrayForArrayWithIDs(page, searchQuery, filters = {}) {
  const qParams = new URL(location).searchParams
  qParams.set('p', page)
  qParams.set('q', searchQuery)

  // console.log(filters)
  Object.entries(filters).forEach(([k, v]) => {
    // console.log(`k=${k}`)
    // console.log(`v=${v}`)
    v.forEach(element => {
      if (qParams.has(k)) {
        qParams.append(k, element.id)
      } else {
        qParams.set(k, element.id)
      }
    })
  })

  return qParams
}

async function prepareQueryParamsBasic(queryParams, URLSearchParams = false) {
  let qParams
  if (URLSearchParams) {
    qParams = URLSearchParams
  } else {
    qParams = new URL(location).searchParams
  }

  Object.entries(queryParams).forEach(([k, v]) => {
    qParams.set(k, v)
  })
  const url = `/api/v1/search/dictionaries?${qParams}`

  return url
}

async function getDataForPageWithQueryForArray(
  page,
  searchQuery,
  filters = {}
) {
  const qParams = new URL(location).searchParams
  qParams.set('p', page)
  qParams.set('q', searchQuery)

  // console.log(filters)
  Object.entries(filters).forEach(([k, v]) => {
    // console.log(`k=${k}`)
    // console.log(`v=${v}`)
    v.forEach(element => {
      if (qParams.has(k)) {
        qParams.append(k, element)
      } else {
        qParams.set(k, element)
      }
    })
  })

  const url = `/api/v1/search/dictionaries?${qParams}`

  return await axios.get(url)
}

async function getDataForQueryParams(queryParams) {
  const qParams = new URL(location).searchParams

  Object.entries(queryParams).forEach(([k, v]) => {
    qParams.set(k, v)
  })
  const url = `/api/v1/search/dictionaries?${qParams}`

  return await axios.get(url)
}

// NEW METHODS, REFACTOR TO BOTTOM

function prepareQueryParams(queryParams, filters = {}) {
  const qParams = new URL(location).searchParams

  Object.entries(filters).forEach(([k, v]) => {
    // console.log(`k=${k}`)
    // console.log(`v=${v}`)
    v.forEach(element => {
      if (qParams.has(k)) {
        qParams.append(k, element.id)
      } else {
        qParams.set(k, element.id)
      }
    })
  })

  Object.entries(queryParams).forEach(([k, v]) => {
    qParams.set(k, v)
  })

  return qParams
}

async function getDataFromURLSearchParams(URLSearchParams) {
  const url = `/api/v1/search/dictionaries?${URLSearchParams}`

  return await axios.get(url)
}
