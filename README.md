# githubNabber [![Build Status](https://travis-ci.org/Runnable/githubNabber.svg?branch=cleanup/refactor)](https://travis-ci.org/Runnable/githubNabber)

A wonderful tool to grab (Github) repositories and create a runnable Docker image.

## Installation

```
npm install Runnable/githubNabber
```

## Example

```javascript
var nabber = require('githubNabber');
var options = {
  source: 'http://github.com/Runnable/githubNabber',
  docker: dockerOptions,
  dockerBuildOptions: {
    't': 'nabber/test',
    'nocache': true,
  },
};
var nab = nabber(options);
nab.createDockerImage(function (err, readme) {
  if (err) return done(err);
  /* nab.imageId is the Docker image ID that was created
   * the image is also tagged with 'nabber/test', so you 
   * can do docker.getImage('nabber/test') to get the 
   * image with dockerode.
   */
  // ...
});
```