// modules/ui/dashboardUI.js
// Module pour gérer l'interface du dashboard

LinkJuice.DashboardUI = (function() {
    // État interne du module
    let currentData = null;
    let originalData = null;
    let currentContextFilter = 'all';

    /**
     * Initialise le dashboard avec les données d'analyse
     * @param {Object} data - Données d'analyse à afficher
     */
    function initDashboard(data) {
        // Cacher le loader et afficher le dashboard
        document.getElementById('loader-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'block';

        // Stocker les données originales pour filtrage
        originalData = JSON.parse(JSON.stringify(data));
        currentData = data;

        // Rendre le dashboard
        renderDashboard(data);

        // Initialiser les événements
        initEvents();
    }

    /**
     * Initialise les gestionnaires d'événements
     */
    function initEvents() {
        // Gestion des tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Désactiver tous les tabs du groupe
                const tabGroup = this.parentElement.querySelectorAll('.tab');
                tabGroup.forEach(t => t.classList.remove('active'));

                // Désactiver tous les contenus de tab du groupe
                const tabContents = document.querySelectorAll('.tab-content');
                tabContents.forEach(c => c.classList.remove('active'));

                // Activer le tab cliqué
                this.classList.add('active');

                // Activer le contenu associé
                const targetId = this.dataset.target;
                document.getElementById(targetId).classList.add('active');
            });
        });

        // Gestion du filtre de contexte
        const applyFilterBtn = document.getElementById('apply-filter');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', function() {
                const contextSelector = document.getElementById('context-selector');
                if (contextSelector) {
                    currentContextFilter = contextSelector.value;
                    applyContextFilter();
                }
            });
        }

        // Gestion du bouton d'export
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                chrome.runtime.sendMessage({ action: 'exportResults' });
            });
        }

        // Gestion du clic sur les recommandations (pour affichage détaillé)
        document.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', function() {
                this.classList.toggle('expanded');
            });
        });
    }

    /**
     * Applique un filtre de contexte aux données
     */
    function applyContextFilter() {
        if (!originalData) {
            console.error("Données originales non disponibles pour le filtrage");
            return;
        }

        // Si aucun filtre, utiliser les données originales
        if (currentContextFilter === 'all') {
            currentData = JSON.parse(JSON.stringify(originalData));
            renderDashboard(currentData, false);
            updateFilterNotification(false);
            return;
        }

        // Créer une copie filtrée des données
        const filteredData = filterDataByContext(originalData, currentContextFilter);
        currentData = filteredData;

        // Réactualiser le dashboard avec les données filtrées
        renderDashboard(filteredData, true);
        updateFilterNotification(true);
    }

    /**
     * Filtre les données selon le contexte sélectionné
     * @param {Object} data - Données originales
     * @param {string} contextFilter - Filtre de contexte à appliquer
     * @return {Object} Données filtrées
     */
    function filterDataByContext(data, contextFilter) {
        // Créer une copie profonde des données originales
        const filteredData = JSON.parse(JSON.stringify(data));

        // Filtrer les données de contexte de lien
        if (filteredData.linkContextData) {
            const newLinkContextData = {};

            for (const url in filteredData.linkContextData) {
                // Filtrer les contextes selon le filtre sélectionné
                let filteredContexts;

                if (contextFilter === 'intext') {
                    // Filtre spécial pour tous les liens inText
                    filteredContexts = filteredData.linkContextData[url].filter(context =>
                        context.isInText === true ||
                        ['paragraph', 'content', 'content-main'].includes(context.context)
                    );
                } else {
                    // Filtre standard par type de contexte
                    filteredContexts = filteredData.linkContextData[url].filter(context =>
                        context.context === contextFilter
                    );
                }

                // Ajouter l'URL à la nouvelle structure si elle contient des contextes correspondants
                if (filteredContexts.length > 0) {
                    newLinkContextData[url] = filteredContexts;
                }
            }

            filteredData.linkContextData = newLinkContextData;
        }

        // Recalculer les analyses basées sur les données filtrées
        try {
            // Recalculer le résumé des liens
            filteredData.linksSummary = LinkJuice.Analyzer.generateLinksSummary();

            // Recalculer l'analyse des ancres
            filteredData.anchorQuality = LinkJuice.AnchorQuality.analyzeAnchorQuality(filteredData.linkContextData);

            // Recalculer l'analyse des contextes
            filteredData.contextAnalysis = LinkJuice.ContextDistribution.analyzeContextDistribution(
                filteredData.linkContextData, filteredData.detectedCMS
            );

            // Recalculer l'analyse des liens inText
            filteredData.inTextAnalysis = LinkJuice.InTextAnalysis.analyzeInTextLinks(filteredData.linkContextData);
        } catch (error) {
            console.error("Erreur lors du recalcul des analyses:", error);
        }

        return filteredData;
    }

    /**
     * Met à jour la notification de filtre actif
     * @param {boolean} isFiltered - Indique si un filtre est actif
     */
    function updateFilterNotification(isFiltered) {
        // Créer ou obtenir l'élément de notification
        let filterNotification = document.getElementById('filter-notification');

        if (!filterNotification) {
            filterNotification = document.createElement('div');
            filterNotification.id = 'filter-notification';
            filterNotification.className = 'filter-notification';

            // Ajouter la notification après les statistiques principales
            const dashboardGrid = document.querySelector('.dashboard-grid');
            if (dashboardGrid && dashboardGrid.parentNode) {
                dashboardGrid.parentNode.insertBefore(filterNotification, dashboardGrid.nextSibling);
            }
        }

        // Mettre à jour le contenu de la notification
        if (isFiltered && currentContextFilter !== 'all') {
            let contextName;

            switch (currentContextFilter) {
                case 'paragraph': contextName = 'Paragraphes'; break;
                case 'menu': contextName = 'Menus'; break;
                case 'content-main': contextName = 'Contenu principal'; break;
                case 'button': contextName = 'Boutons'; break;
                case 'intext': contextName = 'Liens inText'; break;
                default: contextName = currentContextFilter;
            }

            filterNotification.innerHTML = `
                <div class="alert-content">
                    <strong>Filtre actif :</strong> Affichage limité aux liens de type "${contextName}"
                    <button id="clear-filter" class="clear-filter-btn">Effacer le filtre</button>
                </div>
            `;
            filterNotification.style.display = 'block';

            // Ajouter l'événement pour effacer le filtre
            document.getElementById('clear-filter').addEventListener('click', function() {
                currentContextFilter = 'all';
                document.getElementById('context-selector').value = 'all';
                applyContextFilter();
            });
        } else {
            filterNotification.style.display = 'none';
        }
    }

    /**
     * Remplit les informations du site
     * @param {Object} data - Données d'analyse
     */
    function fillSiteInfo(data) {
        console.log("Données reçues pour affichage:", data);
        console.log("Métadonnées disponibles:", data.metadata);
        // Informations du site
        document.getElementById('sitemap-url').textContent = 
            data.metadata?.sitemapUrl || data.params?.sitemapUrl || 'N/A';
        document.getElementById('start-url').textContent = 
            data.metadata?.startUrl || data.params?.startUrl || 'N/A';
        document.getElementById('analysis-date').textContent = 
            data.metadata?.date ? new Date(data.metadata.date).toLocaleString() : 'N/A';

        const domainFilter = data.params?.domainFilter;
        document.getElementById('domain-filter').textContent = 
            domainFilter && domainFilter.length > 0 ? 
            (Array.isArray(domainFilter) ? domainFilter.join(', ') : domainFilter) : 
            'Tous';
    }

    /**
     * Remplit les statistiques générales
     * @param {Object} data - Données d'analyse
     */
    function fillStatistics(data) {
        // Statistiques
        document.getElementById('sitemap-count').textContent = 
            (data.sitemapUrlCount || 0).toLocaleString();
        document.getElementById('crawled-count').textContent = 
            (data.crawledUrlCount || 0).toLocaleString();
        document.getElementById('orphaned-count').textContent = 
            (data.orphanedPageCount || 0).toLocaleString();
        document.getElementById('orphaned-percentage').textContent = 
            data.statistics?.orphanedPercentage || '0.00%';

        // Afficher l'alerte si des pages orphelines existent
        if (data.orphanedPageCount > 0) {
            document.getElementById('orphaned-alert').style.display = 'flex';
        } else {
            document.getElementById('orphaned-alert').style.display = 'none';
        }
    }

    /**
     * Affiche les métriques de performance
     * @param {Object} metrics - Métriques de performance
     */
    function displayPerformanceMetrics(metrics) {
        if (!metrics) return;

        // Remplir les métriques dans le DOM
        document.getElementById('avg-links-per-page').textContent = metrics.averageLinksPerPage || 'N/A';
        document.getElementById('silo-density').textContent = metrics.siloDensity || 'N/A';
        document.getElementById('hierarchy-score').textContent = metrics.hierarchyScore || 'N/A';
        document.getElementById('internal-linking-score').textContent = metrics.internalLinkingScore || 'N/A';
        document.getElementById('avg-link-importance').textContent = metrics.averageLinkImportance || 'N/A';

        // Créer des jauges pour visualiser les scores
        createScoreGauge('silo-gauge', metrics.siloDensity, 10);
        createScoreGauge('hierarchy-gauge', metrics.hierarchyScore, 10);
        createScoreGauge('linking-gauge', metrics.internalLinkingScore, 100);
    }

    /**
     * Crée une jauge simple pour visualiser un score
     * @param {string} elementId - ID de l'élément
     * @param {number|string} value - Valeur à afficher
     * @param {number} max - Valeur maximale
     */
    function createScoreGauge(elementId, value, max) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Assurer que la valeur est un nombre
        const numValue = parseFloat(value) || 0;

        // Calculer le pourcentage
        const percentage = (numValue / max) * 100;

        // Déterminer la couleur en fonction du pourcentage
        let color;
        if (percentage >= 70) {
            color = '#4CAF50'; // Vert
        } else if (percentage >= 40) {
            color = '#FFC107'; // Jaune
        } else {
            color = '#F44336'; // Rouge
        }

        // Créer la jauge
        element.innerHTML = `
            <div class="gauge-container">
                <div class="gauge-background"></div>
                <div class="gauge-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                <div class="gauge-value">${numValue}</div>
            </div>
        `;
    }

    /**
     * Affiche les recommandations
     * @param {Array} recommendations - Liste des recommandations
     */
    function displayRecommendations(recommendations) {
        const container = document.getElementById('recommendations-container');
        if (!container) return;
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Aucune recommandation disponible pour le moment.</div>';
            return;
        }

        container.innerHTML = ''; // Nettoyer le conteneur

        // Trier les recommandations par priorité
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        recommendations.forEach(rec => {
            // Créer une carte pour chaque recommandation
            const card = document.createElement('div');
            card.className = 'recommendation-card';

            // Définir une classe selon la priorité
            const priorityClass = rec.priority === 'high' ? 'high-priority' :
                rec.priority === 'medium' ? 'medium-priority' : 'low-priority';
            card.classList.add(priorityClass);

            // Créer l'en-tête
            const header = document.createElement('div');
            header.className = 'recommendation-header';

            const title = document.createElement('h3');
            title.textContent = rec.title;

            const priority = document.createElement('span');
            priority.className = 'priority-badge';
            priority.textContent = rec.priority === 'high' ? 'Priorité élevée' :
                rec.priority === 'medium' ? 'Priorité moyenne' : 'Priorité basse';

            header.appendChild(title);
            header.appendChild(priority);

            // Créer le contenu
            const content = document.createElement('div');
            content.className = 'recommendation-content';

            const description = document.createElement('p');
            description.textContent = rec.description;
            content.appendChild(description);

            // Ajouter les actions
            if (rec.actions && rec.actions.length > 0) {
                const actionsList = document.createElement('ul');
                rec.actions.forEach(action => {
                    const item = document.createElement('li');
                    item.textContent = action;
                    actionsList.appendChild(item);
                });
                content.appendChild(actionsList);
            }

            // Assembler la carte
            card.appendChild(header);
            card.appendChild(content);

            // Ajouter au conteneur
            container.appendChild(card);
        });
    }

    /**
     * Affiche les informations sur la qualité des ancres
     * @param {Object} anchorData - Données d'analyse des ancres
     */
    function displayAnchorQualityInfo(anchorData) {
        if (!anchorData) return;

        // Remplir les statistiques de base
        document.getElementById('total-anchors').textContent = anchorData.totalAnchors.toLocaleString();
        document.getElementById('meaningful-anchors').textContent = anchorData.meaningfulAnchors.toLocaleString() +
            ` (${anchorData.meaningfulPercentage}%)`;
        document.getElementById('generic-anchors').textContent = anchorData.genericAnchors.toLocaleString() +
            ` (${anchorData.genericPercentage}%)`;
        document.getElementById('anchor-avg-length').textContent = anchorData.averageLength;

        // Remplir les termes génériques communs
        const genericTermsList = document.getElementById('generic-terms-list');
        if (genericTermsList) {
            genericTermsList.innerHTML = '';

            if (anchorData.commonGenericTerms && anchorData.commonGenericTerms.length > 0) {
                anchorData.commonGenericTerms.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = `"${item.term}" (${item.count} occurrences)`;
                    genericTermsList.appendChild(li);
                });
            } else {
                genericTermsList.innerHTML = '<li>Aucun terme générique fréquent trouvé</li>';
            }
        }

        // Remplir les mots-clés communs
        const keywordsList = document.getElementById('keywords-list');
        if (keywordsList) {
            keywordsList.innerHTML = '';

            if (anchorData.commonKeywords && anchorData.commonKeywords.length > 0) {
                anchorData.commonKeywords.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = `"${item.term}" (${item.count} occurrences)`;
                    keywordsList.appendChild(li);
                });
            } else {
                keywordsList.innerHTML = '<li>Aucun mot-clé fréquent trouvé</li>';
            }
        }
    }

    /**
     * Affiche les informations sur les liens inText
     * @param {Object} inTextData - Données d'analyse des liens inText
     */
    function displayInTextAnalysis(inTextData) {
        if (!inTextData) return;

        // Mettre à jour les compteurs
        document.getElementById('intext-links-count').textContent = inTextData.inTextLinks.toLocaleString();
        document.getElementById('intext-percentage').textContent = inTextData.inTextPercentage + '%';
        document.getElementById('navigation-links-count').textContent = inTextData.navigationLinks.toLocaleString();
        document.getElementById('avg-intext-per-page').textContent = inTextData.averageInTextPerPage;

        // Remplir le tableau des meilleures pages inText
        LinkJuice.TableRenderers.populateTopInTextTable('top-intext-table', inTextData.topInTextPages);
    }

    /**
     * Render les graphiques du dashboard
     * @param {Object} data - Données d'analyse
     */
    function renderCharts(data) {
        if (!data) return;

        try {
            // Graphique de distribution des contextes
            if (data.linksSummary) {
                LinkJuice.ChartRenderers.createContextsChart('contexts-chart', data.linksSummary);
            }

            // Graphiques des pages les plus liées
            if (data.linksSummary.topDestinationPages) {
                LinkJuice.ChartRenderers.createTopPagesChart('most-linked-chart', 
                    data.linksSummary.topDestinationPages, '#1a73e8');
            }

            // Graphiques des pages avec le plus de liens sortants
            if (data.linksSummary.topSourcePages) {
                LinkJuice.ChartRenderers.createTopPagesChart('most-linking-chart', 
                    data.linksSummary.topSourcePages, '#34a853');
            }

            // Graphique de qualité des ancres
            if (data.anchorQuality) {
                LinkJuice.ChartRenderers.createAnchorQualityChart('anchor-quality-chart', data.anchorQuality);
                LinkJuice.ChartRenderers.createAnchorLengthChart('anchor-length-chart', data.anchorQuality);
            }

            // Graphique de distribution d'importance
            if (data.linksSummary) {
                LinkJuice.ChartRenderers.createImportanceDistributionChart('importance-distribution-chart', data.linksSummary);
            }

            // Graphique de distribution inText vs Navigation
            if (data.inTextAnalysis) {
                LinkJuice.ChartRenderers.createInTextDistributionChart('intext-distribution-chart', data.inTextAnalysis);
            }

            // Graphique des catégories de contexte
            if (data.contextAnalysis) {
                LinkJuice.ChartRenderers.createContextCategoryChart('context-category-chart', data.contextAnalysis);
            }
        } catch (error) {
            console.error("Erreur lors du rendu des graphiques:", error);
        }
    }

    /**
     * Remplit les tableaux du dashboard
     * @param {Object} data - Données d'analyse
     */
    function renderTables(data) {
        if (!data) return;

        try {
            // Tableau des pages orphelines
            if (data.orphanedPages) {
                LinkJuice.TableRenderers.populateOrphanedTable('orphaned-table', data.orphanedPages);
            }

            // Tableau des contextes de liens
            if (data.linkContextData) {
                LinkJuice.TableRenderers.populateContextsTable('contexts-table', data.linkContextData);
            }

            // Tableau de toutes les pages
            LinkJuice.TableRenderers.populateAllPagesTable('all-pages-table', data);

            // Tableaux d'importance des liens
            if (data.importanceAnalysis) {
                LinkJuice.TableRenderers.populateImportanceTables(
                    'top-important-table',
                    'low-importance-table',
                    data.importanceAnalysis
                );
            }
        } catch (error) {
            console.error("Erreur lors du rendu des tableaux:", error);
        }
    }

    /**
     * Rend le dashboard complet avec les données d'analyse
     * @param {Object} data - Données d'analyse
     * @param {boolean} [isFiltered=false] - Indique si les données sont filtrées
     */
    function renderDashboard(data, isFiltered = false) {
        try {
            // Nettoyer les visualisations existantes
            LinkJuice.ChartRenderers.clearChartCache();
            LinkJuice.TableRenderers.clearTableCache();

            // Remplir les informations de base
            fillSiteInfo(data);
            fillStatistics(data);

            // Afficher les métriques de performance
            displayPerformanceMetrics(data.performanceMetrics);

            // Afficher les recommandations
            displayRecommendations(data.recommendations);

            // Afficher les informations sur la qualité des ancres
            displayAnchorQualityInfo(data.anchorQuality);

            // Afficher les informations sur les liens inText
            displayInTextAnalysis(data.inTextAnalysis);

            // Rendre les graphiques
            renderCharts(data);

            // Rendre les tableaux
            renderTables(data);

            // Mettre à jour la notification de filtre
            updateFilterNotification(isFiltered);
        } catch (error) {
            console.error("Erreur lors du rendu du dashboard:", error);
            showError('Erreur lors du rendu du dashboard: ' + error.message);
        }
    }

    /**
     * Affiche un message d'erreur sur le dashboard
     * @param {string} message - Message d'erreur
     */
    function showError(message) {
        document.getElementById('loader-container').style.display = 'none';
        document.getElementById('dashboard-container').innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h3 style="color: var(--danger-color);">Erreur</h3>
                <p>${message}</p>
                <p>Veuillez d'abord lancer une analyse depuis la fenêtre principale de l'extension.</p>
            </div>
        `;
        document.getElementById('dashboard-container').style.display = 'block';
    }

    // API publique du module
    return {
        initDashboard: initDashboard,
        renderDashboard: renderDashboard,
        applyContextFilter: applyContextFilter,
        showError: showError,
        getCurrentData: function() { return currentData; }
    };
})();