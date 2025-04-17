// modules/analysis/pagerank.js
LinkJuice.PageRank = (function () {
    /**
     * Calcule le PageRank interne des pages
     * @param {Object} linkContextData - Données de contexte des liens
     * @param {number} iterations - Nombre d’itérations du calcul
     * @param {number} dampingFactor - Facteur d’amortissement (souvent 0.85)
     * @returns {Object} PageRank par URL
     */
    function calculatePageRank(linkContextData, iterations = 20, dampingFactor = 0.85) {
        const pages = new Set();
        const linksOut = {};
        const linksIn = {};

        // Préparation des graphes
        for (const toUrl in linkContextData) {
            linkContextData[toUrl].forEach(({ fromUrl }) => {
                pages.add(toUrl);
                pages.add(fromUrl);
                
                if (!linksOut[fromUrl]) linksOut[fromUrl] = new Set();
                linksOut[fromUrl].add(toUrl);
                
                if (!linksIn[toUrl]) linksIn[toUrl] = new Set();
                linksIn[toUrl].add(fromUrl);
            });
        }

        const totalPages = pages.size;
        const initialRank = 1 / totalPages;
        const pageRank = {};

        // Initialisation
        pages.forEach(url => {
            pageRank[url] = initialRank;
        });

        // Itérations
        for (let i = 0; i < iterations; i++) {
            const newRank = {};

            pages.forEach(url => {
                let incomingSum = 0;
                const incomingLinks = linksIn[url] || [];

                incomingLinks.forEach(inUrl => {
                    const outDegree = linksOut[inUrl]?.size || 1;
                    incomingSum += pageRank[inUrl] / outDegree;
                });

                newRank[url] = (1 - dampingFactor) / totalPages + dampingFactor * incomingSum;
            });

            Object.assign(pageRank, newRank);
        }

        return pageRank;
    }

    return {
        calculatePageRank
    };
})();
