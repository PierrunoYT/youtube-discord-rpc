const net = require('net');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!CLIENT_ID) {
  throw new Error('Missing DISCORD_CLIENT_ID environment variable (Discord Application ID).');
}
const LOG_FILE = path.join(__dirname, 'debug.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

log('=== Host started ===');

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (err) => {
  log(`UNHANDLED: ${err}`);
});

// Discord IPC implementation
class DiscordIPC {
  constructor(clientId) {
    this.clientId = clientId;
    this.socket = null;
    this.connected = false;
    this.user = null;
  }

  encode(op, data) {
    const payload = JSON.stringify(data);
    const len = Buffer.byteLength(payload);
    const packet = Buffer.alloc(8 + len);
    packet.writeInt32LE(op, 0);
    packet.writeInt32LE(len, 4);
    packet.write(payload, 8, len);
    return packet;
  }

  decode(socket, callback) {
    let buffer = Buffer.alloc(0);
    
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      
      while (buffer.length >= 8) {
        const op = buffer.readInt32LE(0);
        const len = buffer.readInt32LE(4);
        
        if (buffer.length < 8 + len) break;
        
        const data = JSON.parse(buffer.slice(8, 8 + len).toString());
        buffer = buffer.slice(8 + len);
        callback(op, data);
      }
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const tryConnect = (pipeId) => {
        if (pipeId > 9) {
          reject(new Error('Could not connect to Discord'));
          return;
        }

        const pipePath = process.platform === 'win32'
          ? `\\\\?\\pipe\\discord-ipc-${pipeId}`
          : `/tmp/discord-ipc-${pipeId}`;

        log(`Trying ${pipePath}`);
        
        const socket = net.createConnection(pipePath, () => {
          log('Socket connected');
          this.socket = socket;
          
          this.decode(socket, (op, data) => {
            log(`Received op ${op}: ${JSON.stringify(data).substring(0, 100)}`);
            
            if (op === 1 && data.cmd === 'DISPATCH' && data.evt === 'READY') {
              this.connected = true;
              this.user = data.data.user;
              resolve();
            }
          });

          socket.write(this.encode(0, { v: 1, client_id: this.clientId }));
        });

        socket.on('error', (err) => {
          log(`Pipe ${pipeId} error: ${err.message}`);
          tryConnect(pipeId + 1);
        });
      };

      tryConnect(0);
    });
  }

  async setActivity(activity) {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected');
    }

    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: activity
      },
      nonce: Math.random().toString(36).substring(2)
    };

    this.socket.write(this.encode(1, payload));
  }

  async clearActivity() {
    if (!this.socket || !this.connected) return;
    
    const payload = {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid },
      nonce: Math.random().toString(36).substring(2)
    };

    this.socket.write(this.encode(1, payload));
  }
}

const discord = new DiscordIPC(CLIENT_ID);
let isConnected = false;

// Native messaging
let inputBuffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  processMessages();
});

function processMessages() {
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0);
    
    if (messageLength > 1024 * 1024) {
      log(`Invalid message length: ${messageLength}`);
      inputBuffer = Buffer.alloc(0);
      return;
    }
    
    if (inputBuffer.length < 4 + messageLength) return;
    
    const messageData = inputBuffer.slice(4, 4 + messageLength);
    inputBuffer = inputBuffer.slice(4 + messageLength);
    
    try {
      const message = JSON.parse(messageData.toString());
      log(`Parsed: ${message.type}`);
      sendMessage({ debug: 'received', type: message.type });
      updatePresence(message);
    } catch (e) {
      log(`Parse error: ${e.message}`);
    }
  }
}

function sendMessage(message) {
  const messageString = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageString);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);
  
  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);
}

async function updatePresence(data) {
  if (!isConnected) {
    log('Not connected to Discord');
    sendMessage({ error: 'Not connected to Discord' });
    return;
  }

  try {
    if (data.type === 'VIDEO_STOPPED') {
      await discord.clearActivity();
      log('Cleared activity');
      sendMessage({ status: 'cleared' });
      return;
    }

    if (data.type === 'VIDEO_UPDATE') {
      const now = Date.now();
      const remaining = (data.duration - data.currentTime) * 1000;

      const activity = {
        details: data.title.substring(0, 128),
        state: `by ${data.channel}`.substring(0, 128),
        assets: {
          large_image: `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`,
          large_text: 'YouTube'
        },
        buttons: [
          { label: 'Watch on YouTube', url: data.url }
        ]
      };

      if (!data.paused && data.duration > 0) {
        activity.timestamps = {
          end: Math.floor((now + remaining) / 1000)
        };
      }

      await discord.setActivity(activity);
      log(`Set activity: ${data.title.substring(0, 30)}...`);
      sendMessage({ status: 'updated', title: data.title });
    }
  } catch (error) {
    log(`Update error: ${error.message}`);
    sendMessage({ error: error.message });
  }
}

process.stdin.on('end', () => {
  log('stdin ended');
  discord.clearActivity();
  process.exit(0);
});

log('Attempting Discord connection...');
discord.connect().then(() => {
  log('Discord connected: ' + discord.user?.username);
  isConnected = true;
  sendMessage({ status: 'connected', user: discord.user?.username });
}).catch((error) => {
  log(`Discord connection failed: ${error.message}`);
  sendMessage({ error: `Failed to connect: ${error.message}` });
});
