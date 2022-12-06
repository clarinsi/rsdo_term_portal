/* global axios */

/*
TODO
Naming convention for this file is not the best :/, due to filter extension it is
not just language filter, but filter for many properties...
*/

/** BEGIN VARIABLE CONSTRUCTION AREA */

// TODO insert all sections of ids
const ids = [
  'src-lang-side',
  'dest-lang-side',
  'domain-side',
  'dict-side',
  'source-side'
]
// const showAllAnchors = [
//   'show-all-src-lang-side',
//   'show-all-dest-lang-side',
//   'show-all-dict-side'
// ]

/*

extracts entries from the navigation from the ID (without the hash)

*/
/*
function extract(sectionId) {
  try {
    const doc = document.querySelector(`#${sectionId}.nav-section-content`)
    const entries = doc.querySelectorAll('.nav-section-content-desc')
    return {
      id: sectionId,
      items: Array.from(entries).map(a => a.innerHTML)
    }
  } catch (e) {}
}
*/

function extractMap(sectionId) {
  try {
    const doc = document.querySelector(`#${sectionId}.nav-section-content`)
    const entries = doc.querySelectorAll('.nav-section-content-desc')
    return {
      id: sectionId,
      items: Array.from(entries).map(a => {
        return {
          name: a.innerHTML,
          count: a.parentElement.children[2].innerHTML,
          id: a.parentNode.parentNode.id
        }
      })
    }
  } catch (e) {}
}

/// / Dummy hardcoded variables
const sourceLanguageList = extractMap(ids[0])
const destinationLanguageList = extractMap(ids[1])
const domainsList = extractMap(ids[2])
const dictsList = extractMap(ids[3])
const sourcesList = extractMap(ids[4])

const initializedValues = {
  'src-lang-side': sourceLanguageList,
  'dest-lang-side': destinationLanguageList,
  'domain-side': domainsList,
  'dict-side': dictsList,
  'source-side': sourcesList
}

const selectedIds = {
  /*
  'src-lang-side': [],
  'dest-lang-side': [],
  'domain-side': [],
  'dict-side': [],
  'source-side': []
  */
}

function fillSelectedID(idSec) {
  Array.from(document.getElementById(idSec).children).forEach(child => {
    if (child.tagName === 'LI') {
      if (
        child.children[0].children[0].children[0].getAttribute('src') ===
        '/images/square-checkbox-solid.svg'
      ) {
        selectedIds[idSec].push(child.id)
      }
    }
  })
}

function fillSelectedIDs() {
  ids.forEach(idSec => {
    fillSelectedID(idSec)
  })
}

function initSelectedIds() {
  ids.forEach(idSec => {
    selectedIds[idSec] = []
  })
}

initSelectedIds()
fillSelectedIDs()

/** referenced to: select more buttons */
const selectMoreIDs = [
  'select-src-langs',
  'select-dest-langs',
  'select-domains',
  'select-dicts',
  'select-sources'
]

const queryOrderedArr = {
  'src-lang-side': 'sl',
  'dest-lang-side': 'tl',
  'domain-side': 'pd',
  'dict-side': 'd',
  'source-side': 's'
}

const url = new URL(window.location.href)

/** ID of the filter section */
let sectionIDBattery = -1

/** END VARIABLE CONSTRUCTION AREA */

function createListItemBlockForModal(id, name, amount, sectionId) {
  const li = document.createElement('li')
  const div = document.createElement('div')
  li.appendChild(div)
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.id = id

  if (selectedIds[sectionId].filter(e => e === id).length > 0) {
    input.checked = true
  }

  div.appendChild(input)
  const label = document.createElement('label')
  label.setAttribute('for', id)
  label.innerHTML = name
  label.classList = 'nav-modal-content-desc checked'
  li.appendChild(label)
  const amnt = document.createElement('span')
  amnt.innerHTML = amount
  label.appendChild(amnt)

  return li
}

function linkToModal(element) {
  const modalListRoot = document.querySelector('#modal-list')
  modalListRoot.appendChild(element)
}

