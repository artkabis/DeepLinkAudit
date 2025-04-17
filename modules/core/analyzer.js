// modules/core/analyzer.js
// Module principal pour la coordination de l'analyse du maillage interne

LinkJuice.Analyzer = (function() {
    // Variables globales du module
    let sitemapUrls = [];
    let crawledUrls = new Set();
    let crawlQueue = [];
    let orphanedPages = [];
    let analysisResults = null;
    let linkContextData = {};
    let linkImportanceData = {};
    let cmsTotalScore = null;
    let dominantCMS = null;

    /**
     * Lance l'analyse complète du maillage interne
     * @param {Object} params - Paramètres de l'analyse
     * @param {function} progressCallback - Callback pour mise à jour de la progression
     * @return {Promise<Object>} Résultats de l'analyse
     */
    async function startAnalysis(params, progressCallback = null) {
        try {
            // Réinitialiser les données
            sitemapUrls = [];
            crawledUrls = new Set();
            crawlQueue = [];
            orphanedPages = [];
            linkContextData = {};
            linkImportanceData = {};
            cmsTotalScore = null;
            dominantCMS = null;

            // Étape 1: Parser le sitemap.xml
            if (progressCallback) progressCallback({ step: 'sitemap', message: 'Parsing du sitemap...' });
            
            sitemapUrls = await LinkJuice.Sitemap.parseSitemap(params.sitemapUrl);
            console.log(`Sitemap parsed: ${sitemapUrls.length} URLs found`);
            
            if (progressCallback) {
                progressCallback({ 
                    step: 'sitemap_complete', 
                    message: `${sitemapUrls.length} URLs trouvées dans le sitemap.`,
                    urls: sitemapUrls.length
                });
            }

            // Étape 2: Crawler le site à partir de l'URL de départ
            if (progressCallback) progressCallback({ step: 'crawl', message: 'Début du crawl...' });
            
            crawlQueue.push(params.startUrl);
            const domainFilterList = params.domainFilter ? 
                (Array.isArray(params.domainFilter) ? params.domainFilter : params.domainFilter.split(',').map(d => d.trim())) 
                : [];

            let crawledCount = 0;
            while (crawlQueue.length > 0 && crawledCount < params.maxPages) {
                const urlToCrawl = crawlQueue.shift();

                if (!crawledUrls.has(urlToCrawl)) {
                    crawledUrls.add(urlToCrawl);
                    crawledCount++;

                    if (progressCallback) {
                        progressCallback({ 
                            step: 'crawling', 
                            message: `Crawling ${crawledCount}/${params.maxPages}...`,
                            current: crawledCount,
                            total: params.maxPages,
                            url: urlToCrawl
                        });
                    }

                    try {
                        const result = await LinkJuice.Crawler.crawlPage(
                            urlToCrawl, linkContextData, linkImportanceData
                        );
                        
                        // Mettre à jour les informations CMS
                        if (result.cmsInfo) {
                            if (!cmsTotalScore) {
                                cmsTotalScore = result.cmsInfo.scores;
                                dominantCMS = result.cmsInfo.dominant;
                            } else {
                                // Agréger les scores
                                for (const cms in result.cmsInfo.scores) {
                                    cmsTotalScore[cms] += result.cmsInfo.scores[cms];
                                }

                                // Mettre à jour le CMS dominant si nécessaire
                                let newMaxScore = 0;
                                for (const cms in cmsTotalScore) {
                                    if (cmsTotalScore[cms] > newMaxScore) {
                                        newMaxScore = cmsTotalScore[cms];
                                        dominantCMS = cms;
                                    }
                                }
                            }
                        }

                        // Filtrer et ajouter les nouveaux liens à la file d'attente
                        for (const link of result.links) {
                            if (!crawledUrls.has(link) && !crawlQueue.includes(link)) {
                                // Vérifier le filtre de domaine
                                if (domainFilterList.length === 0 || domainFilterList.some(domain => link.includes(domain))) {
                                    crawlQueue.push(link);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error crawling ${urlToCrawl}:`, error);
                    }
                }
            }

            if (progressCallback) {
                progressCallback({ 
                    step: 'crawl_complete', 
                    message: `${crawledUrls.size} pages crawlées.`,
                    urls: crawledUrls.size
                });
            }

            // Étape 3: Identifier les pages orphelines (dans le sitemap mais pas crawlées)
            if (progressCallback) progressCallback({ step: 'orphaned', message: 'Identification des pages orphelines...' });
            
            orphanedPages = sitemapUrls.filter(url => !crawledUrls.has(url));
            
            if (progressCallback) {
                progressCallback({ 
                    step: 'orphaned_complete', 
                    message: `${orphanedPages.length} pages orphelines identifiées.`,
                    urls: orphanedPages.length
                });
            }

            // Étape 4: Générer les résultats complets d'analyse
            if (progressCallback) progressCallback({ step: 'analysis', message: 'Analyse des données...' });
            
            // Convertir les ensembles en tableaux pour le stockage
            const crawledUrlsArray = Array.from(crawledUrls);

            // Générer des détails supplémentaires sur les pages
            const pageDetails = LinkJuice.Crawler.generatePageDetails(
                crawledUrlsArray, sitemapUrls, linkContextData
            );

            // Générer le résumé des liens
            const linksSummary = generateLinksSummary();

            // Analyser la qualité des ancres
            const anchorQuality = LinkJuice.AnchorQuality.analyzeAnchorQuality(linkContextData);

            // Analyser la distribution des contextes
            const contextAnalysis = LinkJuice.ContextDistribution.analyzeContextDistribution(
                linkContextData, dominantCMS
            );

            // Analyser les liens inText
            const inTextAnalysis = LinkJuice.InTextAnalysis.analyzeInTextLinks(linkContextData);
            const pageRank = LinkJuice.PageRank.calculatePageRank(linkContextData);
            const juiceLinkScores = LinkJuice.JuiceLinkScore.calculateJuiceScores(linkContextData);

            // Calculer les métriques de performance
            const performanceMetricsData = {
                linksSummary,
                anchorQuality,
                contextAnalysis,
                orphanedPageCount: orphanedPages.length,
                sitemapUrlCount: sitemapUrls.length,
                crawledUrlCount: crawledUrlsArray.length,
                linkContextData,
                pageRank,
                juiceLinkScores,
                pageDetails
            };
            
            const performanceMetrics = LinkJuice.PerformanceMetrics.generatePerformanceMetrics(
                performanceMetricsData
            );

            // Générer des recommandations
            const recommendationsData = {
                orphanedPageCount: orphanedPages.length,
                sitemapUrlCount: sitemapUrls.length,
                anchorQuality,
                contextAnalysis,
                performanceMetrics,
                linksSummary
            };
            
            const recommendations = LinkJuice.Recommendations.generateRecommendations(recommendationsData);

            // Assembler les résultats complets
            analysisResults = {
                sitemapUrlCount: sitemapUrls.length,
                crawledUrlCount: crawledUrlsArray.length,
                orphanedPageCount: orphanedPages.length,
                orphanedPages: orphanedPages,
                sitemapUrls: sitemapUrls,
                crawledUrls: crawledUrlsArray,
                linkContextData: linkContextData,
                linkImportanceData: linkImportanceData,
                linksSummary: linksSummary,
                anchorQuality: anchorQuality,
                contextAnalysis: contextAnalysis,
                inTextAnalysis: inTextAnalysis,
                pageDetails: pageDetails,
                performanceMetrics: performanceMetrics,
                recommendations: recommendations,
                detectedCMS: dominantCMS,
                params: {  
                    sitemapUrl: params.sitemapUrl,
                    startUrl: params.startUrl,
                    maxPages: params.maxPages,
                    domainFilter: params.domainFilter,
                    date: new Date().toISOString()
                }
            };

            if (progressCallback) {
                progressCallback({ 
                    step: 'complete', 
                    message: 'Analyse terminée avec succès!',
                    results: analysisResults
                });
            }

            return {
                success: true,
                message: `${sitemapUrls.length} pages dans le sitemap, ${crawledUrls.size} pages crawlées, ${orphanedPages.length} pages orphelines trouvées.`,
                results: analysisResults
            };
        } catch (error) {
            console.error('Erreur d\'analyse:', error);
            
            if (progressCallback) {
                progressCallback({ 
                    step: 'error', 
                    message: `Erreur: ${error.message}`,
                    error: error
                });
            }
            
            return {
                success: false,
                message: error.message || 'Une erreur est survenue lors de l\'analyse.',
                error: error
            };
        }
    }

    /**
     * Génère un résumé des types de liens
     * @return {Object} Résumé des liens
     */
    function generateLinksSummary() {
        const summary = {
            totalLinks: 0,
            byContext: {},
            byImportance: {
                high: 0,    // 0.8-1.0
                medium: 0,  // 0.5-0.79
                low: 0      // 0-0.49
            },
            topSourcePages: {},
            topDestinationPages: {}
        };

        // Compter le nombre de liens par contexte et par importance
        for (const url in linkContextData) {
            const contexts = linkContextData[url];

            // Compter les liens par page source
            contexts.forEach(context => {
                summary.totalLinks++;

                // Compter par type de contexte
                if (!summary.byContext[context.context]) {
                    summary.byContext[context.context] = 0;
                }
                summary.byContext[context.context]++;

                // Compter par niveau d'importance
                const importance = context.importance || 0;
                if (importance >= 0.8) {
                    summary.byImportance.high++;
                } else if (importance >= 0.5) {
                    summary.byImportance.medium++;
                } else {
                    summary.byImportance.low++;
                }

                // Compter les liens par page source
                if (!summary.topSourcePages[context.fromUrl]) {
                    summary.topSourcePages[context.fromUrl] = 0;
                }
                summary.topSourcePages[context.fromUrl]++;

                // Compter les liens par page destination
                if (!summary.topDestinationPages[url]) {
                    summary.topDestinationPages[url] = 0;
                }
                summary.topDestinationPages[url]++;
            });
        }

        // Calculer les pourcentages d'importance
        if (summary.totalLinks > 0) {
            summary.byImportancePercentage = {
                high: ((summary.byImportance.high / summary.totalLinks) * 100).toFixed(1),
                medium: ((summary.byImportance.medium / summary.totalLinks) * 100).toFixed(1),
                low: ((summary.byImportance.low / summary.totalLinks) * 100).toFixed(1)
            };
        }

        // Convertir les objets en tableaux triés pour les top pages
        const topSourcePagesArray = Object.entries(summary.topSourcePages)
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        const topDestinationPagesArray = Object.entries(summary.topDestinationPages)
            .map(([url, count]) => ({ url, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        summary.topSourcePages = topSourcePagesArray;
        summary.topDestinationPages = topDestinationPagesArray;

        return summary;
    }

    /**
     * Trouve les pages avec les liens les plus importants
     * @param {number} [limit=10] - Nombre maximum de pages à retourner
     * @return {Array} Pages les plus importantes
     */
    function getTopImportantPages(limit = 10) {
        const pageImportance = {};

        // Calculer l'importance moyenne des liens entrants pour chaque page
        for (const url in linkContextData) {
            const links = linkContextData[url];
            let totalImportance = 0;

            links.forEach(link => {
                totalImportance += link.importance || 0;
            });

            const avgImportance = links.length > 0 ? totalImportance / links.length : 0;
            pageImportance[url] = {
                url: url,
                averageImportance: avgImportance,
                linkCount: links.length,
                totalImportance: totalImportance
            };
        }

        // Trier par importance moyenne et retourner les N premières
        return Object.values(pageImportance)
            .sort((a, b) => b.averageImportance - a.averageImportance)
            .slice(0, limit);
    }

    /**
     * Trouve les pages avec les liens les moins importants
     * @param {number} [limit=10] - Nombre maximum de pages à retourner
     * @return {Array} Pages les moins importantes
     */
    function getLowImportancePages(limit = 10) {
        const pageImportance = {};

        // Calculer l'importance moyenne des liens entrants pour chaque page
        for (const url in linkContextData) {
            const links = linkContextData[url];
            let totalImportance = 0;

            links.forEach(link => {
                totalImportance += link.importance || 0;
            });

            const avgImportance = links.length > 0 ? totalImportance / links.length : 0;
            pageImportance[url] = {
                url: url,
                averageImportance: avgImportance,
                linkCount: links.length,
                totalImportance: totalImportance
            };
        }

        // Trier par importance moyenne (croissant) et retourner les N premières
        return Object.values(pageImportance)
            .filter(page => page.linkCount > 0) // Ignorer les pages sans liens
            .sort((a, b) => a.averageImportance - b.averageImportance)
            .slice(0, limit);
    }

    /**
 * Prépare les données pour le dashboard
 * @return {Object} Données formatées pour le dashboard
 */
function getDashboardData() {
    if (!analysisResults) {
        return {
            success: false,
            message: 'Aucune donnée d\'analyse disponible. Veuillez d\'abord lancer une analyse.'
        };
    }

    // Obtenir des données supplémentaires spécifiques au dashboard
    const topImportantPages = getTopImportantPages(10);
    const lowImportancePages = getLowImportancePages(10);

    // Enrichir les métadonnées si elles ne sont pas déjà présentes
    const metadata = {
        date: analysisResults.params?.date || new Date().toISOString(),
        sitemapUrl: analysisResults.params?.sitemapUrl || "N/A",
        startUrl: analysisResults.params?.startUrl || "N/A",
        maxPages: analysisResults.params?.maxPages || 0,
        domainFilter: analysisResults.params?.domainFilter || "Tous"
    };

    // Créer un objet avec toutes les données pour le dashboard
    const dashboardData = {
        ...analysisResults,
        metadata: metadata,  // Ajouter explicitement les métadonnées
        importanceAnalysis: {
            topImportantPages: topImportantPages,
            lowImportancePages: lowImportancePages
        }
    };

    console.log("Metadata préparée pour le dashboard:", metadata);

    return {
        success: true,
        data: dashboardData
    };
}

    /**
     * Retourne les résultats de la dernière analyse
     * @return {Object|null} Résultats d'analyse ou null si aucune analyse n'a été effectuée
     */
    function getLastAnalysisResults() {
        return analysisResults;
    }

    // API publique du module
    return {
        startAnalysis: startAnalysis,
        generateLinksSummary: generateLinksSummary,
        getTopImportantPages: getTopImportantPages,
        getLowImportancePages: getLowImportancePages,
        getDashboardData: getDashboardData,
        getLastAnalysisResults: getLastAnalysisResults
    };
})();