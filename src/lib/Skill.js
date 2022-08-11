const LIBRARIES = {
    FS: require("fs"),
    Path: require("path"),
    Express: require("express"),

    _FS: require("./FS"),
    Info: require("./Info")
};

class Skill {
    /* ######################################################################################## */
    /* ### STATIC ############################################################################# */
    /* ######################################################################################## */

    /* Cette fonction permet de charger le skill dont le nom du dossier est passé en paramètre. */
    static Load(_directory, _main) {
        const ROOT_PATH = LIBRARIES.Path.join(_main.DirName, "/lib/skills/");
        const SKILL_PATH = LIBRARIES.Path.join(ROOT_PATH, _directory);
        const DEPENDENCY_PATH = LIBRARIES.Path.join(SKILL_PATH, "/src/");
        const CORPUS_PATH = LIBRARIES.Path.join(DEPENDENCY_PATH, "corpus/", _main.Settings.Language, "/corpus.json");

        // LOAD CORPUS
        if(LIBRARIES.FS.existsSync(CORPUS_PATH)) {
            const CORPUS = JSON.parse(LIBRARIES.FS.readFileSync(CORPUS_PATH, "utf8"));
            for(let j = 0; j < CORPUS.data.length; j++) {
                if(CORPUS.data[j].utterances !== undefined) {
                    for(let k = 0; k < CORPUS.data[j].utterances.length; k++) {
                        _main.Manager.addDocuments(CORPUS.data[j].intent, CORPUS.data[j].utterances[k]);
                    }
                }
                if(CORPUS.data[j].answers !== undefined) {
                    for(let k = 0; k < CORPUS.data[j].answers.length; k++) {
                        _main.Manager.addAnswers(CORPUS.data[j].intent, CORPUS.data[j].answers[k]);
                    }
                }
                if(CORPUS.data[j].errors !== undefined) {
                    for(let code in CORPUS.data[j].errors) {
                        _main.Manager.addErrors(CORPUS.data[j].intent, code, CORPUS.data[j].errors[code]);
                    }
                }
            }
        }

        // LOAD RESOURCES
        const RESOURCES_PATH = LIBRARIES.Path.join(SKILL_PATH, "/resources/");
        if (LIBRARIES.FS.existsSync(RESOURCES_PATH)) {
            let skill = _main.URL_Skills.find(x => x.id == _directory);
            if(skill == undefined){
              skill = new LIBRARIES.Info();
            }
            console.log(skill);
            const LOGO_PATH = LIBRARIES.Path.join(RESOURCES_PATH, "nova-icon.png");
            const WALLPAPER_PATH = LIBRARIES.Path.join(RESOURCES_PATH, "nova-wallpaper.jpg");
            if (LIBRARIES.FS.existsSync(LOGO_PATH) || LIBRARIES.FS.existsSync(WALLPAPER_PATH)) {
                _main.Express.use("/" + _directory, LIBRARIES.Express.static(RESOURCES_PATH));
            }
            // Icon
            if (LIBRARIES.FS.existsSync(LOGO_PATH)) {
                skill.icon = "/" + _directory + "/nova-icon.png";
            }
            // Wallpaper
            if (LIBRARIES.FS.existsSync(WALLPAPER_PATH)) {
                skill.wallpaper = "/" + _directory + "/nova-wallpaper.jpg";
            }
            // Screenshots
            const SCREENSHOTS_PATH = LIBRARIES.Path.join(RESOURCES_PATH, "screenshots");
            if (LIBRARIES.FS.existsSync(SCREENSHOTS_PATH)) {
                const SCREENSHOTS = LIBRARIES.FS.readdirSync(SCREENSHOTS_PATH).filter(x => x.endsWith(".jpg"))
                skill.screenshots = [];
                for(let index = 0; index < SCREENSHOTS.length; index++){
                    skill.screenshots.push("/" + _directory + "/screenshots/" + SCREENSHOTS[index]);
                }
            }

            console.log(skill);
            const INDEX = _main.URL_Skills.findIndex(x => x.gitURL === skill.gitURL);
            if(INDEX === -1){
                _main.URL_Skills.push(skill);
            }
            else{
                for(let attr in skill){
                    if(skill[attr] !== "" && skill[attr] !== undefined && skill[attr] !== null){
                        _main.URL_Skills[INDEX][attr] = skill[attr];
                    }
                }
            }
        }

        // LOAD INDEX
        const INDEX_PATH = DEPENDENCY_PATH + "index.js";
        if (LIBRARIES.FS.existsSync(INDEX_PATH)) {
            const LIBRARY = require(INDEX_PATH);
            const SETTINGS = _main.SkillPermanentSettings.skills.find(x => x.Path === SKILL_PATH).Settings;
            new LIBRARY(_main, SETTINGS, _directory);
        }

        // LOAD PUBLIC
        const PUBLIC_PATH = LIBRARIES.Path.join(DEPENDENCY_PATH, "public/");
        _main.AddClientSkillsPublicFile(_directory);
        if (LIBRARIES.FS.existsSync(PUBLIC_PATH)) {
            const FILES = LIBRARIES._FS.readdirSync(PUBLIC_PATH);
            for(let f = 0; f < FILES.length; f++){
                const SLASH_SPLIT = FILES[f].split("/");
                const FILE_NAME = SLASH_SPLIT[SLASH_SPLIT.length - 1];
                if(FILE_NAME[0] !== "."){
                    const SPLIT = FILES[f].split("CLIENT");
                    let file = SPLIT[SPLIT.length - 1];
                    file = file.split('\\').join('/');
                    _main.AddClientSkillsPublicFile(_directory, file);
                }
            }
        }

        _main.Log("The skill id \"" + _directory + "\" is loaded (" + _main.Settings.Language + ").", "green");
    }

