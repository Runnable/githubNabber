var CMD = /^CMD\s+(.+)$/m;
var WORKDIR = /^WORKDIR\s+(.+)$/m;
var RUNNABLE_SERVICE_CMDS = /^ENV\s+RUNNABLE_SERVICE_CMDS\s+(.+)$/m;

module.exports = function (file) {
  return {
    cmd: parseCmd(file),
    workdir: parseWorkdir(file),
    services: parseServices(file)
  };
};

function parseCmd (file) {
  var cmd = CMD.exec(file);
  if (cmd == null) {
    throw Error('Dockerfile needs CMD');
  }
  cmd = cmd.pop();
  try {
    cmd = JSON.parse(req.cmd).join(' ');
  } catch (e) {}
  return cmd;
}

function parseWorkdir (file) {
  var workdir = WORKDIR.exec(file);
  if (workdir == null) {
   throw Error('Dockerfile needs WORKDIR');
  }
  return workdir.pop();
}

function parseServices (file) {
  var services = RUNNABLE_SERVICE_CMDS.exec(file);
  if (services == null) {
   throw Error('Dockerfile needs RUNNABLE_SERVICE_CMDS');
  }
  return services.pop();
}