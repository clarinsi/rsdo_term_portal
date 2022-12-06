const Redis = require('ioredis')
const debug = require('debug')('termPortal:models/cache')

const client = new Redis({ host: 'redis' })

client.on('error', debug)

const isReadyPromise = new Promise(resolve => client.on('ready', resolve))

client.waitForConnection = async () => {
  // eslint-disable-next-line no-console
  console.log('Waiting for cache to be ready')
  await isReadyPromise
  // eslint-disable-next-line no-console
  console.log('Cache is ready')
}

module.exports = client
