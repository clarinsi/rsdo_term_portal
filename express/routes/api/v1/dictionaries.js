const router = require('express-promise-router')()

const dictionaries = require('../../../controllers/api/v1/dictionaries')
const user = require('../../../middleware/user')

// Update domain labels.
router.post('/update-domain-labels', dictionaries.updateDomainLabels)

// Update secondary domains
router.post(
  '/renovateSecondaryDomains',
  user.canAdministrateDictionaries,
  dictionaries.renovateSecondaryDomains
)

// Delete specific dictionary.
router.delete(
  '/:dictionaryId',
  user.canAdministrateDictionary,
  dictionaries.delete
)

// Change page in pagination
router.get(
  '/listAllDictionaries',
  user.canAdministrateDictionaries,
  dictionaries.listDictionaries
)

// Change page in pagination
router.get(
  '/:dictionaryId/listDomainLabels',
  user.canAdministrateDictionary,
  dictionaries.listDomainLabels
)

// Change page in pagination
router.get(
  '/:dictionaryId/showImportFromFileForm',
  user.canContentEdit,
  dictionaries.showImportFromFileForm
)

// Change page in pagination
router.get(
  '/:dictionaryId/showExportToFileForm',
  user.canContentEdit,
  dictionaries.showExportToFileForm
)

// Delete all entries of specific dictionary.
router.delete(
  '/:dictionaryId/entries/all',
  user.canAdministrateDictionary,
  dictionaries.deleteAllEntries
)

// Publish all entries of specific dictionary.
router.put(
  '/:dictionaryId/entries/all/publish',
  user.canAdministrateDictionary,
  dictionaries.publishAllEntries
)

// Import term candidates from extraction.
router.post(
  '/:dictionaryId/import-extraction/:extractionId',
  user.canContentEdit,
  dictionaries.importFromExtraction
)

// Export dictionary into a file.
router.post(
  '/:dictionaryId/export-begin',
  user.canContentEdit,
  dictionaries.exportBegin
)

router.get(
  '/:dictionaryId/domainLabels',
  user.canContentEdit,
  dictionaries.listFilteredDomainLabels
)

router.get(
  '/secondaryDomains',
  user.canAdministrateDictionaries,
  dictionaries.listSecondaryDomainData
)

module.exports = router
