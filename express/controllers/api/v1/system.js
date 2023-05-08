const Eurotermbank = require('../../../models/system/eurotermbank')
// const debug = require('debug')('termPortal:controllers/api/v1/system')

exports.handleCspReports = (req, res) => {
  // eslint-disable-next-line no-console
  console.error(req.body)
  res.end()
}

exports.syncWithEurotermbank = async (req, res) => {
  try {
    await Eurotermbank.push()
    res.send('Sync successful')
  } catch (error) {
    res.send('Sync failed')
  }
}
