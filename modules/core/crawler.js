// modules/core/crawler.js
// Module pour le crawling des pages web et l'extraction des liens

LinkJuice.Crawler = (function() {
    /**
     * Crawle une page web et extrait ses liens
     * @param {string} url - URL de la page à crawler
     * @param {Object} linkContextData - Données de contexte des liens (mis à jour par référence)
     * @param {Object} linkImportanceData - Données d'importance des liens (mis à jour par référence)
     * @return {Promise<Array>} Liste des liens trouvés sur la page
     */
    async function crawlPage(url, linkContextData, linkImportanceData) {
        try {
            const response = await fetch(url);
            const html = await response.text();

            // Détecter le CMS
            const cmsInfo = LinkJuice.CMSDetection.detectCMS(html);

            // Extraire tous les liens avec une expression régulière
            const links = [];
            const hrefRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g;
            let match;

            while ((match = hrefRegex.exec(html)) !== null) {
                let href = match[1];
                let linkText = match[2].replace(/<[^>]*>/g, '').trim(); // Texte du lien sans balises HTML
                let fullLinkHTML = match[0]; // HTML complet du lien

                // Ignorer les liens vides, les ancres et les liens externes
                if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
                    href.startsWith('mailto:') || href.startsWith('tel:')) {
                    continue;
                }

                try {
                    // Convertir les URLs relatives en absolues
                    if (href.startsWith('/')) {
                        const urlObj = new URL(url);
                        href = urlObj.origin + href;
                    } else if (!href.startsWith('http')) {
                        // S'assurer que l'URL se termine par '/' avant d'ajouter un chemin relatif
                        const baseUrl = url.endsWith('/') ? url : url.substring(0, url.lastIndexOf('/') + 1);
                        href = baseUrl + href;
                    }

                    // Vérifier si c'est un lien interne au domaine
                    const urlObj = new URL(url);
                    const hrefObj = new URL(href);

                    if (hrefObj.hostname === urlObj.hostname) {
                        // Normaliser l'URL (supprimer les fragments, etc.)
                        hrefObj.hash = '';
                        const normalizedUrl = hrefObj.toString();
                        links.push(normalizedUrl);

                        // Utiliser la fonction de détermination du contexte
                        const linkImportance = LinkJuice.LinkContext.calculateLinkImportance(
                            fullLinkHTML, html, url, normalizedUrl
                        );

                        // Stocker l'information du contexte
                        if (!linkContextData[normalizedUrl]) {
                            linkContextData[normalizedUrl] = [];
                        }

                        linkContextData[normalizedUrl].push({
                            fromUrl: url,
                            context: linkImportance.context,
                            contextScore: linkImportance.contextScore,
                            linkText: linkText,
                            fullLinkHTML: fullLinkHTML,
                            importance: linkImportance.importance,
                            attributes: linkImportance.attributes,
                            isInText: linkImportance.isInText,
                            anchorText: linkImportance.anchorText
                        });

                        // Stocker les données d'importance pour analyses ultérieures
                        if (!linkImportanceData[normalizedUrl]) {
                            linkImportanceData[normalizedUrl] = [];
                        }
                        linkImportanceData[normalizedUrl].push(linkImportance);
                    }
                } catch (urlError) {
                    // Ignorer les URLs malformées
                    console.error(`URL malformée: ${href}`, urlError);
                }
            }

            return {
                links,
                cmsInfo
            };
        } catch (error) {
            console.error(`Erreur lors du crawl de ${url}:`, error);
            return {
                links: [],
                cmsInfo: null
            };
        }
    }

    /**
     * Calcule la profondeur d'une page (nombre de segments dans le chemin)
     * @param {string} url - URL de la page
     * @return {number} Profondeur de la page
     */
    function calculatePageDepth(url) {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
            return pathSegments.length;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Génère des détails supplémentaires sur les pages
     * @param {Array} crawledUrls - URLs crawlées
     * @param {Array} sitemapUrls - URLs du sitemap
     * @param {Object} linkContextData - Données de contexte des liens
     * @return {Object} Détails des pages
     */
    function generatePageDetails(crawledUrls, sitemapUrls, linkContextData) {
        const pageDetails = {};

        // Ajouter des détails pour chaque page crawlée
        crawledUrls.forEach(url => {
            pageDetails[url] = {
                inSitemap: sitemapUrls.includes(url),
                crawled: true,
                inboundLinks: 0,
                outboundLinks: 0,
                inboundImportance: 0,
                outboundImportance: 0,
                linkTypes: {},
                depth: calculatePageDepth(url)
            };
        });

        // Ajouter des détails pour les pages dans le sitemap mais non crawlées
        sitemapUrls.forEach(url => {
            if (!pageDetails[url]) {
                pageDetails[url] = {
                    inSitemap: true,
                    crawled: false,
                    inboundLinks: 0,
                    outboundLinks: 0,
                    inboundImportance: 0,
                    outboundImportance: 0,
                    linkTypes: {},
                    depth: -1 // Non calculable pour les pages non crawlées
                };
            }
        });

        // Calculer les liens entrants et sortants pour chaque page
        if (linkContextData) {
            // Liens entrants
            for (const targetUrl in linkContextData) {
                const contexts = linkContextData[targetUrl];

                if (pageDetails[targetUrl]) {
                    pageDetails[targetUrl].inboundLinks = contexts.length;

                    // Calculer l'importance totale des liens entrants
                    let totalInboundImportance = 0;
                    contexts.forEach(context => {
                        totalInboundImportance += context.importance || 0;

                        // Compter les types de liens
                        if (!pageDetails[targetUrl].linkTypes[context.context]) {
                            pageDetails[targetUrl].linkTypes[context.context] = 0;
                        }
                        pageDetails[targetUrl].linkTypes[context.context]++;
                    });

                    pageDetails[targetUrl].inboundImportance = totalInboundImportance;
                    pageDetails[targetUrl].avgInboundImportance =
                        contexts.length > 0 ? (totalInboundImportance / contexts.length).toFixed(3) : 0;
                }

                // Liens sortants
                contexts.forEach(context => {
                    const sourceUrl = context.fromUrl;
                    if (pageDetails[sourceUrl]) {
                        pageDetails[sourceUrl].outboundLinks++;
                        pageDetails[sourceUrl].outboundImportance += context.importance || 0;
                    }
                });
            }

            // Calculer les moyennes d'importance pour les liens sortants
            for (const url in pageDetails) {
                if (pageDetails[url].outboundLinks > 0) {
                    pageDetails[url].avgOutboundImportance =
                        (pageDetails[url].outboundImportance / pageDetails[url].outboundLinks).toFixed(3);
                } else {
                    pageDetails[url].avgOutboundImportance = 0;
                }
            }
        }

        return pageDetails;
    }

    // API publique du module
    return {
        crawlPage: crawlPage,
        calculatePageDepth: calculatePageDepth,
        generatePageDetails: generatePageDetails
    };
})();