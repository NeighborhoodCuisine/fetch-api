import Url from 'url'
import queryString from 'query-string'
import debug from 'debug'
const log = debug('api')

/**
 * Error thrown when Api encounters errors while
 * receiving or transforming data.
 */
export class ApiError extends Error {}

export default class Api {
  constructor(apiUrl = '', options = {}) {
    if (typeof apiUrl !== 'string') {
      throw new ApiError('Provide a valid api url.')
    }

    this.API_ROOT = apiUrl
    this.options = options
  }

  /**
   * Prepend API_ROOT to url when it is a relative path.
   * @param {String} url
   * @return {String} full url
   */
  buildFullUrl(url) {
    url = url.toString()
    return (/(http:\/\/|www)/.test(url)) ? url : Url.resolve(this.API_ROOT, url)
  }

  /**
   * Add an auth token to the headers of the next fetch operation.
   * @param {String} token
   * @return {Api} new api instance with configured auth token
   */
  auth(token) {
    if (token === null) {
      throw new ApiError('AuthToken is null. Authorized API calls cannot be send.')
    }

    const mergedOptions = this.mergeOptions({
      headers: {
        'Authorization': `Token ${token}`
      },
      mode: 'cors'
    })

    return new Api(this.apiUrl, mergedOptions)
  }

  /**
   * Select response body transform method by
   * inspecting contentType.
   * @param {String} contentType
   * @return {String} method name
   */
  transformerFromContentType(contentType) {
    if (typeof contentType !== 'string') {
      return 'raw'
    }

    if (contentType.match(/json/)) {
      return 'json'
    }

    if (contentType.match(/text\//)) {
      return 'text'
    }

    return 'raw'
  }

  transformer(response) {
    const contentType = response.headers.get('Content-Type')
    const transformerName = this.transformerFromContentType(contentType)

    if (typeof response[transformerName] !== 'function') {
      throw new ApiError(`Response has no transformer with name ${transformerName}`)
    }

    return response[transformerName].bind(response)
  }

  transform(response) {
    log('fetch response status', response)

    const data = this.transformer(response)()

    if (!response.ok) {
      const error = new ApiError(`Response has no ok-status (${response.status} - ${response.statusText})`)
      error.response = response

      if (typeof data.then === 'function') {
        return data.then((data) => {
          error.data = data
          return Promise.reject(error)
        })
      }

      error.data = data
      return Promise.reject(error)
    }

    if (typeof data.then === 'function') {
      // use explicit Promise.resolve as Reponse may use a non-bluebird promise
      return data.then(data => Promise.resolve({ response, data }))
    }

    return Promise.resolve({ response, data })
  }

  mergeOptions(options) {
    const mergedHeaders = {...this.options.headers || {}, ...options.headers || {}}
    const mergedQuery = {...this.options.query || {}, ...options.query || {}}
    return {...this.options, ...options, headers: mergedHeaders, query: mergedQuery}
  }

  //
  // Fetching
  //

  /**
   * Fetch response from url.
   * @param {String} url absolute or relative path to fetch from
   * @param {[Object]} options fetch options, merged with api options
   * @return {Promise} fetch promise
   */
  fetch(url, options = {}) {
    const mergedOptions = this.mergeOptions(options)

    if (mergedOptions.query) {
      url = url + '?' + queryString.stringify(mergedOptions.query)
    }
    const fullUrl = this.buildFullUrl(url)

    log('fetch on %s', fullUrl)
    log('fetch Options', mergedOptions)

    return fetch(fullUrl, mergedOptions)
      .then(this.transform.bind(this))
  }

  fetchWithJSON(url, json, options) {
    if (json === undefined) {
      throw new ApiError('No JSON object given')
    }

    return this.fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(json)
    })
  }

  get(url, options) {
    return this.fetch(url, {...options, method: 'get'})
  }

  post(url, options) {
    return this.fetch(url, {...options, method: 'post'})
  }

  postJSON(url, json, options) {
    return this.fetchWithJSON(url, json, {...options, method: 'post' })
  }

  put(url, options) {
    return this.fetch(url, {...options, method: 'put'})
  }

  putJSON(url, json, options) {
    return this.fetchWithJSON(url, json, {...options, method: 'put' })
  }
}
