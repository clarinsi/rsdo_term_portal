const router = require('express-promise-router')()

const dictionaries = require('../../../controllers/api/v1/dictionaries')

// Update domain labels.
router.post('/update-domain-labels', dictionaries.updateDomainLabels)

// Update secondary domains
router.post('/renovateSecondaryDomains', dictionaries.renovateSecondaryDomains)

// Delete specific dictionary.
router.delete('/:dictionaryId', dictionaries.delete)

// Change page in pagination
router.get('/listAllDictionaries', dictionaries.listDictionaries)

// Change page in pagination
router.get('/:dictionaryId/listDomainLabels', dictionaries.listDomainLabels)

// Change page in pagination
router.get('/listSecondaryDomains', dictionaries.listSecondaryDomains)

// Change page in pagination
router.get(
  '/:dictionaryId/showImportFromFileForm',
  dictionaries.showImportFromFileForm
)

// Change page in pagination
router.get(
  '/:dictionaryId/showExportToFileForm',
  dictionaries.showExportToFileForm
)

// Delete all entries of specific dictionary.
router.delete('/:dictionaryId/entries/all', dictionaries.deleteAllEntries)

// Publish all entries of specific dictionary.
router.put('/:dictionaryId/entries/all/publish', dictionaries.publishAllEntries)

// Import term candidates from extraction.
router.post(
  '/:id/import-extraction/:extractionId',
  dictionaries.importFromExtraction
)

// Export dictionary into a file.
router.post('/:id/export-begin', dictionaries.exportBegin)

router.get('/:dictionaryId/domainLabels', dictionaries.listFilteredDomainLabels)

router.get('/secondaryDomains', dictionaries.listSecondaryDomainData)

module.exports = router
