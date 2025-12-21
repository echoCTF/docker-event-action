# Docker Event Action

Monitor Docker container events and perform automated actions when containers start. This daemon can run directly on your Docker host.

For each container that starts, the script:

* Inspects container metadata and labels.
* Handles "treasures" encoded in container labels (base64 → JSON) to perform file system operations.
* Moves or replaces files inside the container root filesystem.
* Applies firewall rules (`iptables`) inside the container namespace.
* Logs container information and optionally executes `ctables` for further network configuration.

The behavior is fully customizable via container labels, making it easy to extend for your own automation needs.

## Features

* File operations inside container (`mv` / `sed`).
* Dynamic firewall rule injection per container.
* Supports container metadata labels for structured actions.
* Logs to console and file (configurable with `DEBUG` and `LOG_FILE`).

## Quick Install

```bash
# Move project to /opt
mv docker-event-action/ /opt/
cd /opt/docker-event-action/

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs

# Install ctables helper
install -o root -m 0555 ctables /usr/local/bin/ctables

# Install project dependencies
npm install

# Install and configure PM2 for daemon management
npm install -g pm2
pm2 startup
pm2 start /opt/docker-event-action/docker-events.js
```

## Usage

Containers can include special labels to trigger actions:

```text
dynamic_treasures=true
treasures_0=<base64_json>
player_id=123
team_id=abc
```

JSON in `treasures_*` can define:

```json
{
  "fs": {
    "mv": [{"src": "path/in/container", "dest": "new/path"}],
    "sed": [{"file": "file/path", "src": "old", "dest": "new"}]
  },
  "firewall": [
    {"chain": "INPUT", "action": "ACCEPT", "source": "1.2.3.4"}
  ]
}
```

Logs show container name, PID, applied file/firewall changes, and execution of `ctables`.
