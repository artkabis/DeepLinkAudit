// modules/utils/cmsDetection.js
// Module pour la détection du CMS utilisé sur un site web

LinkJuice.CMSDetection = (function() {
    // Cache des détections pour les URLs déjà analysées
    const detectionCache = new Map();
    
    // Données des signatures de CMS utilisées pour la détection
    const cmsSignatures = {
        wordpress: [
            'wp-content',
            'wp-includes',
            'wp-',
            'wordpress',
            'class="wp-'
        ],
        duda: [
            'dmUDNavigationItem',
            'unifiednav__item',
            'dmNav',
            'dmBody',
            'dm-',
            'data-anim-desktop'
        ],
        webflow: [
            'w-webflow',
            'wf-',
            'webflow',
            'w-nav'
        ],
        wix: [
            'wix-',
            '_wixCssImports',
            '_wixTemplate',
            'wixui'
        ],
        shopify: [
            'shopify',
            'Shopify.theme',
            'shopify-section'
        ],
        squarespace: [
            'squarespace',
            'sqs-',
            'data-sqs-type'
        ]
    };

    /**
     * Calcule un hachage simple pour une chaîne (pour le cache)
     * @private
     * @param {string} str - Chaîne à hacher
     * @return {string} Hachage de la chaîne
     */
    function _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertit en entier 32 bits
        }
        return hash.toString(16);
    }

    /**
     * Détecte le CMS utilisé à partir du HTML d'une page
     * @param {string} html - Le contenu HTML de la page
     * @param {string} [url] - URL optionnelle pour le cache
     * @return {object} Résultat de détection avec scores et CMS dominant
     */
    function detectCMS(html, url) {
        // Si l'URL est fournie et présente dans le cache, retourner le résultat mis en cache
        const cacheKey = url || (html ? _simpleHash(html.substring(0, 5000)) : 'empty');
        if (detectionCache.has(cacheKey)) {
            return detectionCache.get(cacheKey);
        }
        
        // Si aucun HTML fourni, retourner un résultat vide
        if (!html) {
            const emptyResult = {
                scores: { wordpress: 0, duda: 0, webflow: 0, wix: 0, shopify: 0, squarespace: 0 },
                dominant: null,
                dominantScore: 0,
                confidence: 0
            };
            detectionCache.set(cacheKey, emptyResult);
            return emptyResult;
        }

        // Scores pour chaque CMS
        const cmsScores = {
            wordpress: 0,
            duda: 0,
            webflow: 0,
            wix: 0,
            shopify: 0,
            squarespace: 0
        };

        // Vérifier chaque signature
        for (const cms in cmsSignatures) {
            for (const signature of cmsSignatures[cms]) {
                const regex = new RegExp(signature, 'i');
                // Compter le nombre d'occurrences
                const matches = (html.match(new RegExp(signature, 'gi')) || []).length;
                if (matches > 0) {
                    cmsScores[cms] += matches;
                }
            }
        }

        // Déterminer le CMS dominant
        let dominantCMS = null;
        let maxScore = 0;
        let totalScore = 0;

        for (const cms in cmsScores) {
            totalScore += cmsScores[cms];
            if (cmsScores[cms] > maxScore) {
                maxScore = cmsScores[cms];
                dominantCMS = cms;
            }
        }

        // Calculer un niveau de confiance (0-100)
        const confidence = totalScore > 0 ? Math.min(100, Math.round((maxScore / totalScore) * 100)) : 0;

        const result = {
            scores: cmsScores,
            dominant: dominantCMS,
            dominantScore: maxScore,
            confidence: confidence
        };
        
        // Stocker dans le cache
        detectionCache.set(cacheKey, result);
        
        return result;
    }

    /**
     * Ajoute des signatures personnalisées pour la détection des CMS
     * @param {string} cmsName - Nom du CMS
     * @param {Array<string>} signatures - Liste des signatures à détecter
     */
    function addCustomSignatures(cmsName, signatures) {
        if (!cmsName || !Array.isArray(signatures)) return;
        
        if (!cmsSignatures[cmsName]) {
            cmsSignatures[cmsName] = [];
        }
        
        cmsSignatures[cmsName] = [...cmsSignatures[cmsName], ...signatures];
        
        // Vider le cache car les règles ont changé
        detectionCache.clear();
    }

    // API publique du module
    return {
        detectCMS,
        addCustomSignatures,
        
        /**
         * Vide le cache de détection
         */
        clearCache: function() {
            detectionCache.clear();
        },
        
        /**
         * Retourne les signatures disponibles
         * @return {Object} Signatures par CMS
         */
        getSignatures: function() {
            return { ...cmsSignatures };
        }
    };
})();