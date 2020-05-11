const LIBRARIES = {
  FS: require("fs")
};

class Client {
  constructor(_ID, _connected = false, _name = "", _speaking = false, _socketID = null) {
    this.ID = _ID;
    this.Name = _name;
    this.Connected = _connected;
    this.Speaking = _speaking;
    this.SocketID = _socketID;
  }

  Insert(_main){
    Client._PrepareFile(_main);

    const DATA = JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8"));
    DATA.push(this);
    LIBRARIES.FS.writeFileSync(Client._GetPath(_main), JSON.stringify(DATA, null, 4), "utf8");

    return this;
  }

  SetSocketID(_socketID, _main){
    Client._PrepareFile(_main);

    this.SocketID = _socketID;

    const DATA = JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8"));
    const INDEX = DATA.findIndex(x => x.ID === this.ID);

    if(INDEX > -1){
      DATA[INDEX].SocketID = _socketID;

      LIBRARIES.FS.writeFileSync(Client._GetPath(_main), JSON.stringify(DATA, null, 4), "utf8");
    }

    return this;
  }

  SetConnected(_connected, _main){
    Client._PrepareFile(_main);

    this.Connected = _connected;

    const DATA = JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8"));
    const INDEX = DATA.findIndex(x => x.ID === this.ID);

    if(INDEX > -1){
      DATA[INDEX].Connected = _connected;

      LIBRARIES.FS.writeFileSync(Client._GetPath(_main), JSON.stringify(DATA, null, 4), "utf8");
    }

    return this;
  }

  SetSpeaking(_speaking, _main){
    Client._PrepareFile(_main);

    this.Speaking = _speaking;

    const DATA = JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8"));
    const INDEX = DATA.findIndex(x => x.ID === this.ID);

    if(INDEX > -1){
      DATA[INDEX].Speaking = _speaking;

      LIBRARIES.FS.writeFileSync(Client._GetPath(_main), JSON.stringify(DATA, null, 4), "utf8");
    }

    return this;
  }

  /* ######################################################################################## */
  /* ### STATIC ############################################################################# */
  /* ######################################################################################## */

  static SelectBySocketID(_socketID, _main, _callback){
    Client._PrepareFile(_main);

    return Client._Convert(JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8")).find(x => x.SocketID === _socketID));
  }

  static SelectByID(_ID, _main){
    Client._PrepareFile(_main);

    return Client._Convert(JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8")).find(x => x.ID === _ID));
  }

  static SelectAll(_main){
    Client._PrepareFile(_main);

    return JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8"));
  }

  static Reset(_main){
    Client._PrepareFile(_main);

    const DATA = JSON.parse(LIBRARIES.FS.readFileSync(Client._GetPath(_main), "utf8"));
    for(let i = 0; i < DATA.length; i++){
      DATA[i].Speaking = 0;
      DATA[i].Connected = 0;
    }

    LIBRARIES.FS.writeFileSync(Client._GetPath(_main), JSON.stringify(DATA, null, 4), "utf8");
  }

  /* ######################################################################################## */
  /* ### PRIVATE ############################################################################ */
  /* ######################################################################################## */

  static _DBToObj(_dbRow){
    const CLIENT = new Client();
    for(let attr in _dbRow){
      CLIENT[attr] = _dbRow[attr];
    }
    return CLIENT;
  }

  static _GetPath(_main){
    return _main.DirName + "/lib/DB/Client.json";
  }

  static _PrepareFile(_main){
    const PATH = Client._GetPath(_main);
    if (!LIBRARIES.FS.existsSync(PATH)) {
      LIBRARIES.FS.writeFileSync(PATH, JSON.stringify([]));
    }
  }

  static _Convert(_db){
    console.log(_db);
    if(_db === undefined){
      return _db;
    }
    return new Client(_db.ID, _db.Connected, _db.Name, _db.Speaking, _db.SocketID);
  }
}

module.exports = Client;