function initModalList(id, list) {
  list.forEach(l =>
    linkToModal(createListItemBlockForModal(l.id, l.name, l.hits, id))
  )
  sectionIDBattery = id
}

function cleanOldList() {
  const modalListRoot = document.querySelector('#modal-list')
  modalListRoot.innerHTML = ''
}

async function selectMoreListener(event) {
  const idstring = `${event.currentTarget.id
    .replace('select-', '')
    .slice(0, -1)
    .concat('-side')}`
  // console.log(extractMap(idstring))

  // mp is the array of the currently displayed filters (required to get the checked information)
  // const mp = initializedValues[idstring]

  // all filters for search
  // const allAggregationData = { id: idstring }
  const allAggregationData = { id: idstring }

  const currentURL = new URL(window.location.href)
  const searchParams = currentURL.searchParams

  searchParams.set('selectedFilter', idToSearchFiltersMapper(idstring))

  const url = `/api/v1/search/term-filters?${searchParams.toString()}`
  const { data } = await axios.get(url)

  // const parsed = JSON.parse(event.currentTarget.dataset.aggregationInfo ?? '[]')

  allAggregationData.items = data[idToSearchFiltersMapper(idstring)]

  cleanOldList()
  initModalList(allAggregationData.id, allAggregationData.items)
}

function idToSearchFiltersMapper(inpt) {
  const mappings = {
    'src-lang-side': 'sourceLanguages',
    'dest-lang-side': 'targetLanguages',
    'domain-side': 'primaryDomains',
    'dict-side': 'dictionaries',
    'source-side': 'sources'
  }

  return mappings[inpt]
}

function createSideMenuElement(id, name, count, isSelected) {
  const child = document.createElement('li')
  child.id = id
  const anchr = document.createElement('a')
  anchr.classList = 'sel-anchr'
  anchr.setAttribute('href', '#')
  child.appendChild(anchr)
  const divforimg = document.createElement('div')
  const img = document.createElement('img')
  divforimg.appendChild(img)

  if (isSelected) {
    img.setAttribute('src', '/images/square-checkbox-solid.svg')
  } else {
    img.setAttribute('src', '/images/chevron-right.svg')
  }

  const nameSpan = document.createElement('span')
  nameSpan.innerHTML = name
  nameSpan.classList = 'nav-section-content-desc'
  const countSpan = document.createElement('span')
  countSpan.innerHTML = count
  anchr.appendChild(divforimg)
  anchr.appendChild(nameSpan)
  anchr.appendChild(countSpan)

  return child
}

selectMoreIDs.forEach(button => {
  const buttonElement = document.querySelector(`#${button}`)
  buttonElement.addEventListener('click', selectMoreListener)
})

sectionIDBattery = -1

/// logic to update selectedIDs state of checked items
function checkOrUncheck(sectionId, id) {
  const checked = selectedIds[sectionId].filter(e => id === e)

  if (checked.length > 0) {
    selectedIds[sectionId] = selectedIds[sectionId].filter(e => id !== e)
  } else {
    selectedIds[sectionId].push(id)
  }
}

function listener(cnt) {
  return e => {
    const searchParams = url.searchParams
    searchParams.append(
      queryOrderedArr[Object.keys(queryOrderedArr)[cnt]],
      e.currentTarget.parentElement.id
    )
    // console.log(url.searchParams.getAll('sl'))
    window.location.href = url
  }
}

function finishSelectingFromModal(e) {
  const newValues = []
  Array.from(document.querySelector('#modal-list').children).forEach(e => {
    const checkField = e.children[0].children[0]
    const labelId = e.children[1]

    // console.log(checkField, labelId, labelId.getAttribute('for'))
    if (checkField.checked) {
      newValues.push(labelId.getAttribute('for'))
    }
  })
  const url = new URL(window.location.href)
  const searchParams = url.searchParams
  searchParams.delete(queryOrderedArr[sectionIDBattery])
  newValues.forEach(e => {
    searchParams.append(queryOrderedArr[sectionIDBattery], e)
  })
  window.location.href = url
}

