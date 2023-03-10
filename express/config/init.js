const { mkdir } = require('fs/promises')
const { TEMP_EXPORT_PATH } = require('./settings')

module.exports = async () => {
  await mkdir(TEMP_EXPORT_PATH, { recursive: true })
}
