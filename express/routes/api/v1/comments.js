const router = require('express-promise-router')()

const {
  listComments,
  createComment,
  seedComments,
  clearComments,
  updateStatus
} = require('../../../controllers/api/v1/comments')

// List comments (one page).
router.get('/', listComments)

// TEMP - Seed comments.
router.get('/seed/:commentCount', seedComments)

// TEMP - Clear comments.
router.get('/clear', clearComments)

// All further routes are only available to authenticated users.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.status(400).end()
})

// Create new comment.
router.post('/', createComment)

// Change comment's visibility status
router.post('/updateStatus', updateStatus)

module.exports = router
