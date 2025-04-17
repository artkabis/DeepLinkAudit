// modules/ui/chartRenderers.js
// Module pour créer des visualisations de données avec Chart.js

LinkJuice.ChartRenderers = (function() {
    // Cache pour stocker les références aux graphiques créés
    const chartCache = {};

    /**
     * Tronque une URL pour l'affichage
     * @param {string} url - URL à tronquer
     * @param {number} [maxLength=30] - Longueur maximale
     * @return {string} URL tronquée
     */
    function truncateUrl(url, maxLength = 30) {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;

            if (path.length > maxLength) {
                path = path.substring(0, Math.floor(maxLength / 2)) + '...' + 
                       path.substring(path.length - Math.floor(maxLength / 2));
            }

            return urlObj.hostname + path;
        } catch (e) {
            // En cas d'URL invalide
            if (url.length > maxLength) {
                return url.substring(0, Math.floor(maxLength / 2)) + '...' + 
                       url.substring(url.length - Math.floor(maxLength / 2));
            }
            return url;
        }
    }

    /**
     * Crée ou met à jour un graphique de distribution des contextes de liens
     * @param {string} canvasId - ID de l'élément canvas
     * @param {Object} linksSummary - Résumé des liens
     * @return {Object} Instance du graphique Chart.js
     */
    function createContextsChart(canvasId, linksSummary) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Nettoyer le graphique existant s'il existe
        if (chartCache[canvasId]) {
            chartCache[canvasId].destroy();
        }

        // Préparer les données
        const contexts = Object.keys(linksSummary.byContext);
        const counts = contexts.map(c => linksSummary.byContext[c]);

        // Couleurs pour les différents contextes
        const colors = {
            paragraph: '#e3f2fd',
            menu: '#e8f5e9',
            button: '#fff3e0',
            CTA: '#fff3e0',
            footer: '#e0e0e0',
            header: '#f3e5f5',
            sidebar: '#e8eaf6',
            image: '#e0f2f1',
            content: '#f1f3f4'
        };

        // Bordures pour les différents contextes
        const borderColors = {
            paragraph: '#0277bd',
            menu: '#2e7d32',
            button: '#ef6c00',
            CTA: '#ef6c00',
            footer: '#424242',
            header: '#7b1fa2',
            sidebar: '#3949ab',
            image: '#00796b',
            content: '#5f6368'
        };

        // Créer le graphique
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: contexts.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
                datasets: [{
                    data: counts,
                    backgroundColor: contexts.map(c => colors[c] || '#f1f3f4'),
                    borderColor: contexts.map(c => borderColors[c] || '#5f6368'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Stocker le graphique dans le cache
        chartCache[canvasId] = chart;

        return chart;
    }

    /**
     * Crée ou met à jour un graphique des pages les plus liées
     * @param {string} canvasId - ID de l'élément canvas
     * @param {Array} topPages - Pages les plus liées
     * @param {string} [color='#1a73e8'] - Couleur de base du graphique
     * @return {Object} Instance du graphique Chart.js
     */
    function createTopPagesChart(canvasId, topPages, color = '#1a73e8') {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Nettoyer le graphique existant s'il existe
        if (chartCache[canvasId]) {
            chartCache[canvasId].destroy();
        }

        // Limiter à 10 pages maximum
        const pages = topPages.slice(0, 10);

        // Extraire les URLs et les comptes
        const urls = pages.map(p => truncateUrl(p.url));
        const counts = pages.map(p => p.count);

        // Créer le graphique
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: urls,
                datasets: [{
                    label: 'Nombre de liens',
                    data: counts,
                    backgroundColor: color + 'B3', // Ajouter transparence
                    borderColor: color,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function (tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                return pages[index].url;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Nombre de liens'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });

        // Stocker le graphique dans le cache
        chartCache[canvasId] = chart;

        return chart;
    }
   /**
 * Crée ou met à jour un graphique de distribution du PageRank
 * @param {string} canvasId - ID de l'élément canvas
 * @param {Array} pages - Pages avec données PageRank
 * @return {Object} Instance du graphique Chart.js
 */
function createPageRankChart(canvasId, pages) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Nettoyer le graphique existant s'il existe
    if (chartCache[canvasId]) {
        chartCache[canvasId].destroy();
    }

    // Filtrer les pages avec PageRank défini
    const pagesWithRank = pages.filter(page => typeof page.pageRank !== 'undefined');
    
    if (pagesWithRank.length === 0) {
        const container = document.getElementById(canvasId).parentNode;
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; height: 200px; display: flex; align-items: center; justify-content: center;">
                    <p>Aucune donnée PageRank disponible</p>
                </div>
            `;
        }
        return null;
    }
    
    // Trier par PageRank décroissant et prendre les 10 premiers
    const topRanked = pagesWithRank
        .sort((a, b) => b.pageRank - a.pageRank)
        .slice(0, 10);
    
    // Extraire les URLs et les scores
    const urls = topRanked.map(page => truncateUrl(page.url));
    const scores = topRanked.map(page => page.pageRank);

    // Créer le graphique
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: urls,
            datasets: [{
                label: 'Score PageRank',
                data: scores,
                backgroundColor: 'rgba(66, 133, 244, 0.7)',
                borderColor: 'rgba(66, 133, 244, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            return topRanked[index].url;
                        },
                        label: function(context) {
                            return `PageRank: ${context.raw.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Score PageRank'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });

    // Stocker le graphique dans le cache
    chartCache[canvasId] = chart;

    return chart;
}

/**
 * Crée ou met à jour un graphique de distribution du JuiceLinkScore
 * @param {string} canvasId - ID de l'élément canvas
 * @param {Array} pages - Pages avec données JuiceLinkScore
 * @return {Object} Instance du graphique Chart.js
 */
function createJuiceLinkScoreChart(canvasId, pages) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Nettoyer le graphique existant s'il existe
    if (chartCache[canvasId]) {
        chartCache[canvasId].destroy();
    }

    // Filtrer les pages avec JuiceLinkScore défini
    const pagesWithJuice = pages.filter(page => typeof page.juiceLinkScore !== 'undefined');
    
    if (pagesWithJuice.length === 0) {
        const container = document.getElementById(canvasId).parentNode;
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; height: 200px; display: flex; align-items: center; justify-content: center;">
                    <p>Aucune donnée JuiceLink disponible</p>
                </div>
            `;
        }
        return null;
    }
    
    // Trier par JuiceLinkScore décroissant et prendre les 10 premiers
    const topJuiced = pagesWithJuice
        .sort((a, b) => b.juiceLinkScore - a.juiceLinkScore)
        .slice(0, 10);
    
    // Extraire les URLs et les scores
    const urls = topJuiced.map(page => truncateUrl(page.url));
    const scores = topJuiced.map(page => page.juiceLinkScore);

    // Créer le graphique
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: urls,
            datasets: [{
                label: 'JuiceLink Score',
                data: scores,
                backgroundColor: 'rgba(52, 168, 83, 0.7)',
                borderColor: 'rgba(52, 168, 83, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            return topJuiced[index].url;
                        },
                        label: function(context) {
                            return `JuiceLink: ${context.raw.toFixed(1)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'JuiceLink Score'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });

    // Stocker le graphique dans le cache
    chartCache[canvasId] = chart;

    return chart;
}

    /**
     * Crée ou met à jour un graphique de qualité des ancres
     * @param {string} canvasId - ID de l'élément canvas
     * @param {Object} anchorData - Données d'analyse des ancres
     * @return {Object} Instance du graphique Chart.js
     */
    function createAnchorQualityChart(canvasId, anchorData) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Nettoyer le graphique existant s'il existe
        if (chartCache[canvasId]) {
            chartCache[canvasId].destroy();
        }

        // Données pour le graphique en anneau
        const data = [
            anchorData.meaningfulAnchors,
            anchorData.genericAnchors
        ];

        const labels = [
            'Ancres descriptives',
            'Ancres génériques'
        ];

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(52, 168, 83, 0.7)',
                        'rgba(234, 67, 53, 0.7)'
                    ],
                    borderColor: [
                        'rgba(52, 168, 83, 1)',
                        'rgba(234, 67, 53, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = anchorData.totalAnchors;
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Stocker le graphique dans le cache
        chartCache[canvasId] = chart;

        return chart;
    }

    /**
     * Crée ou met à jour un graphique de distribution de longueurs d'ancres
     * @param {string} canvasId - ID de l'élément canvas
     * @param {Object} anchorData - Données d'analyse des ancres
     * @return {Object} Instance du graphique Chart.js
     */
    function createAnchorLengthChart(canvasId, anchorData) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Nettoyer le graphique existant s'il existe
        if (chartCache[canvasId]) {
            chartCache[canvasId].destroy();
        }

        const lengthDistribution = anchorData.lengthDistribution;
        const lengthData = [
            lengthDistribution.veryShort,
            lengthDistribution.short,
            lengthDistribution.medium,
            lengthDistribution.long
        ];

        const lengthLabels = [
            '1-3 caractères',
            '4-10 caractères',
            '11-20 caractères',
            '21+ caractères'
        ];

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: lengthLabels,
                datasets: [{
                    label: 'Distribution des longueurs de texte d\'ancre',
                    data: lengthData,
                    backgroundColor: 'rgba(66, 133, 244, 0.7)',
                    borderColor: 'rgba(66, 133, 244, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Nombre d\'ancres'
                        }
                    }
                }
            }
        });

        // Stocker le graphique dans le cache
        chartCache[canvasId] = chart;

        return chart;
    }

    /**
     * Crée ou met à jour un graphique de distribution d'importance
     * @param {string} canvasId - ID de l'élément canvas
     * @param {Object} linksSummary - Résumé des liens
     * @return {Object} Instance du graphique Chart.js
     */
    function createImportanceDistributionChart(canvasId, linksSummary) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Nettoyer le graphique existant s'il existe
        if (chartCache[canvasId]) {
            chartCache[canvasId].destroy();
        }

        // Données pour le graphique
        const data = [
            linksSummary.byImportance.high,
            linksSummary.byImportance.medium,
            linksSummary.byImportance.low
        ];

        const labels = [
            'Importance élevée (0.8-1.0)',
            'Importance moyenne (0.5-0.79)',
            'Importance basse (0-0.49)'
        ];

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(52, 168, 83, 0.7)',
                        'rgba(251, 188, 5, 0.7)',
                        'rgba(234, 67, 53, 0.7)'
                    ],
                    borderColor: [
                        'rgba(52, 168, 83, 1)',
                        'rgba(251, 188, 5, 1)',
                        'rgba(234, 67, 53, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = linksSummary.totalLinks;
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Stocker le graphique dans le cache
        chartCache[canvasId] = chart;

        return chart;
    }

    /**
     * Crée ou met à jour un graphique de distribution inText vs Navigation
     * @param {string} canvasId - ID de l'élément canvas
     * @param {Object} inTextData - Données d'analyse des liens inText
     * @return {Object} Instance du graphique Chart.js
     */
    function createInTextDistributionChart(canvasId, inTextData) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Nettoyer le graphique existant s'il existe
        if (chartCache[canvasId]) {
            chartCache[canvasId].destroy();
        }

        const data = [
            inTextData.inTextLinks,
            inTextData.navigationLinks,
            inTextData.total - (inTextData.inTextLinks + inTextData.navigationLinks)
        ];

        const labels = [
            'Liens inText (Contenu)',
            'Liens de navigation',
            'Autres liens'
        ];

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(52, 168, 83, 0.7)',  // Vert pour inText
                        'rgba(66, 133, 244, 0.7)', // Bleu pour navigation
                        'rgba(251, 188, 5, 0.7)'   // Jaune pour autres
                    ],
                    borderColor: [
                        'rgba(52, 168, 83, 1)',
                        'rgba(66, 133, 244, 1)',
                        'rgba(251, 188, 5, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = inTextData.total;
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Stocker le graphique dans le cache
        chartCache[canvasId] = chart;

        return chart;
    }

    /**
     * Crée ou met à jour un graphique des catégories de contexte
     * @param {string} canvasId - ID de l'élément canvas
     * @param {Object} contextAnalysis - Analyse de la distribution des contextes
     * @return {Object} Instance du graphique Chart.js
     */
    function createContextCategoryChart(canvasId, contextAnalysis) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Nettoyer le graphique existant s'il existe
        if (chartCache[canvasId]) {
            chartCache[canvasId].destroy();
        }

        // Préparer les données
        const categories = Object.keys(contextAnalysis.byCategory);
        const counts = categories.map(c => contextAnalysis.byCategory[c]);

        // Couleurs pour les différentes catégories
        const categoryColors = {
            navigation: '#4285F4',
            content: '#34A853',
            interactive: '#FBBC05',
            media: '#EA4335',
            metadata: '#673AB7',
            social: '#FF6D00'
        };

        // Créer le graphique
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
                datasets: [{
                    label: 'Répartition par catégorie',
                    data: counts,
                    backgroundColor: categories.map(c => categoryColors[c] ? `${categoryColors[c]}B3` : '#757575B3'),
                    borderColor: categories.map(c => categoryColors[c] || '#757575'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                const total = counts.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Nombre de liens'
                        }
                    }
                }
            }
        });

        // Stocker le graphique dans le cache
        chartCache[canvasId] = chart;

        return chart;
    }

    /**
     * Nettoie tous les graphiques stockés en cache
     */
    function clearChartCache() {
        for (const id in chartCache) {
            chartCache[id].destroy();
        }
        // Réinitialiser le cache
        Object.keys(chartCache).forEach(key => delete chartCache[key]);
    }

    // API publique du module
    return {
        truncateUrl: truncateUrl,
        createContextsChart: createContextsChart,
        createTopPagesChart: createTopPagesChart,
        createAnchorQualityChart: createAnchorQualityChart,
        createAnchorLengthChart: createAnchorLengthChart,
        createImportanceDistributionChart: createImportanceDistributionChart,
        createInTextDistributionChart: createInTextDistributionChart,
        createContextCategoryChart: createContextCategoryChart,
        createPageRankChart: createPageRankChart,
        createJuiceLinkScoreChart: createJuiceLinkScoreChart,
        clearChartCache: clearChartCache
    };
})();