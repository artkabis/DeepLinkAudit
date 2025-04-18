// modules/analysis/anchorQuality.js
// Module pour l'analyse de la qualité des textes d'ancrage

LinkJuice.AnchorQuality = (function() {
    // Liste des termes génériques à détecter
    const GENERIC_TERMS = [
        'ici', 'cliquez', 'lien', 'link', 'click', 'here', 'plus', 'voir', 'lire',
        'en savoir plus', 'cliquez ici', 'read more', 'click here', 'learn more',
        'suivant', 'précédent', 'next', 'previous', 'retour', 'back', 'continuer',
        'suite', 'voir plus'
    ];

    // Cache pour des performances optimales
    const anchorCache = new Map();

    /**
     * Vérifie si un texte d'ancrage est générique
     * @private
     * @param {string} anchorText - Texte d'ancrage à vérifier
     * @return {boolean} True si l'ancre est générique
     */
    function _isGenericAnchor(anchorText) {
        if (!anchorText) return true;
        
        const normalizedText = anchorText.trim().toLowerCase();
        
        // Vérifie si le texte est vide ou très court
        if (normalizedText.length <= 2) return true;
        
        // Vérifie si c'est un terme générique
        return GENERIC_TERMS.some(term => 
            normalizedText === term || normalizedText.includes(term)
        );
    }

    /**
     * Analyse la qualité des textes d'ancrage
     * @param {Object} linkData - Données des liens avec leurs textes d'ancrage
     * @param {boolean} [useCache=true] - Utiliser le cache ou non
     * @return {Object} Métriques de qualité des ancres
     */
    function analyzeAnchorQuality(linkData, useCache = true) {
        // Générer une clé de cache si nécessaire
        const cacheKey = useCache && linkData ? Object.keys(linkData).length : null;
        
        // Vérifier le cache
        if (cacheKey && anchorCache.has(cacheKey)) {
            return anchorCache.get(cacheKey);
        }
        
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
            totalLength: 0,
            meaningfulPercentage: '0.0',
            genericPercentage: '0.0',
            keywordRichPercentage: '0.0'
        };

        // Si pas de données, retourner les valeurs par défaut
        if (!linkData) {
            if (cacheKey) {
                anchorCache.set(cacheKey, anchorData);
            }
            return anchorData;
        }

        // Structure pour collecter les termes
        const termsFrequency = {
            generic: {},
            keywords: {}
        };

        // Parcourir tous les liens pour analyser les textes d'ancrage
        for (const url in linkData) {
            if (!Array.isArray(linkData[url])) continue;
            
            linkData[url].forEach(linkInfo => {
                try {
                    anchorData.totalAnchors++;
                    
                    // Utiliser TextUtils si disponible, sinon fallback
                    const anchorText = typeof LinkJuice.TextUtils?.decodeHtmlEntities === 'function' 
                        ? LinkJuice.TextUtils.decodeHtmlEntities(linkInfo.anchorText || linkInfo.linkText || '')
                        : (linkInfo.anchorText || linkInfo.linkText || '').trim().toLowerCase();
                    
                    if (!anchorText) return; // Ignorer les ancres vides

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
                    const isGeneric = _isGenericAnchor(anchorText);

                    if (isGeneric) {
                        anchorData.genericAnchors++;
                        
                        // Compter le terme générique spécifique
                        for (const term of GENERIC_TERMS) {
                            if (anchorText.includes(term)) {
                                termsFrequency.generic[term] = (termsFrequency.generic[term] || 0) + 1;
                            }
                        }
                    } else if (length >= 4) {
                        anchorData.meaningfulAnchors++;

                        // Extraire des mots-clés potentiels (mots de 4+ caractères)
                        const words = anchorText.split(/\s+/).filter(word => word.length >= 4);
                        
                        words.forEach(word => {
                            // Ignorer les mots très courants
                            if (['dans', 'avec', 'pour', 'votre', 'cette'].includes(word)) return;
                            
                            termsFrequency.keywords[word] = (termsFrequency.keywords[word] || 0) + 1;
                        });

                        // Si contient des mots-clés significatifs
                        if (words.length > 0) {
                            anchorData.keywordRichAnchors++;
                        }
                    }
                } catch (error) {
                    console.error("Erreur lors de l'analyse d'une ancre:", error);
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
        anchorData.commonGenericTerms = Object.entries(termsFrequency.generic)
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Conserver uniquement les 5 plus courants

        // Convertir les mots-clés en tableau pour le tri
        anchorData.commonKeywords = Object.entries(termsFrequency.keywords)
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 mots-clés

        // Sauvegarder dans le cache
        if (cacheKey) {
            anchorCache.set(cacheKey, anchorData);
        }
        
        return anchorData;
    }

    /**
     * Version améliorée pour le dashboard avec débogage
     * @param {Object} linkContextData - Données des liens
     * @return {Object} Métriques détaillées
     */
    function analyzeAnchorQualityDetailed(linkContextData) {
        const anchorData = analyzeAnchorQuality(linkContextData, false);
        
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
                        .map(link => {
                            const text = (link.anchorText || link.linkText || '').trim();
                            
                            // Compter les différents types pour débogage
                            if (!text) {
                                anchorData.debugInfo.emptyTexts++;
                            } else if (text.length < 4) {
                                anchorData.debugInfo.tooShortTexts++;
                            } else {
                                anchorData.debugInfo.validTexts++;
                            }
                            
                            return text;
                        })
                        .filter(text => text.length > 0);
                    
                    allTexts.push(...sampleTexts);
                }
            }
            anchorData.debugInfo.textSamples = allTexts.slice(0, 10);
        }
        
        return anchorData;
    }

    /**
     * Évalue la qualité d'un texte d'ancrage spécifique
     * @param {string} anchorText - Texte d'ancrage à évaluer
     * @return {Object} Évaluation du texte
     */
    function evaluateAnchorText(anchorText) {
        if (!anchorText) {
            return {
                score: 0,
                quality: 'très faible',
                isGeneric: true,
                length: 0,
                suggestions: ['Ajouter un texte d\'ancrage']
            };
        }
        
        const text = typeof LinkJuice.TextUtils?.decodeHtmlEntities === 'function'
            ? LinkJuice.TextUtils.decodeHtmlEntities(anchorText)
            : anchorText;
        
        const normalizedText = text.trim().toLowerCase();
        const length = normalizedText.length;
        const isGeneric = _isGenericAnchor(normalizedText);
        
        // Calculer un score de 0 à 10
        let score = 0;
        let suggestions = [];
        
        // Points pour la longueur
        if (length < 4) {
            score += length;
            suggestions.push('Utiliser un texte plus long (4+ caractères)');
        } else if (length <= 10) {
            score += 4;
        } else if (length <= 20) {
            score += 6;
        } else {
            score += 5; // Pénalité légère pour les textes trop longs
            suggestions.push('Raccourcir le texte d\'ancrage (idéalement 10-20 caractères)');
        }
        
        // Points pour la spécificité
        if (!isGeneric) {
            score += 4;
        } else {
            suggestions.push('Éviter les termes génériques comme "cliquez ici"');
        }
        
        // Qualité textuelle
        let quality;
        if (score <= 2) quality = 'très faible';
        else if (score <= 4) quality = 'faible';
        else if (score <= 6) quality = 'moyenne';
        else if (score <= 8) quality = 'bonne';
        else quality = 'excellente';
        
        return {
            score,
            quality,
            isGeneric,
            length,
            suggestions: suggestions.length > 0 ? suggestions : ['Texte d\'ancrage de bonne qualité']
        };
    }

    // API publique du module
    return {
        analyzeAnchorQuality,
        analyzeAnchorQualityDetailed,
        evaluateAnchorText,
        
        /**
         * Vide le cache d'analyse
         */
        clearCache: function() {
            anchorCache.clear();
        },
        
        /**
         * Récupère la liste des termes génériques
         * @return {Array<string>} Liste des termes
         */
        getGenericTerms: function() {
            return [...GENERIC_TERMS];
        },
        
        /**
         * Ajoute des termes génériques à détecter
         * @param {Array<string>} terms - Nouveaux termes à ajouter
         */
        addGenericTerms: function(terms) {
            if (!Array.isArray(terms)) return;
            
            // Ajouter uniquement les termes non déjà présents
            terms.forEach(term => {
                if (!GENERIC_TERMS.includes(term)) {
                    GENERIC_TERMS.push(term);
                }
            });
            
            // Vider le cache car les règles ont changé
            anchorCache.clear();
        }
    };
})();