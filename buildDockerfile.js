var tar = require('tar-stream');
var fs = require('fs');
var concat = require('concat-stream');

var parseDockerfile = require('./parseDockerfile');

module.exports = buildDockerfileAndTar;

var isReadme = /^src\/([Rr][Ee][Aa][Dd][Mm][Ee]\.?.+?)$/;

function buildDockerfileAndTar (options, domain) {
  var extract = tar.extract();
  options.pack = tar.pack();

  fs.readFile(__dirname +
    '/dockerfiles/' +
    options.stack,
    domain.intercept(function (file) {
      options.response = parseDockerfile(file);
      options.pack.entry({ name: './Dockerfile' }, file);
    }));

  extract.on('entry', parseForReadme);
  extract.on('finish', function () { options.pack.finalize(); });

  function parseForReadme (header, stream, callback) {
    var rootDir = /[^\/]*/;
    var readme;
    header.name = header.name.replace(rootDir, './src');
    if (header.type === 'directory') {
      options.pack.entry(header);
      callback();
    } else if (header.type === 'file') {
      if (isReadme.test(header.name)) {
        stream.pipe(concat(function (contents) {
          options.readme = {
            name: isReadme.exec(header.name)[1],
            contents: contents.toString()
          };
        }));
      }
      stream.pipe(options.pack.entry(header, callback));
    } else {
      callback();
    }
  }

  return extract;
}

