const i18next = require('i18next')
const i18nextMiddleware = require('i18next-http-middleware')
const i18nextBackend = require('i18next-fs-backend')

// If you change this one, don't forget to also update the nodemon ignore flag in package.json scripts.
const LOCALES_PATH = 'public/locales'
const DEFAULT_LANGUAGE = 'sl'

exports.determineRequestLanguage = (req, res, next) => {
  const language =
    req.user?.language || req.session.language || DEFAULT_LANGUAGE

  req.determinedLanguage = language
  res.locals.determinedLanguage = language
  next()
}

const customLanguageDetector = {
  name: 'ownDetector',
  lookup(req) {
    return req.determinedLanguage
  }
}
const languageDetector = new i18nextMiddleware.LanguageDetector()
languageDetector.addDetector(customLanguageDetector)

const inDevEnv = process.env.NODE_ENV === 'development'
i18next
  .use(languageDetector)
  .use(i18nextBackend)
  .init({
    // debug: true,
    supportedLngs: ['sl', 'en', 'dev'],
    preload: ['sl', 'en'],
    ns: ['core', 'extended'],
    defaultNS: 'core',
    // TODO Reenable separators once keys are refactored (also in frontend init in scripts.js)
    nsSeparator: false,
    keySeparator: false,
    ...(inDevEnv && { saveMissing: true }),
    ...(!inDevEnv && { fallbackLng: false }),
    detection: { order: ['ownDetector'] },
    backend: {
      loadPath: `${LOCALES_PATH}/{{lng}}/{{ns}}.json`,
      addPath: `${LOCALES_PATH}/{{lng}}/{{ns}}.json`
    }
  })
