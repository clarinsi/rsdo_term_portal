const settings = {}
const { getInstanceSetting } = require('../models/helpers')

settings.prepareRequiredSettings = async (req, res, next) => {
  const isExtractionEnabled =
    (await getInstanceSetting('is_extraction_enabled')) === 'T'
  const isDictionariesEnabled =
    (await getInstanceSetting('is_dictionaries_enabled')) === 'T'
  const isConsultancyEnabled =
    (await getInstanceSetting('is_consultancy_enabled')) === 'T'

  // req.extractionEnabled = isExtractionEnabled
  // req.dictionariesEnabled = isDictionariesEnabled
  // req.consultancyEnabled = isConsultancyEnabled

  res.locals.extractionEnabled = isExtractionEnabled
  res.locals.dictionariesEnabled = isDictionariesEnabled
  res.locals.consultancyEnabled = isConsultancyEnabled

  next()
}

module.exports = settings
