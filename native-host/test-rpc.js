const DiscordRPC = require('discord-rpc');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!CLIENT_ID) {
  throw new Error('Missing DISCORD_CLIENT_ID environment variable (Discord Application ID).');
}
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

console.log('Connecting to Discord...');

rpc.on('ready', () => {
  console.log('Connected as', rpc.user.username);
  
  rpc.setActivity({
    details: 'Test Video Title',
    state: 'by Test Channel',
    largeImageKey: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    largeImageText: 'YouTube',
  }).then(() => {
    console.log('Activity set!');
  }).catch(err => {
    console.error('Activity error:', err);
  });
});

rpc.login({ clientId: CLIENT_ID }).then(() => {
  console.log('Login successful');
}).catch(err => {
  console.error('Login failed:', err);
});
