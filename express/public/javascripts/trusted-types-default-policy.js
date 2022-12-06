/* global trustedTypes, DOMPurify */
if (window.trustedTypes && trustedTypes.createPolicy) {
  trustedTypes.createPolicy('default', {
    createHTML: (string, sink) => {
      const trustedType = DOMPurify.sanitize(string, {
        RETURN_TRUSTED_TYPE: true
      })

      console.log('REMOVED:', DOMPurify.removed) // eslint-disable-line

      return trustedType
    }
  })
}
