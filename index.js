var request = require('request');
var zlib = require('zlib');
var createDomain = require('domain').create;
var url = require('url');
var join = require('path').join;

var buildDockerImage = require('./buildDockerImage');
var buildDockerfileAndTar = require('./buildDockerfile');

module.exports = buildImageFromGithub;

function buildImageFromGithub(options, callback) {
  var domain = createDomain();
  options.response = {};
  domain.on('error', callback);
  domain.run(function () {

    request(getGithubTarballUrl(options.source))
      .pipe(zlib.createGunzip())
      .pipe(buildDockerfileAndTar(options, domain));

    buildDockerImage(options, callback);

  });
}

function getGithubTarballUrl (repoUrl) {
  var urlData = url.parse(repoUrl);
  return 'http://' + join(
    urlData.host,
    urlData.path,
    'archive/master.tar.gz');
}
