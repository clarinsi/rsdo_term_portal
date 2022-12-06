/* global adjustOffsetBy, moveContent */

function mobileMoveContent() {
  moveContent('admin-nav-mobile')
}

window.addEventListener('load', () => {
  try {
    adjustOffsetBy()
    mobileMoveContent()
  } catch (e) {}
})
