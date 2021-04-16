const LIBRARIES = {
  Express: require("express"),
  HTTP: require("http"),
  HTTPS: require("https"),
  SocketIO: require("socket.io"),
  FS: require("fs"),
  WAV: require("wav"),
  SocketIOClient: require("socket.io-client"),
  ChildProcess: require("child_process"),
  Path: require("path"),

  NOVAClient: require("./Client"),
  Manager: require("./Manager"),
  House: require("./House"),
  Skill: require("./Skill")
};

class Main {
  constructor(_dirname) {
    const SELF = this;

    this.LauncherIO = null; // Ce serveur socket relie le serveur à son launcher.
    this.LauncherMessages = []; // Cette liste contiendra les messages non envoyés au launcher.
    this.InitialiseLauncherSocketClient();

    this.DirName = _dirname;
    this.SkillPermanentSettings = JSON.parse(LIBRARIES.FS.readFileSync(LIBRARIES.Path.join(this.DirName, "/lib/skills/skills.json"), "utf8"));
    this.Settings = JSON.parse(LIBRARIES.FS.readFileSync(LIBRARIES.Path.join(this.DirName, "/settings.json"), "utf8")); // On récupère les paramètres du serveur.
    this.Translation = JSON.parse(LIBRARIES.FS.readFileSync(LIBRARIES.Path.join(this.DirName, "/translation.json"), "utf8")); // On récupère les traductions pour les GUI.
    this.Languages = {};
    for(let key in this.Translation){
      this.Languages[key] = this.Translation[key].language_name;
    }

    this.HotWords = LIBRARIES.FS.readdirSync(LIBRARIES.Path.join(this.DirName, "/public/hot_words")).filter(x => x.endsWith(".pmdl") || x.endsWith(".umdl"));

    this.ClientSkillsPublic = {}; // Cet objet va contenir l'arbre des fichiers provenant des skills destinés à la GUI des clients.

    this.ExpressViewsDirectories = [this.DirName + "/views"];
    this.Express = null; // Serveur Web permettant à un utilisateur d'accéder à une interface d'administration du serveur NOVA.

    this.HTTP = null; // Le serveur Web est en http, pas en https.
    this.ClientIO = null; // Ce serveur socket relie le serveur aux clients NOVA.
    this.ServerIO = null; // Ce serveur socket relie le serveur à son interface.
    this.WavWriters = {}; // Cet objet contiens les modules qui récupèrent la voix pour la convertir en fichier.

    this.Manager = new LIBRARIES.Manager(this); // Cette entité permet de convertir la demande utilisateur en action tout en extrayant les données importantes.

    this.URL_Skills = [
      {
        title: "Convert",
        description: "This skill will allow your assistant to convert a lot of things...",
        git: "https://github.com/constantgillet/NOVA-Convert",
        wallpaper: "https://raw.githubusercontent.com/constantgillet/NOVA-Convert/master/resources/nova-wallpaper.jpg",
        icon: "https://raw.githubusercontent.com/constantgillet/NOVA-Convert/master/resources/nova-icon.png",
        screenshots: [
            "https://raw.githubusercontent.com/constantgillet/NOVA-Convert/master/resources/screenshots/1.jpg"
        ]
      },/*
      {
        title: "Chrome Auto Launcher",
        description: "This skill will allow your client to launch automatically Chrome at boot.",
        git: "https://github.com/HeyHeyChicken/NOVA-ChromeAutoLauncher",
        wallpaper: "https://www.journaldugeek.com/content/uploads/2019/08/googlechrome.png",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Google_Chrome_icon_%282011%29.svg/1024px-Google_Chrome_icon_%282011%29.svg.png",
        screenshots: []
      },*/
      {
        title: "Spotify",
        description: "This skill will allow your NOVA assistant to play you some Spotify music.",
        git: "https://github.com/HeyHeyChicken/NOVA-Spotify",
        wallpaper: "https://raw.githubusercontent.com/HeyHeyChicken/NOVA-Spotify/master/resources/nova-wallpaper.jpg",
        icon: "https://raw.githubusercontent.com/HeyHeyChicken/NOVA-Spotify/master/resources/nova-icon.png",
        screenshots: [
            "https://raw.githubusercontent.com/HeyHeyChicken/NOVA-Spotify/master/resources/screenshots/1.jpg"
        ]
      },/*
      {
        title: "Chrome Speech To text",
        description: "This skill will allow your NOVA assistant understand what you say for free and unlimited, but you'll have to use the Google Chrome browser for your clients.",
        git: "https://github.com/HeyHeyChicken/NOVA-Chrome-Speech-To-Text",
        wallpaper: "https://cloud.google.com/images/products/speech/speech-api-lead.png?hl=fr",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Google_Chrome_icon_%282011%29.svg/1024px-Google_Chrome_icon_%282011%29.svg.png",
        screenshots: []
      },*/
      {
        title: "Device IP Address",
        description: "This skill will allow you to know your assistant IP address.",
        git: "https://github.com/HeyHeyChicken/NOVA-Device-IP-Address",
        wallpaper: "https://bitfix.be/wp-content/uploads/2017/01/127.0.0.1-Wallpaper.png",
        icon: "https://cdn.icon-icons.com/icons2/37/PNG/512/IPaddress_IP_3219.png",
        screenshots: ["https://i.ibb.co/S5XRskB/screenshot.jpg"]
      },
      {
        title: "HomePod Sounds",
        description: "This skill will allow your assistant to play the system sounds of the HomePod.",
        git: "https://github.com/HeyHeyChicken/NOVA-HomePod-Sounds",
        wallpaper: "https://s1.dmcdn.net/v/N0O2u1QRCkSPkpXaf/x1080",
        icon: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/social/do-more-siri-homepod-social-card.jpg",
        screenshots: []
      },/*
      {
        title: "TuneIn",
        description: "This skill will allow your assistant to play you radio.",
        git: "https://github.com/HeyHeyChicken/NOVA-TuneIn",
        wallpaper: "https://store-images.s-microsoft.com/image/apps.61349.9007199266246398.fab84bd6-dd10-4a80-9137-0a0428d5234f.0dfd8a2d-25e4-4765-ad8e-703d58c0ec3d",
        icon: "https://www.underconsideration.com/brandnew/archives/tunein_2017_monogram.jpg",
        screenshots: []
      },*/
      {
        title: "Amberdata",
        description: "This skill will allow your NOVA assistant to know the value of your cryptocurrency portfolio.",
        git: "https://github.com/HeyHeyChicken/NOVA-Amberdata",
        wallpaper: "https://raw.githubusercontent.com/HeyHeyChicken/NOVA-Amberdata/master/resources/nova-wallpaper.jpg",
        icon: "https://raw.githubusercontent.com/HeyHeyChicken/NOVA-Amberdata/master/resources/nova-icon.png",
        screenshots: ["https://raw.githubusercontent.com/HeyHeyChicken/NOVA-Amberdata/master/resources/screenshots/1.jpg"]
      },
      {
        title: "Count",
        description: "This skill will allow your assistant to count.",
        git: "https://github.com/HeyHeyChicken/NOVA-Count",
        wallpaper: "https://www.dictionary.com/e/wp-content/uploads/2019/10/slideshow-Large-numbers_1_1000x700.jpg",
        icon: "data:image/png;base64,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",
        screenshots: ["https://i.ibb.co/xH3FdxN/Count.jpg"]
      },
      {
        title: "ChatBot",
        description: 'This skill will allow you to say "Hello", "Goodbye", and more to your assistant.',
        git: "https://github.com/HeyHeyChicken/NOVA-ChatBot",
        wallpaper: "https://www.spn.asso.fr/wp-content/uploads/2019/08/Chatbot-Cafe%CC%81-Techno-SPN.jpg",
        icon: "https://medias3.prestastore.com/835054-pbig/chat-bot-for-social-networking.jpg",
        screenshots: ["https://i.ibb.co/PgGG5FR/ChatBot.jpg"]
      },
      {
        title: "Random",
        description: "Roll the dice, ask for a random number between 10 and 325, and control the randomness!",
        git: "https://github.com/HeyHeyChicken/NOVA-Random",
        wallpaper: "https://ichef.bbci.co.uk/news/720/cpsprodpb/37B5/production/_89716241_thinkstockphotos-523060154.jpg",
        icon: "https://static.thenounproject.com/png/603655-200.png",
        screenshots: ["https://i.ibb.co/7JJ7qPC/Random.jpg"]
      },
      {
        title: "DateAndTime",
        description: "This skill will allow you to know the current date and the current time.",
        git: "https://github.com/HeyHeyChicken/NOVA-DateAndTime",
        wallpaper: "https://images-eu.ssl-images-amazon.com/images/I/71a-uS3N0mL.png",
        icon: "https://www.yourdictionary.com/images/definitions/lg/11728.time.jpg",
        screenshots: ["https://i.ibb.co/Wsjy0dM/Date-And-Time.jpg"]
      },
      {
        title: "TTS - Mac",
        description: "This skill will allow your assistant to answer you (no connection needed) with the Mac's Siri voice.",
        git: "https://github.com/HeyHeyChicken/NOVA-TTS-Mac",
        wallpaper: "https://github.com/HeyHeyChicken/NOVA-TTS-Mac/blob/master/resources/nova-wallpaper.png",
        icon: "https://github.com/HeyHeyChicken/NOVA-TTS-Mac/blob/master/resources/nova-icon.png",
        screenshots: []
      },
      {
        title: "TTS - Google",
        description: "This skill will allow your assistant to answer you (connection needed) with the Google's voice.",
        git: "https://github.com/HeyHeyChicken/NOVA-TTS-Google",
        wallpaper: "https://images-eu.ssl-images-amazon.com/images/I/71a-uS3N0mL.png",
        icon: "https://github.com/HeyHeyChicken/NOVA-TTS-Google/blob/main/resources/nova-icon.png",
        screenshots: []
      }
    ];

    this.STT = null;

    // PREPARING HOUSE
    this.House = new LIBRARIES.House("Logement");
    this.House.AddRoom("Salle de bain", "fas fa-bath");
    this.House.AddRoom("Chambre", "fas fa-bed");
    this.House.AddRoom("Cuisine", "fas fa-blender");
    this.House.AddRoom("Salon", "fas fa-tv");
    this.House.AddRoom("Toilettes", "fas fa-toilet");

    this.InitialiseServers(); // On initialise les serveurs de NOVA.
    LIBRARIES.Skill.LoadAll(this); // On charge les skills du serveur NOVA.
  }

