var tar = require('tar');
var zlib = require('zlib');
var Docker = require('dockerode');
var request = require('request');
var archiver = require('archiver');
var fs = require('fs');

var archive = archiver.create('tar');
var docker = new Docker({host: 'http://172.16.42.43', port: 4243});

request('https://github.com/Runnable/dockworker/archive/master.tar.gz')
  .pipe(zlib.createGunzip())
  .pipe(tar.Parse())
  .on('entry', function (entry) {

    archive.append(entry, {
      name: entry.props.path.replace(/[^\/]*/,'src'),
      date: entry.props.mtime,
      mode: entry.props.mode
    });
  })
  .on('end', function () {
    archive.append('FROM runnable/node\n' +
      'WORKDIR /root\n' +
      'ADD ./src /root\n' +
      'RUN cd /root && npm install\n' +
      'CMD npm start', { name: 'Dockerfile' });
    archive.finalize(function (err, bytes) {
      console.log('DONE', bytes);
    });

    archive
      .pipe(zlib.createGzip())
      .pipe(fs.createWriteStream(__dirname + '/out.tar.gz'));

    archive
      .pipe(request.post({
        url: 'http://172.16.42.43:4243/build',
        headers: {
          "Content-type": "application/tar"
        }
      }))
      .on('data', function (raw) {
        var data = JSON.parse(raw);
        if (data.stream) {
          process.stdout.write(data.stream);
        } else {
          console.log(data);
        }
      });
  });