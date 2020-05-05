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
        const DEPENDENCY_PATH = __dirname + "/skills/" + _directory + "/src/";
        const CORPUS_PATH = DEPENDENCY_PATH + "corpus/" + _main.Settings.Language + "/corpus.json";
        const SETTINGS_PATH = DEPENDENCY_PATH + "settings.json";
        const SETTINGS = JSON.parse(LIBRARIES.FS.readFileSync(SETTINGS_PATH, "utf8"));

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
            }
        }

        // LOAD INDEX
        const INDEX_PATH = DEPENDENCY_PATH + "index.js";
        if (LIBRARIES.FS.existsSync(INDEX_PATH)) {
            const S = JSON.parse(LIBRARIES.FS.readFileSync(SETTINGS_PATH, "utf8")).Settings;
            const LIBRARY = require(INDEX_PATH);
            new LIBRARY(_main, S);
        }

        // LOAD PUBLIC
        const PUBLIC_PATH = DEPENDENCY_PATH + "public/";
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

        _main.Log("The skill named \"" + SETTINGS.FolderName + "\" is loaded (" + _main.Settings.Language + ").", "green");
    }

    /* Cette fonction permet de charger tous les skills installés. */
    static LoadAll(_main) {
        _main.Log("Start loading skills.", "green");
        const DEPENDENCIES = LIBRARIES.FS.readdirSync("./lib/skills/", { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name);
        for(let i = 0; i < DEPENDENCIES.length; i++) {
            Skill.Load(DEPENDENCIES[i], _main);
        }
        _main.Log("End of skills loading.", "green");
    }

    /* Cette fonction permet de charger le skill dont le nom du dossier est passé en paramètre. */
    static Unload(_directory, _main) {
        const SELF = this;

        if (LIBRARIES.FS.existsSync(_directory)) {
            LIBRARIES.FS.readdirSync(_directory).forEach((file, index) => {
                const curPath = LIBRARIES.Path.join(_directory, file);
                if (LIBRARIES.FS.lstatSync(curPath).isDirectory()) {
                    Skill.Unload(curPath, _main);
                } else { // delete file
                    if (file.endsWith(".json")) {
                        const SETTINGS = JSON.parse(LIBRARIES.FS.readFileSync(curPath, "utf8"));
                        for (let i = 0; i < SETTINGS.data.length; i++) {
                            delete _main.Manager.Intents[SETTINGS.data[i].intent];
                        }
                    }
                }
            });
        }
        else{
            _main.Log("The skill folder you want to uninstall does not exist.", "red");
        }
    }

    /* Cette fonction permet d'installer un skill par son url GIT. */
    static Install(_git, _main, _socket) {
        const skill = _main.URL_Skills.find(x => x.git === _git);
        if(skill !== undefined) {

            const DIR = "./lib/skills/";
            const tmpFilePath = DIR + "temp.zip";

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

                // TODO : Il reste à installer les dépendances.
                const DEPENDENCIES = JSON.parse(LIBRARIES.FS.readFileSync(DIR + new_skill_folder_name + "package.json", "utf8")).dependencies;
                if(DEPENDENCIES !== undefined) {
                    for(let dependency in DEPENDENCIES) {
                        const COMMAND = "npm install " + dependency + "@" + DEPENDENCIES[dependency];
                        //LIBRARIES.ChildProcess.exec(COMMAND);
                    }
                }
                Skill.Load(new_skill_folder_name, _main); // On charge le nouveau skill.
                _main.URL_Skills.find(x => x.git === _git).installed = true;
                _socket.emit("set_skills", _main.URL_Skills); // On met à jour la GUI du client.

                if(!_main.SkillPermanentSettings.installed.includes(_git)) {
                    const SPLIT = _git.split("/");
                    _main.SkillPermanentSettings.installed.push({
                        GIT: {
                            URL: _git,
                            Pseudo: SPLIT.slice(3, -1)[0],
                            Repository: SPLIT.slice(4)[0]
                        }
                    });
                    LIBRARIES.FS.writeFileSync(_main.DirName + "/lib/skills/skills.json", JSON.stringify(_main.SkillPermanentSettings, null, 4), "utf8");
                    _socket.emit("set_installed_skills", _main.SkillPermanentSettings.installed);
                }
            });
        }
        else{
            _main.Log("Skill with GIT : \"" + _git + "\" not found.", "red");
        }
    }

    // Cette fonction désinstalle un skill.
    static Uninstall(_git, _main, _socket){
        const SKILL = _main.URL_Skills.find(x => x.git === _git);
        if(SKILL !== undefined){
            const SKILLS_DIR_PATH = "./lib/skills/";
            const SKILL_DIR_NAME = SKILL.git.split("/").splice(-2, 2).join("_") + "/";
            Skill.Unload(SKILLS_DIR_PATH + SKILL_DIR_NAME + "src/corpus/", _main); // On décharge le skill.
            LIBRARIES._FS.rmdirSync(SKILLS_DIR_PATH + SKILL_DIR_NAME); // On supprime le dossier du skill.

            _socket.emit("set_skills", _main.URL_Skills); // On met à jour la GUI du client.

            const INDEX = _main.SkillPermanentSettings.installed.findIndex(x => x.GIT.URL === _git)
            if(INDEX >= 0){
                _main.SkillPermanentSettings.installed.splice(INDEX, 1);
                LIBRARIES.FS.writeFileSync(_main.DirName + "/lib/skills/skills.json", JSON.stringify(_main.SkillPermanentSettings, null, 4), "utf8");
                _socket.emit("set_installed_skills", _main.SkillPermanentSettings.installed);
            }
        }
        else{
            _main.Log("Skill with GIT : \"" + _git + "\" not found.", "red");
        }
    }
}

module.exports = Skill;
