{
  let isVisible = false
  const pager = document.querySelector('.pager')
  const commentsContainer = document.querySelector('#comments-container')
  const dropImage = document.querySelector('#dropImage')
  const commentCount = document.querySelector('#comments-count')

  const hide = () => {
    pager.className += ' d-none'
    commentsContainer.className += ' d-none'
    commentCount.className += ' d-none'
  }

  document.getElementById('collapseComments').addEventListener('click', e => {
    isVisible = !isVisible

    if (isVisible) {
      pager.className = 'pager'
      commentsContainer.className = 'comments-container pe-1'
      dropImage.src = '/images/arrow_drop_up.svg'
      commentCount.className = 'comment-count d-flex ms-auto me-4 text-p875rem'
    } else {
      dropImage.src = '/images/arrow_drop_down.svg'
      hide()
    }
  })

  hide()
}
