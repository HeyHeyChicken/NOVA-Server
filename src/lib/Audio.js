class Audio {
  constructor(_url, _playbackRate = 1, _volume = 100) {
    this.URL = _url;
    this.PlaybackRate = _playbackRate;
    this.Volume = _volume;
  }
}

module.exports = Audio;
