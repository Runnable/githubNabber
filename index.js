var tar = require('tar-stream');
var zlib = require('zlib');
var request = require('request');
var fs = require('fs');
var parse = require('./gitUrl');
var createDomain = require('domain').create;

var successfull = /Successfully built/;
var rootDir = /[^\/]*/;


module.exports = function (options, cb) {
  var domain = createDomain();

  domain.on('error', cb);

  domain.run(function () {
    var extract = tar.extract();
    var pack = tar.pack();
    var succeeded = false;

    fs.readFile(__dirname +
      '/dockerfiles/' +
      options.stack,
      domain.intercept(function (file) {
        pack.entry({ name: 'Dockerfile' }, file);
      }));

    extract
      .on('entry', function (header, stream, callback) {
        header.name = header.name.replace(rootDir, 'src');
        if (header.type === 'directory') {
          callback();
        } else {
          stream.pipe(pack.entry(header, callback));
        }
      })
      .on('finish', function () {
        pack.finalize();
      });

    request(parse(options.source))
      .pipe(zlib.createGunzip())
      .pipe(extract);

    pack
      .pipe(request.post({
        url: options.destination,
        headers: {
          "Content-type": "application/tar"
        }
      }))
      .on('data', function (raw) {
        try {
          var data = JSON.parse(raw);
          if (data.stream && successfull.test(data.stream)) {
            succeeded = true;
          }
        } catch (err) {}
        if (successfull.test(raw.toString())) {
          succeeded = true;
        }
      })
      .on('end', function (data) {
        if (succeeded) {
          cb();
        } else {
          cb(new Error('Failed to build'));
        }
      });
  });
};