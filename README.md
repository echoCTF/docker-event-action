# Docker event action
Monitor docker events and perform an action on a given event.

The current daemon can run both on your docker server or a remote one (depending on the desired actions).

The examples included assume that the application will run on the host that is responsible for running the docker containers. For each container that gets started, we grap the namespace ID and inject a set of iptables rules into it. This allows us to run iptables commands without giving the containers any extra priviledges.

What scripts are executed and how is left up to the user, this very simple nodejs script can be modified according to your needs 😃

## Quick 'n' Dirty install
```bash
mv docker-event-action/ /opt/
cd /opt/docker-event-action/
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs
install -o root -m 0555 ctables /usr/local/bin/ctables
npm install
npm install -g pm2
pm2 startup
pm2 start /opt/docker-event-action/docker-events.js
```