    /* Cette fonction permet de charger tous les skills installés. */
    static LoadAll(_main) {
        _main.Log("Start loading skills.", "green");
        const DEPENDENCIES = LIBRARIES.FS.readdirSync(LIBRARIES.Path.join(_main.DirName, "/lib/skills/"), { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name);
        for(let i = 0; i < DEPENDENCIES.length; i++) {
            Skill.Load(DEPENDENCIES[i], _main);
        }
        _main.Log("End of skills loading.", "green");
    }

    // Cette fonction installe les dépendances d'un skill
    static InstallDependances(_main, _dependencies, _index, _callback){
        if(_dependencies[_index] !== undefined){
            const COMMAND = "npm install " + _dependencies[_index];
            _main.Terminal(COMMAND, _main.DirName, function(){
                Skill.InstallDependances(_main, _dependencies, _index + 1, _callback);
            });
        }
        else{
            if(_callback !== undefined){
                _callback();
            }
        }
    }

    /* Cette fonction permet d'installer un skill par son url GIT. */
    static Install(_git, _main, _socket) {
        const END_GIT = ".git";
        if(_git.endsWith(END_GIT)){
            _git = _git.slice(0, END_GIT.length * -1);
        }

        const splitted = _git.split("/");
        https://api.github.com/repos/heyheychicken/nova
        _main.HTTPSJsonGet("api.github.com","/repos/" + splitted[splitted.length - 2] + "/" + splitted[splitted.length - 1], function(data){
            const FOLDER_SKILLS = LIBRARIES.Path.join(_main.DirName, "/lib/skills/");
            const FOLDER_SKILL = LIBRARIES.Path.join(FOLDER_SKILLS, data.id + "");

            _main.Terminal("git clone " + _git + " " + FOLDER_SKILL, null, function(_error_code, _messages){
                if(_error_code === 0){
                    const DEPENDENCIES = JSON.parse(LIBRARIES.FS.readFileSync(LIBRARIES.Path.join(FOLDER_SKILL, "/package.json"), "utf8")).dependencies;
                    if(DEPENDENCIES !== undefined) {
                        let array = [];
                        for(let dependency in DEPENDENCIES) {
                            array.push(dependency + "@" + DEPENDENCIES[dependency]);
                        }
                        Skill.InstallDependances(_main, array, 0, function(){
                            Skill.InstallStep2(_git, FOLDER_SKILL, _main, _socket);
                        });
                    }
                    else{
                        Skill.InstallStep2(_git, FOLDER_SKILL, _main, _socket);
                    }
                }
                else{
                    _main.Log("Can't install the skill (\"" + _git + "\").", "red");
                    _main.LauncherIO.emit("reboot_server");
                }
            });
        });
    }

    static InstallStep2(_git, _folder, _main, _socket) {
        const INDEX = _main.SkillPermanentSettings.skills.findIndex(x => x.GIT.URL === _git);
        const PATH = LIBRARIES.Path.join(_folder, "src/settings.json");
        let settings = {};

        if(LIBRARIES.FS.existsSync(PATH)) {
            const NEW_SETTINGS = JSON.parse(LIBRARIES.FS.readFileSync(PATH, "utf8"));
            if(NEW_SETTINGS.Settings !== undefined){
                settings = NEW_SETTINGS.Settings;
            }
        }

        if(INDEX === -1) {

            const SPLIT = _git.split("/");
            _main.SkillPermanentSettings.skills.push({
                GIT: {
                    URL: _git,
                    Pseudo: SPLIT.slice(3, -1)[0],
                    Repository: SPLIT.slice(4)[0]
                },
                Settings: settings,
                Path: _folder
            });
        }
        else{
            _main.SkillPermanentSettings.skills[INDEX].Path = _folder;
            for(let setting in settings){
                if(_main.SkillPermanentSettings.skills[INDEX].Settings[setting] === undefined){
                    _main.SkillPermanentSettings.skills[INDEX].Settings[setting] = settings[setting];
                }
            }
        }
        LIBRARIES.FS.writeFileSync(LIBRARIES.Path.join(_main.DirName, "/lib/skills/skills.json"), JSON.stringify(_main.SkillPermanentSettings, null, 4), "utf8");
        _main.LauncherIO.emit("reboot_server");
    }

    // Cette fonction désinstalle un skill.
    static Uninstall(_git, _main, _socket){
        const SKILL = _main.URL_Skills.find(x => x.git === _git);
        if(SKILL !== undefined){
            const SKILLS_DIR_PATH = LIBRARIES.Path.join(_main.DirName, "lib", "skills");
            LIBRARIES._FS.rmdirSync(LIBRARIES.Path.join(SKILLS_DIR_PATH, SKILL.id + "")); // On supprime le dossier du skill.

            _main.SkillPermanentSettings.skills.find(x => x.GIT.URL === _git).Path = null;
            LIBRARIES.FS.writeFileSync(LIBRARIES.Path.join(_main.DirName, "/lib/skills/skills.json"), JSON.stringify(_main.SkillPermanentSettings, null, 4), "utf8");
            _main.LauncherIO.emit("reboot_server");
        }
        else{
            _main.Log("Skill with GIT : \"" + _git + "\" not found.", "red");
        }
    }
}

module.exports = Skill;
