// modules/analysis/contextDistribution.js
// Module pour l'analyse de la distribution des liens par contexte

LinkJuice.ContextDistribution = (function() {
    // Mappages pour la classification des types de liens
    const typeToCategory = {
        'menu': 'navigation',
        'header': 'navigation',
        'footer': 'navigation',
        'sidebar': 'navigation',
        'wp-menu': 'navigation',
        'duda-menu': 'navigation',
        'webflow-nav': 'navigation',
        'wix-menu': 'navigation',
        'shopify-menu': 'navigation',
        'squarespace-nav': 'navigation',

        'paragraph': 'content',
        'content': 'content',
        'content-main': 'content',
        'card': 'content',

        'button': 'interactive',
        'CTA': 'interactive',
        'wp-featured-image': 'interactive',
        'duda-button': 'interactive',
        'webflow-button': 'interactive',
        'wix-button': 'interactive',
        'shopify-product-link': 'interactive',
        'squarespace-button': 'interactive',

        'image': 'media',

        'breadcrumb': 'metadata',
        'author': 'metadata',
        'taxonomy': 'metadata',
        'wp-post-navigation': 'metadata',

        'social': 'social',
        'duda-social': 'social'
    };

    // Mappings pour la classification par CMS
    const typeToCms = {
        'wp-menu': 'wordpress',
        'wp-widget': 'wordpress',
        'wp-post-navigation': 'wordpress',
        'wp-featured-image': 'wordpress',

        'duda-menu': 'duda',
        'duda-button': 'duda',
        'duda-social': 'duda',
        'duda-element': 'duda',

        'webflow-nav': 'webflow',
        'webflow-button': 'webflow',
        'webflow-link-block': 'webflow',

        'wix-menu': 'wix',
        'wix-button': 'wix',
        'wix-component': 'wix',

        'shopify-menu': 'shopify',
        'shopify-product-link': 'shopify',
        'shopify-collection': 'shopify',

        'squarespace-nav': 'squarespace',
        'squarespace-button': 'squarespace'
    };

    /**
     * Analyse la distribution des liens par contexte
     * @param {Object} linkContextData - Données de contexte des liens
     * @param {string} dominantCMS - CMS dominant détecté
     * @return {Object} Analyse détaillée de la distribution des contextes
     */
    function analyzeContextDistribution(linkContextData, dominantCMS) {
        const contextAnalysis = {
            total: 0,
            byType: {},
            byTypePercentage: {},
            byCategory: {
                navigation: 0, // menu, header, footer, sidebar
                content: 0,    // paragraph, content-main
                interactive: 0, // button, CTA
                media: 0,      // image
                metadata: 0,   // breadcrumb, author, taxonomy
                social: 0      // social links
            },
            byCategoryPercentage: {},
            cmsSpecific: {
                wordpress: 0,
                duda: 0,
                webflow: 0,
                wix: 0,
                shopify: 0,
                squarespace: 0
            },
            cmsSpecificPercentage: {},
            menuToContentRatio: 0,
            paragraphPercentage: 0,
            contextualLinksScore: 0, // Score de 1 à 10
            detectedCMS: dominantCMS || 'inconnu',
            cmsConfidence: 0
        };

        // Compter les liens par contexte
        for (const url in linkContextData) {
            linkContextData[url].forEach(linkInfo => {
                contextAnalysis.total++;

                // Compter par type
                const type = linkInfo.context;
                if (!contextAnalysis.byType[type]) {
                    contextAnalysis.byType[type] = 0;
                }
                contextAnalysis.byType[type]++;

                // Comptage par catégorie
                if (typeToCategory[type]) {
                    contextAnalysis.byCategory[typeToCategory[type]]++;
                }

                // Comptage par CMS
                if (typeToCms[type]) {
                    contextAnalysis.cmsSpecific[typeToCms[type]]++;
                }
            });
        }

        // Calculer les pourcentages
        if (contextAnalysis.total > 0) {
            // Pourcentages par type
            for (const type in contextAnalysis.byType) {
                contextAnalysis.byTypePercentage[type] =
                    (contextAnalysis.byType[type] / contextAnalysis.total * 100).toFixed(1);
            }

            // Pourcentages par catégorie
            for (const category in contextAnalysis.byCategory) {
                contextAnalysis.byCategoryPercentage[category] =
                    (contextAnalysis.byCategory[category] / contextAnalysis.total * 100).toFixed(1);
            }

            // Pourcentages par CMS
            for (const cms in contextAnalysis.cmsSpecific) {
                contextAnalysis.cmsSpecificPercentage[cms] =
                    (contextAnalysis.cmsSpecific[cms] / contextAnalysis.total * 100).toFixed(1);
            }

            // Calculer le ratio menu/contenu
            const menuLinks = contextAnalysis.byType['menu'] || 0;
            const contentLinks = (contextAnalysis.byType['paragraph'] || 0) +
                (contextAnalysis.byType['content-main'] || 0);

            contextAnalysis.menuToContentRatio = contentLinks > 0 ?
                (menuLinks / contentLinks).toFixed(2) : 'N/A';

            // Calculer le pourcentage de liens dans des paragraphes
            contextAnalysis.paragraphPercentage =
                (((contextAnalysis.byType['paragraph'] || 0) / contextAnalysis.total) * 100).toFixed(1);

            // Calculer un score de liens contextuels (1-10)
            const contentRatio = contextAnalysis.byCategory['content'] / contextAnalysis.total;
            contextAnalysis.contextualLinksScore = Math.min(10, Math.max(1, Math.round(contentRatio * 10)));
        }

        // Calculer la confiance dans la détection du CMS
        if (dominantCMS && contextAnalysis.cmsSpecific[dominantCMS]) {
            const cmsLinkCount = contextAnalysis.cmsSpecific[dominantCMS];
            contextAnalysis.cmsConfidence = Math.min(100, Math.round((cmsLinkCount / contextAnalysis.total) * 100));
        }

        return contextAnalysis;
    }

    // API publique du module
    return {
        analyzeContextDistribution: analyzeContextDistribution,
        typeToCategory: typeToCategory,
        typeToCms: typeToCms
    };
})();