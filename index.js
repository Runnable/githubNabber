#!/usr/bin/env node
var tar = require('tar-stream');
var zlib = require('zlib');
var request = require('request');
var fs = require('fs');
var parse = require('./gitUrl');
var domain = require('domain').create();

domain.on('error', console.error);

domain.run(function () {
  var extract = tar.extract();
  var pack = tar.pack();
  var successfull = /^Successfully built/;
  var rootDir = /[^\/]*/;
  var succeeded = false;

  fs.readFile(__dirname +
    '/dockerfiles/' +
    process.argv[3],
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

  request(parse(process.argv[2]))
    .pipe(zlib.createGunzip())
    .pipe(extract);

  pack.pipe(fs.createWriteStream(__dirname + '/out.tar'));

  pack
    .pipe(request.post({
      url: 'http://172.16.42.43:4243/build',
      headers: {
        "Content-type": "application/tar"
      }
    }))
    .on('data', function (raw) {
      try {
        var data = JSON.parse(raw);
        if (data.stream) {
          if (successfull.test(data.stream)) {
            succeeded = true;
          }
          process.stdout.write(data.stream);
        } else {
          console.log(data);
        }
      } catch (err) {
        console.log(raw.toString());
      }
    })
    .on('end', function () {
      console.log('Succeeded', succeeded);
    })
    .on('error', function (err) {
      console.error('FAIL', err, err.stack);
    });
});