  // Cette fonction exécute des commandes terminales sur le poste du client.
  Terminal(_command, _path, _callback){
    const SELF = this;

    const MESSAGES = [];
    const EXECUTION = LIBRARIES.ChildProcess.exec(_command, { cwd: _path });

    EXECUTION.stdout.on("data", (_data) => {
      _data = _data.split("\n");
      for(let i = 0; i < _data.length; i++){
        if(_data[i].length > 0){
          MESSAGES.push(_data[i]);
        }
      }
    });

    EXECUTION.stderr.on("data", (_data) => {
      _data = _data.split("\n");
      for(let i = 0; i < _data.length; i++){
        if(_data[i].length > 0){
          MESSAGES.push(_data[i]);
        }
      }
    });

    EXECUTION.on("close", (_error_code) => {
      if(_callback !== undefined){
        _callback(_error_code, MESSAGES);
      }
    });
  }

  // Cette fonction initialise la conection socket avec le launcher.
  InitialiseLauncherSocketClient(){
    const SELF = this;

    SELF.LauncherIO = LIBRARIES.SocketIOClient("http://localhost:8082"); // Ce serveur socket relie le serveur à son launcher.

    // Lorsque le serveur arrive à se connecter au launcher
    SELF.LauncherIO.on("connect", function(){
      if(SELF.LauncherMessages.length > 0){
        for(let i = 0; i < SELF.LauncherMessages.length; i++){
          SELF.LauncherIO.emit("log", SELF.LauncherMessages[i][0], SELF.LauncherMessages[i][1], SELF.LauncherMessages[i][2]);
        }
        SELF.LauncherMessages = [];
      }
    });

    // Lorsque le launcher demande au serveur de redémarrer.
    SELF.LauncherIO.on("reboot", function(){
      SELF.ClientIO.sockets.emit("reboot");
      process.exit(1);
    });
  }

