// modules/analysis/anchorQuality.js
// Module pour l'analyse de la qualité des textes d'ancrage

LinkJuice.AnchorQuality = (function() {
    /**
     * Analyse la qualité des textes d'ancrage
     * @param {Object} linkData - Données des liens avec leurs textes d'ancrage
     * @return {Object} Métriques de qualité des ancres
     */
    function analyzeAnchorQuality(linkData) {
        const anchorData = {
            totalAnchors: 0,
            meaningfulAnchors: 0,
            genericAnchors: 0,
            keywordRichAnchors: 0,
            lengthDistribution: {
                veryShort: 0, // 1-3 caractères
                short: 0,     // 4-10 caractères
                medium: 0,    // 11-20 caractères
                long: 0       // 21+ caractères
            },
            commonGenericTerms: {},
            commonKeywords: {},
            averageLength: 0,
            totalLength: 0
        };

        const genericTerms = [
            'ici', 'cliquez', 'lien', 'link', 'click', 'here', 'plus', 'voir', 'lire',
            'en savoir plus', 'cliquez ici', 'read more', 'click here', 'learn more'
        ];

        // Vérifier si linkData existe
        if (!linkData) {
            return anchorData;
        }

        // Parcourir tous les liens pour analyser les textes d'ancrage
        for (const url in linkData) {
            linkData[url].forEach(linkInfo => {
                anchorData.totalAnchors++;
                const anchorText = (linkInfo.anchorText || '').trim().toLowerCase();
                anchorData.totalLength += anchorText.length;

                // Classifier par longueur
                const length = anchorText.length;
                if (length >= 1 && length <= 3) {
                    anchorData.lengthDistribution.veryShort++;
                } else if (length >= 4 && length <= 10) {
                    anchorData.lengthDistribution.short++;
                } else if (length >= 11 && length <= 20) {
                    anchorData.lengthDistribution.medium++;
                } else if (length > 20) {
                    anchorData.lengthDistribution.long++;
                }

                // Vérifier si c'est un terme générique
                let isGeneric = false;
                for (const term of genericTerms) {
                    if (anchorText === term || anchorText.includes(term)) {
                        isGeneric = true;
                        if (!anchorData.commonGenericTerms[term]) {
                            anchorData.commonGenericTerms[term] = 0;
                        }
                        anchorData.commonGenericTerms[term]++;
                        break;
                    }
                }

                if (isGeneric) {
                    anchorData.genericAnchors++;
                } else if (length >= 4) {
                    anchorData.meaningfulAnchors++;

                    // Extraire des mots-clés potentiels (mots de 4+ caractères)
                    const words = anchorText.split(/\s+/).filter(word => word.length >= 4);
                    words.forEach(word => {
                        if (!anchorData.commonKeywords[word]) {
                            anchorData.commonKeywords[word] = 0;
                        }
                        anchorData.commonKeywords[word]++;
                    });

                    // Si contient des mots-clés significatifs
                    if (words.length > 0) {
                        anchorData.keywordRichAnchors++;
                    }
                }
            });
        }

        // Calculer les statistiques
        if (anchorData.totalAnchors > 0) {
            anchorData.averageLength = (anchorData.totalLength / anchorData.totalAnchors).toFixed(1);
            anchorData.meaningfulPercentage = (anchorData.meaningfulAnchors / anchorData.totalAnchors * 100).toFixed(1);
            anchorData.genericPercentage = (anchorData.genericAnchors / anchorData.totalAnchors * 100).toFixed(1);
            anchorData.keywordRichPercentage = (anchorData.keywordRichAnchors / anchorData.totalAnchors * 100).toFixed(1);
        }

        // Convertir les termes génériques en tableau pour le tri
        anchorData.commonGenericTerms = Object.entries(anchorData.commonGenericTerms)
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Conserver uniquement les 5 plus courants

        // Convertir les mots-clés en tableau pour le tri
        anchorData.commonKeywords = Object.entries(anchorData.commonKeywords)
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 mots-clés

        return anchorData;
    }

    /**
     * Fonction spécifique pour le dashboard pour décoder les entités HTML
     * @param {string} text - Texte à décoder
     * @return {string} Texte décodé
     */
    function decodeHtmlEntities(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Créer un élément temporaire pour faire le décodage
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    /**
     * Version améliorée pour le dashboard avec débogage
     * @param {Object} linkContextData - Données des liens
     * @return {Object} Métriques détaillées
     */
    function analyzeAnchorQualityDetailed(linkContextData) {
        const anchorData = analyzeAnchorQuality(linkContextData);
        
        // Ajouter des propriétés de débogage
        anchorData.debugInfo = {
            validTexts: 0,
            emptyTexts: 0,
            nullTexts: 0,
            undefinedTexts: 0,
            tooShortTexts: 0,
            textSamples: []
        };
        
        // Collecter des échantillons pour débogage
        if (linkContextData) {
            const allTexts = [];
            for (const url in linkContextData) {
                if (linkContextData[url] && linkContextData[url].length > 0) {
                    const sampleTexts = linkContextData[url]
                        .slice(0, 5)
                        .map(link => (link.anchorText || link.linkText || '').trim())
                        .filter(text => text.length > 0);
                    
                    allTexts.push(...sampleTexts);
                }
            }
            anchorData.debugInfo.textSamples = allTexts.slice(0, 10);
        }
        
        return anchorData;
    }

    // API publique du module
    return {
        analyzeAnchorQuality: analyzeAnchorQuality,
        analyzeAnchorQualityDetailed: analyzeAnchorQualityDetailed,
        decodeHtmlEntities: decodeHtmlEntities
    };
})();