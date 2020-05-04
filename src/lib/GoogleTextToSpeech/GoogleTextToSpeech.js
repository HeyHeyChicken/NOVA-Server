const LIBRARIES = {
  FS: require("fs"),
  HTTPS: require("https"),
  Util: require("util"),
  FreeGoogleTTS: require("google-tts-api"),
  PayingGoogleTTS: require("@google-cloud/text-to-speech"),

  Audio: require("../Audio")
};

class GoogleTextToSpeech {
  constructor(_main) {
    this.Main = _main;

    this.RootPath = "./lib/GoogleTextToSpeech/";
    this.KeyFile = LIBRARIES.FS.readdirSync(this.RootPath).filter(e => e.endsWith(".json"))[0];

    if(this.KeyFile !== undefined){
      this.PayingClient = new LIBRARIES.PayingGoogleTTS.TextToSpeechClient({
        projectId: this.Main.Settings.Google.TextToSpeech.ProjectID,
        keyFilename: this.RootPath + this.KeyFile
      });
    }
  }

  TTS(_socket, _text, _callback){
    if(_text !== undefined){
      if(this.KeyFile !== undefined){
        this.PayingTTS(_socket, _text, _callback);
      }
      else{
        this.FreeTTS(_socket, _text, _callback);
      }
    }
  }

  async PayingTTS(_socket, _text, _callback){
    const SELF = this;

    const request = {
      input: {text: _text},
      voice: {languageCode: this.Main.Settings.Language, ssmlGender: "NEUTRAL"},
      audioConfig: {audioEncoding: "MP3"},
    };

    // Performs the text-to-speech request
    const [response] = await this.PayingClient.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = LIBRARIES.Util.promisify(LIBRARIES.FS.writeFile);
    const NAME = "/mp3/GoogleTTS-" + new Date().getTime() + ".mp3";
    await writeFile("./public" + NAME, response.audioContent, "binary");
    _socket.emit("play_audio", [new LIBRARIES.Audio(NAME, SELF.Main.Settings.Google.TextToSpeech.PlaybackRate)]);
    if(_callback !== undefined){
      _callback(_text);
    }
  }

  FreeTTS(_socket, _text, _callback){
    const SELF = this;

    LIBRARIES.FreeGoogleTTS(_text, this.Main.Settings.Language.substring(0, 2))
    .then(function (url) {
      const NAME = "/mp3/GoogleTTS-" + new Date().getTime() + ".mp3";
      const FILE = LIBRARIES.FS.createWriteStream("./public" + NAME);
      const request = LIBRARIES.HTTPS.get(url, function(response) {
        response.pipe(FILE);
        FILE.on("finish", function() {
          FILE.close();
          _socket.emit("play_audio", [new LIBRARIES.Audio(NAME, SELF.Main.Settings.Google.TextToSpeech.PlaybackRate)]);
          if(_callback !== undefined){
            _callback(_text);
          }
        });
      });
    })
    .catch(function (err) {
      console.error(err.stack);
    });
  }
}

module.exports = GoogleTextToSpeech;
