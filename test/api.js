import { expect } from 'chai'
import fetchMock from 'fetch-mock'
import Api, { ApiError } from '../lib/api'
import simple from 'simple-mock'

const buildResponse = (init) => {
  return new Response(new ArrayBuffer(0), init)
}

const buildResponseWithType = (contentType) => {
  return buildResponse({
    headers: new Headers({ 'Content-Type': contentType })
  })
}

describe('Api Library', () => {
  let api = null
  beforeEach(() => {
    api = new Api('http://example.com')
  })

  afterEach(() => {
    simple.restore()
  })

  describe('transformer', () => {
    const jsonSymbol = Symbol('json')
    const textSymbol = Symbol('text')
    const rawSymbol = Symbol('raw')
    beforeEach(() => {
      simple.mock(Response.prototype, 'json').returnWith(jsonSymbol)
      simple.mock(Response.prototype, 'text').returnWith(textSymbol)
      simple.mock(Response.prototype, 'raw').returnWith(rawSymbol)
    })

    it('should select json transformer', () => {
      const response = buildResponseWithType('application/json')
      const trans = api.transformer(response)
      expect(trans).to.be.a.function
      expect(trans()).to.equal(jsonSymbol)
    })

    it('should select text transformer', () => {
      const response = buildResponseWithType('text/xml')
      const trans = api.transformer(response)
      expect(trans).to.be.a.function
      expect(trans()).to.equal(textSymbol)
    })

    it('should select raw transformer', () => {
      const response = buildResponseWithType('something-unknown')
      const trans = api.transformer(response)
      expect(trans).to.be.a.function
      expect(trans()).to.equal(rawSymbol)
    })
  })

  describe('transform', () => {
    const dataSymbol = Symbol('data')
    beforeEach(() => {
      simple.mock(Response.prototype, 'raw').returnWith(dataSymbol)
    })

    it('should resolve with transformed response', (done) => {
      const response = buildResponse({ status: 200 })
      const promise = api.transform(response)
      expect(promise).to.be.an.instanceOf(Promise)
      expect(promise.isFulfilled()).to.be.true
      promise.then(({ data }) => {
        expect(data).to.equal(dataSymbol)
        done()
      })
    })

    it('should reject with transformed response', (done) => {
      const response = buildResponse({ status: 404 })
      const promise = api.transform(response)
      expect(promise).to.be.an.instanceOf(Promise)
      expect(promise.isRejected()).to.be.true
      promise.catch((error) => {
        expect(error).to.be.an.instanceOf(Error)
        expect(error.message).to.match(/ok-status/)
        expect(error.data).to.equal(dataSymbol)
        done()
      })
    })
  })

  describe('buildFullUrl', () => {
    it('should build full url for a relative path', () => {
      expect(api.buildFullUrl('/path')).to.equal('http://example.com/path')
      expect(api.buildFullUrl('path')).to.equal('http://example.com/path')
    })

    it('should keep full url for an absolute path', () => {
      expect(api.buildFullUrl('http://foo.bar/baz')).to.equal('http://foo.bar/baz')
      expect(api.buildFullUrl('www.example.com')).to.equal('www.example.com')
    })
  })

  describe('fetch', () => {
    it('should merge fetch options', () => {
      api = new Api('http://example.com', {
        method: 'get',
        auth: 123
      })
      const mergedOptions = api.mergeOptions({ foo: 'bar', auth: 321 })
      expect(mergedOptions).to.deep.equal({
        method: 'get',
        auth: 321,
        foo: 'bar',
        headers: {}
      })
    })

    it('should merge fetch headers', () => {
      api = new Api('http://example.com', {
        headers: {
          'Content-Type': 'json',
          'Foo': 'Bar'
        }
      })
      const mergedOptions = api.mergeOptions({
        headers: {
          'Content-Type': 'text',
          'Token': '123'
        }
      })
      expect(mergedOptions).to.deep.equal({
        headers: {
          'Content-Type': 'text',
          'Token': '123',
          'Foo': 'Bar'
        }
      })
    })

    it('should fetch from full url', (done) => {
      fetchMock.mock('http://example.com/sample', {
        status: 200,
        body: 'get-request',
        headers: { 'Content-Type': 'text/plain' },
        sendAsJson: false
      })

      api.get('/sample')
        .then(({ response, data }) => {
          expect(response).to.be.an.instanceOf(Response)
          expect(response.status).to.equal(200)
          expect(data).to.equal('get-request')
          done()
        })
    })
  })

  describe('fetchWithJSON', () => {
    it('should throw when no json is given', () => {
      const request = () => api.fetchWithJSON('/')
      expect(request).to.throw(/No JSON object/)
    })

    it('should add headers', () => {
      simple.mock(Api.prototype, 'fetch')
        .resolveWith(null)

      api.fetchWithJSON('/', {})

      expect(Api.prototype.fetch.lastCall.args[1].headers).to.deep.equal({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      })
    })

    it('should transform body to json string', () => {
      simple.mock(Api.prototype, 'fetch')
        .resolveWith(null)

      const json = { foo: 'bar' }
      api.fetchWithJSON('/', json)

      expect(Api.prototype.fetch.lastCall.args[1].body).to.equal(JSON.stringify(json))
    })
  })
})
