(function () {
  'use strict';

  function initPlayer() {
    if (typeof APlayer === 'undefined' || document.getElementById('whale-player')) return;

    var container = document.createElement('div');
    container.id = 'whale-player';
    container.setAttribute('aria-label', '音乐播放器');
    document.body.appendChild(container);

    var player = new APlayer({
      container: container,
      fixed: false,
      mini: false,
      autoplay: false,
      theme: '#4D6BFE',
      loop: 'all',
      order: 'list',
      preload: 'metadata',
      volume: 0.55,
      listFolded: true,
      listMaxHeight: 180,
      audio: [
        {
          name: '两难',
          artist: '加木',
          url: '/music/liangnan.mp3',
          cover: '/music/liangnan-cover.jpg'
        }
      ]
    });

    // Keep the footer clear of the fixed bar.
    document.documentElement.style.setProperty('--music-bar-height', '72px');

    // Mobile browsers can block playback; show a gentle nudge on first tap.
    var bar = document.getElementById('whale-player');
    if (bar) {
      bar.addEventListener('click', function () {
        bar.classList.add('is-awake');
      }, { once: true });
    }

    window.__whalePlayer = player;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayer);
  } else {
    initPlayer();
  }
})();
