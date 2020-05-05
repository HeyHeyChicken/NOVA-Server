const LIBRARIES = {
  Server : require("./src/lib/Main")
};

const SERVER = new LIBRARIES.Server(__dirname + "/src");