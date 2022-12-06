const nodemailer = require('nodemailer')
const htmlToText = require('nodemailer-html-to-text').htmlToText()
const {
  smtpHost,
  smtpPort,
  smtpTlsRejectUnauthorized,
  smtpFrom
} = require('../config/keys')

const options = {
  host: smtpHost,
  port: smtpPort,
  tls: { rejectUnauthorized: smtpTlsRejectUnauthorized }
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
