let lastVideoId = null;

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function getVideoInfo() {
  const video = document.querySelector('video');
  const titleElement = document.querySelector('#title h1 yt-formatted-string, h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer');
  const channelElement = document.querySelector('#owner #channel-name a, #channel-name yt-formatted-string a, ytd-channel-name a');
  
  console.log('Video:', !!video, 'Title:', titleElement?.textContent);
  
  if (!video || !titleElement) {
    return null;
  }

  const info = {
    type: 'VIDEO_UPDATE',
    videoId: getVideoId(),
    title: titleElement.textContent?.trim() || 'Unknown Title',
    channel: channelElement?.textContent?.trim() || 'Unknown Channel',
    currentTime: Math.floor(video.currentTime),
    duration: Math.floor(video.duration),
    paused: video.paused,
    url: window.location.href
  };
  
  console.log('Sending:', info);
  return info;
}

function sendUpdate() {
  const videoId = getVideoId();
  
  if (!videoId) {
    if (lastVideoId) {
      browser.runtime.sendMessage({ type: 'VIDEO_STOPPED' });
      lastVideoId = null;
    }
    return;
  }

  const info = getVideoInfo();
  if (info) {
    browser.runtime.sendMessage(info);
    lastVideoId = videoId;
  }
}

setInterval(sendUpdate, 3000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    browser.runtime.sendMessage({ type: 'VIDEO_STOPPED' });
  } else {
    sendUpdate();
  }
});

window.addEventListener('beforeunload', () => {
  browser.runtime.sendMessage({ type: 'VIDEO_STOPPED' });
});

console.log('YouTube Discord RPC content script loaded');
