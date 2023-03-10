const nodemailer = require('nodemailer')
const htmlToText = require('nodemailer-html-to-text').htmlToText()
const {
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPassword,
  smtpSecure,
  smtpRequireTls,
  smtpAllowInvalidCerts,
  smtpFrom
} = require('../config/keys')

const options = {
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  requireTLS: smtpRequireTls,
  tls: { rejectUnauthorized: !smtpAllowInvalidCerts }
}
if (smtpUser || smtpPassword) {
  options.auth = {
    user: smtpUser,
    pass: smtpPassword
  }
}

const defaults = { from: smtpFrom }

const transporter = nodemailer.createTransport(options, defaults)
transporter.use('compile', htmlToText)

exports.send = data => transporter.sendMail(data)

exports.waitForConnection = () => {
  return new Promise(resolve => {
    async function testConnection() {
      try {
        // eslint-disable-next-line no-console
        console.log('Verifying connection to SMTP server')
        await transporter.verify()
        // eslint-disable-next-line no-console
        console.log('Connection to SMTP server verified')
        resolve()
      } catch {
        // eslint-disable-next-line no-console
        console.error('Could not connect to SMTP server')
        setTimeout(testConnection, 1000)
      }
    }
    testConnection()
  })
}
