// modules/utils/cmsDetection.js
// Module pour la détection du CMS utilisé sur un site web

LinkJuice.CMSDetection = (function() {
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
     * Détecte le CMS utilisé à partir du HTML d'une page
     * @param {string} html - Le contenu HTML de la page
     * @return {object} Résultat de détection avec scores et CMS dominant
     */
    function detectCMS(html) {
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

        for (const cms in cmsScores) {
            if (cmsScores[cms] > maxScore) {
                maxScore = cmsScores[cms];
                dominantCMS = cms;
            }
        }

        return {
            scores: cmsScores,
            dominant: dominantCMS,
            dominantScore: maxScore
        };
    }

    // API publique du module
    return {
        detectCMS: detectCMS
    };
})();