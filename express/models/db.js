const { Pool, Client } = require('pg')
const debug = require('debug')('termPortal:models/db')

const pool = new Pool()

pool.on('error', (err, client) => {
  debug('Error on DB pool idle client:')
  debug({ err, client })
})

exports.query = (text, params) => pool.query(text, params)

exports.getClient = () => pool.connect()

// Returns a new client from outside the pool.
exports.getExtraClient = () => {
  const client = new Client()
  client.connect()
  return client
}

exports.transaction = async queriesFn => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await queriesFn(client)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

exports.genParamStr = paramArr => {
  const paramPlaceholderString = paramArr.reduce((str, param, index) => {
    if (index) str += ', '
    str += `$${index + 1}`

    return str
  }, '')

  return paramPlaceholderString
}

exports.waitForConnection = () => {
  return new Promise(resolve => {
    async function testConnection() {
      try {
        // eslint-disable-next-line no-console
        console.log('Verifying connection to DB server')
        await pool.query('SELECT 1')
        // eslint-disable-next-line no-console
        console.log('Connection to DB server verified')
        resolve()
      } catch {
        // eslint-disable-next-line no-console
        console.error('Could not connect to DB server')
        setTimeout(testConnection, 1000)
      }
    }
    testConnection()
  })
}
