var nab = require('./');
var Proxy = require('./proxy');

new Proxy(4243, function () {
  new Proxy(4244, function () {
    nab({
      source: 'https://github.com/generalhenry/Santa-Cruz-Pawn-Shop',
      host: 'http://localhost',
      port: 4245,
      query: {
        t: 'pawn'
      },
      stack: 'node',
      verbose: true
    }, function (err) {
      if (err) {
        console.error(err.stack);
      } else {
        console.log('success');
      }
    });
  });
});

