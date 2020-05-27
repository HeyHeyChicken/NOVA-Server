const LIBRARIES = {
    FS: require("fs"),
    Path: require("path"),
    Express: require("express"),

    _FS: require("./FS")
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
            const SKILL = {
                title: "",
                description: "",
                wallpaper: "",
                icon: "",
                git: "",
                screenshots: []
            };
            // Infos
            const INFOS_PATH = LIBRARIES.Path.join(RESOURCES_PATH, "nova-info.json");
            if (LIBRARIES.FS.existsSync(INFOS_PATH)) {
                const INFOS = JSON.parse(LIBRARIES.FS.readFileSync(INFOS_PATH, "utf8"));
                SKILL.title = INFOS.Title;
                SKILL.description = INFOS.Description;
            }
            const LOGO_PATH = LIBRARIES.Path.join(RESOURCES_PATH, "nova-icon.png");
            const WALLPAPER_PATH = LIBRARIES.Path.join(RESOURCES_PATH, "nova-wallpaper.jpg");
            if (LIBRARIES.FS.existsSync(LOGO_PATH) || LIBRARIES.FS.existsSync(WALLPAPER_PATH)) {
                _main.Express.use("/" + _directory, LIBRARIES.Express.static(RESOURCES_PATH));
            }
            // Icon
            if (LIBRARIES.FS.existsSync(LOGO_PATH)) {
                SKILL.icon = "/" + _directory + "/nova-icon.png";
            }
            // Wallpaper
            if (LIBRARIES.FS.existsSync(WALLPAPER_PATH)) {
                SKILL.wallpaper = "/" + _directory + "/nova-wallpaper.jpg";
            }
            // Git
            SKILL.git = _main.SkillPermanentSettings.skills.find(x => x.Path === LIBRARIES.Path.join(_main.DirName, "/lib/skills/", _directory)).GIT.URL;
            // Screenshots
            const SCREENSHOTS_PATH = LIBRARIES.Path.join(RESOURCES_PATH, "screenshots");
            if (LIBRARIES.FS.existsSync(SCREENSHOTS_PATH)) {
                const SCREENSHOTS = LIBRARIES.FS.readdirSync(SCREENSHOTS_PATH).filter(x => x.endsWith(".jpg"))
                for(let index = 0; index < SCREENSHOTS.length; index++){
                    SKILL.screenshots.push("/" + _directory + "/screenshots/" + SCREENSHOTS[index]);
                }
            }

            const INDEX = _main.URL_Skills.findIndex(x => x.git === SKILL.git);
            if(INDEX === -1){
                _main.URL_Skills.push(SKILL);
            }
            else{
                for(let attr in SKILL){
                    if(SKILL[attr] !== "" && SKILL[attr] !== undefined && SKILL[attr] !== null){
                        _main.URL_Skills[INDEX][attr] = SKILL[attr];
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

        _main.Log("The skill named \"" + _directory + "\" is loaded (" + _main.Settings.Language + ").", "green");
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
        const FOLDER_SKILLS = LIBRARIES.Path.join(_main.DirName, "/lib/skills/");
        const NEW_SKILL_FOLDER_NAME = _git.split("/").splice(-2, 2).join("_");
        const FOLDER_SKILL = LIBRARIES.Path.join(FOLDER_SKILLS, NEW_SKILL_FOLDER_NAME);

        _main.Terminal("git clone " + _git + ".git " + FOLDER_SKILL, null, function(_error_code, _messages){
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
            }
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
            const SKILLS_DIR_PATH = LIBRARIES.Path.join(_main.DirName, "/lib/skills/");
            const SKILL_DIR_NAME = SKILL.git.split("/").splice(-2, 2).join("_") + "/";
            LIBRARIES._FS.rmdirSync(SKILLS_DIR_PATH + SKILL_DIR_NAME); // On supprime le dossier du skill.

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
