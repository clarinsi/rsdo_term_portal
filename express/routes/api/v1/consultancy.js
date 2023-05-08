const router = require('express-promise-router')()

const {
  assign,
  createQuestion,
  deleteQuestion,
  updateDomain,
  insertConsultantAndHisDomainsByUsername,
  insertNonModerator,
  deleteConsultantForEntry,
  getSharedAuthors,
  getSharedAuthorsBeforePublish,
  removeConsultant,
  reject,
  sendToReview,
  publish,
  updateQuestion,
  updateSharedAuthors,
  sendPaginationData
} = require('../../../controllers/api/v1/consultancy')

router.get('/entry-pagination', sendPaginationData)

// All routes require an authenticated user.
router.use((req, res, next) => {
  if (req.isAuthenticated()) return next()
  res.status(400).send('Unauthenticated')
})

router.post('/entry', createQuestion)

router.put('/entry', updateQuestion)

// Authorize endpoints for portal admin below.
router.use((req, res, next) => {
  if (req.user.hasRole('portal admin')) return next()
  res.status(400).send('Unauthorized')
})

// router.use(checkUserAdminPrivilegeUltility)

router.post(
  '/add-consultant-by-username',
  insertConsultantAndHisDomainsByUsername
)

router.post('/add-non-moderator', insertNonModerator)

// Remove user from role "consultant"
// body params: id -> user's id

router.get('/get-shared-authors', getSharedAuthorsBeforePublish)

router.get('/get-shared-authors-publish', getSharedAuthors)

router.put('/update-consultant-domain', updateDomain)

router.put('/update-shared-authors', updateSharedAuthors)

router.put('/assign', assign)

router.put('/reject', reject)

router.put('/review', sendToReview)

router.put('/publish', publish)

router.delete('/delete-consultant', removeConsultant)

router.delete('/delete-consultant-author', deleteConsultantForEntry)

router.delete('/delete', deleteQuestion)

module.exports = router
