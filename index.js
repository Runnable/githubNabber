var tar = require('tar-stream');
var zlib = require('zlib');
var request = require('request');
var fs = require('fs');
var parse = require('./gitUrl');
var parseDockerfile = require('./parseDockerfile');
var concat = require('concat-stream');
var createDomain = require('domain').create;
var Docker = require('dockerode');

var successfull = /Successfully built/;
var rootDir = /[^\/]*/;
var isReadme = /^src\/([Rr][Ee][Aa][Dd][Mm][Ee]\.?.+?)$/;


module.exports = function (options, cb) {
  var domain = createDomain();

  domain.on('error', cb);

  domain.run(function () {
    var docker = new Docker({host: options.host, port: options.port});
    var extract = tar.extract();
    var pack = tar.pack();
    var succeeded = false;
    var response;
    var readme;

    fs.readFile(__dirname +
      '/dockerfiles/' +
      options.stack,
      domain.intercept(function (file) {
        response = parseDockerfile(file);
        pack.entry({ name: './Dockerfile' }, file);
      }));

    extract
      .on('entry', function (header, stream, callback) {
        header.name = header.name.replace(rootDir, './src');
        if (header.type === 'directory') {
          pack.entry(header);
          callback();
        } else if (header.type === 'file') {
          if (isReadme.test(header.name)) {
            stream.pipe(concat(function (contents) {
              readme = {
                name: isReadme.exec(header.name)[1],
                contents: contents.toString()
              }
            }));
          }
          stream.pipe(pack.entry(header, callback));
        } else {
          callback();
        }
      })
      .on('finish', function () {
        pack.finalize();
      });

    request(parse(options.source))
      .pipe(zlib.createGunzip())
      .pipe(extract);

    docker.buildImage(pack, options.query, function (err, res) {
      if (err) {
        cb(err);
      } else {
        res
          .on('data', function (raw) {
            try {
              var data = JSON.parse(raw);
              if (data.stream && successfull.test(data.stream)) {
                succeeded = true;
              }
              if (options.verbose) {
                if (data.stream) {
                  process.stdout.write(data.stream);
                } else {
                  console.log(data);
                }
              }
            } catch (err) {
              if (options.verbose) {
                console.log(raw.toString());
              }
            }
            if (successfull.test(raw.toString())) {
              succeeded = true;
            }
          })
          
          .on('end', function (data) {
            if (succeeded) {
              response.readme = readme;
              cb(null, response);
            } else {
              cb(new Error('Failed to build'));
            }
          });
      }
    });

  });
};
