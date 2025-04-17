// modules/analysis/juiceLinkScore.js
LinkJuice.JuiceLinkScore = (function () {
    /**
     * Calcule un score de "juice link" basé sur l’importance et la densité
     * @param {Object} linkContextData
     * @returns {Object} juiceLinkScore par URL
     */
    function calculateJuiceScores(linkContextData) {
        const juiceScores = {};

        for (const toUrl in linkContextData) {
            const links = linkContextData[toUrl];
            let juice = 0;

            links.forEach(({ importance, context }) => {
                const weight = getContextWeight(context);
                juice += (importance || 0) * weight;
            });

            juiceScores[toUrl] = parseFloat(juice.toFixed(4));
        }

        return juiceScores;
    }

    function getContextWeight(context) {
        const weights = {
            'main': 1.0,
            'inText': 0.9,
            'footer': 0.3,
            'header': 0.5,
            'sidebar': 0.4
        };

        return weights[context] || 0.2;
    }

    return {
        calculateJuiceScores
    };
})();
