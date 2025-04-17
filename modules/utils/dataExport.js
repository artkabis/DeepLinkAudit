// modules/utils/dataExport.js
// Module pour l'exportation des données d'analyse

LinkJuice.DataExport = (function() {
    /**
     * Exporte les résultats d'analyse au format JSON
     * @param {Object} analysisResults - Résultats complets de l'analyse
     * @return {void}
     */
    function exportResults(analysisResults) {
        if (!analysisResults) return;

        const resultsObj = {
            metadata: {
                date: new Date().toISOString(),
                sitemapUrl: analysisResults.params?.sitemapUrl || 'N/A',
                startUrl: analysisResults.params?.startUrl || 'N/A',
                maxPages: analysisResults.params?.maxPages || 0,
                domainFilter: analysisResults.params?.domainFilter || ''
            },
            statistics: {
                sitemapUrlCount: analysisResults.sitemapUrlCount || 0,
                crawledUrlCount: analysisResults.crawledUrlCount || 0,
                orphanedPageCount: analysisResults.orphanedPageCount || 0,
                orphanedPercentage: (
                    analysisResults.orphanedPageCount && analysisResults.sitemapUrlCount ?
                    (analysisResults.orphanedPageCount / analysisResults.sitemapUrlCount * 100).toFixed(2) : 
                    "0.00"
                )
            },
            orphanedPages: analysisResults.orphanedPages || [],
            crawledUrls: analysisResults.crawledUrls || [],
            sitemapUrls: analysisResults.sitemapUrls || [],
            linkContextData: analysisResults.linkContextData || {},
            linkImportanceData: analysisResults.linkImportanceData || {},
            linksSummary: analysisResults.linksSummary || {},
            anchorQuality: analysisResults.anchorQuality || {},
            contextDistribution: analysisResults.contextAnalysis || {},
            inTextAnalysis: analysisResults.inTextAnalysis || {},
            performanceMetrics: analysisResults.performanceMetrics || {},
            recommendations: analysisResults.recommendations || []
        };

        // Convertir en chaîne JSON
        const jsonString = JSON.stringify(resultsObj, null, 2);

        // Utiliser l'API downloads de Chrome
        chrome.downloads.download({
            url: 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString),
            filename: 'maillage-interne-analyse.json',
            saveAs: true
        });
    }

    /**
     * Prépare un sous-ensemble des données pour le dashboard
     * @param {Object} fullResults - Résultats complets de l'analyse
     * @return {Object} Données préparées pour le dashboard
     */
    function prepareDashboardData(fullResults) {
        // Vous pouvez filtrer et transformer les données ici si nécessaire
        // Par exemple, limiter le nombre d'URLs pour des raisons de performance
        
        // Pour l'instant, nous retournons simplement les résultats complets
        return fullResults;
    }

    // API publique du module
    return {
        exportResults: exportResults,
        prepareDashboardData: prepareDashboardData
    };
})();