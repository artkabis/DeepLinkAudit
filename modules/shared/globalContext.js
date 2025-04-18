// modules/shared/globalContext.js
// Module partagé qui définit le contexte global

/**
 * Détermine le contexte d'exécution global (service worker ou fenêtre)
 * @const {Object} globalContext
 */
var globalContext = typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : self);

/**
 * Espace de noms pour l'application Link Juice Checker
 * @namespace
 */
globalContext.LinkJuice = globalContext.LinkJuice || {
  /**
   * Version de l'application
   * @type {string}
   */
  version: '2.1.0',
  
  /**
   * Journalise les événements de l'application si le mode debug est activé
   * @param {string} message - Message à journaliser
   * @param {*} [data] - Données complémentaires
   */
  log: function(message, data) {
    if (this.debug) {
      console.log(`[LinkJuice] ${message}`, data || '');
    }
  },
  
  /**
   * Mode debug (désactivé par défaut)
   * @type {boolean}
   */
  debug: false
};