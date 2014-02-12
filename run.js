var nab = require('./');

nab({
  source: 'https://github.com/generalhenry/Santa-Cruz-Pawn-Shop',
  host: 'http://172.16.42.43',
  port: 4243,
  query: {
  	t: 'pawn'
  },
  stack: 'web',
  verbose: true
}, function (err) {
  if (err) {
    throw err;
  } else {
    console.log('success');
  }
});