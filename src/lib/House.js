const LIBRARIES = {
  Room: require("./Room")
};

class House {
  constructor(_name) {
    this.Name = _name;
    this.Rooms = [];
    this.address = null;
  }

  AddRoom(_name, _icon){
    this.Rooms.push(new LIBRARIES.Room(_name, _icon));
  }
}

module.exports = House;
