let port = null;

function connectToNativeHost() {
  try {
    port = browser.runtime.connectNative('youtube_discord_rpc');
    
    port.onMessage.addListener((response) => {
      console.log('Received from native host:', response);
    });

    port.onDisconnect.addListener(() => {
      console.log('Native host disconnected:', browser.runtime.lastError?.message);
      port = null;
      setTimeout(connectToNativeHost, 5000);
    });

    console.log('Connected to native host');
  } catch (error) {
    console.error('Failed to connect to native host:', error);
    setTimeout(connectToNativeHost, 5000);
  }
}

connectToNativeHost();

browser.runtime.onMessage.addListener((message, sender) => {
  console.log('Received from content script:', message);
  if (port) {
    try {
      port.postMessage(message);
      console.log('Sent to native host');
    } catch (error) {
      console.error('Failed to send message to native host:', error);
    }
  } else {
    console.warn('No native host connection');
  }
});

console.log('YouTube Discord RPC background script loaded');
