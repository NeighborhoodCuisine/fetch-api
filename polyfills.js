function polyfillBluebird() {
  let local = null
  const Promise = require('bluebird')

  // configuration
  Promise.config({
    longStrackTraces: true,
    warnings: true
  })

  if (typeof global !== 'undefined') {
    local = global
  } else if (typeof self !== 'undefined') {
    local = self
  } else {
    try {
      local = Function('return this')()
    } catch (e) {
      throw new Error(
        'Bluebird polyfill failed because global object' +
        ' is unavailable in this environment'
      )
    }
  }

  local.Promise = Promise
}

//
// Execute Polyfills
//

import 'babel-polyfill'
polyfillBluebird()
import 'isomorphic-fetch'
