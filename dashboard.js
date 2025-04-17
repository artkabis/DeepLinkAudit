// dashboard.js (refactorisé)
// Script principal pour la page dashboard de l'extension Link Juice Checker

document.addEventListener('DOMContentLoaded', function () {
    // Références des éléments DOM
    const loaderContainer = document.getElementById('loader-container');
    const dashboardContainer = document.getElementById('dashboard-container');

    // Charger les données d'analyse depuis le background script
    chrome.runtime.sendMessage({ action: 'getDashboardData' }, function (response) {
        if (response && response.success) {
            // Initialiser le dashboard avec les données
            LinkJuice.DashboardUI.initDashboard(response.data);
        } else {
            // Afficher un message d'erreur
            LinkJuice.DashboardUI.showError('Erreur lors du chargement des données: ' + 
                (response ? response.message : 'Une erreur est survenue.'));
        }
    });
});