// Import 3rd party node modules.
const express = require('express')
const path = require('path')
const logger = require('morgan')
const helmet = require('helmet')
const favicon = require('serve-favicon')
const cookieParser = require('cookie-parser')
const createError = require('http-errors')
const i18next = require('i18next')
const i18nextMiddleware = require('i18next-http-middleware')
// const debug = require('debug')('termPortal:app')

// Import own modules.
const { isBehindProxy, secret } = require('./config/keys')
const helmetConfig = require('./config/helmet')
const session = require('./middleware/session')
const i18n = require('./middleware/i18n')
const passport = require('./middleware/auth')
const user = require('./middleware/user')
const settings = require('./middleware/settings')
const { enhanceLocals } = require('./middleware')

// Import Routers.
const apiRouter = require('./routes/api')
const adminRouter = require('./routes/admin')
const dictionariesRouter = require('./routes/dictionaries')
const extractionRouter = require('./routes/extraction')
const consultancyRouter = require('./routes/consultancy')
const indexRouter = require('./routes/index')

// Create express app.
const app = express()

// View engine setup.
const viewsPath = path.join(__dirname, 'views')
app.set('view engine', 'pug')
app.set('views', viewsPath)
app.locals.basedir = viewsPath

// Other settings.
const inDevEnv = app.get('env') === 'development'
if (isBehindProxy) app.set('trust proxy', 1) // Trust first proxy.
app.locals.inDevEnv = inDevEnv

// Mount middleware.
app.use(logger('dev'))
app.use(helmet(helmetConfig))
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json({ type: ['application/json', 'application/csp-report'] }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser(secret))
app.use(session)
app.use(passport.initialize())
app.use(passport.session())
app.use(passport.authenticate('remember-me'))
app.use(i18n.determineRequestLanguage)
app.use(i18nextMiddleware.handle(i18next))
app.use(user.enhance)
app.use(settings.prepareRequiredSettings)
app.use(enhanceLocals)

if (inDevEnv) {
  app.post(
    '/locales/add/:lng/:ns',
    i18nextMiddleware.missingKeyHandler(i18next)
  )
}

// Apparently express-debug can't be run inside another middleware and must be run in this file.
// To help you debug, temporarily uncomment the next line, but comment the helmet line due to strict CSP.
// if (app.get('env') === 'development') require('express-debug')(app)

// Pretty printing pug output is strongly ill-advised and deprecated, since too often, it creates subtle bugs.
// But if you really need it to help you debug, you can temporarily enable the next line.
// app.locals.pretty = true

// Mount routers.
app.use('/api', apiRouter)
app.use('/admin', adminRouter)
app.use('/slovarji', dictionariesRouter)
app.use('/luscenje', extractionRouter)
app.use('/svetovanje', consultancyRouter)
app.use('/', indexRouter)

// Catch 404 and forward to error handler.
app.use((req, res, next) => next(createError(404)))

// Error handler.
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  if (err.status !== 404) console.error(err)

  // Set error info to be displayed to user depending on environment.
  let message, error

  if (inDevEnv || err.displayInProd) {
    message = err.message
    error = err
  } else {
    message =
      err.status === 404
        ? req.t('Stran ne obstaja')
        : req.t('Prišlo je do strežniške napake. Poskusite kasneje.')
    error = {}
  }

  res.status(err.status || 500)

  // Send plain error message for ajax requests.
  if (req.isAjax) {
    return res.send(message)
  }

  // Render the error page.
  res.render('error', { title: req.t('Napaka'), message, error })
})

module.exports = app
