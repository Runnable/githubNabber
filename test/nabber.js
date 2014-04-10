var should = require('should');
var nabber = require('index');
var nock = require('nock');
var fs = require('fs');
var join = require('path').join;
var Docker = require('dockerode');
var debug = require('util').debug;
var dockerMock = require('docker-mock');
dockerMock.listen(5354);

/* defaults to using a docker mock, but it can test using docker setting:
 * DOCKER_HOST and TEST_USING_DOCKER
 */
var dockerOptions = {};
dockerOptions.host = 'http://localhost';
dockerOptions.port = 5354;

// catch the github downloads and supply a sample tarball!
var github = nock('https://github.com').
  persist(). // remove this, and put this in-line of the tests we if need different tarballs
  get('/Runnable/githubNabber/archive/master.tar.gz').
  reply(200, function (uri, reqBody) {
    return fs.createReadStream(join(__dirname, 'fixtures/githubNabber.tar.gz'));
  });

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
      var nab = nabber({
        source: 'https://github.com/Runnable/githubNabber.git',
        docker: dockerOptions,
        dockerBuildOptions: {
          't': 'nabber/test',
          'nocache': true,
        },
      });
      it('should give us the url for the archive tarball', function () {
        nab.getUrl().should.equal(targetUrl);
      });
    });
  });
  describe('for unknown urls', function () {
    var nab = nabber({
      source: 'https://foo.com/bar.tar.gz',
      docker: dockerOptions,
      dockerBuildOptions: {
        't': 'nabber/test',
        'nocache': true,
      },
    });
    it('should return back the same url', function () {
      nab.getUrl().should.equal('https://foo.com/bar.tar.gz');
    });
  });
});

describe('downloading tarballs', function () {
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
      else done(err);
    });
  });
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