  // Cette fonction initialise les serveurs de NOVA.
  InitialiseServers(){
    const SELF = this;

    this.Express = LIBRARIES.Express(); // On initialise Express.
    this.Express.set("view engine", "ejs"); // On utilise le moteur de rendu "ejs" pour nos vues.
    this.Express.set("views", this.ExpressViewsDirectories);
    this.Express.use(LIBRARIES.Express.static(LIBRARIES.Path.join(SELF.DirName, "/public"))); // On défini un dossier public.
    this.Express.get("/", function(req, res){
      res.render("index");
    });
    this.HTTP = LIBRARIES.HTTP.createServer(this.Express);
    this.InitialiseSocketClient();
    this.InitialiseSocketServer();
    this.HTTP.listen(this.Settings.WebServerPort, function(){
      SELF.Log("You can access the server's GUI on http://localhost:" + SELF.Settings.WebServerPort + ".", "green");
    });
  }

  // Cette fonction est en attente d'un module de Text To Speech.
  TTS(_socket, _text, _callback){
  }

  // Cette fonction initialise le serveur socket reliant le serveur NOVA aux clients NOVA.
  InitialiseSocketClient(){
    const SELF = this;

    this.ClientIO = LIBRARIES.SocketIO(this.HTTP);
    this.ClientIO.on("connection", function(socket){
      socket.emit("set_skills_public_files", SELF.ClientSkillsPublic);
      socket.emit("set_language", SELF.Settings.Language);
      socket.emit("set_hot_word", SELF.Settings.HotWord);

      // Lorsque l'utilisateur envoie un message au serveur.
      socket.on("cs_message", function(_message){
        SELF.Manager.process(_message.Content, socket);
      });

      // Lorsque l'utilisateur envoie un message au serveur.
      socket.on("add_client", function(_ID){
        let client = LIBRARIES.NOVAClient.SelectByID(_ID, SELF);
        if(client === undefined){
          client = new LIBRARIES.NOVAClient(_ID).Insert(SELF);
          client.SetConnected(true, SELF);
          client.SetSocketID(socket.client.conn.id, SELF);

          SELF.UpdateServerGUI();
        }
      });

      // Lorsque l'utilisateur fait une demande directe au serveur.
      socket.on("server", function(_message){
        switch(_message){
          case "microphone_prompt_permission":
            SELF.TTS(socket, "Bonjour, si vous souhaitez communiquer par la voix, vous devez autoriser Chrome à accéder à votre microphone.");
            break;
          case "microphone_denied_permission":
            SELF.TTS(socket, "Vous venez de refuser l'accès à Chrome à votre microphone, vous ne pourrez communiquer avec moi que par texte.");
            break;
          case "microphone_granted_permission":
            SELF.TTS(socket, "Parfait, vous pouvez à présent me parler.");
            break;
        }
      });

      socket.on("start_recording", function(_data){
        SELF.WavWriters[socket.client.conn.id] = new LIBRARIES.WAV.FileWriter(SELF.DirName + "/voices/" + socket.client.conn.id + ".wav", {
          channels: _data.numChannels,
          sampleRate: _data.fps,
          bitDepth: _data.bps
        });
        let client = LIBRARIES.NOVAClient.SelectBySocketID(socket.client.conn.id, SELF);
        if(client !== undefined){
          client.SetSpeaking(true, SELF);

          SELF.UpdateServerGUI();
        }
      });

      // L'utilisateur est en train de parler, nous enregisrons son flux audio dans un fichier.
      socket.on("write_audio", function(_data){
        LIBRARIES.FS.appendFile(LIBRARIES.Path.join(SELF.DirName,"/voices/", socket.client.conn.id + ".wav"), _data, function (err) {
          if (err) throw err;
        });
      });

      // L'utilisateur a fini de parler, nous envoyons sa voix au serveur STT.
      socket.on("end_recording", function(){
        const PATH = LIBRARIES.Path.join(SELF.DirName, "/voices/", socket.client.conn.id + ".wav");
        const FILE = LIBRARIES.FS.readFileSync(PATH);
        const AUDIO_BYTES = FILE.toString("base64");
        const REQUEST = {
          audio: {
            content: AUDIO_BYTES
          },
          config: {
            encoding: "LINEAR16",
            //sampleRateHertz: 16000,
            languageCode: SELF.Settings.Language
          }
        };
        (async () => {
          if(SELF.STT != null){
            const [response] = await SELF.STT.recognize(REQUEST);
            let transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');
            if(transcription != ""){
              transcription = transcription.charAt(0).toUpperCase() + transcription.slice(1);
              socket.emit("cs_message", transcription);
              SELF.Manager.process(transcription, socket);
            }
          }
          else{
            SELF.Log("The STT service isn't initialised.", "red");
          }
          LIBRARIES.FS.unlink(PATH, function(){});
        })();

        let client = LIBRARIES.NOVAClient.SelectBySocketID(socket.client.conn.id, SELF);
        if(client !== undefined){
          client.SetSpeaking(false, SELF);

          SELF.UpdateServerGUI();
        }
      });

      // Lorsqu'un client NOVA se déconnecte du serveur NOVA.
      socket.on("disconnect", function(){

        let client = LIBRARIES.NOVAClient.SelectBySocketID(socket.client.conn.id, SELF);
        if(client !== undefined){
          client.SetConnected(false, SELF);
          client.SetSpeaking(false, SELF);

          SELF.UpdateServerGUI();
        }
      });
    });
  }

