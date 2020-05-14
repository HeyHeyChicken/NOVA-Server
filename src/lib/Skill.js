const LIBRARIES = {
    FS: require("fs"),
    Path: require("path"),
    Zip: require("adm-zip"),

    _FS: require("./FS")
};

class Skill {
    /* ######################################################################################## */
    /* ### STATIC ############################################################################# */
    /* ######################################################################################## */

    /* Cette fonction permet de charger le skill dont le nom du dossier est passé en paramètre. */
    static Load(_directory, _main) {
        const ROOT_PATH = LIBRARIES.Path.join(_main.DirName, "/lib/skills/");
        const SKILL_PATH = LIBRARIES.Path.join(ROOT_PATH, _directory, "/");
        const DEPENDENCY_PATH = LIBRARIES.Path.join(SKILL_PATH, "src/");
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
        const skill = _main.URL_Skills.find(x => x.git === _git);
        if(skill !== undefined) {

            const DIR = LIBRARIES.Path.join(_main.DirName, "/lib/skills/");
            const tmpFilePath = LIBRARIES.Path.join(DIR, "temp.zip");

            // On récupère le nom du futur dossier du skill.
            LIBRARIES._FS.downloadFile(skill.git + "/archive/master.zip", tmpFilePath, _main, function (err) {
                const ZIP = new LIBRARIES.Zip(tmpFilePath);
                let skill_folder_name = null;
                ZIP.getEntries().forEach(function(zipEntry) {
                    if(zipEntry.isDirectory){
                        if(zipEntry.entryName.split("/").length === 2) {
                            skill_folder_name = zipEntry.entryName;
                        }
                    }
                });
                ZIP.extractAllTo(DIR,true);
                LIBRARIES.FS.unlink(tmpFilePath, function(){});
                const new_skill_folder_name = skill.git.split("/").splice(-2, 2).join("_") + "/";
                LIBRARIES.FS.renameSync(DIR + skill_folder_name, DIR + new_skill_folder_name);

                const DEPENDENCIES = JSON.parse(LIBRARIES.FS.readFileSync(DIR + new_skill_folder_name + "package.json", "utf8")).dependencies;
                if(DEPENDENCIES !== undefined) {
                    let array = [];
                    for(let dependency in DEPENDENCIES) {
                        array.push(dependency + "@" + DEPENDENCIES[dependency]);
                    }
                    Skill.InstallDependances(_main, array, 0, function(){
                        Skill.InstallStep2(_git, DIR + new_skill_folder_name, _main, _socket);
                    });
                }
                else{
                    Skill.InstallStep2(_git, DIR + new_skill_folder_name, _main, _socket);
                }
            });
        }
        else{
            _main.Log("Skill with GIT : \"" + _git + "\" not found.", "red");
        }
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
