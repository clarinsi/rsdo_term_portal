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

// Delete all entries of specific dictionary.
router.delete('/:dictionaryId/entries/all', dictionaries.deleteAllEntries)

// Publish all entries of specific dictionary.
router.put('/:dictionaryId/entries/all/publish', dictionaries.publishAllEntries)

// Import term candidates from extraction.
router.post(
  '/:id/import/extraction/:extractionId',
  dictionaries.extractionImport
)

module.exports = router
