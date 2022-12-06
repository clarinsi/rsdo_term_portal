const debug = require('debug')('termPortal:controllers/api/v1/system')
const Eurotermbank = require('../../../models/system/eurotermbank')

exports.handleCspReports = (req, res) => {
  debug(req.body)
  res.sendStatus(200)
}

exports.syncWithEurotermbank = async (req, res) => {
  try {
    await Eurotermbank.push()
    res.send('Sync successful')
  } catch (error) {
    res.send('Sync failed')
  }
}
