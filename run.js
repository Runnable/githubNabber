var nab = require('./');

nab({
  source: 'https://github.com/tardate/jtab',
  destination: 'http://172.16.42.43:4243/build',
  stack: 'web'
}, function (err) {
  if (err) {
    throw err;
  } else {
    console.log('success');
  }
});