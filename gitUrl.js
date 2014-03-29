var url = require('url');

function parseUrl (repo, githubHost) {
  githubHost = githubHost || 'github.com';

  var http = new RegExp('(https?):\/\/' + githubHost +
    '\/([^\/]+)\/([^\/^\.]+)(\.git)?$');
  var git  = new RegExp('(git):\/\/' + githubHost +
    '\/([^\/]+)\/([^\/^\.]+)(\.git)?$');
  var ssh  = new RegExp('(git@)' + githubHost +
    ':([^\/]+)\/([^\/^\.]+)(\.git)?$');
  var userName = /()([^\/]+)\/([^\/]+)(\.git)?$/;

  if('object' === typeof repo) {
    repo = repo.url;
  }
  var m;
  if((m = http.exec(repo)) ||
    (m = git.exec(repo)) ||
    (m = ssh.exec(repo)) ||
    (m = userName.exec(repo))) {
    return {
      user: m[2],
      project: m[3],
      protocol: m[1] === 'git@' ? 'ssh' : m[1]
    };
  }
}

module.exports = function (repo) {
  var repoData = url.parse(repo);
  repo = parseUrl(repo, repoData.host);
  if (repo == null) {
    throw new Error('bad url');
  }
  return repo.protocol + '://' +
    repoData.host + '/' +
    repo.user + '/' +
    repo.project + '/archive/master.tar.gz';
};
