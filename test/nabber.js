var should = require('should');
var nabber = require('index');
var Docker = require('dockerode');

/* defaults to using a docker mock, but it can test using docker setting:
 * DOCKER_HOST and TEST_USING_DOCKER
 */
var dockerOptions = {};
dockerOptions.host = 'http://localhost';
dockerOptions.port = 5253;

if (process.env.DOCKER_HOST && process.env.TEST_USING_DOCKER) {
  console.log('using REAL Docker!');
  var url = require('url');
  var u = url.parse(process.env.DOCKER_HOST);
  dockerOptions.host = 'http://' + u.host;
  dockerOptions.port = u.port || 4243;
}

var options = {
  source: 'http://github.com/Runnable/githubNabber',
  docker: dockerOptions,
  dockerBuildOptions: {
    't': 'nabber/test',
    'nocache': true,
  },
};

describe('nabber', function () {
  var nab = nabber(options);
  it('should return a new nabber', function () {
    nab.should.not.be.undefined;
  });
});

describe('url functions', function () {
  describe('for github', function () {
    var targetUrl = 'https://github.com/Runnable/githubNabber/archive/master.tar.gz';
    describe('for http url', function () {
      var nab = nabber(options);
      it('should give us the url for the archive tarball', function () {
        nab.getUrl().should.equal(targetUrl);
      });
    });
    describe('for https url with git', function () {
      options.source = 'http://github.com/Runnable/githubNabber.git';
      var nab = nabber(options);
      it('should give us the url for the archive tarball', function () {
        nab.getUrl().should.equal(targetUrl);
      });
    });
  });
});

describe('downloading tarballs', function () {
  this.timeout(10000); // we don't want to have a download timeout
  describe('from github', function () {
    var nab = nabber(options);
    it('should give us a tarball with some source files and a Dockerfile', function (done) {
      var fileNames = [];
      var extract = require('tar-stream').extract();
      extract.on('entry', function (header, stream, callback) {
        fileNames.push(header.name);
        callback();
      });
      extract.on('finish', function () {
        fileNames.indexOf('./src/').should.not.equal(-1);
        // FIXME: we _do_ need a dockerfile...
        fileNames.indexOf('./Dockerfile').should.not.equal(-1);
        nab.readme.should.not.be.undefined;
        done();
      });
      nab.buildDockerTarball().pipe(extract);
    });
  });
});

describe('building Dockerfiles', function () {
  describe('of a web stack example', function () {
    options.stack = 'web';
    var nab = nabber(options);
    it('should create a Dockerfile', function () {
      nab.generateDockerfile();
      nab.dockerfile.should.not.be.undefined;
      nab.dockerfile.indexOf('FROM').should.not.equal(-1);
    });
  });
});

describe('building docker images', function () {
  afterEach(function (done) {
    Docker(dockerOptions).getImage('nabber/test').remove(function (err) {
      if (!err) done();
      else if (err && err.statusCode === 409) done();
      else done();
    });
  });
  this.timeout(10000);
  describe('of github tarballs', function () {
    options.docker = dockerOptions;
    var nab = nabber(options);
    it('should build a docker image for us and tag it', function (done) {
      nab.createDockerImage(function (err, readme) {
        if (err) return done(err);
        readme.should.not.be.undefined;
        nab.imageId.should.not.be.undefined;
        done();
      });
    });
  });
});
