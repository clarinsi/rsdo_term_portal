const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const RememberMeStrategy = require('passport-remember-me-extended').Strategy
const bcrypt = require('bcrypt')
const db = require('../models/db')
const User = require('../models/user')
const {
  rememberMeCookieSettings,
  REMEMBER_ME_DURATION_SQL
} = require('../config/settings')

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    // TODO Consider storing this data in cache.
    // TODO In that case, make sure to invalidate it at every (relevant) data change.

    const user = await User.fetchDeserializedDataById(id)

    // TODO Consider what to do if no user was found?
    done(null, user)
  } catch (error) {
    done(error)
  }
})

passport.use(
  new LocalStrategy(
    { passReqToCallback: true, usernameField: 'usernameOrEmail' },
    async (req, usernameOrEmail, password, done) => {
      try {
        const { rows } = await db.query(
          'SELECT id, status, bcrypt_hash FROM "user" WHERE username = $1 OR email = $1',
          [usernameOrEmail]
        )
        const user = rows[0]

        if (!user) {
          return done(null, false, {
            message: req.t(
              'Nepravilno uporabniško ime, elektronski naslov ali geslo.'
            )
          })
        }

        if (user.status !== 'active') {
          return done(null, false, {
            message: req.t(
              'Uporabniški račun še ni aktiviran. Kliknite aktivacijsko povezavo, katero smo vam poslali po elektronski pošti.'
            )
          })
        }

        const isCorrectPassword = await bcrypt.compare(
          password,
          user.bcrypt_hash
        )
        if (!isCorrectPassword) {
          return done(null, false, {
            message: req.t(
              'Nepravilno uporabniško ime, elektronski naslov ali geslo.'
            )
          })
        }

        delete user.bcrypt_hash
        done(null, user)
      } catch (error) {
        done(error)
      }
    }
  )
)

passport.use(
  new RememberMeStrategy(
    { cookie: rememberMeCookieSettings, signed: true },
    async (token, done) => {
      try {
        const text = `
          DELETE 
          FROM user_token_remember_me t
          WHERE
            t.token = $1
            AND AGE(NOW(), t.time_created) < $2::INTERVAL
          RETURNING (SELECT u.id FROM "user" u where u.id = t.user_id)
        `
        const values = [token, REMEMBER_ME_DURATION_SQL]

        let {
          rows: [user]
        } = await db.query(text, values)

        if (!user) return done(null, false)

        user = await User.fetchDeserializedDataById(user.id)

        done(null, user)
      } catch (error) {
        done(error)
      }
    },
    async (user, done) => {
      try {
        const token = await User.generateRememberMeToken()
        await User.saveRememberMeToken(user, token)
        done(null, token)
      } catch (error) {
        done(error)
      }
    }
  )
)

module.exports = passport
