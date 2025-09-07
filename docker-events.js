
const Docker = require('dockerode');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEBUG = process.env.DEBUG === "1";
const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, 'app.log');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

function hashFileSHA256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Logging helper
function log(...args) {
  const message = args.join(' ');

  // Write to console
  if (DEBUG) console.log(message);

  // Append to logfile
  try {
    fs.appendFileSync(LOG_FILE, message + '\n', 'utf8');
  } catch (err) {
    console.error(`Failed to write to log file: ${err.message}`);
  }
}

function logExec(err, stdout, stderr) {
  if (err) log(`Error: ${err.message}`);
  if (stderr) log(`Stderr: ${stderr}`);
}

// Filesystem helpers
function moveFile(src, dest) {
  if (!fs.existsSync(src)) {
    log(`Source file does not exist, skipping move: ${src} -> ${dest}`);
    try {
      fs.closeSync(fs.openSync(dest, 'w'));      // create empty file
      fs.chmodSync(dest, 0o400);                 // set 0400 mode
      log(`Created empty file at ${dest} with mode 0400`);
    } catch (err) {
      log(`Failed to create file at ${dest}: ${err.message}`);
    }
    return;
  }

  try {
    fs.renameSync(src, dest);
    log(`Moved ${src} -> ${dest}`);
  } catch (err) {
    log(`Failed to move ${src} -> ${dest}: ${err.message}`);
  }
}

function replaceFileContents(filePath, src, dest) {
  if (!fs.existsSync(filePath)) {
    log(`File does not exist, skipping replace ${src} -> ${dest}: ${filePath}`);
    return;
  }

  try {
    const beforeHash = hashFileSHA256(filePath);

    const cmd = `sed -i 's/${src}/${dest}/g' ${filePath}`;
    execSync(cmd, { stdio: 'pipe' });

    const afterHash = hashFileSHA256(filePath);

    if (beforeHash === afterHash) {
      log(`No replacements made for ${src} -> ${dest} in ${filePath}`);
    } else {
      log(`Replaced content ${src} -> ${dest}: ${filePath}`);
    }
  } catch (err) {
    log(`Error replacing ${src} -> ${dest} in ${filePath}: ${err.message}`);
  }
}

// Firewall helper
function processFirewallOps(ops, containerPid) {
  if (!Array.isArray(ops)) return;

  const linkFile = `/var/run/netns/${containerPid}`;
  if (!fs.existsSync('/var/run/netns')) fs.mkdirSync('/var/run/netns', { recursive: true });

  try { if (fs.existsSync(linkFile)) fs.unlinkSync(linkFile); } catch (err) { log(err.message); }
  try { fs.symlinkSync(`/proc/${containerPid}/ns/net`, linkFile); } catch (err) { log(err.message); return; }

  ops.forEach(rule => {
    let cmd = `ip netns exec ${containerPid} iptables`;
    if (rule.table) cmd += ` -t ${rule.table}`;
    cmd += ` -I ${rule.chain}`;
    if (rule.inInterface) cmd += ` -i ${rule.inInterface}`;
    if (rule.outInterface) cmd += ` -o ${rule.outInterface}`;
    if (rule.source) cmd += ` -s ${rule.source}`;
    if (rule.conntrack) cmd += ` -m conntrack --ctstate ${rule.conntrack}`;
    cmd += ` -j ${rule.action}`;
    log(`Applying firewall rule: ${cmd}`);
    try {
      const output = execSync(cmd, { stdio: 'pipe' }).toString();
      if (output) log(output);
    } catch (err) {
      log(`Error: ${err.message}`);
    }
  });

  try { fs.unlinkSync(linkFile); } catch (err) { log(err.message); }
}

// Docker event listener
docker.getEvents({ filters: { type: ["container"], event: ["start"] } }, (err, stream) => {
  if (err || !stream) return log(`[Failed to monitor host: ${err}]`);
  log("Docker event listener started.");

  stream.on('data', chunk => {
    const { Actor } = JSON.parse(chunk.toString());
    handleDockerStartEvent(Actor);
  });
});

// Main container handler
function handleDockerStartEvent(Actor) {
  const container = docker.getContainer(Actor.ID);

  container.inspect((err, data) => {
    if (err) return log(`Inspect error: ${err.message}`);
    const labels = data.Config.Labels || {};
    const containerRoot = `/proc/${data.State.Pid}/root`;
    const containerPid = data.State.Pid;

    // Always show target name and PID
    log(`Target: ${data.Name}, PID: ${containerPid}`);

    let final = null;

    if (labels.dynamic_treasures) {
      const treasureKeys = Object.keys(labels).filter(k => k.startsWith("treasures_"));
      if (treasureKeys.length > 0) {
        try {
          const treasures = treasureKeys
            .sort((a, b) => parseInt(a.split("_")[1], 10) - parseInt(b.split("_")[1], 10))
            .map(k => labels[k])
            .join("");
          const decoded = Buffer.from(treasures, "base64").toString("utf8");
          final = JSON.parse(decoded);
          log("Decoded treasures successfully:", final);
        } catch (e) {
          log("Treasure decode failed:", e.message);
        }
      }
    } else {
      log(`Skipping treasures handling for container ${data.Name}`);
    }

    if (final && final.fs) {
      if (Array.isArray(final.fs.mv)) {
        final.fs.mv.forEach(op => {
          moveFile(path.join(containerRoot, op.src), path.join(containerRoot, op.dest));
        });
      }
      if (Array.isArray(final.fs.sed)) {
        final.fs.sed.forEach(op => {
          replaceFileContents(path.join(containerRoot, op.file), op.src, op.dest);
        });
      }
    }

    if (final && final.firewall) processFirewallOps(final.firewall, containerPid);

    ["player_id", "target_id", "team_id"].forEach(key => {
      if (labels[key]) log(`${key}: ${labels[key]}`);
    });

    log(`Applying ctables to PID: ${containerPid}`);
    exec(`/usr/local/bin/ctables ${containerPid}`, logExec);
  });
}
