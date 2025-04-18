// modules/analysis/juiceLinkScore.js
// Module pour le calcul des scores de "juice link" (transmission du jus de liens)

LinkJuice.JuiceLinkScore = (function() {
    /**
     * Poids par défaut pour différents contextes de liens
     * @private
     * @const {Object}
     */
    const DEFAULT_CONTEXT_WEIGHTS = {
        // Contextes de contenu (poids élevés)
        'paragraph': 1.0,
        'content': 0.9,
        'content-main': 1.0,
        'intext': 1.0,
        
        // Contextes de navigation (poids moyens)
        'menu': 0.6,
        'header': 0.5,
        'footer': 0.3,
        'sidebar': 0.4,
        
        // Contextes interactifs (poids variables)
        'button': 0.7,
        'CTA': 0.8,
        
        // Contextes médias
        'image': 0.6,
        
        // Contextes de métadonnées
        'breadcrumb': 0.7,
        'author': 0.5,
        'taxonomy': 0.6,
        
        // Valeur par défaut
        'default': 0.5
    };
    
    // Poids personnalisables
    let customWeights = {};
    
    /**
     * Obtient le poids d'un contexte spécifique
     * @private
     * @param {string} context - Type de contexte
     * @return {number} Poids du contexte (0-1)
     */
    function _getContextWeight(context) {
        // Vérifier d'abord les poids personnalisés
        if (customWeights[context] !== undefined) {
            return customWeights[context];
        }
        
        // Sinon utiliser les poids par défaut
        return DEFAULT_CONTEXT_WEIGHTS[context] || DEFAULT_CONTEXT_WEIGHTS.default;
    }
    
    /**
     * Normalise un score entre un minimum et un maximum
     * @private
     * @param {number} score - Score à normaliser
     * @param {number} [min=0] - Valeur minimale
     * @param {number} [max=10] - Valeur maximale
     * @return {number} Score normalisé
     */
    function _normalizeScore(score, min = 0, max = 10) {
        return Math.max(min, Math.min(max, score));
    }

    /**
     * Calcule un score de "juice link" basé sur l'importance et le contexte
     * @param {Object} linkContextData - Données de contexte des liens
     * @param {boolean} [normalize=true] - Normaliser les scores (0-10)
     * @return {Object} juiceLinkScore par URL
     */
    function calculateJuiceScores(linkContextData, normalize = true) {
        const juiceScores = {};
        
        if (!linkContextData) return juiceScores;

        // Première passe: calculer les scores bruts
        for (const toUrl in linkContextData) {
            const links = linkContextData[toUrl];
            if (!Array.isArray(links)) continue;
            
            let juice = 0;
            let highestJuice = 0;

            links.forEach(linkInfo => {
                try {
                    const context = linkInfo.context || 'default';
                    const importance = linkInfo.importance || 0.5;
                    const weight = _getContextWeight(context);
                    
                    // Calculer le jus de ce lien
                    const linkJuice = importance * weight;
                    juice += linkJuice;
                    
                    // Garder trace du lien le plus important
                    if (linkJuice > highestJuice) {
                        highestJuice = linkJuice;
                    }
                } catch (error) {
                    console.error(`Erreur de calcul de juice pour ${toUrl}:`, error);
                }
            });
            
            // Bonus pour les URLs avec beaucoup de liens (mais plafonné)
            const linkCountFactor = Math.min(1 + (Math.log(links.length) / 10), 1.5);
            
            // Bonus pour les URLs avec au moins un lien très important
            const importanceFactor = 1 + (highestJuice / 2);
            
            // Score final
            const finalScore = juice * linkCountFactor * importanceFactor;
            
            // Normaliser si demandé
            juiceScores[toUrl] = normalize 
                ? _normalizeScore(finalScore) 
                : parseFloat(finalScore.toFixed(4));
        }
        
        return juiceScores;
    }
    
    /**
     * Calcule les flux de juice entre les pages
     * @param {Object} linkContextData - Données de contexte des liens
     * @param {Object} pageRankData - Données de PageRank
     * @return {Object} Flux de juice entre pages
     */
    function calculateJuiceFlow(linkContextData, pageRankData) {
        const juiceFlow = {
            nodes: [],
            links: []
        };
        
        if (!linkContextData || !pageRankData) return juiceFlow;
        
        // Collecter les pages uniques
        const uniquePages = new Set();
        
        for (const url in linkContextData) {
            uniquePages.add(url);
            linkContextData[url].forEach(link => {
                uniquePages.add(link.fromUrl);
            });
        }
        
        // Créer les nœuds
        uniquePages.forEach(url => {
            juiceFlow.nodes.push({
                id: url,
                pageRank: pageRankData[url] || 0,
                linksIn: 0,
                linksOut: 0
            });
        });
        
        // Créer les liens
        for (const toUrl in linkContextData) {
            linkContextData[toUrl].forEach(link => {
                const fromUrl = link.fromUrl;
                
                // Trouver les nœuds correspondants
                const fromNode = juiceFlow.nodes.find(node => node.id === fromUrl);
                const toNode = juiceFlow.nodes.find(node => node.id === toUrl);
                
                if (fromNode && toNode) {
                    fromNode.linksOut++;
                    toNode.linksIn++;
                    
                    // Calculer le flux de juice
                    const context = link.context || 'default';
                    const importance = link.importance || 0.5;
                    const weight = _getContextWeight(context);
                    const linkJuice = importance * weight;
                    
                    juiceFlow.links.push({
                        source: fromUrl,
                        target: toUrl,
                        value: linkJuice,
                        context
                    });
                }
            });
        }
        
        return juiceFlow;
    }
    
    /**
     * Configure des poids personnalisés pour les contextes
     * @param {Object} weights - Poids des contextes
     */
    function setCustomWeights(weights) {
        if (!weights || typeof weights !== 'object') return;
        
        // Réinitialiser les poids personnalisés
        customWeights = {};
        
        // Ajouter les nouveaux poids
        for (const context in weights) {
            const weight = parseFloat(weights[context]);
            if (!isNaN(weight)) {
                customWeights[context] = Math.max(0, Math.min(1, weight));
            }
        }
    }

    // API publique du module
    return {
        calculateJuiceScores,
        calculateJuiceFlow,
        setCustomWeights,
        
        /**
         * Réinitialise les poids personnalisés
         */
        resetCustomWeights: function() {
            customWeights = {};
        },
        
        /**
         * Retourne les poids actuels
         * @return {Object} Poids des contextes
         */
        getContextWeights: function() {
            return { ...DEFAULT_CONTEXT_WEIGHTS, ...customWeights };
        }
    };
})();