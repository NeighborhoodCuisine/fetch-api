# fetch-api

[![Build Status](https://travis-ci.org/NeighborhoodCuisine/fetch-api.svg?branch=master)](https://travis-ci.org/NeighborhoodCuisine/fetch-api)

A tiny fetch wrapper to write simple apis. Supports authentication tokens and runs on ES6 Promises.

## Install

```bash
npm install NeighborhoodCuisine/fetch-api --save
```

Use `npm test` to run unit tests.

## Usage

```javascript
import Api from 'fetch-api'

// create a new api
const api = new Api('http://example.com')

// get from relative route
api.get('/sample').then(({ response, data }) => {
// response is the original fetch reponse
// data is parsed and transformed response body, guessed by Content-Type header

// ... cast your magic
}))

// get absolute route
api.get('http://another.com/sample')

// use get, put, post
api.get
api.put
api.post

// or use fetch directly
api.fetch(url, options)

// each request accepts an options Object as second parameter
// these are original fetch options
api.get('/sample', {
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors'
})
```
