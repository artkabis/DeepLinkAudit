// modules/core/sitemap.js
// Module pour le parsing du sitemap XML

LinkJuice.Sitemap = (function() {
    /**
     * Parse un sitemap XML et extrait les URLs
     * @param {string} sitemapUrl - URL du sitemap à analyser
     * @param {Array} [existingUrls=[]] - URLs déjà connues (pour récursion)
     * @return {Promise<Array>} Liste des URLs trouvées dans le sitemap
     */
    async function parseSitemap(sitemapUrl, existingUrls = []) {
        try {
            // Clone la liste des URLs existantes pour éviter les effets de bord
            const sitemapUrls = [...existingUrls];
            
            const response = await fetch(sitemapUrl);
            const text = await response.text();

            // Utiliser des expressions régulières au lieu de DOMParser
            // Pour les sitemaps index
            const indexRegex = /<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g;
            let indexMatch;
            let isIndex = false;

            while ((indexMatch = indexRegex.exec(text)) !== null) {
                isIndex = true;
                const subSitemapUrl = indexMatch[1];
                // Appel récursif pour traiter les sous-sitemaps
                const subSitemapUrls = await parseSitemap(subSitemapUrl, sitemapUrls);
                
                // Les résultats sont déjà fusionnés dans sitemapUrls grâce à la récursion
            }

            // Si ce n'est pas un sitemap index, parser les URLs
            if (!isIndex) {
                const urlRegex = /<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/url>/g;
                let urlMatch;

                while ((urlMatch = urlRegex.exec(text)) !== null) {
                    const url = urlMatch[1];
                    sitemapUrls.push(url);
                }
            }

            return sitemapUrls;
        } catch (error) {
            console.error(`Erreur lors du parsing du sitemap: ${error.message}`);
            throw new Error(`Erreur lors du parsing du sitemap: ${error.message}`);
        }
    }

    /**
     * Nettoie et standardise les URLs du sitemap
     * @param {Array} urls - Liste des URLs à nettoyer
     * @return {Array} Liste des URLs nettoyées
     */
    function normalizeUrls(urls) {
        return urls.map(url => {
            try {
                // Créer un objet URL pour standardiser le format
                const urlObj = new URL(url);
                
                // Supprimer les fragments comme #section
                urlObj.hash = '';
                
                // Retourner l'URL normalisée
                return urlObj.toString();
            } catch (e) {
                // Si l'URL est invalide, la retourner telle quelle
                console.warn(`URL invalide ignorée: ${url}`);
                return url;
            }
        });
    }

    /**
     * Filtre les URLs pour ne garder que celles correspondant aux domaines spécifiés
     * @param {Array} urls - Liste des URLs à filtrer
     * @param {Array} domainFilters - Liste des domaines à inclure
     * @return {Array} Liste des URLs filtrées
     */
    function filterUrlsByDomain(urls, domainFilters) {
        // Si aucun filtre n'est spécifié, retourner toutes les URLs
        if (!domainFilters || domainFilters.length === 0) {
            return urls;
        }

        return urls.filter(url => {
            try {
                const urlObj = new URL(url);
                return domainFilters.some(domain => urlObj.hostname.includes(domain));
            } catch (e) {
                return false;
            }
        });
    }

    // API publique du module
    return {
        parseSitemap: parseSitemap,
        normalizeUrls: normalizeUrls,
        filterUrlsByDomain: filterUrlsByDomain
    };
})();