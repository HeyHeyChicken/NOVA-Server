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
  Axios: require("axios"),

  Message: require("./Message"),
  NOVAClient: require("./Client"),
  Manager: require("./Manager"),
  Skill: require("./Skill"),
  Info: require("./Info"),
};

class Main {
  constructor(_dirname) {
    const SELF = this;

    this.LauncherIO = null; // Ce serveur socket relie le serveur à son launcher.
    this.LauncherMessages = []; // Cette liste contiendra les messages non envoyés au launcher.
    this.InitialiseLauncherSocketClient();

    this.FunctionsToAddToIOClientClients = {};

    this.DirName = _dirname;
    this.SkillPermanentSettings = JSON.parse(
      LIBRARIES.FS.readFileSync(
        LIBRARIES.Path.join(this.DirName, "/lib/skills/skills.json"),
        "utf8"
      )
    );
    this.Settings = JSON.parse(
      LIBRARIES.FS.readFileSync(
        LIBRARIES.Path.join(this.DirName, "/settings.json"),
        "utf8"
      )
    ); // On récupère les paramètres du serveur.
    this.ClientsSocket = {};

    this.Translation = JSON.parse(
      LIBRARIES.FS.readFileSync(
        LIBRARIES.Path.join(this.DirName, "/translation.json"),
        "utf8"
      )
    ); // On récupère les traductions pour les GUI.
    this.Languages = {};
    for (let key in this.Translation) {
      this.Languages[key] = this.Translation[key].language_name;
    }

    this.HotWords = LIBRARIES.FS.readdirSync(
      LIBRARIES.Path.join(this.DirName, "public", "hot_words")
    ).filter((x) => x.endsWith(".pmdl") || x.endsWith(".umdl"));
    this.Themes = LIBRARIES.FS.readdirSync(
      LIBRARIES.Path.join(this.DirName, "public", "css", "theme")
    ).filter((x) => x.endsWith(".css"));

    this.ClientSkillsPublic = {}; // Cet objet va contenir l'arbre des fichiers provenant des skills destinés à la GUI des clients.

    this.ExpressViewsDirectories = [this.DirName + "/views"];
    this.Express = null; // Serveur Web permettant à un utilisateur d'accéder à une interface d'administration du serveur NOVA.

    this.HTTP = null; // Le serveur Web est en http, pas en https.
    this.ClientIO = null; // Ce serveur socket relie le serveur aux clients NOVA.
    this.ServerIO = null; // Ce serveur socket relie le serveur à son interface.
    this.WavWriters = {}; // Cet objet contiens les modules qui récupèrent la voix pour la convertir en fichier.

    this.Manager = new LIBRARIES.Manager(this); // Cette entité permet de convertir la demande utilisateur en action tout en extrayant les données importantes.

    this.STT = null;

    this.URL_Skills = [];

    this.Unofficial_Skills = JSON.parse(
      LIBRARIES.FS.readFileSync(
        LIBRARIES.Path.join(
          this.DirName,
          "/lib/skills/unofficial_skill_list.json"
        ),
        "utf8"
      )
    );
    this.Official_Skills = JSON.parse(
      LIBRARIES.FS.readFileSync(
        LIBRARIES.Path.join(
          this.DirName,
          "/lib/skills/official_skill_list.json"
        ),
        "utf8"
      )
    );
    this.URL_Skills = JSON.parse(
      LIBRARIES.FS.readFileSync(
        LIBRARIES.Path.join(this.DirName, "/lib/skills/github_skill_list.json"),
        "utf8"
      )
    );

    if (this.URL_Skills.length == 0) {
      this.RefreshSkillsList(function () {
        SELF.InitialiseServers(); // On initialise les serveurs de NOVA.
        LIBRARIES.Skill.LoadAll(SELF); // On charge les skills du serveur NOVA.
      });
    } else {
      SELF.InitialiseServers(); // On initialise les serveurs de NOVA.
      LIBRARIES.Skill.LoadAll(SELF); // On charge les skills du serveur NOVA.
    }

    const CLIENTS = LIBRARIES.NOVAClient.SelectAll(SELF);
    for (let i = 0; i < CLIENTS.length; i++) {
      Object.assign(new LIBRARIES.NOVAClient(), CLIENTS[i]).SetConnected(
        false,
        SELF
      );
    }
  }

