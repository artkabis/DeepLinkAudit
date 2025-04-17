// modules/shared/globalContext.js
// Module partagé qui définit le contexte global

// Déterminer le contexte global (service worker ou fenêtre)
var globalContext = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : self);

// Créer le namespace LinkJuice
globalContext.LinkJuice = globalContext.LinkJuice || {};