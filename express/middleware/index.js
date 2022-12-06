const { getInstanceSetting } = require('../models/helpers')

exports.enhanceLocals = async (req, res, next) => {
  res.locals.portalCode = await getInstanceSetting('portal_code')
  next()
}
