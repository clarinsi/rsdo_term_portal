const router = require('express-promise-router')()
const user = require('../../../middleware/user')

const {
  create,
  syncRemoteDictionaries,
  fetchDictionary,
  updatePortalStatus,
  listSelectedLinkedDicts,
  listAllLinkedDicts,
  deleteLinkedDictionary
} = require('../../../controllers/api/v1/portals')

// All further routes are only available to portal admin.
router.use(user.isAuthenticated, user.isPortalAdmin)

// Create new portal connection
router.post('/createPortal', create)

// Synchronize all dictionaries (without entries) for linked portal.
router.put('/:linkedPortalId/dictionaries', syncRemoteDictionaries)

// Delete linked portal.
router.delete('/:linkedPortalId/deleteLinkedDictionary', deleteLinkedDictionary)

// Fetch all dictionaries for selected portal
router.get('/getMyDictionaries', fetchDictionary)

// Update selected portal status (enable or disable)
router.post('/updatePortalStatus', updatePortalStatus)

// Fetch new page of dictionaries for pagination
router.get('/:portalId/listSelectedLinkedDicts', listSelectedLinkedDicts)

// Fetch new page of all linked dictionaries for pagination
router.get('/listAllLinkedDicts', listAllLinkedDicts)

module.exports = router
