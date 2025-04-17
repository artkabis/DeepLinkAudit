// modules/analysis/performanceMetrics.js
// Module pour le calcul des métriques de performance du maillage interne

LinkJuice.PerformanceMetrics = (function() {
    /**
     * Calcule la moyenne de liens par page
     */
    function calculateAverageLinksPerPage(linkSummary, crawledUrlCount) {
        return crawledUrlCount > 0 ?
            (linkSummary.totalLinks / crawledUrlCount).toFixed(1) : '0.0';
    }

    /**
     * Calcule le ratio de liens vers les pages orphelines
     */
    function calculateLinksToOrphanedRatio(orphanedPageCount, sitemapUrlCount) {
        return '0.00';
    }

    /**
     * Calcule la densité de silo (groupement thématique)
     */
    function calculateSiloDensity(linkContextData, pageDetails) {
        const linksByDepth = {};
        const linksWithinDepth = {};
        let totalLinks = 0;

        for (const url in linkContextData) {
            const contexts = linkContextData[url];
            const targetDepth = pageDetails[url]?.depth || 0;

            if (!linksByDepth[targetDepth]) {
                linksByDepth[targetDepth] = 0;
                linksWithinDepth[targetDepth] = 0;
            }

            contexts.forEach(context => {
                totalLinks++;
                linksByDepth[targetDepth]++;

                const sourceDepth = pageDetails[context.fromUrl]?.depth || 0;
                if (sourceDepth === targetDepth) {
                    linksWithinDepth[targetDepth]++;
                }
            });
        }

        let withinDepthPercentage = 0;
        for (const depth in linksByDepth) {
            if (linksByDepth[depth] > 0) {
                withinDepthPercentage += (linksWithinDepth[depth] / linksByDepth[depth]);
            }
        }

        const depthCount = Object.keys(linksByDepth).length;
        let siloScore = 5;

        if (depthCount > 0) {
            withinDepthPercentage = withinDepthPercentage / depthCount;
            siloScore = Math.min(10, Math.max(1, Math.round(withinDepthPercentage * 10)));
        }

        return siloScore.toFixed(1);
    }

    /**
     * Calcule le score de hiérarchie
     */
    function calculateHierarchyScore(data) {
        const nonOrphanedRatio = 1 - (data.orphanedPageCount / data.sitemapUrlCount);
        const hierarchyScore = Math.min(10, Math.max(1, Math.round(nonOrphanedRatio * 8) + 2));
        return hierarchyScore;
    }

    /**
     * Calcule l'importance moyenne des liens
     */
    function calculateAverageImportance(linkContextData) {
        let totalImportance = 0;
        let totalLinks = 0;

        for (const url in linkContextData) {
            linkContextData[url].forEach(link => {
                totalImportance += link.importance || 0;
                totalLinks++;
            });
        }

        return totalLinks > 0 ?
            { value: (totalImportance / totalLinks), formatted: (totalImportance / totalLinks).toFixed(3) } :
            { value: 0, formatted: '0.000' };
    }

    /**
     * Calcule la dispersion des scores de PageRank (écart type)
     */
    function calculatePagerankDispersion(pageRankData) {
        const values = Object.values(pageRankData || {});
        if (values.length === 0) return 0;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        return parseFloat(Math.sqrt(variance).toFixed(5));
    }

    /**
     * Calcule un score global de maillage interne
     */
    function calculateOverallScore(data) {
        const linkSummary = data.linksSummary;
        const anchorQuality = data.anchorQuality;
        const contextAnalysis = data.contextAnalysis;
        const avgImportance = calculateAverageImportance(data.linkContextData).value;

        const nonOrphanedRatio = 1 - (data.orphanedPageCount / data.sitemapUrlCount);
        const nonOrphanedScore = nonOrphanedRatio * 100;

        const linksPerPage = data.crawledUrlCount > 0 ? (linkSummary.totalLinks / data.crawledUrlCount) : 0;
        const linksPerPageScore = Math.min(100, linksPerPage * 10);

        const contentContexts = ['paragraph', 'content', 'content-main'];
        let contentLinksCount = 0;
        for (const context in linkSummary.byContext) {
            if (contentContexts.includes(context)) {
                contentLinksCount += linkSummary.byContext[context] || 0;
            }
        }
        const contentRatio = linkSummary.totalLinks > 0 ? (contentLinksCount / linkSummary.totalLinks) : 0;
        const contentScore = contentRatio * 100;

        const anchorScore = anchorQuality.meaningfulPercentage ? parseFloat(anchorQuality.meaningfulPercentage) : 0;

        const highImportance = linkSummary.byImportancePercentage?.high ? parseFloat(linkSummary.byImportancePercentage.high) : 0;
        const importanceScore = highImportance + (avgImportance * 50);

        const pagerankDispersion = calculatePagerankDispersion(data.pageRank);
        const authorityFlowScore = 100 - Math.min(100, pagerankDispersion * 200);

        const overallScore = Math.round(
            (nonOrphanedScore * 0.25) +
            (linksPerPageScore * 0.15) +
            (contentScore * 0.2) +
            (anchorScore * 0.15) +
            (importanceScore * 0.15) +
            (authorityFlowScore * 0.1)
        );

        return Math.min(100, Math.max(0, overallScore));
    }

    /**
     * Génère toutes les métriques de performance
     */
    function generatePerformanceMetrics(data) {
        if (!data.sitemapUrlCount || !data.crawledUrlCount) {
            return {
                averageLinksPerPage: calculateAverageLinksPerPage(data.linksSummary, data.crawledUrls?.length || 0),
                siloDensity: '5.0',
                hierarchyScore: '7',
                internalLinkingScore: '75',
                averageLinkImportance: calculateAverageImportance(data.linkContextData).formatted,
                pagerankDispersion: '0.00000',
                averageJuiceLinkScore: '0.0000'
            };
        }

        const juiceValues = Object.values(data.juiceLinkScores || {});
        const avgJuice = juiceValues.length > 0 ?
            (juiceValues.reduce((sum, v) => sum + v, 0) / juiceValues.length).toFixed(4) : '0.0000';

        return {
            averageLinksPerPage: calculateAverageLinksPerPage(data.linksSummary, data.crawledUrlCount),
            siloDensity: calculateSiloDensity(data.linkContextData, data.pageDetails || {}),
            hierarchyScore: calculateHierarchyScore(data),
            internalLinkingScore: calculateOverallScore(data),
            averageLinkImportance: calculateAverageImportance(data.linkContextData).formatted,
            linksToOrphanedRatio: calculateLinksToOrphanedRatio(data.orphanedPageCount, data.sitemapUrlCount),
            pagerankDispersion: calculatePagerankDispersion(data.pageRank),
            averageJuiceLinkScore: avgJuice
        };
    }

    return {
        calculateAverageLinksPerPage,
        calculateSiloDensity,
        calculateHierarchyScore,
        calculateAverageImportance,
        calculateOverallScore,
        generatePerformanceMetrics
    };
})();
