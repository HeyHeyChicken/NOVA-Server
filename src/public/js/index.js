let map;

const ROOM_COMPONENT = Vue.component("novaroom", {
  props: {
    Name: String,
    Icon: String
  },
  template: ''+
  '<div class="col col-12 col-sm-6 col-md-4 col-lg-3">'+
    '<div :class="{ has_title: Name }" class="room">'+
      '<div class="square">'+
        '<i :class="[Icon]"></i>'+
        '<span v-if="Name">{{ Name }}</span>'+
      '</div>'+
    '</div>'+
  '</div>'
});

const APP = new Vue({
  el: "#app",
  methods: {
    install_skill_from_git: function(event) {
      const URL = event.target.closest(".input-group").getElementsByTagName("input")[0].value;
      if(URL != ""){
        this.ShowSpinner = true;
        SOCKET.emit("install_skill", URL);
      }
    },
    // Lorsque l'utilisateur demande à supprimer un client à partir du serveur.
    remove_client: function(event) {
      const CARD = event.target.closest(".card-body");
      const ID = CARD.querySelector("input[name='ID']").value;
      SOCKET.emit("remove_client", ID);
    },
    // Lorsque l'utilisateur demande à redémarer un client à partir du serveur.
    reboot_client: function(event) {
      const CARD = event.target.closest(".card-body");
      const ID = CARD.querySelector("input[name='ID']").value;
      SOCKET.emit("reboot_client", ID);
    },
    set_language: function(event) {
      if(event.target.value != ""){
        this.ShowSpinner = true;
        SOCKET.emit("set_language", event.target.value);
      }
    },
    ReadAndAcceptLicenseAgreement: function(event) {
      this.TutorialIndex++;
      SOCKET.emit("read_and_accept_license_agreement");
    },
    EndTutorial: function(event) {
      this.DoneTutorial = true;
      SOCKET.emit("end_tutorial");
    },
    refresh_skills_list: function(event){
      SOCKET.emit("refresh_skills_list");
    },
    set_theme: function(event){
      this.themePath = "./css/theme/" + event.target.value;
      //this.ShowSpinner = true;
      // TODO WTF ?
      SOCKET.emit("set_theme", event.target.value);
    },
    install_skill: function(event) {
      this.ShowSpinner = true;
      SOCKET.emit("install_skill", event.target.closest("button").getAttribute("data-git"));
    },
    uninstall_skill: function(event) {
      this.ShowSpinner = true;
      SOCKET.emit("uninstall_skill", event.target.closest("button").getAttribute("data-git"));
    },
    cancelJsonEditing: function(event){
      this.JsonEditing = !this.JsonEditing;
      SOCKET.emit("get_Installed");
    },
    validateJsonEditing: function(event){
      this.JsonEditing = !this.JsonEditing;
      SOCKET.emit("set_Installed", JSON.stringify(this.skills.Installed));
    }
  },
  data: {
    skills: {
      Library: [],
      Installed: []
    },
    Language: null,
    Languages: [],
    Dictionary: {},
    NovaClients: [],
    DoneTutorial: null,
    OfficialSkills: [],
    LicenseKey: "null",
    TutorialIndex: 0,
    LicenseAgreementReadedAndAccepted: false,
    ShowSpinner: false,
    AlreadyConnected: false,
    skillSearch: "",
    themes: "",
    theme: "",
    themePath: "",
    JsonEditing: false,
    JsonEditorOptions: {
      onChange(json){
        console.log("You updated settings");
      }
    }
  }
});

/* ################################################################################################################ */
/* ### SOCKETS #################################################################################################### */
/* ################################################################################################################ */

const PORT = "8081";
let SOCKET = null;
if(window.location.hostname.includes("gitpod.io")){
  const SPLITTER = "-";
  const SPLIT = window.location.hostname.split(SPLITTER);
  SPLIT[0] = PORT;
  const URL = SPLIT.join(SPLITTER);
  SOCKET = io(URL);
}
else{
  SOCKET = io(window.location.hostname + ":" + PORT);
}

// Si la connection socket avec le serveur est réussie.
SOCKET.on("connect", function() {
  if(APP.AlreadyConnected === false) {
    APP.AlreadyConnected = true;
  }
  else {
    document.location.reload(true);
  }
});

// Si le serveur envoie une mise à jour de la liste des clients NOVA.
SOCKET.on("set_clients", function(_NovaClients) {
  APP.NovaClients = _NovaClients;
});

SOCKET.on("set_themes", function(_themes) {
  APP.themes = _themes;
});

SOCKET.on("set_theme", function(_theme) {
  APP.theme = _theme
  APP.themePath = "./css/theme/" + APP.theme;
});

// Si le serveur envoie une mise à jour de la liste des clients NOVA.
SOCKET.on("set_skills", function(_skills) {
  APP.skills.Library = _skills.sort(function(a, b){
    if (a.name < b.name)
      return -1;
    else if (a.name > b.name)
      return 1;
    return 0;
  });
});

// Si le serveur envoie une mise à jour de la liste des clients NOVA.
SOCKET.on("set_installed_skills", function(_data) {
  APP.skills.Installed = _data;
});

// Si le serveur envoie une mise à jour des traductions du site.
SOCKET.on("set_translation", function(_data) {
  APP.Dictionary = _data;
});

// Si le serveur envoie la cle le license
SOCKET.on("set_license_key", function(_data) {
  APP.LicenseKey = _data;
});

// Si le serveur envoie une mise à jour de la langue.
SOCKET.on("set_language", function(_data) {
  APP.Language = _data;
});

// Si le serveur envoie une mise à jour de la liste des langues disponibles.
SOCKET.on("set_languages", function(_data) {
  APP.Languages = _data;
});

// Si le serveur envoie une mise à jour de l'état de completion du tuto
SOCKET.on("set_done_tutorial", function(_data) {
  APP.DoneTutorial = _data;
});

// Si le serveur envoie une mise à jour de l'état de completion du tuto
SOCKET.on("set_official_skills", function(_data) {
  APP.OfficialSkills = _data;
});

/* ################################################################################################################ */
/* ### FUNCTIONS ################################################################################################## */
/* ################################################################################################################ */

// Cette fonction n'a pour l'instant aucun intérêt.
function InitMap() {
  map = L.map("map").setView([47, 2.3488], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  L.marker([51.5, -0.09]).addTo(map).bindPopup();
}
