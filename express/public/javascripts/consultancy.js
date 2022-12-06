/* global $, handleDomainsClickForConsultancy, inputFieldsChecker, currentPagePath, axios, nthParent, tooltipListWOL, tooltipTriggerList */

/*
author: Miha Stele, 2022
*/

/** selectedID -> ID of the selected Entry */
let selectedID = -1

// consultancy FORM
let offsetMain
function adjustOffsetBy() {
  offsetMain = document.querySelector('#offset-main')
  const fixedTopSection = document.querySelector('#fixed-top-section')
  const referenceHeight = fixedTopSection.offsetHeight
  const offsetHeader = document.getElementsByClassName('offset-header')
  const offsetHeaderPadding = document.getElementById('offset-padding')
  // const adminNavMobile = document.getElementsByClassName('admin-nav')
  const headerPadding = document.getElementById('header-padding')

  if (document.body.clientWidth < 1200) {
    if (offsetHeaderPadding !== null) offsetMain.style.paddingTop = `0px`
  } else {
    for (let i = 0; i < offsetHeader.length; i++) {
      offsetHeader[i].style.paddingTop = `${referenceHeight}px`
    }
    if (headerPadding !== null) {
      const headerPaddingHeight = headerPadding.offsetHeight
      offsetMain.style.paddingTop = `${headerPaddingHeight}px`
    }
    if (offsetHeaderPadding !== null) {
      const offsetHeaderHeight = offsetHeaderPadding.offsetHeight
      offsetMain.style.paddingTop = `${referenceHeight + offsetHeaderHeight}px`
    }
  }
}

function event2SelectedId(e) {
  return nthParent(e.currentTarget, 4).id.substring(3)
}

window.addEventListener('load', () => {
  adjustOffsetBy()

  const ce = {}
  window.adminElements = ce
  /* copy source admin.js in case of refactoring */

  if (currentPagePath === '/svetovanje/vprasanje/admin/uporabniki') {
    offsetMain.addEventListener('click', handleDomainsClickForConsultancy)
    ce.name = document.getElementById('name-input')
    if (ce.name) {
      ce.name.addEventListener('input', inputFieldsChecker)
    }
    ce.inputAreaEl = document.getElementById('area-input')
    if (ce.inputAreaEl) {
      ce.inputAreaEl.addEventListener('input', inputFieldsChecker)
    }
  }
})

window.addEventListener('resize', () => {
  adjustOffsetBy()
  // mobileMoveContent()
})

try {
  document.querySelector('#consultancy-form').addEventListener('submit', e => {
    e.preventDefault()

    // window.location.replace('/svetovanje/iskanje')
  })
} catch (e) {}

try {
  const splitedHref = window.location.href.split('/')

  document.querySelectorAll('.edit-button').forEach(e => {
    e.addEventListener('click', () => {
      window.location.replace(
        `/svetovanje/vprasanje/admin/urejanje/${nthParent(e, 4).id.slice(
          3
        )}?sentFrom=${splitedHref[splitedHref.length - 1]}`
      )
    })
  })
} catch (e) {}
// share.pug
try {
  // In your Javascript (external .js resource or <script> tag)
  $(document).ready(function () {
    $('.share-search-consultants').select2({
      dropdownParent: $('#consultancyModalShare')
    })
  })
} catch (e) {}

// assign.pug
try {
  // In your Javascript (external .js resource or <script> tag)
  $(document).ready(function () {
    $('.assign-search-consultants').select2({
      dropdownParent: $('#consultancyModalAssign')
    })
  })
} catch (e) {}

const summernote = $('.summernote')
if (summernote) {
  summernote.summernote({
    placeholder: 'Na kratko opišite zasnovo in namen slovarja.',
    height: 300,
    minheight: 150,
    toolbar: [
      ['style', ['style', 'bold', 'italic', 'underline']],
      ['font', ['superscript', 'subscript']],
      ['link', ['linkDialogShow']],
      ['para', ['ul', 'ol']],
      ['table', ['table']],
      ['insert', ['picture']]
    ],
    styleTags: ['p', 'h3', 'h4']
  })
}

