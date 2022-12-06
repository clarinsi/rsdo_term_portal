const crypto = require('crypto')

module.exports = {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      scriptSrc: [
        generateCspNonce,
        "'strict-dynamic'",
        'https:',
        "'unsafe-inline'"
      ],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https:'],
      imgSrc: ["'self'", 'data:'],
      // Disabled TT due to jQuery using sink functions and trying to sanitize
      // produced HTML with DOMPurify breaks functionality of summernote.
      // requireTrustedTypesFor: ["'script'"],
      reportUri: ['/api/v1/system/csp-reports']
    }
  },

  referrerPolicy: {
    policy: ['no-referrer', 'strict-origin-when-cross-origin']
  }
}

// TODO CSP nonce is generated for every request.
// It would only really be needed (CSP in general) for the ones which return HTML documents
// and not for all the other (static) resources (styles, scrips, images, ...)
// Consider: caching static resources, using hash based policy instead of nonce or other ...

function generateCspNonce(req, res) {
  const cspNonce = crypto.randomBytes(16).toString('base64')
  res.locals.cspNonce = cspNonce
  return `'nonce-${cspNonce}'`
}
