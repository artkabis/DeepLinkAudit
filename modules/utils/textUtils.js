// modules/utils/textUtils.js
LinkJuice.TextUtils = (function() {
    /**
     * Décode les entités HTML dans un texte
     * @param {string} text - Texte à décoder
     * @return {string} Texte décodé
     */
    function decodeHtmlEntities(text) {
        if (!text || typeof text !== 'string') return text;
        
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
    
    // API publique du module
    return {
        decodeHtmlEntities: decodeHtmlEntities,
        decodeLinkContextTextData: decodeLinkContextTextData
    };
})();