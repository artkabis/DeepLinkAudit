// modules/ui/dashboardUI.js
// Module pour gérer l'interface du dashboard

LinkJuice.DashboardUI = (function () {
  // État interne du module
  let currentData = null;
  let originalData = null;
  let currentContextFilter = "all";

  /**
   * Initialise le dashboard avec les données d'analyse
   * @param {Object} data - Données d'analyse à afficher
   */
  function initDashboard(data) {
    // Cacher le loader et afficher le dashboard
    document.getElementById("loader-container").style.display = "none";
    document.getElementById("dashboard-container").style.display = "block";

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
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        // Désactiver tous les tabs du groupe
        const tabGroup = this.parentElement.querySelectorAll(".tab");
        tabGroup.forEach((t) => t.classList.remove("active"));

        // Désactiver tous les contenus de tab du groupe
        const tabContents = document.querySelectorAll(".tab-content");
        tabContents.forEach((c) => c.classList?.remove("active"));

        // Activer le tab cliqué
        this.classList.add("active");

        // Activer le contenu associé
        const targetId = this.dataset.target;
        document.getElementById(targetId)?.classList?.add("active");
      });
    });

    // Gestion du filtre de contexte
    const applyFilterBtn = document.getElementById("apply-filter");
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener("click", function () {
        const contextSelector = document.getElementById("context-selector");
        if (contextSelector) {
          currentContextFilter = contextSelector.value;
          applyContextFilter();
        }
      });
    }

    // Gestion du bouton d'export
    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        chrome.runtime.sendMessage({ action: "exportResults" });
      });
    }

    // Gestion du clic sur les recommandations (pour affichage détaillé)
    document.querySelectorAll(".recommendation-card").forEach((card) => {
      card.addEventListener("click", function () {
        this.classList?.toggle("expanded");
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
    if (currentContextFilter === "all") {
      currentData = JSON.parse(JSON.stringify(originalData));
      renderDashboard(currentData, false);
      updateFilterNotification(false);
      return;
    }

    // Créer une copie filtrée des données
    const filteredData = filterDataByContext(
      originalData,
      currentContextFilter
    );
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

        if (contextFilter === "intext") {
          // Filtre spécial pour tous les liens inText
          filteredContexts = filteredData.linkContextData[url].filter(
            (context) =>
              context.isInText === true ||
              ["paragraph", "content", "content-main"].includes(context.context)
          );
        } else {
          // Filtre standard par type de contexte
          filteredContexts = filteredData.linkContextData[url].filter(
            (context) => context.context === contextFilter
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
      filteredData.anchorQuality = LinkJuice.AnchorQuality.analyzeAnchorQuality(
        filteredData.linkContextData
      );

      // Recalculer l'analyse des contextes
      filteredData.contextAnalysis =
        LinkJuice.ContextDistribution.analyzeContextDistribution(
          filteredData.linkContextData,
          filteredData.detectedCMS
        );

      // Recalculer l'analyse des liens inText
      filteredData.inTextAnalysis = LinkJuice.InTextAnalysis.analyzeInTextLinks(
        filteredData.linkContextData
      );
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
    let filterNotification = document.getElementById("filter-notification");

    if (!filterNotification) {
      filterNotification = document.createElement("div");
      filterNotification.id = "filter-notification";
      filterNotification.className = "filter-notification";

      // Ajouter la notification après les statistiques principales
      const dashboardGrid = document.querySelector(".dashboard-grid");
      if (dashboardGrid && dashboardGrid.parentNode) {
        dashboardGrid.parentNode.insertBefore(
          filterNotification,
          dashboardGrid.nextSibling
        );
      }
    }

    // Mettre à jour le contenu de la notification
    if (isFiltered && currentContextFilter !== "all") {
      let contextName;

      switch (currentContextFilter) {
        case "paragraph":
          contextName = "Paragraphes";
          break;
        case "menu":
          contextName = "Menus";
          break;
        case "content-main":
          contextName = "Contenu principal";
          break;
        case "button":
          contextName = "Boutons";
          break;
        case "intext":
          contextName = "Liens inText";
          break;
        default:
          contextName = currentContextFilter;
      }

      filterNotification.innerHTML = `
                <div class="alert-content">
                    <strong>Filtre actif :</strong> Affichage limité aux liens de type "${contextName}"
                    <button id="clear-filter" class="clear-filter-btn">Effacer le filtre</button>
                </div>
            `;
      filterNotification.style.display = "block";

      // Ajouter l'événement pour effacer le filtre
      document
        .getElementById("clear-filter")
        .addEventListener("click", function () {
          currentContextFilter = "all";
          document.getElementById("context-selector").value = "all";
          applyContextFilter();
        });
    } else {
      filterNotification.style.display = "none";
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
    document.getElementById("sitemap-url").textContent =
      data.metadata?.sitemapUrl || data.params?.sitemapUrl || "N/A";
    document.getElementById("start-url").textContent =
      data.metadata?.startUrl || data.params?.startUrl || "N/A";
    document.getElementById("analysis-date").textContent = data.metadata?.date
      ? new Date(data.metadata.date).toLocaleString()
      : "N/A";

    const domainFilter = data.params?.domainFilter;
    document.getElementById("domain-filter").textContent =
      domainFilter && domainFilter.length > 0
        ? Array.isArray(domainFilter)
          ? domainFilter.join(", ")
          : domainFilter
        : "Tous";
  }

  /**
   * Remplit les statistiques générales
   * @param {Object} data - Données d'analyse
   */
  function fillStatistics(data) {
    // Statistiques
    document.getElementById("sitemap-count").textContent = (
      data.sitemapUrlCount || 0
    ).toLocaleString();
    document.getElementById("crawled-count").textContent = (
      data.crawledUrlCount || 0
    ).toLocaleString();
    document.getElementById("orphaned-count").textContent = (
      data.orphanedPageCount || 0
    ).toLocaleString();
    document.getElementById("orphaned-percentage").textContent =
      data.statistics?.orphanedPercentage || "0.00%";

    // Afficher l'alerte si des pages orphelines existent
    if (data.orphanedPageCount > 0) {
      document.getElementById("orphaned-alert").style.display = "flex";
    } else {
      document.getElementById("orphaned-alert").style.display = "none";
    }
  }
  function displayHttpStatusInfo(data) {

    const linkStatusData = data.linkStatusData || {};
    console.log("Dashboard: linkStatusData disponible?", !!data.linkStatusData);
    if (!data || !data.pageDetails) {
      console.warn("Aucune donnée de statut HTTP disponible");
      return;
    }
    // Vérifier si au moins une page a la propriété httpStatus
  let hasHttpStatusData = false;
  for (const url in data.pageDetails) {
    if (data.pageDetails[url].httpStatus !== undefined) {
      hasHttpStatusData = true;
      break;
    }
  }
  if (Object.keys(linkStatusData).length > 0) {
    console.log("Dashboard: Utilisation directe de linkStatusData");
    
    // Pour tester, mettez à jour manuellement quelques pages avec des statuts HTTP
    for (const url in data.pageDetails) {
        if (linkStatusData[url]) {
            data.pageDetails[url].httpStatus = linkStatusData[url].status;
            data.pageDetails[url].redirected = linkStatusData[url].redirected;
            data.pageDetails[url].redirectUrl = linkStatusData[url].redirectUrl;
        }
    }
}
  
  if (!hasHttpStatusData) {
    console.warn("Les données de statut HTTP ne sont pas présentes dans pageDetails");
    
    // Mettre à jour les compteurs pour montrer "Non vérifiés"
    const totalPages = Object.keys(data.pageDetails).length;
    document.getElementById('status-200-count').textContent = "0";
    document.getElementById('status-3xx-count').textContent = "0";
    document.getElementById('status-error-count').textContent = "0";
    document.getElementById('status-unknown-count').textContent = totalPages.toLocaleString();
    
    document.getElementById('status-200-percent').textContent = "0%";
    document.getElementById('status-3xx-percent').textContent = "0%";
    document.getElementById('status-error-percent').textContent = "0%";
    document.getElementById('status-unknown-percent').textContent = "100%";
    
    // Afficher un message pour l'utilisateur dans le conteneur du graphique
    const chartContainer = document.getElementById('http-status-chart').parentNode;
    if (chartContainer) {
      chartContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p style="margin-bottom: 10px; font-size: 16px;"><strong>Données de statut HTTP non disponibles</strong></p>
          <p>Veuillez lancer une nouvelle analyse avec la version mise à jour du crawler pour collecter les statuts HTTP.</p>
        </div>`;
    }
    
    // Vider ou mettre à jour les tableaux
    ['http-status-tbody', 'broken-links-tbody', 'redirects-tbody'].forEach(id => {
      const tbody = document.getElementById(id);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Aucune donnée disponible. Veuillez lancer une nouvelle analyse.</td></tr>';
      }
    });
    
    return;
  }
    
    // Compiler les statistiques de statut HTTP
    const statsByCode = {};
    const statusGroups = {
      '2xx': 0,  // 200-299: Succès
      '3xx': 0,  // 300-399: Redirection
      '4xx': 0,  // 400-499: Erreur client
      '5xx': 0,  // 500-599: Erreur serveur
      '0': 0,    // 0: Erreur de connexion ou non vérifié
      'unknown': 0  // Status inconnu
    };
    
    let totalChecked = 0;
    const brokenLinks = [];
    const redirects = [];
    
    // Analyser chaque page pour son statut HTTP
    for (const url in data.pageDetails) {
      const page = data.pageDetails[url];
      const status = page.httpStatus;
      
      // Ignorer les entrées sans statut HTTP
      if (!status || status === 'unknown') {
        statusGroups.unknown++;
        continue;
      }
      
      totalChecked++;
      
      // Grouper par code HTTP spécifique
      if (!statsByCode[status]) {
        statsByCode[status] = { count: 0, urls: [] };
      }
      statsByCode[status].count++;
      statsByCode[status].urls.push(url);
      
      // Grouper par classe de statut
      if (status >= 200 && status < 300) {
        statusGroups['2xx']++;
      } else if (status >= 300 && status < 400) {
        statusGroups['3xx']++;
        // Collecter les infos de redirection
        //if (page.redirected && page.redirectUrl) {
            console.log('+++++++++++++++++++ redirection detected !',page.redirected, page.redirectUrl)
          redirects.push({
            fromUrl: url,
            toUrl: page.redirectUrl,
            type: `${status} ${getStatusDescription(status)}`,
            inboundLinks: page.inboundLinks || 0
          });
        //}
      } else if (status >= 400 && status < 500) {
        statusGroups['4xx']++;
        // Collecter les liens cassés
        if (page.inboundLinks > 0) {
          // Trouver les pages qui pointent vers cette URL cassée
          for (const sourceUrl in data.linkContextData) {
            const contexts = data.linkContextData[sourceUrl];
            contexts.forEach(context => {
              if (context.targetUrl === url || context.href === url) {
                brokenLinks.push({
                  source: context.fromUrl,
                  target: url,
                  status: status,
                  context: context.context
                });
              }
            });
          }
        }
      } else if (status >= 500) {
        statusGroups['5xx']++;
        // Aussi collecter comme liens cassés
        if (page.inboundLinks > 0) {
          for (const sourceUrl in data.linkContextData) {
            const contexts = data.linkContextData[sourceUrl];
            contexts.forEach(context => {
              if (context.targetUrl === url || context.href === url) {
                brokenLinks.push({
                  source: context.fromUrl,
                  target: url,
                  status: status,
                  context: context.context
                });
              }
            });
          }
        }
      } else if (status === 0) {
        statusGroups['0']++;
        // Aussi collecter comme liens cassés
        if (page.inboundLinks > 0) {
          for (const sourceUrl in data.linkContextData) {
            const contexts = data.linkContextData[sourceUrl];
            contexts.forEach(context => {
              if (context.targetUrl === url || context.href === url) {
                brokenLinks.push({
                  source: context.fromUrl,
                  target: url,
                  status: 0,
                  context: context.context
                });
              }
            });
          }
        }
      }
    }
    
    // Mise à jour des statistiques dans l'interface
    const total = totalChecked + statusGroups.unknown;
    
    // Mettre à jour les compteurs
    document.getElementById('status-200-count').textContent = statusGroups['2xx'].toLocaleString();
    document.getElementById('status-3xx-count').textContent = statusGroups['3xx'].toLocaleString();
    document.getElementById('status-error-count').textContent = (statusGroups['4xx'] + statusGroups['5xx'] + statusGroups['0']).toLocaleString();
    document.getElementById('status-unknown-count').textContent = statusGroups.unknown.toLocaleString();
    
    // Mettre à jour les pourcentages
    if (total > 0) {
      document.getElementById('status-200-percent').textContent = `${Math.round(statusGroups['2xx'] / total * 100)}%`;
      document.getElementById('status-3xx-percent').textContent = `${Math.round(statusGroups['3xx'] / total * 100)}%`;
      document.getElementById('status-error-percent').textContent = `${Math.round((statusGroups['4xx'] + statusGroups['5xx'] + statusGroups['0']) / total * 100)}%`;
      document.getElementById('status-unknown-percent').textContent = `${Math.round(statusGroups.unknown / total * 100)}%`;
    }
    
    // Créer le graphique circulaire des statuts HTTP
    createHttpStatusChart('http-status-chart', statusGroups);
    
    // Remplir la table des statuts HTTP détaillés
    populateHttpStatusTable('http-status-table', statsByCode);
    
    // Gérer l'alerte de liens cassés
    const brokenLinksCount = statusGroups['4xx'] + statusGroups['5xx'] + statusGroups['0'];
    if (brokenLinksCount > 0) {
      document.getElementById('broken-links-alert').style.display = 'flex';
      document.getElementById('broken-links-summary').textContent = 
        `${brokenLinksCount} liens cassés détectés. Cela peut nuire à l'expérience utilisateur et au référencement.`;
    } else {
      document.getElementById('broken-links-alert').style.display = 'none';
    }
    
    // Remplir la table des liens cassés
    populateBrokenLinksTable('broken-links-table', brokenLinks);
    
    // Remplir la table des redirections
    populateRedirectsTable('redirects-table', redirects);
  }
  // Fonction pour créer le graphique des statuts HTTP
function createHttpStatusChart(canvasId, statusGroups) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Nettoyer le graphique existant s'il existe
    if (globalContext.httpStatusChart) {
      globalContext.httpStatusChart.destroy();
    }
    
    const data = [
      statusGroups['2xx'],
      statusGroups['3xx'],
      statusGroups['4xx'] + statusGroups['5xx'],
      statusGroups['0'],
      statusGroups['unknown']
    ];
    
    const labels = [
      'OK (200-299)',
      'Redirections (300-399)',
      'Erreurs (400-599)',
      'Erreurs de connexion',
      'Non vérifiés'
    ];
    
    globalContext.httpStatusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(52, 168, 83, 0.7)',  // 2xx - vert
            'rgba(251, 188, 5, 0.7)',  // 3xx - jaune
            'rgba(234, 67, 53, 0.7)',  // 4xx/5xx - rouge
            'rgba(128, 128, 128, 0.7)', // 0 - gris
            'rgba(200, 200, 200, 0.5)'  // unknown - gris clair
          ],
          borderColor: [
            'rgba(52, 168, 83, 1)',
            'rgba(251, 188, 5, 1)',
            'rgba(234, 67, 53, 1)',
            'rgba(128, 128, 128, 1)',
            'rgba(200, 200, 200, 1)'
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
                const total = data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // Fonction pour remplir la table des statuts HTTP détaillés
function populateHttpStatusTable(tableId, statsByCode) {
    const tbody = document.getElementById(`${tableId}-tbody`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const statusCodes = Object.keys(statsByCode).sort((a, b) => a - b);
    
    for (const code of statusCodes) {
      const stats = statsByCode[code];
      const row = document.createElement('tr');
      
      // Cellule de code HTTP
      const codeCell = document.createElement('td');
      const codeBadge = document.createElement('span');
      
      let badgeClass = 'status-0';
      if (code >= 200 && code < 300) badgeClass = 'status-200';
      else if (code >= 300 && code < 400) badgeClass = 'status-300';
      else if (code >= 400 && code < 500) badgeClass = 'status-400';
      else if (code >= 500) badgeClass = 'status-500';
      
      codeBadge.className = `http-status-badge ${badgeClass}`;
      codeBadge.textContent = code;
      codeCell.appendChild(codeBadge);
      
      // Cellule de description
      const descCell = document.createElement('td');
      descCell.textContent = getStatusDescription(code);
      
      // Cellule de comptage
      const countCell = document.createElement('td');
      countCell.textContent = stats.count.toLocaleString();
      
      // Cellule de pourcentage
      const percentCell = document.createElement('td');
      const total = Object.values(statsByCode).reduce((sum, s) => sum + s.count, 0);
      const percent = total > 0 ? Math.round((stats.count / total) * 100) : 0;
      percentCell.textContent = `${percent}%`;
      
      row.appendChild(codeCell);
      row.appendChild(descCell);
      row.appendChild(countCell);
      row.appendChild(percentCell);
      
      tbody.appendChild(row);
    }
    
    // Initialiser DataTable
    try {
      if (typeof initDataTable === 'function') {
        initDataTable(tableId);
      }
    } catch (e) {
      console.error("Erreur lors de l'initialisation de DataTable:", e);
    }
  }
  
  // Fonction pour remplir la table des liens cassés
  function populateBrokenLinksTable(tableId, brokenLinks) {
    const tbody = document.getElementById(`${tableId}-tbody`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (brokenLinks.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.style.textAlign = 'center';
      cell.textContent = 'Aucun lien cassé détecté';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }
    
    for (const link of brokenLinks) {
      const row = document.createElement('tr');
      
      // Cellule de page source
      const sourceCell = document.createElement('td');
      const sourceLink = document.createElement('a');
      sourceLink.href = link.source;
      sourceLink.target = '_blank';
      sourceLink.textContent = link.source;
      sourceCell.appendChild(sourceLink);
      
      // Cellule de lien cassé
      const targetCell = document.createElement('td');
      const targetLink = document.createElement('a');
      targetLink.href = link.target;
      targetLink.target = '_blank';
      targetLink.textContent = link.target;
      targetLink.style.color = '#d93025';
      targetCell.appendChild(targetLink);
      
      // Cellule de code HTTP
      const statusCell = document.createElement('td');
      const statusBadge = document.createElement('span');
      
      let badgeClass = 'status-0';
      if (link.status >= 400 && link.status < 500) badgeClass = 'status-400';
      else if (link.status >= 500) badgeClass = 'status-500';
      
      statusBadge.className = `http-status-badge ${badgeClass}`;
      statusBadge.textContent = link.status || 'Erreur';
      statusCell.appendChild(statusBadge);
      
      // Cellule de contexte
      const contextCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge ${link.context}`;
      badge.textContent = link.context || 'Inconnu';
      contextCell.appendChild(badge);
      
      row.appendChild(sourceCell);
      row.appendChild(targetCell);
      row.appendChild(statusCell);
      row.appendChild(contextCell);
      
      tbody.appendChild(row);
    }
    
    // Initialiser DataTable
    try {
      if (typeof initDataTable === 'function') {
        initDataTable(tableId);
      }
    } catch (e) {
      console.error("Erreur lors de l'initialisation de DataTable:", e);
    }
  }
  
  // Fonction pour remplir la table des redirections
  function populateRedirectsTable(tableId, redirects) {
    const tbody = document.getElementById(`${tableId}-tbody`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (redirects.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.style.textAlign = 'center';
      cell.textContent = 'Aucune redirection détectée';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }
    
    for (const redirect of redirects) {
      const row = document.createElement('tr');
      
      // Cellule d'URL d'origine
      const fromCell = document.createElement('td');
      const fromLink = document.createElement('a');
      fromLink.href = redirect.fromUrl;
      fromLink.target = '_blank';
      fromLink.textContent = redirect.fromUrl;
      fromCell.appendChild(fromLink);
      
      // Cellule d'URL de destination
      const toCell = document.createElement('td');
      const toLink = document.createElement('a');
      toLink.href = redirect.toUrl;
      toLink.target = '_blank';
      toLink.textContent = redirect.toUrl;
      toCell.appendChild(toLink);
      
      // Cellule de type de redirection
      const typeCell = document.createElement('td');
      const typeBadge = document.createElement('span');
      typeBadge.className = 'http-status-badge status-300';
      typeBadge.textContent = redirect.type;
      typeCell.appendChild(typeBadge);
      
      // Cellule de nombre de liens entrants
      const linksCell = document.createElement('td');
      linksCell.textContent = redirect.inboundLinks.toLocaleString();
      
      row.appendChild(fromCell);
      row.appendChild(toCell);
      row.appendChild(typeCell);
      row.appendChild(linksCell);
      
      tbody.appendChild(row);
    }
    
    // Initialiser DataTable
    try {
      if (typeof initDataTable === 'function') {
        initDataTable(tableId);
      }
    } catch (e) {
      console.error("Erreur lors de l'initialisation de DataTable:", e);
    }
  }
  
  // Fonction utilitaire pour obtenir la description d'un code HTTP
  function getStatusDescription(code) {
    const descriptions = {
      // 2xx - Succès
      200: 'OK',
      201: 'Créé',
      204: 'Pas de contenu',
      
      // 3xx - Redirection
      301: 'Redirection permanente',
      302: 'Redirection temporaire',
      304: 'Non modifié',
      307: 'Redirection temporaire',
      308: 'Redirection permanente',
      
      // 4xx - Erreur client
      400: 'Requête incorrecte',
      401: 'Non autorisé',
      403: 'Interdit',
      404: 'Non trouvé',
      410: 'Disparu',
      
      // 5xx - Erreur serveur
      500: 'Erreur interne du serveur',
      502: 'Mauvaise passerelle',
      503: 'Service indisponible',
      504: 'Délai de passerelle dépassé',
      
      // Spécial
      0: 'Erreur de connexion'
    };
    
    return descriptions[code] || `Code HTTP ${code}`;
  }
  
  /**
   * Affiche les informations sur le CMS détecté
   * @param {Object} data - Données d'analyse
   */
  function displayCMSInfo(data) {
    console.log("Affichage des informations CMS:", {
      detectedCMS: data.detectedCMS,
      contextAnalysis: data.contextAnalysis
        ? {
            detectedCMS: data.contextAnalysis.detectedCMS,
            cmsSpecificPercentage: data.contextAnalysis.cmsSpecificPercentage,
          }
        : null,
    });

    // Récupérer les éléments DOM pour l'affichage
    const cmsElement = document.getElementById("detected-cms");
    const confidenceElement = document.getElementById("cms-confidence");

    if (!cmsElement || !confidenceElement) {
      console.warn("Éléments DOM pour l'affichage du CMS non trouvés");
      return;
    }

    // Récupérer le CMS détecté (soit dans data.detectedCMS, soit dans data.contextAnalysis.detectedCMS)
    const detectedCMS =
      data.detectedCMS ||
      (data.contextAnalysis ? data.contextAnalysis.detectedCMS : null);

    console.log("CMS détecté:", detectedCMS);

    // Mettre à jour l'affichage
    if (detectedCMS) {
      // Afficher le CMS avec première lettre en majuscule
      cmsElement.textContent =
        detectedCMS.charAt(0).toUpperCase() + detectedCMS.slice(1);

      // Récupérer la confiance (pourcentage)
      let confidence = "0";

      if (data.contextAnalysis && data.contextAnalysis.cmsSpecificPercentage) {
        // Si disponible dans cmsSpecificPercentage[cms]
        const cmsKey = detectedCMS.toLowerCase();
        if (data.contextAnalysis.cmsSpecificPercentage[cmsKey]) {
          confidence = data.contextAnalysis.cmsSpecificPercentage[cmsKey];
        }
      }

      // Mettre à jour l'élément de confiance
      confidenceElement.textContent = confidence;
    } else {
      // Aucun CMS détecté
      cmsElement.textContent = "Non détecté";
      confidenceElement.textContent = "-";
    }
  }

  /**
   * Affiche les métriques de performance
   * @param {Object} metrics - Métriques de performance
   */
  function displayPerformanceMetrics(metrics) {
    if (!metrics) return;

    // Remplir les métriques dans le DOM
    document.getElementById("avg-links-per-page").textContent =
      metrics.averageLinksPerPage || "N/A";
    document.getElementById("silo-density").textContent =
      metrics.siloDensity || "N/A";
    document.getElementById("hierarchy-score").textContent =
      metrics.hierarchyScore || "N/A";
    document.getElementById("internal-linking-score").textContent =
      metrics.internalLinkingScore || "N/A";
    document.getElementById("avg-link-importance").textContent =
      metrics.averageLinkImportance || "N/A";

    // Créer des jauges pour visualiser les scores
    createScoreGauge("silo-gauge", metrics.siloDensity, 10);
    createScoreGauge("hierarchy-gauge", metrics.hierarchyScore, 10);
    createScoreGauge("linking-gauge", metrics.internalLinkingScore, 100);
  }
  /**
   * Prépare les données de pages avec les scores PageRank et JuiceLink
   * @param {Object} data - Données d'analyse
   * @return {Array} Tableau des pages avec scores
   */
  function preparePageScoreData(data) {
    // Créer un tableau de pages avec les URLs connues
    let knownPages = [];

    // Collecter les URLs depuis différentes sources
    if (data.sitemapUrls) knownPages = knownPages.concat(data.sitemapUrls);
    if (data.crawledUrls) knownPages = knownPages.concat(data.crawledUrls);

    // Éliminer les doublons
    knownPages = [...new Set(knownPages)];

    console.log(`Préparation des données pour ${knownPages.length} pages`);

    // Créer un tableau d'objets page avec les détails disponibles
    const pages = knownPages.map((url) => {
      // Récupérer les détails de la page si disponibles
      const details =
        data.pageDetails && data.pageDetails[url] ? data.pageDetails[url] : {};

      // Dans la fonction preparePageScoreData, modifiez le calcul du PageRank
      let pageRank = 0.15; // Score de base

      if (details.inboundLinks) {
        // Plus une page a de liens entrants, plus son PageRank est élevé
        // L'algorithme réel de PageRank est plus complexe, mais c'est une approximation
        const linkBoost = Math.min(details.inboundLinks * 0.01, 0.8);
        pageRank += linkBoost;

        // Bonus pour les liens de haute importance
        if (details.avgInboundImportance) {
          pageRank += details.avgInboundImportance * 0.05;
        }

        // Ajouter une petite variation aléatoire pour différencier les pages
        pageRank += Math.random() * 0.1;
      }

      // Limiter à un maximum de 1.0
      pageRank = Math.min(pageRank, 0.999);

      // Calculer un score JuiceLink approximatif basé sur les liens sortants
      let juiceLinkScore = 1; // Score de base

      if (details.outboundLinks) {
        // Plus une page a de liens sortants de qualité, plus son JuiceLink score est élevé
        juiceLinkScore += details.outboundLinks * 0.2;

        // Bonus pour les liens de haute importance
        if (details.avgOutboundImportance) {
          juiceLinkScore += details.avgOutboundImportance * 2;
        }

        // Malus si trop de liens sortants (dilution)
        if (details.outboundLinks > 50) {
          juiceLinkScore -= (details.outboundLinks - 50) * 0.05;
        }
      }

      // Limiter entre 1 et 10
      juiceLinkScore = Math.max(1, Math.min(juiceLinkScore, 10));

      return {
        url,
        incomingLinks: details.inboundLinks || 0,
        outgoingLinks: details.outboundLinks || 0,
        pageRank: pageRank,
        juiceLinkScore: juiceLinkScore,
      };
    });

    console.log("Pages avec scores préparées:", pages.length);
    return pages;
  }
  /**
   * Affiche les visualisations de scores PageRank et JuiceLinkScore
   * @param {Object} data - Données d'analyse
   */
  function displayScoreVisualisations(data) {
    if (!data) return;

    console.log("Préparation de l'affichage des scores...");

    // Vérifier si nous avons déjà des pages avec des scores
    const hasPageRankScores =
      data.pages && data.pages.some((p) => typeof p.pageRank !== "undefined");
    const hasJuiceLinkScores =
      data.pages &&
      data.pages.some((p) => typeof p.juiceLinkScore !== "undefined");

    // Si nous n'avons pas de scores individuels, générons-les
    let pagesWithScores = [];

    if (hasPageRankScores && hasJuiceLinkScores) {
      console.log("Utilisation des scores existants");
      pagesWithScores = data.pages;
    } else {
      console.log("Génération des scores approximatifs");
      // Générer des données de page avec des scores approximatifs
      pagesWithScores = preparePageScoreData(data);
    }

    try {
      // Créer le graphique PageRank
      if (document.getElementById("pagerank-chart")) {
        console.log("Création du graphique PageRank");
        LinkJuice.ChartRenderers.createPageRankChart(
          "pagerank-chart",
          pagesWithScores
        );
      }

      // Créer le graphique JuiceLink
      if (document.getElementById("juicelink-chart")) {
        console.log("Création du graphique JuiceLink");
        LinkJuice.ChartRenderers.createJuiceLinkScoreChart(
          "juicelink-chart",
          pagesWithScores
        );
      }

      // Remplir le tableau des top pages par score
      if (document.getElementById("top-scored-table")) {
        console.log("Création du tableau des top scores");
        populateTopScoredTable("top-scored-table", pagesWithScores);
      }
    } catch (error) {
      console.error("Erreur lors de l'affichage des scores:", error);
    }
  }

  /**
   * Remplit un tableau des pages avec les meilleurs scores
   * @param {string} tableId - ID de l'élément table
   * @param {Array} pages - Pages avec scores
   */
  function populateTopScoredTable(tableId, pages) {
    // Utiliser l'ID correct pour le tbody
    const tbodyId = `${tableId.replace("-table", "")}-tbody`;
    console.log(`Recherche de l'élément tbody avec l'ID ${tbodyId}`);

    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
      console.error(`Élément tbody non trouvé pour l'ID ${tbodyId}`);
      return;
    }

    tbody.innerHTML = "";

    if (!pages || pages.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">Aucune donnée de score disponible</td></tr>';
      return;
    }

    // Calculer un score combiné
    const pagesWithCombined = pages.map((page) => {
      let scoreCount = 0;
      let scoreSum = 0;

      if (typeof page.pageRank !== "undefined") {
        scoreSum += page.pageRank;
        scoreCount++;
      }

      if (typeof page.juiceLinkScore !== "undefined") {
        // Normaliser JuiceLink (1-10) à une échelle (0-1) similaire à PageRank
        scoreSum += page.juiceLinkScore / 10;
        scoreCount++;
      }

      return {
        ...page,
        combinedScore: scoreCount > 0 ? scoreSum / scoreCount : 0,
      };
    });

    // Trier par score combiné et prendre les 20 premiers
    const topScored = pagesWithCombined
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 20);

    // Remplir le tableau
    topScored.forEach((page, index) => {
      const row = document.createElement("tr");

      const rankCell = document.createElement("td");
      rankCell.textContent = index + 1;

      const urlCell = document.createElement("td");
      const urlLink = document.createElement("a");
      urlLink.href = page.url;
      urlLink.target = "_blank";
      urlLink.textContent = page.url;
      urlCell.appendChild(urlLink);

      const pageRankCell = document.createElement("td");
      pageRankCell.textContent =
        typeof page.pageRank !== "undefined" ? page.pageRank.toFixed(3) : "N/A";

      const juiceLinkCell = document.createElement("td");
      juiceLinkCell.textContent =
        typeof page.juiceLinkScore !== "undefined"
          ? page.juiceLinkScore.toFixed(1)
          : "N/A";

      const inboundCell = document.createElement("td");
      inboundCell.textContent = page.incomingLinks || 0;

      const outboundCell = document.createElement("td");
      outboundCell.textContent = page.outgoingLinks || 0;

      row.appendChild(rankCell);
      row.appendChild(urlCell);
      row.appendChild(pageRankCell);
      row.appendChild(juiceLinkCell);
      row.appendChild(inboundCell);
      row.appendChild(outboundCell);

      tbody.appendChild(row);
    });
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
      color = "#4CAF50"; // Vert
    } else if (percentage >= 40) {
      color = "#FFC107"; // Jaune
    } else {
      color = "#F44336"; // Rouge
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
    const container = document.getElementById("recommendations-container");
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML =
        '<div class="alert alert-info">Aucune recommandation disponible pour le moment.</div>';
      return;
    }

    container.innerHTML = ""; // Nettoyer le conteneur

    // Trier les recommandations par priorité
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    recommendations.forEach((rec) => {
      // Créer une carte pour chaque recommandation
      const card = document.createElement("div");
      card.className = "recommendation-card";

      // Définir une classe selon la priorité
      const priorityClass =
        rec.priority === "high"
          ? "high-priority"
          : rec.priority === "medium"
          ? "medium-priority"
          : "low-priority";
      card.classList.add(priorityClass);

      // Créer l'en-tête
      const header = document.createElement("div");
      header.className = "recommendation-header";

      const title = document.createElement("h3");
      title.textContent = rec.title;

      const priority = document.createElement("span");
      priority.className = "priority-badge";
      priority.textContent =
        rec.priority === "high"
          ? "Priorité élevée"
          : rec.priority === "medium"
          ? "Priorité moyenne"
          : "Priorité basse";

      header.appendChild(title);
      header.appendChild(priority);

      // Créer le contenu
      const content = document.createElement("div");
      content.className = "recommendation-content";

      const description = document.createElement("p");
      description.textContent = rec.description;
      content.appendChild(description);

      // Ajouter les actions
      if (rec.actions && rec.actions.length > 0) {
        const actionsList = document.createElement("ul");
        rec.actions.forEach((action) => {
          const item = document.createElement("li");
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
    document.getElementById("total-anchors").textContent =
      anchorData.totalAnchors.toLocaleString();
    document.getElementById("meaningful-anchors").textContent =
      anchorData.meaningfulAnchors.toLocaleString() +
      ` (${anchorData.meaningfulPercentage}%)`;
    document.getElementById("generic-anchors").textContent =
      anchorData.genericAnchors.toLocaleString() +
      ` (${anchorData.genericPercentage}%)`;
    document.getElementById("anchor-avg-length").textContent =
      anchorData.averageLength;

    // Remplir les termes génériques communs
    const genericTermsList = document.getElementById("generic-terms-list");
    if (genericTermsList) {
      genericTermsList.innerHTML = "";

      if (
        anchorData.commonGenericTerms &&
        anchorData.commonGenericTerms.length > 0
      ) {
        anchorData.commonGenericTerms.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = `"${item.term}" (${item.count} occurrences)`;
          genericTermsList.appendChild(li);
        });
      } else {
        genericTermsList.innerHTML =
          "<li>Aucun terme générique fréquent trouvé</li>";
      }
    }

    // Remplir les mots-clés communs
    const keywordsList = document.getElementById("keywords-list");
    if (keywordsList) {
      keywordsList.innerHTML = "";

      if (anchorData.commonKeywords && anchorData.commonKeywords.length > 0) {
        anchorData.commonKeywords.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = `"${item.term}" (${item.count} occurrences)`;
          keywordsList.appendChild(li);
        });
      } else {
        keywordsList.innerHTML = "<li>Aucun mot-clé fréquent trouvé</li>";
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
    document.getElementById("intext-links-count").textContent =
      inTextData.inTextLinks.toLocaleString();
    document.getElementById("intext-percentage").textContent =
      inTextData.inTextPercentage + "%";
    document.getElementById("navigation-links-count").textContent =
      inTextData.navigationLinks.toLocaleString();
    document.getElementById("avg-intext-per-page").textContent =
      inTextData.averageInTextPerPage;

    // Remplir le tableau des meilleures pages inText
    LinkJuice.TableRenderers.populateTopInTextTable(
      "top-intext-table",
      inTextData.topInTextPages
    );
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
        LinkJuice.ChartRenderers.createContextsChart(
          "contexts-chart",
          data.linksSummary
        );
      }

      // Graphiques des pages les plus liées
      if (data.linksSummary.topDestinationPages) {
        LinkJuice.ChartRenderers.createTopPagesChart(
          "most-linked-chart",
          data.linksSummary.topDestinationPages,
          "#1a73e8"
        );
      }

      // Graphiques des pages avec le plus de liens sortants
      if (data.linksSummary.topSourcePages) {
        LinkJuice.ChartRenderers.createTopPagesChart(
          "most-linking-chart",
          data.linksSummary.topSourcePages,
          "#34a853"
        );
      }

      // Graphique de qualité des ancres
      if (data.anchorQuality) {
        LinkJuice.ChartRenderers.createAnchorQualityChart(
          "anchor-quality-chart",
          data.anchorQuality
        );
        LinkJuice.ChartRenderers.createAnchorLengthChart(
          "anchor-length-chart",
          data.anchorQuality
        );
      }

      // Graphique de distribution d'importance
      if (data.linksSummary) {
        LinkJuice.ChartRenderers.createImportanceDistributionChart(
          "importance-distribution-chart",
          data.linksSummary
        );
      }

      // Graphique de distribution inText vs Navigation
      if (data.inTextAnalysis) {
        LinkJuice.ChartRenderers.createInTextDistributionChart(
          "intext-distribution-chart",
          data.inTextAnalysis
        );
      }

      // Graphique des catégories de contexte
      if (data.contextAnalysis) {
        LinkJuice.ChartRenderers.createContextCategoryChart(
          "context-category-chart",
          data.contextAnalysis
        );
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
        LinkJuice.TableRenderers.populateOrphanedTable(
          "orphaned-table",
          data.orphanedPages
        );
      } else {
        console.warn("renderTables: Données de pages orphelines manquantes");
        // Vérifier d'autres sources possibles pour les pages orphelines
        if (data.orphanedPageCount > 0) {
            console.log("renderTables: Détection de pages orphelines via orphanedPageCount");
            // Il y a des pages orphelines mais les données détaillées sont manquantes
            const placeholder = document.getElementById("orphaned-tbody");
            if (placeholder) {
                placeholder.innerHTML = `
                    <tr>
                        <td colspan="2" style="text-align: center;">
                            ${data.orphanedPageCount} pages orphelines détectées, mais les détails ne sont pas disponibles
                        </td>
                    </tr>
                `;
            }
        }
    }

      // Tableau des contextes de liens
      if (data.linkContextData) {
        LinkJuice.TableRenderers.populateContextsTable(
          "contexts-table",
          data.linkContextData
        );
      }

      // Tableau de toutes les pages
      LinkJuice.TableRenderers.populateAllPagesTable("all-pages-table", data);

      // Tableaux d'importance des liens
      if (data.importanceAnalysis) {
        LinkJuice.TableRenderers.populateImportanceTables(
          "top-important-table",
          "low-importance-table",
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
      // Afficher les informations du CMS détecté
      displayCMSInfo(data); // <-- Ajoutez cette ligne ici

      // Afficher les recommandations
      displayRecommendations(data.recommendations);

      // Afficher les informations sur la qualité des ancres
      displayAnchorQualityInfo(data.anchorQuality);

      // Afficher les informations sur les liens inText
      displayInTextAnalysis(data.inTextAnalysis);

      // Afficher les scores PageRank et JuiceLink
      displayScoreVisualisations(data);

      // Afficher les informations de statut HTTP
        displayHttpStatusInfo(data);

      // CORRECTION: Générer et attacher les données d'importance si elles n'existent pas déjà
      if (!data.importanceAnalysis && data.linkContextData) {
        // Utiliser l'API d'Analyzer pour générer les pages importantes
        data.importanceAnalysis = {
            topImportantPages: LinkJuice.Analyzer.getTopImportantPages(10),
            lowImportancePages: LinkJuice.Analyzer.getLowImportancePages(10)
        };
        
        console.log("Données d'importance générées:", data.importanceAnalysis);
    }


      // Rendre les graphiques
      renderCharts(data);

      // Rendre les tableaux
      renderTables(data);

      // Mettre à jour la notification de filtre
      updateFilterNotification(isFiltered);
    } catch (error) {
      console.error("Erreur lors du rendu du dashboard:", error);
      showError("Erreur lors du rendu du dashboard: " + error.message);
    }
  }
  /**
   * Affiche un message d'erreur sur le dashboard
   * @param {string} message - Message d'erreur
   */
  function showError(message) {
    document.getElementById("loader-container").style.display = "none";
    document.getElementById("dashboard-container").innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h3 style="color: var(--danger-color);">Erreur</h3>
                <p>${message}</p>
                <p>Veuillez d'abord lancer une analyse depuis la fenêtre principale de l'extension.</p>
            </div>
        `;
    document.getElementById("dashboard-container").style.display = "block";
  }

  // API publique du module
  return {
    initDashboard: initDashboard,
    renderDashboard: renderDashboard,
    applyContextFilter: applyContextFilter,
    showError: showError,
    getCurrentData: function () {
      return currentData;
    },
  };
})();
