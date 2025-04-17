// popup.js (refactorisé)
// Script pour la popup de l'extension Link Juice Checker

document.addEventListener('DOMContentLoaded', function () {
    const startButton = document.getElementById('startAnalysis');
    const exportButton = document.getElementById('exportResults');
    const dashboardButton = document.getElementById('viewDashboard');
    const statusDiv = document.getElementById('status');

    // Charger les valeurs sauvegardées
    chrome.storage.local.get(['sitemapUrl', 'startUrl', 'maxPages', 'domainFilter', 'hasResults'], function (data) {
        if (data.sitemapUrl) document.getElementById('sitemapUrl').value = data.sitemapUrl;
        if (data.startUrl) document.getElementById('startUrl').value = data.startUrl;
        if (data.maxPages) document.getElementById('maxPages').value = data.maxPages;
        if (data.domainFilter) document.getElementById('domainFilter').value = data.domainFilter;

        // Activer les boutons si des résultats existent
        if (data.hasResults) {
            exportButton.disabled = false;
            dashboardButton.disabled = false;
        }
    });

    startButton.addEventListener('click', function () {
        const sitemapUrl = document.getElementById('sitemapUrl').value.trim();
        const startUrl = document.getElementById('startUrl').value.trim();
        const maxPages = parseInt(document.getElementById('maxPages').value);
        const domainFilter = document.getElementById('domainFilter').value.trim();

        // Validation
        if (!sitemapUrl || !startUrl) {
            updateStatus('Veuillez renseigner les URLs du sitemap et de départ.', 'error');
            return;
        }

        // Enregistrer les paramètres
        chrome.storage.local.set({
            sitemapUrl: sitemapUrl,
            startUrl: startUrl,
            maxPages: maxPages,
            domainFilter: domainFilter
        });

        // Démarrer l'analyse
        updateStatus('Analyse en cours... Cela peut prendre quelques minutes.', 'progress');
        startButton.disabled = true;

        chrome.runtime.sendMessage({
            action: 'startAnalysis',
            sitemapUrl: sitemapUrl,
            startUrl: startUrl,
            maxPages: maxPages,
            domainFilter: domainFilter
        }, function (response) {
            if (response && response.success) {
                updateStatus('Analyse terminée ! ' + response.message, 'success');
                exportButton.disabled = false;
                dashboardButton.disabled = false;

                // Marquer que des résultats sont disponibles
                chrome.storage.local.set({ hasResults: true });
            } else {
                updateStatus('Erreur: ' + (response ? response.message : 'Une erreur est survenue.'), 'error');
                startButton.disabled = false;
            }
        });
    });

    exportButton.addEventListener('click', function () {
        chrome.runtime.sendMessage({ action: 'exportResults' });
    });

    dashboardButton.addEventListener('click', function () {
        // Ouvrir le dashboard dans un nouvel onglet
        chrome.tabs.create({ url: 'dashboard.html' });
    });

    function updateStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        statusDiv.style.display = 'block';
    }
});