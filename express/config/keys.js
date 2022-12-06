module.exports = {
  isBehindProxy: process.env.IS_BEHIND_PROXY === 'true',
  secret: process.env.SECRET,
  cookiesSecure: process.env.COOKIES_SECURE === 'true',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpTlsRejectUnauthorized:
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'true',
  smtpFrom: process.env.SMTP_FROM,
  origin: process.env.ORIGIN
}
