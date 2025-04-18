// modules/analysis/pagerank.js
// Module pour le calcul du PageRank interne des pages

LinkJuice.PageRank = (function() {
    /**
     * Paramètres par défaut de l'algorithme PageRank
     * @private
     * @const {Object}
     */
    const DEFAULT_PARAMS = {
        iterations: 20,      // Nombre d'itérations
        dampingFactor: 0.85, // Facteur d'amortissement (souvent 0.85)
        tolerance: 0.0001,   // Tolérance de convergence
        normalizeOutput: true // Normaliser le résultat (0-1)
    };
    
    // Cache pour améliorer les performances
    const computationCache = new Map();
    
    /**
     * Génère une clé pour le cache
     * @private
     * @param {Object} data - Données des liens
     * @param {Object} params - Paramètres de calcul
     * @return {string} Clé de cache
     */
    function _generateCacheKey(data, params) {
        // Compter le nombre de liens pour une clé simple
        let linkCount = 0;
        for (const url in data) {
            linkCount += data[url].length;
        }
        
        return `${linkCount}_${params.iterations}_${params.dampingFactor}`;
    }

    /**
     * Calcule le PageRank interne des pages
     * @param {Object} linkContextData - Données de contexte des liens
     * @param {Object} [customParams={}] - Paramètres personnalisés
     * @return {Object} PageRank par URL
     */
    function calculatePageRank(linkContextData, customParams = {}) {
        // Fusionner les paramètres par défaut et personnalisés
        const params = { ...DEFAULT_PARAMS, ...customParams };
        
        // Vérifier si les données sont valides
        if (!linkContextData || Object.keys(linkContextData).length === 0) {
            return {};
        }
        
        // Vérifier le cache
        const cacheKey = _generateCacheKey(linkContextData, params);
        if (computationCache.has(cacheKey)) {
            return computationCache.get(cacheKey);
        }
        
        try {
            // Préparer les structures de données
            const pages = new Set();
            const linksOut = {};
            const linksIn = {};
            
            // Construire le graphe de liens
            for (const toUrl in linkContextData) {
                if (!linkContextData[toUrl] || !Array.isArray(linkContextData[toUrl])) continue;
                
                linkContextData[toUrl].forEach(linkInfo => {
                    const fromUrl = linkInfo.fromUrl;
                    if (!fromUrl) return;
                    
                    pages.add(toUrl);
                    pages.add(fromUrl);
                    
                    if (!linksOut[fromUrl]) linksOut[fromUrl] = new Set();
                    linksOut[fromUrl].add(toUrl);
                    
                    if (!linksIn[toUrl]) linksIn[toUrl] = new Set();
                    linksIn[toUrl].add(fromUrl);
                });
            }
            
            const totalPages = pages.size;
            if (totalPages === 0) return {};
            
            const initialRank = 1 / totalPages;
            const pageRank = {};
            
            // Initialisation des rangs
            pages.forEach(url => {
                pageRank[url] = initialRank;
            });
            
            // Algorithme PageRank itératif
            let converged = false;
            for (let i = 0; i < params.iterations && !converged; i++) {
                const newRank = {};
                let maxDiff = 0;
                
                pages.forEach(url => {
                    let incomingSum = 0;
                    const incomingLinks = linksIn[url] || new Set();
                    
                    incomingLinks.forEach(inUrl => {
                        const outDegree = linksOut[inUrl]?.size || 1;
                        incomingSum += pageRank[inUrl] / outDegree;
                    });
                    
                    const newValue = (1 - params.dampingFactor) / totalPages + 
                                    params.dampingFactor * incomingSum;
                    
                    newRank[url] = newValue;
                    
                    // Vérifier la convergence
                    const diff = Math.abs(newValue - pageRank[url]);
                    maxDiff = Math.max(maxDiff, diff);
                });
                
                // Mettre à jour les rangs
                Object.assign(pageRank, newRank);
                
                // Vérifier si l'algorithme a convergé
                if (maxDiff < params.tolerance) {
                    converged = true;
                    LinkJuice.log(`PageRank converged after ${i+1} iterations`);
                }
            }
            
            // Normaliser les scores (optionnel)
            if (params.normalizeOutput) {
                // Trouver les valeurs min et max
                let minRank = Infinity;
                let maxRank = -Infinity;
                
                for (const url in pageRank) {
                    minRank = Math.min(minRank, pageRank[url]);
                    maxRank = Math.max(maxRank, pageRank[url]);
                }
                
                // Normaliser entre 0 et 1
                if (maxRank > minRank) {
                    for (const url in pageRank) {
                        pageRank[url] = (pageRank[url] - minRank) / (maxRank - minRank);
                    }
                }
            }
            
            // Arrondir les valeurs pour une meilleure lisibilité
            for (const url in pageRank) {
                pageRank[url] = parseFloat(pageRank[url].toFixed(6));
            }
            
            // Mettre en cache le résultat
            computationCache.set(cacheKey, { ...pageRank });
            
            return pageRank;
        } catch (error) {
            console.error("Erreur lors du calcul du PageRank:", error);
            return {};
        }
    }
    
    /**
     * Identifie les pages les plus importantes selon le PageRank
     * @param {Object} pageRankData - Données de PageRank
     * @param {number} [limit=10] - Nombre de pages à retourner
     * @return {Array} Pages les plus importantes
     */
    function getTopPages(pageRankData, limit = 10) {
        if (!pageRankData || typeof pageRankData !== 'object') return [];
        
        // Convertir en tableau et trier
        return Object.entries(pageRankData)
            .map(([url, rank]) => ({ url, pageRank: rank }))
            .sort((a, b) => b.pageRank - a.pageRank)
            .slice(0, limit);
    }
    
    /**
     * Calcule la dispersion des scores de PageRank (écart type)
     * @param {Object} pageRankData - Données de PageRank
     * @return {number} Écart type des scores
     */
    function calculateDispersion(pageRankData) {
        if (!pageRankData || typeof pageRankData !== 'object') return 0;
        
        const values = Object.values(pageRankData);
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance);
    }

    // API publique du module
    return {
        calculatePageRank,
        getTopPages,
        calculateDispersion,
        
        /**
         * Vide le cache de calcul
         */
        clearCache: function() {
            computationCache.clear();
        },
        
        /**
         * Retourne les paramètres par défaut
         * @return {Object} Paramètres par défaut
         */
        getDefaultParams: function() {
            return { ...DEFAULT_PARAMS };
        }
    };
})();