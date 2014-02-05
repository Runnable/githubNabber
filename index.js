#!/usr/bin/env node
var tar = require('tar');
var zlib = require('zlib');
var request = require('request');
var archiver = require('archiver');
var fs = require('fs');
var parse = require('./gitUrl');

var archive = archiver.create('tar');
var successfull = /^Successfully built/;
var rootDir = /[^\/]*/;
var succeeded = false;

request(parse(process.argv[2]))
  .pipe(zlib.createGunzip())
  .pipe(tar.Parse())
  .on('entry', function (entry) {
    archive.append(entry, {
      name: entry.props.path.replace(rootDir, 'src'),
      date: entry.props.mtime,
      mode: entry.props.mode
    });
  })
  .on('end', function () {
    archive.append(fs.createReadStream(__dirname +
      '/dockerfiles/' +
      process.argv[3]), {
      name: 'Dockerfile' 
    });
    archive.finalize();

    archive
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
      });
  });