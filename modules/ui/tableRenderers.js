// modules/ui/tableRenderers.js
// Module pour le rendu des tableaux de données dans le dashboard

LinkJuice.TableRenderers = (function() {
    // Cache des instances DataTables
    const tableCache = {};

    /**
     * Tronque un texte pour l'affichage
     * @param {string} text - Texte à tronquer
     * @param {number} maxLength - Longueur maximale
     * @return {string} Texte tronqué
     */
    function truncateText(text, maxLength = 50) {
        if (!text) return 'N/A';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Tronque une URL pour l'affichage
     * @param {string} url - URL à tronquer
     * @return {string} URL tronquée
     */
    function truncateUrl(url) {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;

            if (path.length > 30) {
                path = path.substring(0, 15) + '...' + path.substring(path.length - 15);
            }

            return urlObj.hostname + path;
        } catch (e) {
            // En cas d'URL invalide
            if (url.length > 30) {
                return url.substring(0, 15) + '...' + url.substring(url.length - 15);
            }
            return url;
        }
    }

    /**
     * Initialise ou réinitialise un tableau DataTable
     * @param {string} tableId - ID de l'élément table
     * @param {Object} options - Options de configuration DataTable
     * @return {Object} Instance DataTable
     */
    function initDataTable(tableId, options = {}) {
        const defaultOptions = {
            language: {
                url: 'lib/fr-FR.json'
            },
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            responsive: true
        };

        // Fusionner les options par défaut et celles fournies
        const mergedOptions = {...defaultOptions, ...options};

        // Détruire l'instance existante si présente
        if (tableCache[tableId] && $.fn.DataTable.isDataTable(`#${tableId}`)) {
            tableCache[tableId].destroy();
            $(`#${tableId}`).empty();
        }

        // Initialiser la nouvelle instance
        const table = $(`#${tableId}`).DataTable(mergedOptions);
        tableCache[tableId] = table;

        return table;
    }
    

    /**
     * Remplit un tableau des pages orphelines
     * @param {string} tableId - ID de l'élément table
     * @param {Array} orphanedPages - Liste des pages orphelines
     */
    function populateOrphanedTable(tableId, orphanedPages) {
        const tbody = document.getElementById(`${tableId}-tbody`);
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (!orphanedPages || orphanedPages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Aucune page orpheline trouvée</td></tr>';
            return;
        }

        orphanedPages.forEach((url, index) => {
            const row = document.createElement('tr');

            const indexCell = document.createElement('td');
            indexCell.textContent = index + 1;

            const urlCell = document.createElement('td');
            const urlLink = document.createElement('a');
            urlLink.href = url;
            urlLink.target = '_blank';
            urlLink.textContent = url;
            urlCell.appendChild(urlLink);

            row.appendChild(indexCell);
            row.appendChild(urlCell);

            tbody.appendChild(row);
        });

        // Initialiser DataTable
        initDataTable(tableId);
    }
/**
 * Remplit un tableau des pages avec les meilleurs scores PageRank et JuiceLink
 * @param {string} tableId - ID de l'élément table
 * @param {Array} pages - Pages à afficher
 */
function populateTopScoredTable(tableId, pages) {
    console.log(`populateTopScoredTable: Initialisation pour ${tableId} avec ${pages ? pages.length : 0} pages`);
    
    // Vérifier que tbody existe
    const tbody = document.getElementById(`${tableId}-tbody`);
    if (!tbody) {
        console.error(`populateTopScoredTable: Élément tbody non trouvé pour ${tableId}-tbody`);
        return;
    }
    
    // Vider le contenu existant
    tbody.innerHTML = '';
    
    // Vérifier que nous avons des pages à traiter
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
        console.warn("populateTopScoredTable: Aucune page disponible");
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucune donnée de score disponible</td></tr>';
        return;
    }
    
    // Filtrer les pages qui ont au moins un des scores
    const pagesWithScores = pages.filter(page => 
        typeof page.pageRank !== 'undefined' || typeof page.juiceLinkScore !== 'undefined'
    );
    
    console.log(`populateTopScoredTable: ${pagesWithScores.length} pages ont des scores`);
    
    if (!pagesWithScores || pagesWithScores.length === 0) {
        console.warn("populateTopScoredTable: Aucune page avec scores disponible");
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucune donnée de score disponible</td></tr>';
        return;
    }
    
    try {
        // Calculer un score combiné pour le tri
        pagesWithScores.forEach(page => {
            let scoreSum = 0;
            let scoreCount = 0;
            
            if (typeof page.pageRank !== 'undefined') {
                // Le PageRank est généralement entre 0 et 1
                scoreSum += page.pageRank;
                scoreCount++;
            }
            
            if (typeof page.juiceLinkScore !== 'undefined') {
                // Le JuiceLink Score est généralement sur une échelle différente (par ex. 1-10)
                // Normaliser pour le calcul du score combiné
                scoreSum += (page.juiceLinkScore / 10); // Supposons une échelle 0-10 pour JuiceLink
                scoreCount++;
            }
            
            page.combinedScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
        });
        
        // Trier par score combiné et prendre les 20 premiers
        const topScored = pagesWithScores
            .sort((a, b) => b.combinedScore - a.combinedScore)
            .slice(0, 20);
        
        console.log(`populateTopScoredTable: Affichage de ${topScored.length} pages triées`);
        
        if (topScored.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucune page avec score disponible pour l\'affichage</td></tr>';
            return;
        }
        
        // Créer les lignes du tableau
        topScored.forEach((page, index) => {
            try {
                const row = document.createElement('tr');
                
                // Cellule du rang
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                row.appendChild(rankCell);
                
                // Cellule de l'URL
                const urlCell = document.createElement('td');
                const urlLink = document.createElement('a');
                urlLink.href = page.url;
                urlLink.target = '_blank';
                
                // S'assurer que truncateUrl existe, sinon utiliser l'URL complète
                try {
                    urlLink.textContent = typeof truncateUrl === 'function' ? 
                        truncateUrl(page.url) : page.url;
                } catch (error) {
                    console.warn("populateTopScoredTable: Fonction truncateUrl non disponible", error);
                    urlLink.textContent = page.url;
                }
                
                urlLink.title = page.url; // Tooltip avec l'URL complète
                urlCell.appendChild(urlLink);
                row.appendChild(urlCell);
                
                // Cellule du PageRank
                const pageRankCell = document.createElement('td');
                pageRankCell.textContent = typeof page.pageRank !== 'undefined' ? 
                    page.pageRank.toFixed(3) : 'N/A';
                row.appendChild(pageRankCell);
                
                // Cellule du JuiceLink Score
                const juiceLinkCell = document.createElement('td');
                juiceLinkCell.textContent = typeof page.juiceLinkScore !== 'undefined' ? 
                    page.juiceLinkScore.toFixed(2) : 'N/A';
                row.appendChild(juiceLinkCell);
                
                // Cellule des liens entrants
                const inboundCell = document.createElement('td');
                inboundCell.textContent = page.incomingLinks || 0;
                row.appendChild(inboundCell);
                
                // Cellule des liens sortants
                const outboundCell = document.createElement('td');
                outboundCell.textContent = page.outgoingLinks || 0;
                row.appendChild(outboundCell);
                
                // Ajouter la ligne au tableau
                tbody.appendChild(row);
            } catch (rowError) {
                console.error(`populateTopScoredTable: Erreur lors de la création de la ligne ${index}:`, rowError);
            }
        });
        
        // Initialiser DataTable si la fonction est disponible
        if (typeof initDataTable === 'function') {
            try {
                console.log(`populateTopScoredTable: Initialisation de DataTable pour ${tableId}`);
                initDataTable(tableId);
            } catch (dataTableError) {
                console.error("populateTopScoredTable: Erreur lors de l'initialisation de DataTable:", dataTableError);
            }
        } else {
            console.warn("populateTopScoredTable: Fonction initDataTable non disponible");
        }
        
        console.log(`populateTopScoredTable: Tableau ${tableId} rempli avec succès`);
    } catch (error) {
        console.error("populateTopScoredTable: Erreur globale:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #e53935;">
                    Une erreur s'est produite lors du chargement des données. 
                    Veuillez actualiser la page ou contacter le support.
                </td>
            </tr>
        `;
    }
}

    /**
     * Remplit un tableau de contextes de liens
     * @param {string} tableId - ID de l'élément table
     * @param {Object} linkContextData - Données de contexte des liens
     * @param {number} [limit=1000] - Limite du nombre de lignes
     */
    function populateContextsTable(tableId, linkContextData, limit = 1000) {
        const tbody = document.getElementById(`${tableId}-tbody`);
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (!linkContextData || Object.keys(linkContextData).length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucune donnée de contexte disponible</td></tr>';
            return;
        }

        let rows = [];

        // Traiter les données de contexte
        for (const url in linkContextData) {
            const contexts = linkContextData[url];

            contexts.forEach(context => {
                rows.push({
                    destination: url,
                    source: context.fromUrl,
                    context: context.context,
                    text: context.linkText || context.anchorText || 'N/A',
                    importance: context.importance || 0,
                    isInText: context.isInText || false
                });
            });
        }

        // Limiter le nombre de lignes pour les performances
        rows = rows.slice(0, limit);

        rows.forEach(row => {
            const tr = document.createElement('tr');

            if (row.isInText) {
                tr.className = 'intext-link';
            }

            const destCell = document.createElement('td');
            const destLink = document.createElement('a');
            destLink.href = row.destination;
            destLink.target = '_blank';
            destLink.textContent = truncateUrl(row.destination);
            destLink.title = row.destination;
            destCell.appendChild(destLink);

            const sourceCell = document.createElement('td');
            const sourceLink = document.createElement('a');
            sourceLink.href = row.source;
            sourceLink.target = '_blank';
            sourceLink.textContent = truncateUrl(row.source);
            sourceLink.title = row.source;
            sourceCell.appendChild(sourceLink);

            const contextCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `badge ${row.context}`;
            badge.textContent = row.context;
            contextCell.appendChild(badge);

            const textCell = document.createElement('td');
            textCell.textContent = truncateText(row.text);
            textCell.title = row.text;

            const importanceCell = document.createElement('td');
            const importanceValue = (row.importance * 100).toFixed(1);
            importanceCell.textContent = importanceValue + '%';

            // Ajouter une couleur selon l'importance
            if (row.importance >= 0.8) {
                importanceCell.className = 'text-success';
            } else if (row.importance >= 0.5) {
                importanceCell.className = 'text-warning';
            } else {
                importanceCell.className = 'text-danger';
            }

            const typeCell = document.createElement('td');
            if (row.isInText) {
                typeCell.innerHTML = '<span class="badge intext">inText</span>';
            } else {
                typeCell.innerHTML = '<span class="badge navigation">Navigation</span>';
            }

            tr.appendChild(destCell);
            tr.appendChild(sourceCell);
            tr.appendChild(contextCell);
            tr.appendChild(textCell);
            tr.appendChild(importanceCell);
            tr.appendChild(typeCell);

            tbody.appendChild(tr);
        });

        // Initialiser DataTable
        initDataTable(tableId);
    }

    /**
     * Remplit un tableau de toutes les pages
     * @param {string} tableId - ID de l'élément table
     * @param {Object} data - Données d'analyse complètes
     */
    function populateAllPagesTable(tableId, data) {
        const tbody = document.getElementById(`${tableId}-tbody`);
        if (!tbody) return;
        
        tbody.innerHTML = '';

        // Fusionner toutes les URLs (sitemap et crawl)
        const allUrls = new Set([...data.sitemapUrls, ...data.crawledUrls]);

        // Créer un ensemble des URLs du sitemap et du crawl pour des recherches plus rapides
        const sitemapSet = new Set(data.sitemapUrls);
        const crawledSet = new Set(data.crawledUrls);

        // Obtenir les données des liens entrants et sortants
        const inboundLinks = {};
        const outboundLinks = {};

        // Calculer les liens entrants et sortants à partir des données de contexte
        if (data.linkContextData) {
            for (const url in data.linkContextData) {
                inboundLinks[url] = data.linkContextData[url].length;
                
                data.linkContextData[url].forEach(context => {
                    outboundLinks[context.fromUrl] = (outboundLinks[context.fromUrl] || 0) + 1;
                });
            }
        }

        // Convertir en tableau pour le tri
        const urls = Array.from(allUrls).sort();

        urls.forEach((url, index) => {
            const row = document.createElement('tr');

            const indexCell = document.createElement('td');
            indexCell.textContent = index + 1;

            const urlCell = document.createElement('td');
            const urlLink = document.createElement('a');
            urlLink.href = url;
            urlLink.target = '_blank';
            urlLink.textContent = url;
            urlCell.appendChild(urlLink);

            const inSitemapCell = document.createElement('td');
            inSitemapCell.innerHTML = sitemapSet.has(url) ?
                '<span style="color: var(--secondary-color);">✓</span>' :
                '<span style="color: var(--danger-color);">✗</span>';

            const inCrawlCell = document.createElement('td');
            inCrawlCell.innerHTML = crawledSet.has(url) ?
                '<span style="color: var(--secondary-color);">✓</span>' :
                '<span style="color: var(--danger-color);">✗</span>';

            // Ajouter les informations de liens entrants et sortants
            const inboundCell = document.createElement('td');
            inboundCell.textContent = inboundLinks[url] || 0;

            const outboundCell = document.createElement('td');
            outboundCell.textContent = outboundLinks[url] || 0;

            row.appendChild(indexCell);
            row.appendChild(urlCell);
            row.appendChild(inSitemapCell);
            row.appendChild(inCrawlCell);
            row.appendChild(inboundCell);
            row.appendChild(outboundCell);

            tbody.appendChild(row);
        });

        // Initialiser DataTable
        initDataTable(tableId);
    }

    /**
     * Remplit les tableaux d'importance des pages
     * @param {string} topTableId - ID du tableau des pages importantes
     * @param {string} lowTableId - ID du tableau des pages peu importantes
     * @param {Object} importanceData - Données d'analyse d'importance
     */
    function populateImportanceTables(topTableId, lowTableId, importanceData) {
        if (!importanceData) return;

        // Tableau des pages importantes
        const topTbody = document.getElementById(`${topTableId}-tbody`);
        if (topTbody) {
            topTbody.innerHTML = '';

            if (importanceData.topImportantPages && importanceData.topImportantPages.length > 0) {
                importanceData.topImportantPages.forEach((page, index) => {
                    const row = document.createElement('tr');

                    const rankCell = document.createElement('td');
                    rankCell.textContent = index + 1;

                    const urlCell = document.createElement('td');
                    const urlLink = document.createElement('a');
                    urlLink.href = page.url;
                    urlLink.target = '_blank';
                    urlLink.textContent = truncateUrl(page.url);
                    urlLink.title = page.url;
                    urlCell.appendChild(urlLink);

                    const scoreCell = document.createElement('td');
                    scoreCell.textContent = (page.averageImportance * 100).toFixed(1) + '%';

                    const linksCell = document.createElement('td');
                    linksCell.textContent = page.linkCount;

                    row.appendChild(rankCell);
                    row.appendChild(urlCell);
                    row.appendChild(scoreCell);
                    row.appendChild(linksCell);

                    topTbody.appendChild(row);
                });
            } else {
                topTbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Aucune donnée disponible</td></tr>';
            }

            // Initialiser DataTable
            initDataTable(topTableId);
        }

        // Tableau des pages à faible importance
        const lowTbody = document.getElementById(`${lowTableId}-tbody`);
        if (lowTbody) {
            lowTbody.innerHTML = '';

            if (importanceData.lowImportancePages && importanceData.lowImportancePages.length > 0) {
                importanceData.lowImportancePages.forEach((page, index) => {
                    const row = document.createElement('tr');

                    const rankCell = document.createElement('td');
                    rankCell.textContent = index + 1;

                    const urlCell = document.createElement('td');
                    const urlLink = document.createElement('a');
                    urlLink.href = page.url;
                    urlLink.target = '_blank';
                    urlLink.textContent = truncateUrl(page.url);
                    urlLink.title = page.url;
                    urlCell.appendChild(urlLink);

                    const scoreCell = document.createElement('td');
                    scoreCell.textContent = (page.averageImportance * 100).toFixed(1) + '%';

                    const linksCell = document.createElement('td');
                    linksCell.textContent = page.linkCount;

                    row.appendChild(rankCell);
                    row.appendChild(urlCell);
                    row.appendChild(scoreCell);
                    row.appendChild(linksCell);

                    lowTbody.appendChild(row);
                });
            } else {
                lowTbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Aucune donnée disponible</td></tr>';
            }

            // Initialiser DataTable
            initDataTable(lowTableId);
        }
    }

    /**
 * Remplit un tableau des pages avec le plus de liens inText
 * @param {string} tableId - ID de l'élément table
 * @param {Array} topInTextPages - Pages avec le plus de liens inText
 */
function populateTopInTextTable(tableId, topInTextPages) {
    console.log(`populateTopInTextTable: Initialisation pour ${tableId} avec ${topInTextPages ? topInTextPages.length : 0} pages`);
    
    // Vérifier différentes possibilités pour l'ID du tbody
    let tbodyId = `${tableId}-tbody`;
    let tbody = document.getElementById(tbodyId);
    
    // Si non trouvé avec le premier format, essayer les alternatives
    if (!tbody) {
      tbodyId = `${tableId.replace('-table', '')}-tbody`;
      tbody = document.getElementById(tbodyId);
    }
    
    // Si toujours pas trouvé, chercher directement dans la table
    if (!tbody) {
      const table = document.getElementById(tableId);
      if (table) {
        tbody = table.querySelector('tbody');
      }
    }
    
    // Si aucun tbody n'est trouvé, abandonner
    if (!tbody) {
      console.error(`populateTopInTextTable: Élément tbody non trouvé pour le tableau ${tableId}`);
      return;
    }
    
    // Vider le contenu existant
    tbody.innerHTML = '';
    
    // Vérifier que nous avons des données
    if (!topInTextPages || !Array.isArray(topInTextPages) || topInTextPages.length === 0) {
      console.warn(`populateTopInTextTable: Aucune page inText disponible`);
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Aucune page avec liens inText trouvée</td></tr>';
      return;
    }
    
    console.log(`populateTopInTextTable: Affichage de ${topInTextPages.length} pages avec liens inText`);
    
    // Remplir le tableau
    topInTextPages.forEach((page, index) => {
      const row = document.createElement('tr');
      
      // Cellule de rang
      const rankCell = document.createElement('td');
      rankCell.textContent = index + 1;
      row.appendChild(rankCell);
      
      // Cellule d'URL
      const urlCell = document.createElement('td');
      const urlLink = document.createElement('a');
      urlLink.href = page.url;
      urlLink.target = '_blank';
      urlLink.textContent = page.url;
      urlCell.appendChild(urlLink);
      row.appendChild(urlCell);
      
      // Cellule de nombre de liens
      const countCell = document.createElement('td');
      countCell.textContent = page.count;
      row.appendChild(countCell);
      
      // Ajouter la ligne au tableau
      tbody.appendChild(row);
    });
    
    console.log(`populateTopInTextTable: Tableau ${tableId} rempli avec succès`);
  }

    /**
     * Nettoie tous les tableaux en cache
     */
    function clearTableCache() {
        for (const id in tableCache) {
            if ($.fn.DataTable.isDataTable(`#${id}`)) {
                tableCache[id].destroy();
            }
        }
        // Réinitialiser le cache
        Object.keys(tableCache).forEach(key => delete tableCache[key]);
    }

    // API publique du module
    return {
        truncateText: truncateText,
        truncateUrl: truncateUrl,
        initDataTable: initDataTable,
        populateOrphanedTable: populateOrphanedTable,
        populateContextsTable: populateContextsTable,
        populateAllPagesTable: populateAllPagesTable,
        populateImportanceTables: populateImportanceTables,
        populateTopInTextTable: populateTopInTextTable,
        populateTopScoredTable: populateTopScoredTable,
        clearTableCache: clearTableCache
    };
})();