// modules/utils/recommendations.js
// Module pour générer des recommandations basées sur l'analyse

LinkJuice.Recommendations = (function() {
    /**
     * Génère des recommandations basées sur l'analyse
     * @param {Object} analysisResults - Résultats complets de l'analyse
     * @return {Array} Liste de recommandations
     */
    function generateRecommendations(analysisResults) {
        const recommendations = [];

        if (!analysisResults) {
            return recommendations;
        }

        // Vérifier les pages orphelines
        if (analysisResults.orphanedPageCount > 0) {
            const orphanedPercentage = (analysisResults.orphanedPageCount / analysisResults.sitemapUrlCount * 100).toFixed(1);

            recommendations.push({
                id: 'orphaned_pages',
                title: 'Réduire les pages orphelines',
                description: `${analysisResults.orphanedPageCount} pages (${orphanedPercentage}%) sont présentes dans le sitemap mais inaccessibles via des liens internes.`,
                priority: orphanedPercentage > 20 ? 'high' : 'medium',
                actions: [
                    'Créer des liens vers ces pages depuis des contenus thématiquement reliés',
                    'Ajouter ces pages dans la navigation principale ou secondaire',
                    'Créer des sections "Articles connexes" pour lier vers ces pages'
                ]
            });
        }

        // Vérifier la qualité des ancres
        const anchorData = analysisResults.anchorQuality;
        if (anchorData && anchorData.genericPercentage > 30) {
            recommendations.push({
                id: 'anchor_quality',
                title: 'Améliorer la qualité des textes d\'ancrage',
                description: `${anchorData.genericPercentage}% de vos liens utilisent des termes génériques comme "cliquez ici" ou "en savoir plus".`,
                priority: 'medium',
                actions: [
                    'Utiliser des mots-clés descriptifs dans les textes d\'ancrage',
                    'Éviter les termes génériques comme "cliquez ici"',
                    'Rendre l\'ancre pertinente par rapport au contenu de destination'
                ]
            });
        }

        // Vérifier les liens contextuels
        const contextAnalysis = analysisResults.contextAnalysis;
        if (contextAnalysis && contextAnalysis.paragraphPercentage < 40) {
            recommendations.push({
                id: 'contextual_links',
                title: 'Augmenter les liens contextuels',
                description: `Seulement ${contextAnalysis.paragraphPercentage}% de vos liens sont intégrés dans des paragraphes de contenu.`,
                priority: 'medium',
                actions: [
                    'Intégrer plus de liens dans le texte courant des articles',
                    'Lier naturellement les termes pertinents vers d\'autres pages',
                    'Réduire la dépendance aux menus et widgets pour la navigation'
                ]
            });
        }

        // Vérifier la densité de liens
        if (analysisResults.performanceMetrics && analysisResults.performanceMetrics.averageLinksPerPage < 3) {
            recommendations.push({
                id: 'link_density',
                title: 'Augmenter la densité de liens',
                description: `Votre site a en moyenne seulement ${analysisResults.performanceMetrics.averageLinksPerPage} liens internes par page.`,
                priority: 'medium',
                actions: [
                    'Ajouter plus de liens internes entre les pages connexes',
                    'Créer des sections "Articles connexes" ou "Voir aussi"',
                    'Utiliser des liens contextuels dans le corps du texte'
                ]
            });
        }

        // Vérifier la structure hiérarchique
        if (analysisResults.performanceMetrics && analysisResults.performanceMetrics.hierarchyScore < 7) {
            recommendations.push({
                id: 'hierarchy_structure',
                title: 'Améliorer la structure hiérarchique',
                description: 'La structure hiérarchique de votre maillage interne pourrait être améliorée.',
                priority: 'low',
                actions: [
                    'Créer une structure en silo thématique',
                    'Établir clairement les pages piliers et les pages de support',
                    'Assurer que chaque page soit accessible en 3 clics maximum'
                ]
            });
        }

        // Vérifier la distribution des scores d'importance
        const linksSummary = analysisResults.linksSummary;
        if (linksSummary && linksSummary.byImportancePercentage) {
            const highImportancePercentage = linksSummary.byImportancePercentage.high ? 
                parseFloat(linksSummary.byImportancePercentage.high) : 0;

            if (highImportancePercentage < 20) {
                recommendations.push({
                    id: 'importance_distribution',
                    title: 'Améliorer l\'importance des liens',
                    description: `Seulement ${highImportancePercentage}% de vos liens ont une importance élevée.`,
                    priority: 'medium',
                    actions: [
                        'Placer plus de liens dans des paragraphes de contenu pertinents',
                        'Utiliser des textes d\'ancrage riches en mots-clés',
                        'Ajouter des liens dans des sections CTA ou des blocs importants',
                        'Éviter les liens trop génériques dans les menus secondaires'
                    ]
                });
            }
        }

        // Vérifier l'analyse inText
        if (analysisResults.inTextAnalysis) {
            const inTextPercentage = parseFloat(analysisResults.inTextAnalysis.inTextPercentage);
            if (inTextPercentage < 25) {
                recommendations.push({
                    id: 'intext_links',
                    title: 'Augmenter les liens inText',
                    description: `Seulement ${inTextPercentage}% de vos liens sont des liens inText (dans le contenu).`,
                    priority: 'high',
                    actions: [
                        'Privilégier les liens dans le corps du texte plutôt que dans les menus',
                        'Identifier les termes clés de vos contenus et les transformer en liens',
                        'Créer des liens contextuels dans les paragraphes pour vos contenus importants'
                    ]
                });
            }
        }

        // Recommandation basée sur l'analyse des CMS
        if (contextAnalysis && contextAnalysis.cmsSpecificPercentage) {
            const cmsDistribution = contextAnalysis.cmsSpecificPercentage;
            let dominantCms = '';
            let maxPercentage = 0;

            for (const cms in cmsDistribution) {
                const percentage = parseFloat(cmsDistribution[cms]);
                if (percentage > maxPercentage) {
                    maxPercentage = percentage;
                    dominantCms = cms;
                }
            }

            if (dominantCms && maxPercentage > 30) {
                let cmsSpecificActions = [];

                switch (dominantCms) {
                    case 'wordpress':
                        cmsSpecificActions = [
                            'Utiliser un plugin de liens internes automatiques comme Link Whisper ou Yoast SEO',
                            'Ajouter des widgets "Articles connexes" dans la barre latérale',
                            'Personnaliser votre thème pour améliorer la navigation contextuelle',
                            'Utiliser les taxonomies (catégories et tags) pour renforcer le maillage thématique'
                        ];
                        break;
                    case 'duda':
                        cmsSpecificActions = [
                            'Utiliser des widgets personnalisés pour les liens contextuels',
                            'Créer des sections de contenu avec des liens thématiques',
                            'Optimiser la structure de navigation mobile',
                            'Exploiter les fonctionnalités multi-niveaux pour le maillage interne'
                        ];
                        break;
                    case 'webflow':
                        cmsSpecificActions = [
                            'Utiliser des collections dynamiques pour lier le contenu connexe',
                            'Créer des composants réutilisables avec des liens contextuels',
                            'Optimiser les liens dans les templates CMS',
                            'Implémenter des listes de références pour les articles connexes'
                        ];
                        break;
                    case 'wix':
                        cmsSpecificActions = [
                            'Utiliser l\'outil "Pages liées" dans l\'éditeur Wix',
                            'Créer des menus secondaires thématiques',
                            'Ajouter des sections "Contenu connexe" à vos modèles de page',
                            'Exploiter les répéteurs Wix pour afficher des articles liés'
                        ];
                        break;
                    case 'shopify':
                        cmsSpecificActions = [
                            'Optimiser les liens entre produits connexes et collections',
                            'Ajouter des sections "Produits similaires" ou "Récemment consultés"',
                            'Améliorer les liens de navigation par catégorie',
                            'Utiliser des blogs pour renforcer le maillage vers les fiches produits'
                        ];
                        break;
                    default:
                        cmsSpecificActions = [
                            'Optimiser la structure de navigation spécifique à votre CMS',
                            'Vérifier les options de liens automatiques dans votre plateforme',
                            'Améliorer les modèles de page pour inclure plus de liens contextuels',
                            'Explorer les extensions ou plugins dédiés au maillage interne'
                        ];
                }

                recommendations.push({
                    id: 'cms_specific',
                    title: `Optimisation pour ${dominantCms}`,
                    description: `Votre site utilise principalement ${dominantCms} (${maxPercentage}% des éléments de navigation).`,
                    priority: 'low',
                    actions: cmsSpecificActions
                });
            }
        }

        // Ajouter une recommandation sur la stratégie globale de maillage
        recommendations.push({
            id: 'global_strategy',
            title: 'Établir une stratégie globale de maillage interne',
            description: 'Une approche stratégique du maillage interne peut améliorer significativement le référencement et l\'expérience utilisateur.',
            priority: 'medium',
            actions: [
                'Identifier vos pages piliers et créer un plan de liaison avec vos contenus satellites',
                'Mettre en place une structure en silo thématique pour renforcer la pertinence',
                'Définir un nombre minimal de liens internes par page de contenu',
                'Réviser régulièrement la structure du maillage et l\'adapter selon les performances'
            ]
        });

        return recommendations;
    }

    // API publique du module
    return {
        generateRecommendations: generateRecommendations
    };
})();