  HTTPSJsonGet(_hostname, _path, _callback) {
    const SELF = this;
    let back = null;

    LIBRARIES.Axios.get(_hostname + _path)
      .then(function (response) {
        back = response.data;
      })
      .catch(function (error) {
        SELF.Log(error, "red");
      })
      .then(function () {
        if (_callback != undefined) {
          _callback(back);
        }
      });
  }

  TextURLToLink(text) {
    // Put the URL to variable $1 after visiting the URL
    var Rexp =
      /((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;

    // Replace the RegExp content by HTML element
    return text.replace(Rexp, "<a href='$1' target='_blank'>$1</a>");
  }

  // Cette fonction récupère la liste des screenshots d'un skill.
  GetSkillScreenshot(_url, _index, _array, _callback) {
    const SELF = this;
    const HOST_NAME = "raw.githubusercontent.com";
    const PATH =
      "/" + _url + "/master/resources/screenshots/" + _index + ".jpg";
    LIBRARIES.HTTPS.get(
      {
        hostname: HOST_NAME,
        path: PATH,
        headers: { "User-Agent": "Mozilla/5.0" },
      },
      (response) => {
        let request_data = "";

        response.on("data", (chunk) => {
          request_data += chunk;
        });

        response.on("end", () => {
          if (request_data == "404: Not Found") {
            _callback(_array);
          } else {
            _array.push("https://" + HOST_NAME + PATH);
            SELF.GetSkillScreenshot(_url, _index + 1, _array, _callback);
          }
        });
      }
    );
  }

  // Cette fonction met à jour la liste des skills disponibles à être installés.
  RefreshSkillsList(_callback) {
    const SELF = this;
    SELF.URL_Skills = [];
    SELF.HTTPSJsonGet(
      "https://api.github.com",
      "/search/repositories?q=+topic:nova-assistant-skill+is:public",
      function (skills) {
        if (skills != null) {
          for (let index = 0; index < skills.items.length; index++) {
            SELF.RefreshSkill(skills.items[index], function () {
              if (SELF.URL_Skills.length == skills.items.length) {
                if (SELF.Unofficial_Skills.length > 0) {
                  for (
                    let unofficial_index = 0;
                    unofficial_index < SELF.Unofficial_Skills.length;
                    unofficial_index++
                  ) {
                    SELF.HTTPSJsonGet(
                      "https://api.github.com",
                      "/search/repositories?q=+repo:" +
                        SELF.Unofficial_Skills[unofficial_index],
                      function (unofficial_skills) {
                        SELF.RefreshSkill(
                          unofficial_skills.items[0],
                          function () {
                            if (
                              SELF.URL_Skills.length ==
                              skills.items.length +
                                SELF.Unofficial_Skills.length
                            ) {
                              SELF.URL_Skills.sort((a, b) =>
                                a.title > b.title ? 1 : -1
                              );
                              LIBRARIES.FS.writeFileSync(
                                LIBRARIES.Path.join(
                                  SELF.DirName,
                                  "/lib/skills/github_skill_list.json"
                                ),
                                JSON.stringify(SELF.URL_Skills, null, 4),
                                "utf8"
                              );

                              if (_callback != undefined) {
                                _callback();
                              }
                            }
                          }
                        );
                      }
                    );
                  }
                } else {
                  SELF.URL_Skills.sort((a, b) => (a.title > b.title ? 1 : -1));
                  LIBRARIES.FS.writeFileSync(
                    LIBRARIES.Path.join(
                      SELF.DirName,
                      "/lib/skills/github_skill_list.json"
                    ),
                    JSON.stringify(SELF.URL_Skills, null, 4),
                    "utf8"
                  );

                  if (_callback != undefined) {
                    _callback();
                  }
                }
              }
            });
          }
        }
      }
    );
  }

  // Cette fonction ajoute un skill à la liste des skills disponibles à être installés.
  RefreshSkill(item, _callback) {
    const SELF = this;
    const URL_END = item.html_url.split("https://github.com/")[1];
    // On récupère le fichier "info.json"
    const INFO = new LIBRARIES.Info();
    INFO.id = item.id;
    INFO.name = item.name;
    INFO.author = {
      name: item.owner.login,
      url: item.owner.html_url,
    };
    INFO.gitURL = item.html_url;
    (INFO.wallpaper =
      "https://raw.githubusercontent.com/" +
      URL_END +
      "/master/resources/nova-wallpaper.jpg"),
      (INFO.icon =
        "https://raw.githubusercontent.com/" +
        URL_END +
        "/master/resources/nova-icon.png"),
      (INFO.lastUpdated = item.pushed_at);

    SELF.HTTPSJsonGet(
      "https://raw.githubusercontent.com",
      "/" + URL_END + "/master/resources/info.json",
      function (json) {
        if (json != null) {
          if (json.description[SELF.Settings.Language] != undefined) {
            INFO.description = json.description[SELF.Settings.Language];
          } else if (json.description["en-US"] != undefined) {
            INFO.description = json.description["en-US"];
          } else if (Object.keys(json.description).length > 0) {
            INFO.description =
              json.description[Object.keys(json.description)[0]];
          }

          INFO.language = json.language;
          INFO.worksOffline = json.worksOffline;
        }

        SELF.GetSkillScreenshot(URL_END, 1, [], function (_screenshots) {
          INFO.screenshots = _screenshots;
          SELF.URL_Skills.push(INFO);

          if (_callback != undefined) {
            _callback();
          }
        });
      }
    );
  }

  // Cette fonction exécute des commandes terminales sur le poste du client.
  Terminal(_command, _path, _callback) {
    const SELF = this;

    const MESSAGES = [];
    const EXECUTION = LIBRARIES.ChildProcess.exec(_command, { cwd: _path });

    EXECUTION.stdout.on("data", (_data) => {
      _data = _data.split("\n");
      for (let i = 0; i < _data.length; i++) {
        if (_data[i].length > 0) {
          MESSAGES.push(_data[i]);
        }
      }
    });

    EXECUTION.stderr.on("data", (_data) => {
      _data = _data.split("\n");
      for (let i = 0; i < _data.length; i++) {
        if (_data[i].length > 0) {
          MESSAGES.push(_data[i]);
        }
      }
    });

    EXECUTION.on("close", (_error_code) => {
      if (_callback !== undefined) {
        _callback(_error_code, MESSAGES);
      }
    });
  }

  // Cette fonction initialise la conection socket avec le launcher.
  InitialiseLauncherSocketClient() {
    const SELF = this;

    SELF.LauncherIO = LIBRARIES.SocketIOClient("http://localhost:8082"); // Ce serveur socket relie le serveur à son launcher.

    // Lorsque le serveur arrive à se connecter au launcher
    SELF.LauncherIO.on("connect", function () {
      if (SELF.LauncherMessages.length > 0) {
        for (let i = 0; i < SELF.LauncherMessages.length; i++) {
          SELF.LauncherIO.emit(
            "log",
            SELF.LauncherMessages[i][0],
            SELF.LauncherMessages[i][1],
            SELF.LauncherMessages[i][2]
          );
        }
        SELF.LauncherMessages = [];
      }
    });

    // Lorsque le launcher demande au serveur de redémarrer.
    SELF.LauncherIO.on("reboot", function () {
      SELF.ClientIO.sockets.emit("reboot");
      process.exit(1);
    });
  }

  // Cette fonction initialise les serveurs de NOVA.
  InitialiseServers() {
    const SELF = this;
    this.Express = LIBRARIES.Express(); // On initialise Express.
    this.Express.set("view engine", "ejs"); // On utilise le moteur de rendu "ejs" pour nos vues.
    this.Express.set("views", this.ExpressViewsDirectories);
    this.Express.use(
      LIBRARIES.Express.static(LIBRARIES.Path.join(SELF.DirName, "/public"))
    ); // On défini un dossier public.
    this.Express.get("/", function (req, res) {
      res.render("index");
    });
    this.Express.get("/license.pdf", function (req, res) {
      res.sendFile(
        LIBRARIES.Path.join(
          LIBRARIES.Path.dirname(SELF.DirName),
          "non-commercial-license.pdf"
        )
      );
    });
    this.HTTP = LIBRARIES.HTTP.createServer(this.Express);
    this.InitialiseSocketClient();
    this.InitialiseSocketServer();
    this.HTTP.listen(this.Settings.WebServerPort, function () {
      SELF.Log(
        "You can access the server's GUI on http://localhost:" +
          SELF.Settings.WebServerPort +
          ".",
        "green"
      );
    });
  }

  // Cette fonction est en attente d'un module de Text To Speech.
  TTS(_socket, _text, _callback) {}

  // Cette fonction initialise le serveur socket reliant le serveur NOVA aux clients NOVA.
  InitialiseSocketClient() {
    const SELF = this;

    this.ClientIO = LIBRARIES.SocketIO();
    this.ClientIO.on("connection", function (socket) {
      SELF.ClientsSocket[socket.client.conn.id] = socket;
      socket.emit("set_skills_public_files", SELF.ClientSkillsPublic);
      socket.emit("set_language", SELF.Settings.Language);
      socket.emit("set_theme", SELF.Settings.Theme);
      socket.emit("set_done_tutorial", SELF.Settings.DoneTutorial);
      socket.emit("set_translation", SELF.Translation[SELF.Settings.Language]);

      for (var attribute in SELF.FunctionsToAddToIOClientClients) {
        socket.on(attribute, SELF.FunctionsToAddToIOClientClients[attribute]);
      }

      // Lorsque l'utilisateur envoie un message au serveur.
      socket.on("cs_message", function (_message) {
        SELF.Manager.process(_message.Content, socket);
      });

      // Lorsque l'utilisateur envoie un message au serveur.
      socket.on("add_client", function (_ID) {
        let client = LIBRARIES.NOVAClient.SelectByID(_ID, SELF);
        if (client === undefined) {
          client = new LIBRARIES.NOVAClient(_ID).Insert(SELF);
        }
        client.SetSocketID(socket.client.conn.id, SELF);
        client.SetConnected(true, SELF);
        SELF.UpdateServerGUI();
      });

      // Lorsque l'utilisateur fait une demande directe au serveur.
      socket.on("server", function (_message) {
        let text = null;
        switch (_message) {
          case "microphone_prompt_permission":
            text = SELF.Translation.microphone_prompt_permission;
            socket.emit("sc_message", new LIBRARIES.Message(text, true));
            SELF.TTS(socket, text);
            break;
          case "microphone_denied_permission":
            text = SELF.Translation.microphone_prompt_permission;
            SELF.TTS(socket, text);
            socket.emit("sc_message", new LIBRARIES.Message(text, true));
            break;
          case "microphone_granted_permission":
            text = SELF.Translation.microphone_granted_permission;
            SELF.TTS(socket, text);
            socket.emit("sc_message", new LIBRARIES.Message(text, true));
            break;
        }
      });

      socket.on("start_recording", function (_data) {
        SELF.WavWriters[socket.client.conn.id] = new LIBRARIES.WAV.FileWriter(
          SELF.DirName + "/voices/" + socket.client.conn.id + ".wav",
          {
            channels: _data.numChannels,
            sampleRate: _data.fps,
            bitDepth: _data.bps,
          }
        );
        let client = LIBRARIES.NOVAClient.SelectBySocketID(
          socket.client.conn.id,
          SELF
        );
        if (client !== undefined) {
          client.SetSpeaking(true, SELF);

          SELF.UpdateServerGUI();
        }
      });

      // L'utilisateur est en train de parler, nous enregisrons son flux audio dans un fichier.
      socket.on("write_audio", function (_data) {
        LIBRARIES.FS.appendFile(
          LIBRARIES.Path.join(
            SELF.DirName,
            "/voices/",
            socket.client.conn.id + ".wav"
          ),
          _data,
          function (err) {
            if (err) throw err;
          }
        );
      });

      // L'utilisateur a fini de parler, nous envoyons sa voix au serveur STT.
      socket.on("end_recording", function () {
        const PATH = LIBRARIES.Path.join(
          SELF.DirName,
          "/voices/",
          socket.client.conn.id + ".wav"
        );
        if (SELF.STT != null) {
          SELF.STT.Recognize(PATH, function (_message) {
            socket.emit("stop_stt");
            socket.emit("cs_message", _message);
            SELF.Manager.process(_message, socket);
          });
        } else {
          SELF.Log("No STT service initialised.", "red");
        }

        let client = LIBRARIES.NOVAClient.SelectBySocketID(
          socket.client.conn.id,
          SELF
        );
        if (client !== undefined) {
          client.SetSpeaking(false, SELF);

          SELF.UpdateServerGUI();
        }
      });

      // Lorsqu'un client NOVA se déconnecte du serveur NOVA.
      socket.on("disconnect", function () {
        let client = LIBRARIES.NOVAClient.SelectBySocketID(
          socket.client.conn.id,
          SELF
        );
        if (client !== undefined) {
          client.SetConnected(false, SELF);
          client.SetSpeaking(false, SELF);

          SELF.UpdateServerGUI();
        }
      });
    });
    this.ClientIO.listen(8081);
  }

  // Cette fonction initialise le serveur socket reliant le serveur NOVA au serveur Web de NOVA.
  InitialiseSocketServer() {
    const SELF = this;
    this.ServerIO = LIBRARIES.SocketIO(this.HTTP);
    this.ServerIO.on("connection", function (socket) {
      // Un utilisateur vient d'ouvrir la page Web du serveur NOVA.
      // On envoie à l'interface WEB la liste des clients NOVA.

      socket.emit("set_clients", LIBRARIES.NOVAClient.SelectAll(SELF));

      // On envoie à l'interface WEB la liste des skills installables.
      socket.emit("set_skills", SELF.URL_Skills);
      socket.emit("set_installed_skills", SELF.SkillPermanentSettings.skills);
      socket.emit("set_languages", SELF.Languages);
      socket.emit("set_language", SELF.Settings.Language);
      socket.emit("set_translation", SELF.Translation[SELF.Settings.Language]);
      socket.emit("set_themes", SELF.Themes);
      socket.emit("set_theme", SELF.Settings.Theme);
      socket.emit("set_license_key", SELF.Settings.LicenseKey);
      socket.emit("set_done_tutorial", SELF.Settings.DoneTutorial);
      socket.emit("set_official_skills", SELF.Official_Skills);

      // Si l'utilisateur demande à changer les rélages d'un skill.
      socket.on("set_Installed", function (_skills) {
        SELF.SkillPermanentSettings.skills = JSON.parse(_skills);
        LIBRARIES.FS.writeFileSync(
          LIBRARIES.Path.join(SELF.DirName, "/lib/skills/skills.json"),
          JSON.stringify(SELF.SkillPermanentSettings, null, 4),
          "utf8"
        );
        SELF.LauncherIO.emit("reboot_server");
      });

      // Si l'utilisateur demande à rafraichir la liste des skills
      socket.on("refresh_skills_list", function () {
        const OLD_SKILLS_LIST = SELF.URL_Skills;
        SELF.URL_Skills = [];

        SELF.RefreshSkillsList(function () {
          socket.emit("set_skills", SELF.URL_Skills);
        });
      });

      // L'utilisateur demande à récupérer la liste des skills installés.
      socket.on("get_Installed", function () {
        socket.emit("set_installed_skills", SELF.SkillPermanentSettings.skills);
      });

      // L'utilisateur a lu et accepté le contrat de license
      socket.on("read_and_accept_license_agreement", function () {
        SELF.Settings.LicenseKey = "non-commercial-and-evaluation";
        LIBRARIES.FS.writeFileSync(
          LIBRARIES.Path.join(SELF.DirName, "settings.json"),
          JSON.stringify(SELF.Settings, null, 4),
          "utf8"
        );
      });

      // L'utilisateur a fini le tuto
      socket.on("end_tutorial", function () {
        SELF.Settings.DoneTutorial = true;
        LIBRARIES.FS.writeFileSync(
          LIBRARIES.Path.join(SELF.DirName, "settings.json"),
          JSON.stringify(SELF.Settings, null, 4),
          "utf8"
        );
      });

      // L'utilisateur demande à installer un skill.
      socket.on("install_skill", function (_git) {
        let presentInSkillList = false;
        for (let index = 0; index < SELF.URL_Skills.length; index++) {
          if (SELF.URL_Skills[index].gitURL == _git) {
            presentInSkillList = true;
          }
        }

        if (!presentInSkillList) {
          const END = ".git";
          if (_git.endsWith(END)) {
            _git = _git.substring(_git.length - END.length, 0);
          }
          const SPLITTED = _git.split("/");
          const ID =
            SPLITTED[SPLITTED.length - 2] + "/" + SPLITTED[SPLITTED.length - 1];
          if (!SELF.Unofficial_Skills.includes(ID)) {
            SELF.Unofficial_Skills.push(ID);
            LIBRARIES.FS.writeFileSync(
              LIBRARIES.Path.join(
                SELF.DirName,
                "/lib/skills/unofficial_skill_list.json"
              ),
              JSON.stringify(SELF.Unofficial_Skills, null, 4),
              "utf8"
            );
          }

          SELF.RefreshSkillsList(function () {
            socket.emit("set_skills", SELF.URL_Skills);
            LIBRARIES.Skill.Install(_git, SELF, socket);
          });
        } else {
          LIBRARIES.Skill.Install(_git, SELF, socket);
        }
      });

      // L'utilisateur demande à desinstaller un skill.
      socket.on("uninstall_skill", function (_git) {
        LIBRARIES.Skill.Uninstall(_git, SELF, socket);
      });

      // L'utilisateur demande à changer de langue.
      socket.on("set_language", function (_language) {
        if (_language != "") {
          SELF.Settings.Language = _language;
          LIBRARIES.FS.writeFileSync(
            LIBRARIES.Path.join(SELF.DirName, "settings.json"),
            JSON.stringify(SELF.Settings, null, 4),
            "utf8"
          );
          SELF.RefreshSkillsList(function () {
            SELF.LauncherIO.emit("reboot_server");
          });
        }
      });

      // L'utilisateur demande à supprimer un client.
      socket.on("remove_client", function (_id) {
        const CLIENT = LIBRARIES.NOVAClient.SelectByID(_id, SELF);
        if (CLIENT !== undefined) {
          CLIENT.Delete(SELF);

          SELF.UpdateServerGUI();
        }
      });

      // L'utilisateur demande à redémarrer un client.
      socket.on("reboot_client", function (_id) {
        const CLIENT = LIBRARIES.NOVAClient.SelectByID(_id, SELF);
        if (CLIENT !== undefined) {
          SELF.ClientsSocket[CLIENT.SocketID].emit("reboot");
        }
      });

      socket.on("set_theme", function (_theme) {
        SELF.Settings.Theme = _theme;
        LIBRARIES.FS.writeFileSync(
          LIBRARIES.Path.join(SELF.DirName, "settings.json"),
          JSON.stringify(SELF.Settings, null, 4),
          "utf8"
        );
        SELF.LauncherIO.emit("reboot_server");
      });
    });
  }

  // Cette fonction ajoute un fichier à l'arbre des fichiers provenant des skills destinés à la GUI des clients.
  AddClientSkillsPublicFile(_skillName, _file) {
    if (this.ClientSkillsPublic[_skillName] === undefined) {
      this.ClientSkillsPublic[_skillName] = [];
      const PATH = LIBRARIES.Path.join(
        this.DirName,
        "/lib/skills/",
        _skillName,
        "/src/public/CLIENT/"
      );
      if (LIBRARIES.FS.existsSync(PATH)) {
        this.Express.use("/" + _skillName, LIBRARIES.Express.static(PATH)); // On défini un dossier public.
      }
    }
    if (_file !== undefined) {
      this.ClientSkillsPublic[_skillName].push(_file);
    }
  }

  // Cette fonction remonte l'état des clients à l'interface Web du serveur.
  UpdateServerGUI() {
    const SELF = this;

    if (SELF.ServerIO.sockets !== undefined) {
      SELF.ServerIO.sockets.emit(
        "set_clients",
        LIBRARIES.NOVAClient.SelectAll(SELF)
      );
    }
  }

  // Cette fonction remplace le "console.log"
  Log(_text, _color = "white", _header = "NOVA SERVER") {
    if (this.LauncherIO.connected === true) {
      this.LauncherIO.emit("log", _text, _color, _header);
    } else {
      this.LauncherMessages.push([_text, _color, _header]);
      console.log(_text);
    }
  }
}

module.exports = Main;
