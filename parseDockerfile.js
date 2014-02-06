module.exports = function (file) {
  var cmd = /^CMD\s+(.+)$/m.exec(file);
  if (cmd == null) {
    throw Error('Dockerfile needs CMD');
  }
  cmd = cmd.pop();
  try {
    cmd = JSON.parse(req.cmd).join(' ');
  } catch (e) {}
  var workdir = /^WORKDIR\s+(.+)$/m.exec(file);
  if (workdir == null) {
   throw Error('Dockerfile needs WORKDIR');
  }
  workdir = workdir.pop();
  return {
    cmd: cmd,
    workdir: workdir
  };
};