# Docker event action
Monitor docker events and perform an action on a given event.


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
