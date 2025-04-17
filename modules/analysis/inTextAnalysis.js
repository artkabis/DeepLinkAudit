// modules/analysis/inTextAnalysis.js
// Module pour l'analyse des liens inText (dans le contenu principal)

LinkJuice.InTextAnalysis = (function() {
    /**
     * Analyse les liens inText dans les données de contexte
     * @param {Object} linkContextData - Données de contexte des liens
     * @return {Object} Résultats d'analyse des liens inText
     */
    function analyzeInTextLinks(linkContextData) {
        if (!linkContextData) {
            return {
                total: 0,
                inTextLinks: 0,
                navigationLinks: 0,
                inTextPercentage: 0,
                navigationPercentage: 0,
                inTextByPage: {},
                topInTextPages: [],
                averageInTextPerPage: 0
            };
        }

        const inTextAnalysis = {
            total: 0,
            inTextLinks: 0,
            navigationLinks: 0,
            inTextPercentage: 0,
            navigationPercentage: 0,
            inTextByPage: {},
            topInTextPages: [],
            averageInTextPerPage: 0
        };

        // Contextes considérés comme inText (dans le contenu principal)
        const inTextContexts = ['paragraph', 'content', 'content-main'];

        // Contextes considérés comme navigation
        const navigationContexts = ['menu', 'header', 'footer', 'sidebar', 'wp-menu', 'duda-menu',
            'webflow-nav', 'wix-menu', 'shopify-menu', 'squarespace-nav'];

        // Parcourir les données de contexte
        for (const url in linkContextData) {
            const contexts = linkContextData[url];
            let pageInTextCount = 0;

            contexts.forEach(context => {
                inTextAnalysis.total++;

                // Vérifier si c'est un lien inText
                if (inTextContexts.includes(context.context)) {
                    inTextAnalysis.inTextLinks++;
                    pageInTextCount++;

                    // Ajouter une propriété pour identifier les liens inText
                    context.isInText = true;

                    // Améliorer le score d'importance pour les liens inText
                    if (context.importance) {
                        context.importance = Math.min(1, context.importance * 1.2);
                    }
                } else if (navigationContexts.includes(context.context)) {
                    inTextAnalysis.navigationLinks++;
                    context.isInText = false;
                } else {
                    context.isInText = false;
                }
            });

            // Stocker le nombre de liens inText par page
            if (pageInTextCount > 0) {
                inTextAnalysis.inTextByPage[url] = pageInTextCount;
            }
        }

        // Calculer les pourcentages
        if (inTextAnalysis.total > 0) {
            inTextAnalysis.inTextPercentage = (inTextAnalysis.inTextLinks / inTextAnalysis.total * 100).toFixed(1);
            inTextAnalysis.navigationPercentage = (inTextAnalysis.navigationLinks / inTextAnalysis.total * 100).toFixed(1);
        }

        // Calculer la moyenne de liens inText par page
        const pagesWithInText = Object.keys(inTextAnalysis.inTextByPage).length;
        if (pagesWithInText > 0) {
            inTextAnalysis.averageInTextPerPage = (inTextAnalysis.inTextLinks / pagesWithInText).toFixed(1);
        }

        // Trouver les pages avec le plus de liens inText
        inTextAnalysis.topInTextPages = Object.entries(inTextAnalysis.inTextByPage)
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return inTextAnalysis;
    }

    // API publique du module
    return {
        analyzeInTextLinks: analyzeInTextLinks
    };
})();