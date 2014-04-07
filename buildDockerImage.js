var Docker = require('dockerode');

module.exports = buildDockerImage;

var successfull = /Successfully built/;

function buildDockerImage (options, callback) {
  var docker = new Docker({host: options.host, port: options.port});
  var succeeded = false;
  docker.buildImage(options.pack, options.query, function (err, res) {
    if (err) {
      return err;
    } else {
      res.on('data', function (raw) {
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
      });

      res.on('end', function (data) {
        if (succeeded) {
          callback(null, options.response);
        } else {
          callback(new Error('Failed to build'));
        }
      });
    }
  });
}
