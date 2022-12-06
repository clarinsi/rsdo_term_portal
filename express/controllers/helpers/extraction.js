const Extraction = require('../../models/extraction')

// Check if extraction process can be started.
exports.checkIfcanBegin = async extraction => {
  if (extraction.status !== 'new') return false

  if (extraction.ossParams) return extraction.ossParams.status === 'confirmed'

  const documentsNames = await Extraction.fetchAllDocumentsNames(extraction.id)
  return !!documentsNames.length
}
