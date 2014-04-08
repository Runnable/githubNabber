var app = require('express')();
var zlib = require('zlib');
var tar = require('tar');
var join = require('path').join;

var images = {};

app.post('/build', function (req, res, next) {
  images[req.query.t] = true;
  var foundDockerFile = false;
  if (req.headers['content-type'] === 'application/x-gzip') {
    req = req.pipe(zlib.createGunzip());
  }
  req.pipe(tar.Parse()).
    on('entry', function (entry) {
      if (entry.props.path === './Dockerfile') dockerFileFound = true;
    }).
    on('end', function () {
      if (dockerFileFound) res.send(200, 'Successfully built 0a1a75086368');
      else res.send(500, 'Server Error - A Dockerfile is required.');
    });
});

app.del('/images/:name', deleteImage);
app.del('/images/:repository/:name', deleteImage);

function deleteImage (req, res, next) {
  var name = req.params.name;
  if (req.params.repository) name = join(req.params.repository, name);
  if (images[name]) {
    delete images[name];
    res.send(200);
  } else {
    res.send(404, 'No such image.');
  }
}

app.all('*', function (req, res, next) {
  res.send(404);
  console.log(req.url, req.method);
});

if (process.env.NODE_ENV === 'testing' && !process.env.TEST_USING_DOCKER) {
  console.log('Dcoker mock on port 5253');
  app.listen(5253);
}
