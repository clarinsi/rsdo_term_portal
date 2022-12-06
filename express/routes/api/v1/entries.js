// This page refers to dictionary entries, not consultancy or other entries
const router = require('express-promise-router')()

const {
  getEntry,
  updateEntry,
  createEntry,
  fetchEntries,
  deleteEntry,
  getEntryVersionSnapshot
} = require('../../../controllers/api/v1/dictionaries')

// TODO Add authorization.

// Render entry data for the selected entry
router.get('/', getEntry)

// Create entry
router.post('/create', createEntry)

// Update entry
router.post('/update', updateEntry)

// Get all entries
router.get('/fetch-terms', fetchEntries)

// Delete selected entry
router.delete('/delete-entry', deleteEntry)

// Get single entry version history snapshot.
router.get('/:entryId/version-snapshots/:version', getEntryVersionSnapshot)

module.exports = router
