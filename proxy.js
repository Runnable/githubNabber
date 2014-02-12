var Docker = require('dockerode');
var express = require('express');

function Proxy (port, cb) {
  var app = express();
  var host = port === 4243 ? 'http://172.16.42.43' : 'http://localhost';
  var docker = new Docker({host: host, port: port});
  app.post('/build', function (req, res) {
    docker.buildImage(req, req.query, function (err, resp) {
      if (err) {
        res.send(502);
      } else {
        resp.pipe(res);
      }
    });
  });
  app.listen(port + 1, cb);
}

module.exports = Proxy;