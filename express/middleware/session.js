const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const { secret, cookiesSecure } = require('../config/keys')
const redisClient = require('../models/cache')

const SESSION_DURATION = 1000 * 60 * 60 * 2 // 2 hours.
const SESSION_ID_COOKIE_NAME = 'sid'
// const RETRY_PERIOD = 3000 // 3 seconds.

const options = {
  cookie: { maxAge: SESSION_DURATION, sameSite: 'lax', secure: cookiesSecure },
  secret,
  name: SESSION_ID_COOKIE_NAME,
  rolling: true,
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redisClient })
}

module.exports = session(options)

// Aditional checking logic below.
// Export it instead of the middleware above if it proves necessary.

// const sessionMiddleware = session(options)

// function verifiedSession(req, res, next) {
//   let tries = 3
//   let timeoutId

//   function lookupSession(err) {
//     clearTimeout(timeoutId)

//     if (err) return next(err)

//     if (req.session !== undefined) return next()

//     tries -= 1

//     if (tries < 0) {
//       return next(Error('Session store unresponsive'))
//     }

//     sessionMiddleware(req, res, lookupSession)

//     if (req.session === undefined) {
//       timeoutId = setTimeout(lookupSession, RETRY_PERIOD)
//     }
//   }

//   lookupSession()
// }

// module.exports = verifiedSession