function reRenderSpecific(event) {
  const idstring = event.currentTarget.id
  const id = idstring.replace('show-all-', '')
  // console.log(id)
  rePlotAndCheck(id, [], true)
  clearModalFiltersWID(id)
}

function initClickableForList(sectionId) {
  let QOACounter = 0
  document.querySelectorAll(`#${sectionId}`).forEach(e => {
    e.querySelectorAll('a.sel-anchr').forEach(a => {
      a.addEventListener('click', listener(QOACounter))
    })
    QOACounter++
  })
}

/* function applied to reset filter(s) or select modal return state */
function rePlotAndCheck(sectionId, selectedIdsArray, plotInverse = false) {
  const doc = document.querySelector(`#${sectionId}.nav-section-content`)
  doc.innerHTML = ''

  initializedValues[sectionId].items.forEach(el => {
    const isSelected = selectedIdsArray.filter(e => e === el.id).length > 0
    if (isSelected) {
      doc.appendChild(
        createSideMenuElement(el.id, el.name, el.count, isSelected)
      )
    } else if (plotInverse) {
      doc.appendChild(
        createSideMenuElement(el.id, el.name, el.count, isSelected)
      )
    }
  })

  if (doc.children.length < 1) {
    initializedValues[sectionId].items.forEach(el => {
      doc.appendChild(createSideMenuElement(el.id, el.name, el.count, false))
    })
  }

  initClickableForList(sectionId)

  const anchr = document.createElement('a')
  anchr.classList = ' showall d-none'
  anchr.id = `show-all-${sectionId}`
  anchr.href = '#'

  const img = document.createElement('img')
  img.setAttribute('src', '/images/chevron-left-blue.svg')
  const span = document.createElement('span')
  span.innerHTML = 'PRIKAŽI VSE'

  anchr.appendChild(img)
  anchr.appendChild(span)

  anchr.addEventListener('click', reRenderSpecific)

  doc.appendChild(anchr)

  if (selectedIdsArray.length > 0) {
    const anchr = document.querySelector(`#show-all-${sectionId}`)
    // console.log(`#show-all-${sectionId}`)
    anchr.classList = 'showall'
  }
}

///  TODO, some better option than global variable sectionIDBattery?
function selectFromModal(event) {
  // console.log(event.target.id)
  if (event.target.id) {
    checkOrUncheck(sectionIDBattery, event.target.id)
  }
}

function clearModalFilters() {
  Array.from(document.querySelector('#modal-list').children).forEach(e => {
    e.children[0].children[0].checked = false
  })
  selectedIds[sectionIDBattery] = []
}

function clearModalFiltersWID(id) {
  Array.from(document.querySelector('#modal-list').children).forEach(e => {
    e.children[0].children[0].checked = false
  })
  selectedIds[id] = []
}

function initializeClickables() {
  let QOACounter = 0
  ids.forEach(element => {
    document.querySelectorAll(`#${element}`).forEach(e => {
      e.querySelectorAll('a.sel-anchr').forEach(a => {
        a.addEventListener('click', listener(QOACounter))
      })
    })
    QOACounter++
  })
  document
    .querySelector('#modal-list')
    .addEventListener('click', selectFromModal)
  document
    .querySelector('#sf-modal-button')
    .addEventListener('click', finishSelectingFromModal)

  document.querySelector('#ccf').addEventListener('click', clearModalFilters)

  Array.from(document.querySelectorAll('.showall')).forEach(e =>
    e.addEventListener('click', event => {
      sectionIDBattery = event.currentTarget.id.replace('show-all-', '')
      const url = new URL(window.location.href)
      const searchParams = url.searchParams
      searchParams.delete(queryOrderedArr[sectionIDBattery])
      window.location.href = url
    })
  )

  document.querySelector('#clear-filters').addEventListener('click', e => {
    const url = new URL(window.location.href)
    const searchParams = url.searchParams
    Object.keys(queryOrderedArr).forEach(queryParamKey => {
      searchParams.delete(queryOrderedArr[queryParamKey])
    })
    window.location.href = url
  })
}

// initModalList('id1', langsMapModal)

/// global run

initializeClickables()
