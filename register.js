require('babel-core/register')({
  // ignore 3rd party packages
  // but build those which are written in es6 purely
  ignore: /(?!node_modules\/(fetch-mock))node_modules/
})