  // Cette fonction initialise le serveur socket reliant le serveur NOVA au serveur Web de NOVA.
  InitialiseSocketServer(){
    const SELF = this;

    this.ServerIO = LIBRARIES.SocketIO();
    this.ServerIO.on("connection", function(socket){ // Un utilisateur vient d'ouvrir la page Web du serveur NOVA.
      // On envoie à l'interface WEB la liste des clients NOVA.

      socket.emit("set_clients", LIBRARIES.NOVAClient.SelectAll(SELF));

      // On envoie à l'interface WEB la liste des skills installables.
      socket.emit("set_skills", SELF.URL_Skills);
      socket.emit("set_installed_skills", SELF.SkillPermanentSettings.skills);
      socket.emit("set_house", SELF.House);
      socket.emit("set_language", SELF.Settings.Language);
      socket.emit("set_languages", SELF.Languages);
      socket.emit("set_dark_mode", SELF.Settings.DarkMode);
      socket.emit("set_translation", SELF.Translation[SELF.Settings.Language]);
      socket.emit("set_hot_words", SELF.HotWords);
      socket.emit("set_hot_word", SELF.Settings.HotWord);

      // Si l'utilisateur demande à changer les rélages d'un skill.
      socket.on("set_Installed", function(_skills){
        SELF.SkillPermanentSettings.skills = JSON.parse(_skills);
        LIBRARIES.FS.writeFileSync(LIBRARIES.Path.join(SELF.DirName, "/lib/skills/skills.json"), JSON.stringify(SELF.SkillPermanentSettings, null, 4), "utf8");
        SELF.LauncherIO.emit("reboot_server");
      });

      // L'utilisateur demande à récupérer la liste des skills installés.
      socket.on("get_Installed", function(){
        socket.emit("set_installed_skills", SELF.SkillPermanentSettings.skills);
      });

      // L'utilisateur demande à installer un skill.
      socket.on("install_skill", function(_git){
        LIBRARIES.Skill.Install(_git, SELF, socket);
      });

      // L'utilisateur demande à desinstaller un skill.
      socket.on("uninstall_skill", function(_git){
        LIBRARIES.Skill.Uninstall(_git, SELF, socket);
      });

      // L'utilisateur demande à changer de langue.
      socket.on("set_language", function(_language) {
        SELF.Settings.Language = _language;
        LIBRARIES.FS.writeFileSync(LIBRARIES.Path.join(SELF.DirName, "/settings.json"), JSON.stringify(SELF.Settings, null, 4), "utf8");
        SELF.LauncherIO.emit("reboot_server");
      });

      // L'utilisateur demande à changer le mot de déclenchement.
      socket.on("set_hot_word", function(_hot_word) {
        SELF.Settings.HotWord = _hot_word;
        LIBRARIES.FS.writeFileSync(LIBRARIES.Path.join(SELF.DirName, "/settings.json"), JSON.stringify(SELF.Settings, null, 4), "utf8");
        SELF.LauncherIO.emit("reboot_server");
      });
    });

    this.ServerIO.listen(8081);
  }

