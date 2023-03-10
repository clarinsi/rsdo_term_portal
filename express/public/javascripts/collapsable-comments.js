{
  let isVisible = false
  const pager = document.querySelector('.pager')
  const commentsContainer = document.querySelector('#comments-container')
  const dropImage = document.querySelector('#dropImage')
  const commentCount = document.querySelector('#comments-count')
  const collapsableHR = document.querySelector('.collapable-hr')

  const hide = () => {
    pager.className += ' invisible'
    commentsContainer.className += ' d-none'
    commentCount.className += ' invisible'
    collapsableHR.className += ' d-none'
  }

  const show = () => {
    pager.className = 'pager d-flex'
    commentsContainer.className = 'comments-container pe-1'
    dropImage.src = '/images/arrow_drop_up.svg'
    commentCount.className = 'comment-count d-flex ms-auto me-4 text-p875rem'
    collapsableHR.className += 'comments-top-hr mt-3'
  }

  document.getElementById('collapseComments').addEventListener('click', e => {
    isVisible = !isVisible

    if (isVisible) {
      show()
    } else {
      dropImage.src = '/images/arrow_drop_down.svg'
      hide()
    }
  })

  hide()
}
