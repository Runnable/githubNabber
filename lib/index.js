var request = require('request');
var zlib = require('zlib');
var url = require('url');
var tar = require('tar-stream');
var concat = require('concat-stream');
var Docker = require('dockerode');
var join = require('path').join;
var debug = require('util').debug;

function NabberGalore (options) {
  this.options = options || {};
  if (!this.options.docker) this.options.docker = {};
  if (!this.options.docker.host) this.options.docker.host = 'localhost';
  if (!this.options.docker.port) this.options.docker.port = 4243;
  this.buildPack = tar.pack();
}

NabberGalore.prototype.createDockerImage = function (callback) {
  this.buildDockerTarball();
  this.buildImage(callback);
};

NabberGalore.prototype.getUrl = function () {
  var urlData = url.parse(this.options.source);
  if (urlData.host === 'github.com') {
    var hasDotGit = urlData.path.lastIndexOf('.git');
    if (hasDotGit !== -1) {
      urlData.path = urlData.path.substring(0, hasDotGit);
    }
    return 'https://' + join(
      urlData.host,
      urlData.path,
      'archive/master.tar.gz');
  } else {
    debug('do not know how to handle url: ' + this.options.source);
  }
  return this.options.source;
};

NabberGalore.prototype.downloadTarball = function () {
  return request(this.getUrl());
};

NabberGalore.prototype.generateDockerfile = function () {
  var d = '';
  var stack = this.options.stack;
  var workdirs = {
    // stack: path,
    'web': '/var/www',
  };
  var cmds = {
    // stack: command
    'web': 'date',
  };
  var service_cmds = {
    // stack: commands,
    'web': 'memcached -d -u www-data; mysqld;',
  };
  d += 'FROM runnable/' + stack + '\n';
  d += 'WORKDIR ' + workdirs[stack] + '\n';
  d += 'ADD ./src ' + workdirs[stack] + '\n';
  d += 'CMD ' + cmds[stack] + '\n';
  d += 'ENV RUNNABLE_SERVICE_CMDS ' + service_cmds[stack] + '\n';

  this.dockerfile = d;
  this.buildPack.entry({ name: './Dockerfile' }, this.dockerfile);
};

NabberGalore.prototype.buildDockerTarball = function () {
  var self = this;
  var isReadme = /^\.\/src\/(readme\.?.+?)$/i;

  var extract = tar.extract();
  extract.on('entry', parseForReadme);
  extract.on('finish', function () { 
    self.generateDockerfile();
    self.buildPack.finalize();
  });

  function parseForReadme (header, stream, callback) {
    header.name = header.name.replace(/[^\/]*/, './src');
    if (header.type === 'directory') {
      self.buildPack.entry(header);
      callback();
    } else if (header.type === 'file') {
      if (isReadme.test(header.name)) {
        stream.pipe(concat(function (contents) {
          self.readme = {
            name: isReadme.exec(header.name)[1],
            contents: contents.toString()
          };
        }));
      }
      stream.pipe(self.buildPack.entry(header, callback));
    } else {
      callback();
    }
  }

  var tarStream = this.downloadTarball();
  tarStream.
    pipe(zlib.createGunzip()).
    pipe(extract);
  return self.buildPack;
};

NabberGalore.prototype.buildImage = function (callback) {
  var self = this;

  var docker = Docker({
    host: this.options.docker.host,
    port: this.options.docker.port
  });
  docker.buildImage(self.buildPack, self.options.dockerBuildOptions, handleBuildResponse);

  function handleBuildResponse (err, res) {
    if (err) return callback(err);
    var succeeded = false;
    var successfull = /Successfully built ([0-9a-f]+)/;
    self.imageId = undefined;
    res.on('data', function (raw) {
      try {
        var data = JSON.parse(raw);
        if (data.stream && successfull.test(data.stream)) {
          succeeded = true;
          self.imageId = successfull.exec(raw.toString())[1];
        }
      } catch (err) {}
      if (successfull.test(raw.toString())) {
        succeeded = true;
        self.imageId = successfull.exec(raw.toString())[1];
      }
      // if (successfull.test(raw.toString())) succeeded = true;
    });
    res.on('end', function (data) {
      if (succeeded) callback(null, self.readme);
      else callback(new Error('failed to build'));
    });
  }
};

module.exports = function (options) {
  return new NabberGalore(options);
};
