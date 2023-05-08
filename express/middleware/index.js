const { getInstanceSetting } = require('../models/helpers')

exports.enhanceLocals = async (req, res, next) => {
  res.locals.portalCode = await getInstanceSetting('portal_code')
  res.locals.flashInfo = req.flash('info')

  next()
}

exports.adjustHeaders = async (req, res, next) => {
  res.set('Cache-Control', 'no-cache, private')

  next()
}
