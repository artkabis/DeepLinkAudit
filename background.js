// background.js (refactorisé)
// Fichier principal du background pour l'extension Link Juice Checker

// Écouteur principal pour les messages
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'startAnalysis') {
        startAnalysis(request, sendResponse);
        return true; // Pour garder la connexion ouverte pour la réponse asynchrone
    } else if (request.action === 'exportResults') {
        exportResults();
    } else if (request.action === 'getDashboardData') {
        // Action pour le dashboard
        getDashboardData(sendResponse);
        return true; // Pour garder la connexion ouverte pour la réponse asynchrone
    }
});

/**
 * Lance l'analyse du maillage interne
 * @param {Object} params - Paramètres de l'analyse
 * @param {function} sendResponse - Callback pour envoyer la réponse
 */
async function startAnalysis(params, sendResponse) {
    try {
        // Lancer l'analyse à l'aide du module Analyzer
        const result = await LinkJuice.Analyzer.startAnalysis(params);
        
        sendResponse(result);
    } catch (error) {
        console.error('Analysis error:', error);
        sendResponse({
            success: false,
            message: error.message || 'Une erreur est survenue lors de l\'analyse.'
        });
    }
}

/**
 * Exporte les résultats d'analyse au format JSON
 */
function exportResults() {
    const analysisResults = LinkJuice.Analyzer.getLastAnalysisResults();
    
    if (analysisResults) {
        LinkJuice.DataExport.exportResults(analysisResults);
    }
}

/**
 * Prépare les données pour le dashboard
 * @param {function} sendResponse - Callback pour envoyer la réponse
 */
function getDashboardData(sendResponse) {
    // Obtenir les données préparées par le module Analyzer
    const dashboardData = LinkJuice.Analyzer.getDashboardData();
    
    // Ajouter un log pour débogage
    console.log("Données du dashboard à envoyer:", dashboardData);
    
    // Envoyer les données via le callback sendResponse
    sendResponse(dashboardData);
}