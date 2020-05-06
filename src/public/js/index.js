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
    set_language: function(event) {
      SOCKET.emit("set_language", event.target.value);
    },
    install_skill: function(event) {
      SOCKET.emit("install_skill", event.target.closest("button").getAttribute("data-git"));
    },
    uninstall_skill: function(event) {
      SOCKET.emit("uninstall_skill", event.target.closest("button").getAttribute("data-git"));
    }
  },
  data: {
    skills: {
      Library: [],
      Installed: []
    },
    Language: null,
    Dictionary: {},
    NovaClients: [],
    House: {},
    Rebooting: false,
    ShowSpinner: false
  }
});

const SOCKET = io("http://localhost:8081");

// Si la connection socket avec le serveur est réussie.
SOCKET.on("connect", function() {
  if(APP.Rebooting === true){
    document.location.reload(true);
  }
});

// Si le serveur envoie une mise à jour de la liste des clients NOVA.
SOCKET.on("set_clients", function(_NovaClients) {
  APP.NovaClients = _NovaClients;
});

// Si le serveur envoie une mise à jour de ???
SOCKET.on("set_house", function(_house) {
  APP.House = _house;
});

// Si le serveur envoie une mise à jour de la liste des clients NOVA.
SOCKET.on("set_skills", function(_skills) {
  APP.skills.Library = _skills;
});

// Si le serveur envoie une mise à jour de la liste des clients NOVA.
SOCKET.on("set_installed_skills", function(_data) {
  APP.skills.Installed = _data;
});

// Si le serveur envoie une mise à jour des traductions du site.
SOCKET.on("set_translation", function(_data) {
  APP.Dictionary = _data;
});

// Si le serveur envoie une mise à jour de la langue.
SOCKET.on("set_language", function(_data) {
  APP.Language = _data;
});

// Si le serveur demande à redémarrer l'interface.
SOCKET.on("reboot", function() {
  APP.Rebooting = true;
});

function InitMap() {
  map = L.map("map").setView([47, 2.3488], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  L.marker([51.5, -0.09]).addTo(map).bindPopup();
}