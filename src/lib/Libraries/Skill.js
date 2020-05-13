const LIBRARIES = {
  FS: require("fs")
};

class Skill {
  constructor(_main, _settings, _folder) {
    this.Folder = _folder;
    this.Main = _main;
    this.Settings = _settings;
  }

  SaveSettings(){
    const INDEX = this.Main.SkillPermanentSettings.skills.findIndex(x => x.Path.endsWith(this.Folder + "/"));
    this.Main.SkillPermanentSettings.skills[INDEX].Settings = this.Settings;
    LIBRARIES.FS.writeFileSync(this.Main.DirName + "/lib/skills/skills.json", JSON.stringify(this.Main.SkillPermanentSettings, null, 4), "utf8");
  }
}

module.exports = Skill;
