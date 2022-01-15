var Docker = require('dockerode');
const { exec } = require("child_process");

var docker = new Docker({socketPath: '/var/run/docker.sock'});
docker.getEvents( { filters: { type: ["container"], event: ["start", "stop"] } }, (err, stream) => {
      if (err || !stream) {
        console.log(`[Failed to monitor host: ${err}`)
        return
      }

      stream.on('data', function(data){
          const { Type, Action, Actor } = JSON.parse(data.toString());
          handleDockerEvent(Type,Action,Actor);
          console.log(`${Type} ${Action}`)
      })
})

function handleDockerEvent(Type,Action,Actor)
{
  if(Type=='container' && Action=='start')
  {
    var container = docker.getContainer(Actor.ID);
    container.inspect(function (err, data) {
      console.log(`Processing: ${data.State.Pid}${data.Name}`);
      exec(`/usr/local/bin/ctables ${data.State.Pid}`, (error, stdout, stderr) => {
          if (error) {
              console.log(`error: ${error.message}`);
              return;
          }
          if (stderr) {
              console.log(`stderr: ${stderr}`);
              return;
          }
      });
    });
  }
}
