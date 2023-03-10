module.exports = {
  isBehindProxy: process.env.IS_BEHIND_PROXY === 'true',
  secret: process.env.SECRET,
  cookiesSecure: process.env.COOKIES_SECURE === 'true',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpRequireTls: process.env.SMTP_REQUIRE_TLS === 'true',
  smtpAllowInvalidCerts: process.env.SMTP_TLS_ALLOW_INVALID_CERTS === 'true',
  smtpFrom: process.env.SMTP_FROM,
  origin: process.env.ORIGIN,
  portalAdminInitialEmail: process.env.PORTAL_ADMIN_INITIAL_EMAIL,
  portalAdminInitialPassword: process.env.PORTAL_ADMIN_INITIAL_PASSWORD,
  extractionApiOrigin: process.env.EXTRACTION_API_ORIGIN
}
