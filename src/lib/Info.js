class Info {
  constructor(_main, _name) {
    this.id = null;
    this.name = null;
    this.author = {
      name: null,
      url: null
    };
    this.lastUpdated = null;
    this.gitURL = null;
    this.wallpaper = null;
    this.icon = null;
    this.description = "";
    this.worksOffline = false;
    this.language = [];
    this.screenshots = [];
  }
}

module.exports = Info;
