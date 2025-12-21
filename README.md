# Docker event action

Monitor docker events and perform an action on a given event.

The current daemon can run both on your docker server or a remote one (depending on the provided actions).

The examples included assume that the application will run on the host that is responsible for running the docker containers. For each container that gets started, we grab the namespace ID and inject a set of iptables rules into it. This allows us to run iptables commands without giving the containers any extra privileges.

What scripts are executed and how is left up to the user, this very simple nodejs script can be modified according to your needs 😃

## Quick 'n' Dirty install

There is possibly a better way to deal with this, but this should do it for most cases

```bash
mv docker-event-action/ /opt/
cd /opt/docker-event-action/
apt-get install -y nodejs npm
# or
# pkg_add -vvi nodejs npm for remote
install -o root -m 0555 ctables /usr/local/bin/ctables
npm install
npm install -g pm2
pm2 startup
pm2 start /opt/docker-event-action/docker-events.js
```

## Usage

```
Usage:
  node docker-events.js [docker-socket-or-remote-url]
```

Examples:

```
node docker-events.js                            # Use default local socket
node docker-events.js /var/run/custom.sock       # Use custom local socket
node docker-events.js tcp://192.168.1.100:2375   # Connect to remote Docker API

DEBUG=1 node docker-events.js                    # Use default local socket and set debug logging
DEBUG=1 LOG_FILE=/tmp/app.log node docker-events.js # Use default local socket and set debug logging at /tmp/app.log
```

## Envirnonent Variables

* `DEBUG`: Enable debug logging
* `LOG_FILE`: Set custom log file location (default `/opt/docker-event-action/app.log`)

## Label Actions

* `dynamic_treasures`: If label exists process `treasures_N` labels
* `treasures_N`: Chunks of 1024 bytes of the base64 encoded treasure actions
* `player_id`: The player id this instance belongs to
* `target_id`: The target id for this instance
* `team_id`: The team id (optional)

### Base64 `treasures_N`

The following is an example of the options currently supported by the aplication. The following JSON is provided as base64 encoded string split into chunks of 1024 bytes.

***NOTE:** Base environment variabels are added by the system and not this structure.*

First level properties:

* `fs`: For container filesystem operations
  * `mv`: Rename operations (`src`=>`dest`)
  * `sed`: Replace operations (`file`: `src`=>`dest`)
* `firewall`: For container specific firewall rules

```json
{
  "fs": {
    "mv": [
      {
        "src": "/root/ETSCTF_ROOT_FLAG_FROM_BUILD",
        "dest": "/root/ETSCTF_NEW_ROOT_FLAG_FOR_PLAYER"
      }
    ],
    "sed": [
      {
        "file": "/etc/shadow",
        "src": "SHADOW_FLAG_FROM_BUILD",
        "dest": "NEW_SHADOW_FLAG_FOR_PLAYER"
      },
      {
        "file": "/etc/passwd",
        "src": "PASSWD_FLAG_FROM_BUILD",
        "dest": "PASSWD_FLAG_FOR_PLAYER"
      }
    ]
  },
  "firewall": [
    {"chain": "INPUT", "action": "REJECT"},
    {"chain": "INPUT", "inInterface": "lo", "action": "ACCEPT"},
    {"chain": "INPUT", "conntrack": "ESTABLISHED,RELATED", "action": "ACCEPT"},
    {"chain": "INPUT", "source": "10.0.0.0/24", "action": "ACCEPT"},
    {"chain": "INPUT", "source": "10.10.0.0/16", "action": "ACCEPT"},
    {"chain": "OUTPUT", "outInterface": "lo", "action": "ACCEPT"},
    {"chain": "OUTPUT", "conntrack": "ESTABLISHED", "action": "ACCEPT"}
  ]
}
```