/*
mixin shareResultsItem(userId, name)
  .share-results-item(id=userId)
    .row 
      .col-11 
        p.mb-0.navigation-text-color.mb0 #{ name }
      .col-1
        .d-flex.justify-content-end
          button.delete-shared-cons.bg-transparent.no-border
            img(src="/images/trash-2.svg")
    hr.mt-1.mb-1
*/
function buildSharedAuthorListItem(id, name) {
  const root = document.createElement('div')
  root.className = 'share-results-item'
  root.id = id
  const row = document.createElement('div')
  row.className = 'row'
  root.appendChild(row)
  const hr = document.createElement('hr')
  hr.className = 'mt-1 mb-1'
  root.appendChild(hr)
  const col11 = document.createElement('div')
  col11.className = 'col-11'
  row.appendChild(col11)
  const col1 = document.createElement('div')
  col1.className = 'col-1'
  row.appendChild(col1)
  const nameEl = document.createElement('p')
  nameEl.className = 'mb-0 navigation-text-color mb0'
  nameEl.textContent = name
  col11.appendChild(nameEl)
  const aligner = document.createElement('div')
  aligner.className = 'd-flex justify-content-end'
  col1.appendChild(aligner)
  const btn = document.createElement('btn')
  btn.className = 'delete-shared-cons bg-transparent no-border'
  aligner.appendChild(btn)
  const img = document.createElement('img')
  img.src = '/images/trash-2.svg'
  btn.appendChild(img)

  btn.addEventListener('click', e => {
    const element = nthParent(e.currentTarget, 4)

    axios
      .delete('/api/v1/consultancy/delete-consultant-author', {
        data: {
          question_id: selectedID,
          user_id: element.id
        }
      })
      .then(() => {
        element.remove()
      })
  })

  root.appendChild(row)

  return root
}

const assignModalBtns = document.querySelectorAll('.consultancy-modal-assign')

// assign button logic NOTE you can only have assignBtn when you have
// assign buttons (one or more) that trigger the assign modal (assignModalBtns)
// otherwise they're useless
if (assignModalBtns.length > 0) {
  // let modalQuestionBatteryId = -1

  assignModalBtns.forEach(assignButton => {
    assignButton.addEventListener('click', e => {
      $('#consultancyModalAssign').modal('toggle')
      selectedID = parseInt(event2SelectedId(e))
    })
  })

  const assignBtn = document.querySelector('#assign-btn')

  if (assignBtn) {
    assignBtn.addEventListener('click', e => {
      // TODO, assign the question to the in progress section if you are consultancy admin or portal admin

      const userId = document.querySelector('#assign-sel').value
      if (userId !== 'NONE_SELECTED_PLACEHOLDER') {
        axios
          .put('/api/v1/consultancy/assign', {
            question_id: selectedID,
            user_id: document.querySelector('#assign-sel').value
          })
          .then(() => {
            window.location.href += ''
          })
      } else {
        console.log('Please select different username')
      }
    })
  }
}

const shareButtons = document.querySelectorAll('.consultancy-modal-share')

if (shareButtons.length > 0) {
  document.querySelector('#add-shared-author').addEventListener('click', () => {
    axios
      .post('/api/v1/consultancy/add-non-moderator', {
        question_id: selectedID,
        user_id: document.querySelector('#share-sel').value
      })
      .then(e => {
        const sel = document.querySelector('#share-sel')
        document
          .querySelector('.share-results-container')
          .appendChild(
            buildSharedAuthorListItem(
              selectedID,
              sel.options[sel.selectedIndex].text
            )
          )
      })
  })

  document.querySelector('#close-shared').addEventListener('click', () => {
    window.location.href += ''
  })

  shareButtons.forEach(assignButton => {
    assignButton.addEventListener('click', e => {
      selectedID = parseInt(event2SelectedId(e))
      axios
        .get(`/api/v1/consultancy/get-shared-authors?id=${selectedID}`)
        .then(res => {
          const rootCont = document.querySelector('.share-results-container')
          rootCont.innerHTML = ''

          const authors = res.data
          authors.forEach(author => {
            rootCont.appendChild(
              buildSharedAuthorListItem(
                author.user_id,
                `${author.first_name} ${author.last_name} (${author.username})`
              )
            )
          })
        })

      $('#consultancyModalShare').modal('toggle')
    })
  })
}

