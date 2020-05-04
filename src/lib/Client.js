class Client {
  constructor(_ID, _connected = false, _name = "", _speaking = false, _socketID = null) {
    this.ID = _ID;
    this.Name = _name;
    this.Connected = _connected;
    this.Speaking = _speaking;
    this.SocketID = _socketID;
  }

  Insert(_db){
    var stmt = _db.prepare("INSERT INTO NovaClient VALUES (?, ?, ?, ?, ?)");
    stmt.run(this.ID, this.Name, this.Connected, this.Speaking, this.SocketID);
    stmt.finalize();
    return this;
  }

  SetSocketID(_socketID, _db){
    const SELF = this;

    var stmt = _db.prepare("UPDATE NovaClient SET SocketID = ? WHERE ID = ?");
    stmt.run(_socketID, this.ID);
    stmt.finalize();
    return this;
  }

  SetConnected(_connected, _db){
    const SELF = this;

    var stmt = _db.prepare("UPDATE NovaClient SET Connected = ? WHERE ID = ?");
    stmt.run(_connected, this.ID);
    stmt.finalize();
    return this;
  }

  SetSpeaking(_speaking, _db){
    const SELF = this;

    var stmt = _db.prepare("UPDATE NovaClient SET Speaking = ? WHERE ID = ?");
    stmt.run(_speaking, this.ID);
    stmt.finalize();
    return this;
  }

  /* ######################################################################################## */
  /* ### STATIC ############################################################################# */
  /* ######################################################################################## */

  static SelectBySocketID(_socketID, _db, _callback){
    const SELF = this;

    _db.get("SELECT * FROM NovaClient WHERE SocketID = ?", [_socketID], (err, row) => {
      if (err) {
        throw err;
      }
      if(_callback !== undefined){
        if(row === undefined){
          _callback(row);
        }
        else{
          _callback(Client._DBToObj(row));
        }
      }
    });
  }

  static SelectByID(_ID, _db, _callback){
    const SELF = this;

    _db.get("SELECT * FROM NovaClient WHERE ID = ?", [_ID], (err, row) => {
      if (err) {
        throw err;
      }
      if(_callback !== undefined){
        if(row === undefined){
          _callback(row);
        }
        else{
          _callback(Client._DBToObj(row));
        }
      }
    });
  }

  static SelectAll(_db, _callback){
    const SELF = this;

    _db.all("SELECT * FROM NovaClient", [], (err, rows) => {
      if (err) {
        throw err;
      }
      if(_callback !== undefined){
        const ARRAY = [];
        for(let index = 0; index < rows.length; index++){
          ARRAY.push(Client._DBToObj(rows[index]));
        }
        _callback(ARRAY);
      }
    });
  }

  static Reset(_db){
    var stmt = _db.prepare("UPDATE NovaClient SET Speaking = 0, Connected = 0");
    stmt.run();
    stmt.finalize();
    return this;
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
}

module.exports = Client;
