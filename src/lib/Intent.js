const LIBRARIES = {
  Message: require("./Message")
};

class Intent {
  constructor(_textToSpeech, _name) {
    this.TextToSpeech = _textToSpeech;
    this.Name = _name;
    this.Documents = [];
    this.Answers = [];
    this.Actions = [];
    this.Variables = {};
  }

  addDocuments(_utterances){
    this.Documents = this.Documents.concat(_utterances);
  }

  addAnswers(_answers){
    this.Answers = this.Answers.concat(_answers);
  }

  addActions(_actions){
    this.Actions = this.Actions.concat(_actions);
  }

  answer(_socket, _answer){
    if(_answer === undefined){
      _answer = this.Answers[Math.floor(Math.random() * this.Answers.length)];
    }
    if(_answer !== undefined){
      for(let variable in this.Variables){
        _answer = _answer.replace("%" + variable + "%", this.Variables[variable])
      }

      _socket.emit("sc_message", new LIBRARIES.Message(_answer, true));
      this.TextToSpeech.TTS(_socket, _answer);
    }
  }
}

module.exports = Intent;
