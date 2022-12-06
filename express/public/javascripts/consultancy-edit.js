/* global $, axios */

function sumbitFormForConsultancy(e) {
  const id = document.querySelector('#entry-id').value
  const questionTitle = document.querySelector('#question-title').value
  const domain = document.querySelector('#select-cerif').value
  const question = document.querySelector('#question').value
  const answer = $('#opinion').summernote('code')

  axios.put(e.target.action, {
    id,
    questionTitle,
    domain,
    question,
    answer
  })
  axios
    .put('/api/v1/consultancy/entry', {
      id,
      questionTitle,
      domain,
      question,
      answer
    })
    .then(() => {
      window.location.href = '/svetovanje/vprasanje/admin/v-delu'
    })
}

{
  /*
  $('#opinion').summernote({
    codeviewFilter: true,
    codeviewIframeFilter: true
  })
  */

  const ef = document.querySelector('#edit-form')

  ef.addEventListener('submit', e => {
    e.preventDefault()

    sumbitFormForConsultancy(e)
  })

  ef.addEventListener('change', e => {
    document.querySelector('#opt1').disabled = false
  })

  $('#opinion').on('summernote.change', function (we, contents, $editable) {
    document.querySelector('#opt1').disabled = false
  })

  const resizeFields = document.querySelectorAll('.explanation-field')
  if (resizeFields.length) {
    resizeFields.forEach(el =>
      el.addEventListener('input', () => autoResize(el))
    )
  }

  function autoResize(el) {
    if (el.style) {
      el.style.height = 42 + 'px'
      el.style.height = `${el.scrollHeight}px`
    }
  }

  resizeFields.forEach(el => {
    autoResize(el)
  })
}
