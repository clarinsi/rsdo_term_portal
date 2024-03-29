const { cookiesSecure } = require('../config/keys')

// Duration of validity of a remember me token. 1 year.
const REMEMBER_ME_DURATION_JS = 365 * 24 * 60 * 60 * 1000
exports.REMEMBER_ME_DURATION_SQL = '365 days'

exports.rememberMeCookieSettings = {
  httpOnly: true,
  maxAge: REMEMBER_ME_DURATION_JS,
  secure: cookiesSecure,
  signed: true,
  sameSite: 'lax'
}

exports.DEFAULT_HITS_PER_PAGE = 10

exports.EDITOR_MAX_HITS = 10000

// If you change this one, don't forget to also update the volume mount in docker-compose.prod.yml
// and nodemon ignore flag in package.json scripts.
const DATA_FILES_PATH = 'data_files'
exports.DATA_FILES_PATH = DATA_FILES_PATH

exports.TEMP_EXPORT_PATH = `${DATA_FILES_PATH}/export_temp`

exports.MAX_EXTRACTIONS_PER_USER = 5

exports.ACTIVATION_TOKEN_VALID_DAYS = 7

exports.CHANGE_EMAIL_TOKEN_VALID_DAYS = 7
