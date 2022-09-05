const LIBRARIES = {
  Intent: require("./Intent")
};

class Manager {
  constructor(_main) {
    this.Main = _main;
    this.Intents = {};

    this._checkIntentExistence("none");
  }

  /* ################################################################## */
  /* ### PUBLIC ####################################################### */
  /* ################################################################## */

  /* Documents */
  /* Cette fonction ajoute un moyen d'appeler une action. */
  addDocument(_intentName, _utterance){
    this.addDocuments(_intentName, [_utterance]);
  }

  /* Cette fonction ajoute des moyens d'appeler une action. */
  addDocuments(_intentName, _utterances){
    this._checkIntentExistence(_intentName);
    this.Intents[_intentName].addDocuments(_utterances);
  }

  /* Answers */
  /* Cette fonction ajoute une réponse à une action. */
  addAnswer(_intentName, _answer){
    this.addAnswers(_intentName, [_answer]);
  }

  /* Cette fonction ajoute des réponses à une action. */
  addAnswers(_intentName, _answers){
    this._checkIntentExistence(_intentName);
    this.Intents[_intentName].addAnswers(_answers);
  }

  /* Errors */
  addErrors(_intentName, _errorsName, _errors){
    this._checkIntentExistence(_intentName);
    this.Intents[_intentName].addErrors(_errorsName, _errors);
  }

  /* Actions */
  /* Cette fonction ajoute une action. Cette action sera déclenchée à l'appel d'un document. */
  addAction(_intentName, _action){
    this.addActions(_intentName, [_action]);
  }

  /* Cette fonction ajoute des actions. Ces action seront déclenchées à l'appel d'un document. */
  addActions(_intentName, _actions){
    this._checkIntentExistence(_intentName);
    this.Intents[_intentName].addActions(_actions);
  }

  /* Process */
  /* Cette fonction exécute l'intent qui correspond à la phrase du client. */
  process(_sentence, _socket){
    const SPLITTED_SAY = _sentence.split(" ");
    let intent_name = null;
    let variables = null;

    loop1:
    for(let loop_intent_name in this.Intents){
      for(let a = 0; a < this.Intents[loop_intent_name].Documents.length; a++){
        const RESULT = this._process(this.Intents[loop_intent_name].Documents[a], SPLITTED_SAY);
        if(RESULT !== false){
          intent_name = loop_intent_name;
          variables = RESULT;
          break loop1;
        }
      }
    }

    if(intent_name === null){
      loop1:
      for(let loop_intent_name in this.Intents){
        for(let a = 0; a < this.Intents[loop_intent_name].Documents.length; a++){
          const RESULT = this._process(this.Intents[loop_intent_name].Documents[a], SPLITTED_SAY, false);
          if(RESULT !== false){
            intent_name = loop_intent_name;
            variables = RESULT;
            break loop1;
          }
        }
      }
    }

    if(intent_name === null){
      intent_name = "none";
    }

    for(let variable in variables){
      const VALUE = parseFloat(variables[variable]);
      if(!isNaN(VALUE)){
        variables[variable] = VALUE;
      }
    }
    this.Intents[intent_name].Variables = variables;

    if(this.Intents[intent_name].Actions.length === 0){
      this.Intents[intent_name].answer(_socket);
    }
    else{
      for(let index = 0; index < this.Intents[intent_name].Actions.length; index++){
        this.Intents[intent_name].Actions[index](this.Intents[intent_name], _socket);
      }
    }
  }

  /* ################################################################## */
  /* ### PRIVATE ###################################################### */
  /* ################################################################## */

  /* Cette fonction vérifie si un intent existe, si non, elle le crée. */
  _checkIntentExistence(_intentName){
    const SELF = this;
    if(this.Intents[_intentName] === undefined){
      this.Intents[_intentName] = new LIBRARIES.Intent(SELF.Main, _intentName);
    }
  }

  /* Cette fonction est une boucle essentielle de la fonction "process"; */
  _process(_sentence, _splitedSay, _asc = true){
    const REPLACE = ["'"];
    const SEPARATOR = " ";
    _splitedSay = _splitedSay.join(SEPARATOR);
    for(let i = 0; i < REPLACE.length; i++){
      while(_sentence.indexOf(REPLACE[i]) != -1){
        _sentence = _sentence.replace(REPLACE[i], SEPARATOR);
      }
      while(_splitedSay.indexOf(REPLACE[i]) != -1){
        _splitedSay = _splitedSay.replace(REPLACE[i], SEPARATOR);
      }
    }
    _splitedSay = _splitedSay.split(SEPARATOR);
    let SPLITTED_SENTENSE = _sentence.split(SEPARATOR);

    if(_asc === false){
      SPLITTED_SENTENSE = SPLITTED_SENTENSE.reverse();
      _splitedSay = _splitedSay.reverse();
    }

    const VARIABLES = {};
    let variables_position = 0;
    let variable_name = null;
    let ok = 0; // cette variable représente le nombre de mots ou variables correspondantes à la phrase testée.
    loop3:
    for(let b = 0; b < SPLITTED_SENTENSE.length; b++){
      // SI LE MOT EST UNE VARIABLE
      if(SPLITTED_SENTENSE[b][0] === "{" && SPLITTED_SENTENSE[b][SPLITTED_SENTENSE[b].length - 1] === "}"){
        let without_percent = SPLITTED_SENTENSE[b].substring(1, SPLITTED_SENTENSE[b].length - 1).split("|");
        variable_name = without_percent[0];
        let max_words = parseInt(without_percent[1]);
        VARIABLES[variable_name] = [];
        let next_word = SPLITTED_SENTENSE[b + 1];
        while(_splitedSay[b + variables_position] !== next_word && _splitedSay[b + variables_position] !== undefined){
          VARIABLES[variable_name].push(_splitedSay[b + variables_position]);
          variables_position = variables_position + 1;
          //console.log(next_word, _splitedSay, _splitedSay[b + variables_position]);
          if(max_words > 0){
            if(VARIABLES[variable_name].length > max_words){
              break loop3;
            }
          }
        }
        variables_position = variables_position - 1;
        if(_asc === false){
          VARIABLES[variable_name] = VARIABLES[variable_name].reverse()
        }
        VARIABLES[variable_name] = VARIABLES[variable_name].join(" ");
        ok++;
      }
      // SI LE MOT N'EST PAS UNE VARIABLE
      else{
        // SI LE MOT EN COUR EST EGAL AU MOT QUE L'ON A ENTENDU
        if(SPLITTED_SENTENSE[b] === _splitedSay[b + variables_position]){
          ok++;
        }
        else{
          break;
        }
      }
    }
    
    if(ok === SPLITTED_SENTENSE.length){
      return VARIABLES;
    }
    return false;
  }
}

module.exports = Manager;