  // Cette fonction ajoute un fichier à l'arbre des fichiers provenant des skills destinés à la GUI des clients.
  AddClientSkillsPublicFile(_skillName, _file){
    if(this.ClientSkillsPublic[_skillName] === undefined){
      this.ClientSkillsPublic[_skillName] = [];
      const PATH = LIBRARIES.Path.join(this.DirName, "/lib/skills/",_skillName, "/src/public/CLIENT/");
      if(LIBRARIES.FS.existsSync(PATH)) {
        this.Express.use("/" + _skillName, LIBRARIES.Express.static(PATH)); // On défini un dossier public.
      }
    }
    if(_file !== undefined){
      this.ClientSkillsPublic[_skillName].push(_file);
    }
  }

  // Cette fonction remonte l'état des clients à l'interface Web du serveur.
  UpdateServerGUI(){
    const SELF = this;

    if(SELF.ServerIO.sockets !== undefined){
      SELF.ServerIO.sockets.emit("set_clients", LIBRARIES.NOVAClient.SelectAll(SELF));
    }
  }

  // Cette fonction remplace le "console.log"
  Log(_text, _color = "white", _header = "NOVA SERVER"){
    if(this.LauncherIO.connected === true){
      this.LauncherIO.emit("log", _text, _color, _header);
    }
    else{
      this.LauncherMessages.push([_text, _color, _header]);
      console.log(_text);
    }
  }
}

module.exports = Main;