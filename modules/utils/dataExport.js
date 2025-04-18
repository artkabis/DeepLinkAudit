// modules/utils/dataExport.js
// Module pour l'exportation des données d'analyse

LinkJuice.DataExport = (function() {
    /**
     * Formatage des données pour réduire la taille sans perdre d'informations
     * @private
     * @param {Object} data - Données à formater
     * @return {Object} Données formatées
     */
    function _formatExportData(data) {
        // Créer une copie profonde des données
        const dataCopy = JSON.parse(JSON.stringify(data));
        
        // Limiter le nombre d'URLs pour les grandes listes
        if (dataCopy.sitemapUrls && dataCopy.sitemapUrls.length > 1000) {
            dataCopy.sitemapUrls = {
                truncated: true,
                total: dataCopy.sitemapUrls.length,
                sample: dataCopy.sitemapUrls.slice(0, 1000)
            };
        }
        
        if (dataCopy.crawledUrls && dataCopy.crawledUrls.length > 1000) {
            dataCopy.crawledUrls = {
                truncated: true,
                total: dataCopy.crawledUrls.length,
                sample: dataCopy.crawledUrls.slice(0, 1000)
            };
        }
        
        // Ajouter des métadonnées
        dataCopy.exportMeta = {
            version: LinkJuice.version || '2.1.0',
            date: new Date().toISOString(),
            format: 'LinkJuiceExport'
        };
        
        return dataCopy;
    }

    /**
     * Exporte les résultats d'analyse au format JSON
     * @param {Object} analysisResults - Résultats complets de l'analyse
     * @param {boolean} [compress=false] - Indication si les données doivent être compressées
     * @return {Promise<boolean>} Résultat de l'exportation
     */
    async function exportResults(analysisResults, compress = false) {
        if (!analysisResults) {
            console.error("Aucun résultat d'analyse à exporter");
            return false;
        }

        try {
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
                    orphanedPercentage: analysisResults.orphanedPercentage || "0.00%"
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
            
            // Formater les données
            const formattedData = _formatExportData(resultsObj);

            // Convertir en chaîne JSON
            const jsonString = JSON.stringify(formattedData, null, compress ? 0 : 2);
            
            // Nom de fichier avec date
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `linkjuice-analysis-${dateStr}.json`;

            // Utiliser l'API downloads de Chrome
            await chrome.downloads.download({
                url: 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString),
                filename: filename,
                saveAs: true
            });
            
            return true;
        } catch (error) {
            console.error("Erreur lors de l'exportation des résultats:", error);
            return false;
        }
    }

    /**
     * Exporte les résultats au format CSV
     * @param {Object} analysisResults - Résultats de l'analyse
     * @param {string} dataType - Type de données à exporter ("urls", "links", "contexts", "recommendations")
     * @return {Promise<boolean>} Résultat de l'exportation
     */
    async function exportCsv(analysisResults, dataType) {
        if (!analysisResults) return false;
        
        try {
            let csvContent = '';
            let filename = '';
            
            switch (dataType) {
                case 'urls':
                    csvContent = 'URL,Dans Sitemap,Crawlée,Liens entrants,Liens sortants\n';
                    filename = 'linkjuice-urls.csv';
                    
                    // Fusionner toutes les URLs connues
                    const allUrls = new Set([
                        ...(analysisResults.sitemapUrls || []),
                        ...(analysisResults.crawledUrls || [])
                    ]);
                    
                    allUrls.forEach(url => {
                        const inSitemap = (analysisResults.sitemapUrls || []).includes(url);
                        const crawled = (analysisResults.crawledUrls || []).includes(url);
                        const pageDetails = analysisResults.pageDetails?.[url] || {};
                        
                        csvContent += `"${url}",${inSitemap},${crawled},${pageDetails.inboundLinks || 0},${pageDetails.outboundLinks || 0}\n`;
                    });
                    break;
                    
                case 'links':
                    // Implémentation similaire pour les liens
                    break;
                    
                // Autres types de données...
                
                default:
                    return false;
            }
            
            // Utiliser l'API downloads de Chrome
            await chrome.downloads.download({
                url: 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent),
                filename: filename,
                saveAs: true
            });
            
            return true;
        } catch (error) {
            console.error("Erreur lors de l'exportation CSV:", error);
            return false;
        }
    }

    /**
     * Prépare un sous-ensemble des données pour le dashboard
     * @param {Object} fullResults - Résultats complets de l'analyse
     * @return {Object} Données préparées pour le dashboard
     */
    function prepareDashboardData(fullResults) {
        if (!fullResults) return null;
        
        // Créer une copie pour éviter de modifier l'original
        const dashboardData = JSON.parse(JSON.stringify(fullResults));
        
        // Décoder les textes d'ancrage HTML pour le dashboard
        if (dashboardData.linkContextData && typeof LinkJuice.TextUtils?.decodeLinkContextTextData === 'function') {
            dashboardData.linkContextData = LinkJuice.TextUtils.decodeLinkContextTextData(dashboardData.linkContextData);
        }
        
        return dashboardData;
    }

    // API publique du module
    return {
        exportResults,
        exportCsv,
        prepareDashboardData
    };
})();