// modules/utils/textUtils.js
// Utilitaires de manipulation de texte

LinkJuice.TextUtils = (function() {
    // Cache des décodages pour optimiser les performances
    const entityCache = new Map();

    /**
     * Décode les entités HTML dans un texte
     * @param {string} text - Texte à décoder
     * @return {string} Texte décodé
     */
    function decodeHtmlEntities(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Vérifier si cette chaîne est déjà dans le cache
        if (entityCache.has(text)) {
            return entityCache.get(text);
        }
        
        // Solution compatible avec tous les navigateurs
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        
        // Corriger spécifiquement les entités problématiques qui n'auraient pas été décodées
        let decoded = textarea.value;
        
        // Mappages d'entités spécifiques qui pourraient poser problème
        const entityMap = {
            '&eacute;': 'é',
            '&egrave;': 'è',
            '&agrave;': 'à',
            '&ccedil;': 'ç',
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&apos;': '\'',
            '&Eacute;': 'É',
            '&Egrave;': 'È',
            '&Agrave;': 'À',
            '&Ccedil;': 'Ç'
        };
        
        // Remplacer manuellement les entités problématiques
        Object.keys(entityMap).forEach(entity => {
            const regex = new RegExp(entity, 'g');
            decoded = decoded.replace(regex, entityMap[entity]);
        });
        
        // Gestion des entités numériques (comme &#233;)
        decoded = decoded.replace(/&#(\d+);/g, function(match, dec) {
            return String.fromCharCode(dec);
        });

        // Gestion des entités hexadécimales (comme &#x00E9;)
        decoded = decoded.replace(/&#x([0-9A-F]+);/gi, function(match, hex) {
            return String.fromCharCode(parseInt(hex, 16));
        });
        
        // Stocker dans le cache
        entityCache.set(text, decoded);
        
        return decoded;
    }
    
    /**
     * Décode tous les textes d'ancrage dans les données de contexte de liens
     * @param {Object} linkContextData - Données de contexte des liens
     * @return {Object} Données avec textes décodés
     */
    function decodeLinkContextTextData(linkContextData) {
        if (!linkContextData) return {};
        
        const decodedData = {};
        
        for (const url in linkContextData) {
            decodedData[url] = linkContextData[url].map(context => {
                return {
                    ...context,
                    linkText: decodeHtmlEntities(context.linkText),
                    anchorText: decodeHtmlEntities(context.anchorText),
                    fullLinkHTML: context.fullLinkHTML // Ne pas modifier le HTML brut
                };
            });
        }
        
        return decodedData;
    }
    
    /**
     * Tronque un texte à une longueur maximale
     * @param {string} text - Texte à tronquer
     * @param {number} [maxLength=50] - Longueur maximale
     * @param {string} [suffix='...'] - Suffixe à ajouter au texte tronqué
     * @return {string} Texte tronqué
     */
    function truncateText(text, maxLength = 50, suffix = '...') {
        if (!text) return '';
        
        if (text.length <= maxLength) return text;
        
        const halfLength = Math.floor((maxLength - suffix.length) / 2);
        return text.substring(0, halfLength) + 
               suffix + 
               text.substring(text.length - halfLength);
    }
    
    /**
     * Tronque une URL pour l'affichage
     * @param {string} url - URL à tronquer
     * @param {number} [maxLength=30] - Longueur maximale
     * @return {string} URL tronquée
     */
    function truncateUrl(url, maxLength = 30) {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;

            if (path.length > maxLength) {
                path = truncateText(path, maxLength);
            }

            return urlObj.hostname + path;
        } catch (e) {
            // En cas d'URL invalide
            return truncateText(url, maxLength);
        }
    }
    
    /**
     * Crée un élément DOM sécurisé à partir d'une chaîne HTML
     * @param {string} html - Chaîne HTML à convertir
     * @return {DocumentFragment} Fragment DOM contenant les éléments
     */
    function createSafeHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content;
    }
    
    /**
     * Sanitize une chaîne pour éviter les injections
     * @param {string} text - Texte à sécuriser
     * @return {string} Texte sécurisé
     */
    function sanitizeText(text) {
        if (!text) return '';
        return text.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }
    
    // API publique du module
    return {
        decodeHtmlEntities,
        decodeLinkContextTextData,
        truncateText,
        truncateUrl,
        createSafeHtml,
        sanitizeText,
        
        /**
         * Vide le cache d'entités
         */
        clearCache: function() {
            entityCache.clear();
        }
    };
})();