const rejectButtons = document.querySelectorAll('.reject-item')

if (rejectButtons.length > 0) {
  rejectButtons.forEach(rejectButton => {
    rejectButton.addEventListener('click', e => {
      selectedID = parseInt(event2SelectedId(e))
      // $('#alert-modal').modal('toggle')

      axios
        .put('/api/v1/consultancy/reject', {
          question_id: selectedID
        })
        .then(() => {
          window.location.href += ''
        })
    })
  })
}

const deleteButtons = document.querySelectorAll('.delete-item')

if (deleteButtons.length > 0) {
  document.querySelector('#del-btn').addEventListener('click', e => {
    axios
      .delete('/api/v1/consultancy/delete', {
        data: { id: selectedID }
      })
      .then(() => {
        window.location.href += ''
      })
  })

  deleteButtons.forEach(assignButton => {
    assignButton.addEventListener('click', e => {
      selectedID = parseInt(event2SelectedId(e))
      $('#deleteModal').modal('toggle')
    })
  })
}

const reviewBtns = document.querySelectorAll('.review-btn')

if (reviewBtns.length > 0) {
  reviewBtns.forEach(reviewBtn => {
    reviewBtn.addEventListener('click', e => {
      selectedID = parseInt(event2SelectedId(e))

      axios
        .put('/api/v1/consultancy/review', {
          question_id: selectedID
        })
        .then(() => {
          window.location.href += ''
        })
    })
  })
}

const publishBtns = document.querySelectorAll('.publish-btn')

if (publishBtns.length > 0) {
  publishBtns.forEach(publishBtn => {
    publishBtn.addEventListener('click', e => {
      selectedID = parseInt(event2SelectedId(e))

      const answerAuthorsWithComma =
        document.getElementById('moderatorName').innerText +
        ',' +
        (nthParent(
          e.currentTarget,
          3
        ).childNodes[0].childNodes[0].childNodes[4].getAttribute(
          'data-tooltip-content'
        ) ?? ',')
      axios
        .put('/api/v1/consultancy/publish', {
          question_id: selectedID,
          answer_authors: answerAuthorsWithComma.slice(0, -1)
        })
        .then(() => {
          window.location.href += ''
        })
    })
  })
}

// Share authors boilerplate code

/// // SUBMIT FUNCTIONS

const createAnswerForm = document.querySelector('#create-consultancy-question')

if (createAnswerForm) {
  async function onCreateAnswerSubmit(event) {
    event.preventDefault()
    if (createAnswerForm && !createAnswerForm.checkValidity()) {
      event.stopPropagation()
      createAnswerForm.classList.add('was-validated')
      return
    }

    const payload = Object.fromEntries(new FormData(event.target))

    const res = await axios.post(event.target.action, payload)
    // const data = res.data

    // console.log(data)

    if (res.status === 201) {
      window.location.href = '/svetovanje'
    }
  }

  createAnswerForm.addEventListener('submit', onCreateAnswerSubmit)
}

const insertConsultantForm = document.querySelector('#insert-consultant')

if (insertConsultantForm) {
  insertConsultantForm.addEventListener('submit', e => {
    e.preventDefault()
    const url = e.currentTarget.action

    const username = document.querySelector('#username').value
    const domains = document.querySelector('#domains').value

    axios
      .post(url, {
        username: username,
        domains: domains
      })
      .then(result => {
        console.log(result)
        window.location.href = '/svetovanje/vprasanje/admin/uporabniki'
      })
  })
}

try {
  if (tooltipTriggerList.length > 0) {
    // initialize tooltips
    tooltipListWOL('author-list-tooltip') // ADD for tooltip debug in the end -> [0].show()
  }
} catch (e) {
  console.log(e)
}

/*
if (tooltipList) {
  console.log(tooltipList)
  tooltipList.forEach(ptl => {
    console.log(ptl)
  })
}
*/

// focus required field section

$(document).ready(() => {
  const focused = $('#description')
  if (focused) {
    focused.focus()
  }
})
