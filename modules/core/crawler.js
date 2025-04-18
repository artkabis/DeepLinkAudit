// modules/core/crawler.js
// Module pour le crawling des pages web et l'extraction des liens - Version optimisée avec codes de statut

LinkJuice.Crawler = (function() {
    // Configuration du crawler
    const CONFIG = {
        MAX_REDIRECTS: 3,        // Nombre maximum de redirections à suivre
        TIMEOUT_MS: 10000,       // Timeout pour les requêtes fetch en ms
        LINK_LIMIT: 2000,        // Limite du nombre de liens extraits par page
        CHECK_LINKS: true,       // Activer la vérification des statuts HTTP des liens
        MAX_LINKS_TO_CHECK: 200, // Limite de liens à vérifier par page
        CHUNK_SIZE: 20,          // Nombre de vérifications simultanées
        URL_BLACKLIST: [         // Extensions/motifs d'URL à ignorer
            '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar', '.doc', '.docx', 
            '.xls', '.xlsx', '.ppt', '.pptx', '.mp3', '.mp4', '.avi', '.mov',
            '/wp-login', '/wp-admin', '/feed/', '/xmlrpc.php',
            'javascript:', 'tel:', 'mailto:', 'sms:', 'whatsapp:', 'viber:'
        ]
    };

    // Cache des statuts HTTP (pour éviter de vérifier plusieurs fois la même URL)
    const httpStatusCache = {};

    /**
     * Nettoie et normalise une URL
     * @param {string} href - URL à nettoyer
     * @param {string} baseUrl - URL de base pour résoudre les URLs relatives
     * @return {string|null} URL normalisée ou null si invalide
     */
    function normalizeUrl(href, baseUrl) {
        if (!href || typeof href !== 'string') return null;
        
        // Ignorer les ancres et protocoles spéciaux
        if (href.startsWith('#')) return null;
        
        // Vérifier les motifs à blacklister
        if (CONFIG.URL_BLACKLIST.some(pattern => href.includes(pattern))) {
            return null;
        }
        
        try {
            // Résoudre les URLs relatives
            let absoluteUrl;
            
            if (href.startsWith('/')) {
                // URL relative à la racine du domaine
                const urlObj = new URL(baseUrl);
                absoluteUrl = urlObj.origin + href;
            } else if (!href.startsWith('http')) {
                // URL relative au chemin courant
                const baseUrlObj = new URL(baseUrl);
                const basePath = baseUrlObj.pathname.endsWith('/') 
                    ? baseUrlObj.pathname 
                    : baseUrlObj.pathname.substring(0, baseUrlObj.pathname.lastIndexOf('/') + 1);
                absoluteUrl = baseUrlObj.origin + basePath + href;
            } else {
                // Déjà une URL absolue
                absoluteUrl = href;
            }
            
            // Créer un objet URL pour normalisation
            const urlObj = new URL(absoluteUrl);
            
            // Nettoyer l'URL
            urlObj.hash = ''; // Supprimer les fragments
            
            // Normaliser le protocole (préférer https)
            if (urlObj.protocol === 'http:' && baseUrl.startsWith('https:')) {
                urlObj.protocol = 'https:';
            }
            
            // Supprimer les paramètres UTM et autres trackers courants
            const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
            paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
            
            // Retourner l'URL normalisée
            const normalizedUrl = urlObj.toString()
                .replace(/\/$/, '') // Supprimer le slash final (uniformisation)
                .replace(/^http:\/\//, 'https://') // Uniformiser vers https
                .replace(/httphttps:\/\//, 'https://'); // Correction d'un bug potentiel
                
            // Vérifier les motifs d'URL suspects
            if (normalizedUrl.includes('$')) {
                console.warn(`URL potentiellement malformée détectée et filtrée: ${normalizedUrl}`);
                return null;
            }
            
            return normalizedUrl;
        } catch (error) {
            console.warn(`URL malformée ignorée: ${href}`, error);
            return null;
        }
    }
    
    /**
     * Effectue une requête fetch avec gestion des timeouts et redirections
     * @param {string} url - URL à crawler
     * @return {Promise<{html: string, finalUrl: string, status: number, redirectedFrom: string|null}>} HTML et métadonnées
     */
    async function fetchWithTimeout(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
            
            const response = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 LinkJuice Checker Bot'
                }
            });
            
            clearTimeout(timeoutId);
            
            // Suivre les redirections manuellement pour capturer les codes 301/302
            const redirectedFrom = response.redirected ? url : null;
            
            const html = await response.text();
            return {
                html,
                finalUrl: response.url,  // URL finale après redirections
                status: response.status,
                redirected: response.redirected,
                redirectedFrom: redirectedFrom
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`Timeout dépassé (${CONFIG.TIMEOUT_MS}ms): ${url}`);
            }
            throw error;
        }
    }
    
    /**
     * Vérifie le statut HTTP d'une URL sans télécharger tout le contenu
     * @param {string} url - URL à vérifier
     * @return {Promise<{status: number, redirected: boolean, redirectUrl: string|null}>} Informations de statut
     */
    async function checkUrlStatus(url) {
        // Vérifier si on a déjà cette URL dans le cache
        if (httpStatusCache[url]) {
            return httpStatusCache[url];
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS / 2); // Timeout plus court pour les vérifications
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'HEAD',  // Utiliser HEAD pour ne pas télécharger le contenu
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 LinkJuice Checker Bot'
                }
            });
            
            clearTimeout(timeoutId);
            
            const result = {
                status: response.status,
                redirected: response.redirected,
                redirectUrl: response.redirected ? response.url : null
            };
            
            // Sauvegarder dans le cache
            httpStatusCache[url] = result;
            console.log(`HEAD Résultat pour ${url}:`, result);
            return result;
        } catch (error) {
            // Si HEAD échoue, on essaie avec GET (certains serveurs ne supportent pas HEAD)
            console.log('HHHHHHHHHHHHHHHead échoué on passe à GET')
            if (error.name !== 'AbortError') {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS / 2);
                    
                    const response = await fetch(url, {
                        signal: controller.signal,
                        method: 'GET',
                        redirect: 'follow',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 LinkJuice Checker Bot'
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    const result = {
                        status: response.status,
                        redirected: response.redirected,
                        redirectUrl: response.redirected ? response.url : null
                    };
                    
                    // Sauvegarder dans le cache
                    httpStatusCache[url] = result;
                    console.log(`GET Résultat pour ${url}:`, result);
                    return result;
                } catch (getError) {
                    console.log(`>>>>>>>>>>>>>Error total du traitement des requêtes ::::: pour ${url}:`, result);
                    // Si les deux méthodes échouent
                    const result = {
                        status: 0,  // 0 = erreur de connexion
                        redirected: false,
                        redirectUrl: null,
                        error: getError.message
                    };
                    
                    httpStatusCache[url] = result;
                    return result;
                }
            } else {
                // Timeout
                const result = {
                    status: 0,
                    redirected: false,
                    redirectUrl: null,
                    error: 'Timeout'
                };
                
                httpStatusCache[url] = result;
                return result;
            }
        }
    }
    
    /**
     * Vérifie les statuts HTTP des liens par lots pour éviter de surcharger le serveur
     * @param {Array<string>} urls - URLs à vérifier
     * @return {Promise<Object>} Map des URLs à leurs statuts
     */
    async function checkLinksStatusInChunks(urls) {
        const results = {};
        const uniqueUrls = [...new Set(urls)]; // Dédoublonner les URLs
        const urlsToCheck = uniqueUrls.slice(0, CONFIG.MAX_LINKS_TO_CHECK);
        
        console.log(`Vérification des statuts HTTP pour ${urlsToCheck.length} liens...`);
        
        // Traiter par lots
        for (let i = 0; i < urlsToCheck.length; i += CONFIG.CHUNK_SIZE) {
            const chunk = urlsToCheck.slice(i, i + CONFIG.CHUNK_SIZE);
            
            // Vérifier en parallèle les URLs du lot
            const chunkPromises = chunk.map(async url => {
                try {
                    const status = await checkUrlStatus(url);
                    results[url] = status;
                    console.log('>>>>>>>>>>>>>>> ',url, status);
                    return { url, status };
                } catch (error) {
                    results[url] = { 
                        status: 0, 
                        redirected: false, 
                        redirectUrl: null,
                        error: error.message 
                    };
                    return { url, error: error.message };
                }
            });
            
            await Promise.all(chunkPromises);
            console.log(`Traitement du lot ${i/CONFIG.CHUNK_SIZE + 1}/${Math.ceil(urlsToCheck.length/CONFIG.CHUNK_SIZE)} terminé.`);
        }
        
        return results;
    }
    
    /**
     * Extrait les liens d'une page HTML
     * @param {string} html - Contenu HTML
     * @param {string} baseUrl - URL de base pour la résolution des liens relatifs
     * @return {Array<{href: string, text: string, html: string}>} Liens extraits
     */
    function extractLinks(html, baseUrl) {
        const links = [];
        const hrefRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g;
        let match;
        let count = 0;
        
        while ((match = hrefRegex.exec(html)) !== null && count < CONFIG.LINK_LIMIT) {
            const href = match[1];
            const linkText = match[2].replace(/<[^>]*>/g, '').trim();
            const fullLinkHTML = match[0];
            
            const normalizedUrl = normalizeUrl(href, baseUrl);
            if (normalizedUrl) {
                links.push({
                    href: normalizedUrl,
                    text: linkText,
                    html: fullLinkHTML
                });
                count++;
            }
        }
        
        return links;
    }
    
    /**
     * Détecte si deux URLs pointent vers la même page (canonicalisées)
     * @param {string} url1 - Première URL
     * @param {string} url2 - Deuxième URL
     * @return {boolean} True si les URLs sont équivalentes
     */
    function areUrlsEquivalent(url1, url2) {
        try {
            // Comparer les URL sans protocole, sans www., sans paramètres et sans slash final
            const normalize = url => {
                const u = new URL(url);
                let hostname = u.hostname.replace(/^www\./, '');
                let path = u.pathname;
                if (path.endsWith('/')) path = path.slice(0, -1);
                return hostname + path;
            };
            
            return normalize(url1) === normalize(url2);
        } catch (e) {
            return false;
        }
    }

    /**
     * Crawle une page web et extrait ses liens
     * @param {string} url - URL de la page à crawler
     * @param {Object} linkContextData - Données de contexte des liens (mis à jour par référence)
     * @param {Object} linkImportanceData - Données d'importance des liens (mis à jour par référence)
     * @param {Object} linkStatusData - Données de statut HTTP des liens (mis à jour par référence)
     * @return {Promise<{links: Array, cmsInfo: Object, status: Object}>} Résultats du crawl
     */
    async function crawlPage(url, linkContextData, linkImportanceData, linkStatusData = {}) {
        try {
            console.log(`Crawling: ${url}`);
            
            // Effectuer la requête avec gestion des timeouts
            const { html, finalUrl, status, redirected, redirectedFrom } = await fetchWithTimeout(url);
            
            // Stocker le statut HTTP de cette page
            const statusInfo = {
                status: status,
                redirected: redirected,
                redirectedFrom: redirectedFrom,
                redirectUrl: redirected ? finalUrl : null,
                checked: new Date().toISOString()
            };
            
            // Si linkStatusData est fourni, y stocker le statut
            if (linkStatusData) {
                linkStatusData[url] = statusInfo;
                // Si redirigé, stocker aussi l'info pour l'URL finale
                if (redirected && finalUrl !== url) {
                    linkStatusData[finalUrl] = {
                        status: status,
                        redirected: false,  // L'URL finale n'est pas elle-même redirigée
                        redirectedFrom: url,
                        redirectUrl: null,
                        checked: new Date().toISOString()
                    };
                }
            }
            
            // Si l'URL a été redirigée, utiliser l'URL finale
            const effectiveUrl = finalUrl || url;
            
            // Détecter le CMS
            const cmsInfo = LinkJuice.CMSDetection.detectCMS(html);
            
            // Extraire les liens
            const extractedLinks = extractLinks(html, effectiveUrl);
            console.log(`Extracted ${extractedLinks.length} links from ${effectiveUrl}`);
            
            // Filtrer pour garder uniquement les liens internes
            const internalLinks = [];
            const allLinksUrls = [];
            const baseUrlHostname = new URL(effectiveUrl).hostname;
            
            extractedLinks.forEach(({ href, text, html: linkHtml }) => {
                try {
                    const linkUrl = new URL(href);
                    allLinksUrls.push(href);
                    
                    // Vérifier si c'est un lien interne
                    if (linkUrl.hostname === baseUrlHostname) {
                        internalLinks.push(href);
                        
                        // Déterminer le contexte et l'importance du lien
                        const linkImportance = LinkJuice.LinkContext.calculateLinkImportance(
                            linkHtml, html, effectiveUrl, href
                        );
                        
                        // Stocker les informations de contexte
                        if (!linkContextData[href]) {
                            linkContextData[href] = [];
                        }
                        
                        linkContextData[href].push({
                            fromUrl: effectiveUrl,
                            context: linkImportance.context,
                            contextScore: linkImportance.contextScore,
                            linkText: text,
                            fullLinkHTML: linkHtml,
                            importance: linkImportance.importance,
                            attributes: linkImportance.attributes,
                            isInText: linkImportance.isInText,
                            anchorText: linkImportance.anchorText
                        });
                        
                        // Stocker les données d'importance
                        if (!linkImportanceData[href]) {
                            linkImportanceData[href] = [];
                        }
                        linkImportanceData[href].push(linkImportance);
                    }
                } catch (urlError) {
                    // Ignorer les URLs malformées
                    console.error(`Erreur de traitement d'URL: ${href}`, urlError);
                }
            });
            
            // Vérifier les statuts HTTP des liens si activé
            if (CONFIG.CHECK_LINKS && linkStatusData) {
                const linksStatusResults = await checkLinksStatusInChunks(allLinksUrls);
                
                // Fusionner les résultats dans linkStatusData
                Object.assign(linkStatusData, linksStatusResults);
            }
            
            return {
                links: internalLinks,
                cmsInfo,
                status: statusInfo
            };
        } catch (error) {
            console.error(`Erreur lors du crawl de ${url}:`, error);
            
            // Stocker l'erreur dans le statut
            const errorStatus = {
                status: 0,
                redirected: false,
                redirectUrl: null,
                error: error.message,
                checked: new Date().toISOString()
            };
            
            // Si linkStatusData est fourni, y stocker le statut
            if (linkStatusData) {
                linkStatusData[url] = errorStatus;
            }
            
            return {
                links: [],
                cmsInfo: null,
                status: errorStatus
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
            // Ignorer les segments vides et index.html, etc.
            const pathSegments = urlObj.pathname
                .split('/')
                .filter(segment => {
                    return segment.length > 0 && 
                           !segment.match(/^(index|default|home)\.(html|htm|php|asp|aspx)$/i);
                });
            return pathSegments.length;
        } catch (e) {
            console.warn(`Erreur lors du calcul de la profondeur pour ${url}:`, e);
            return 0;
        }
    }

    /**
     * Génère des détails supplémentaires sur les pages
     * @param {Array} crawledUrls - URLs crawlées
     * @param {Array} sitemapUrls - URLs du sitemap
     * @param {Object} linkContextData - Données de contexte des liens
     * @param {Object} linkStatusData - Données de statut HTTP des liens
     * @return {Object} Détails des pages
     */
    function generatePageDetails(crawledUrls, sitemapUrls, linkContextData, linkStatusData = {}) {
        const pageDetails = {};
        console.log("generatePageDetails appelé avec linkStatusData:", {
            disponible: !!linkStatusData,
            nombreEntrees: Object.keys(linkStatusData).length,
            exemples: Object.keys(linkStatusData).slice(0, 3)
        });

        // Préparer des ensembles pour des recherches plus efficaces
        const crawledUrlsSet = new Set(crawledUrls);
        const sitemapUrlsSet = new Set(sitemapUrls);

        // Ajouter des détails pour chaque page crawlée
        crawledUrls.forEach(url => {
            const status = linkStatusData[url] || { 
                status: "unknown", 
                redirected: false, 
                redirectUrl: null 
            };
            const statusInfo = linkStatusData[url];
            console.log(`Statut pour ${url}:`, statusInfo);
            pageDetails[url] = {
                inSitemap: sitemapUrlsSet.has(url) || hasCanonicalVariant(url, sitemapUrlsSet),
                crawled: true,
                inboundLinks: 0,
                outboundLinks: 0,
                inboundImportance: 0,
                outboundImportance: 0,
                linkTypes: {},
                depth: calculatePageDepth(url),
                // Utiliser le statut récupéré ou "unknown" par défaut
                httpStatus: statusInfo ? statusInfo.status : "unknown",
                redirected: statusInfo ? statusInfo.redirected : false,
                redirectUrl: statusInfo ? statusInfo.redirectUrl : null,
                redirectedFrom: statusInfo ? statusInfo.redirectedFrom : null,
                brokenLinks: {
                    count: 0,
                    urls: []
                }
            };
        });

        // Ajouter des détails pour les pages dans le sitemap mais non crawlées
        sitemapUrls.forEach(url => {
            if (!pageDetails[url]) {
                const status = linkStatusData[url] || { status: 'unknown' };
                
                pageDetails[url] = {
                    inSitemap: true,
                    crawled: crawledUrlsSet.has(url) || hasCanonicalVariant(url, crawledUrlsSet),
                    inboundLinks: 0,
                    outboundLinks: 0,
                    inboundImportance: 0,
                    outboundImportance: 0,
                    linkTypes: {},
                    depth: calculatePageDepth(url),
                    httpStatus: status.status,
                    redirected: status.redirected || false,
                    redirectUrl: status.redirectUrl || null,
                    redirectedFrom: status.redirectedFrom || null,
                    brokenLinks: {
                        count: 0,
                        urls: []
                    }
                };
            }
        });

        // Calculer les liens entrants et sortants pour chaque page
        if (linkContextData) {
            // Calculer les liens entrants
            for (const targetUrl in linkContextData) {
                const contexts = linkContextData[targetUrl];
                
                // Créer la page cible si elle n'existe pas encore
                if (!pageDetails[targetUrl]) {
                    const status = linkStatusData[targetUrl] || { status: 'unknown' };
                    
                    pageDetails[targetUrl] = {
                        inSitemap: sitemapUrlsSet.has(targetUrl),
                        crawled: crawledUrlsSet.has(targetUrl),
                        inboundLinks: 0,
                        outboundLinks: 0,
                        inboundImportance: 0,
                        outboundImportance: 0,
                        linkTypes: {},
                        depth: calculatePageDepth(targetUrl),
                        httpStatus: status.status,
                        redirected: status.redirected || false,
                        redirectUrl: status.redirectUrl || null,
                        redirectedFrom: status.redirectedFrom || null,
                        brokenLinks: {
                            count: 0,
                            urls: []
                        }
                    };
                }
                
                pageDetails[targetUrl].inboundLinks = contexts.length;
                
                // Calculer l'importance totale des liens entrants
                let totalInboundImportance = 0;
                
                // Traiter les liens et leur origine
                contexts.forEach(context => {
                    totalInboundImportance += context.importance || 0;
                    
                    // Compter les types de liens
                    if (!pageDetails[targetUrl].linkTypes[context.context]) {
                        pageDetails[targetUrl].linkTypes[context.context] = 0;
                    }
                    pageDetails[targetUrl].linkTypes[context.context]++;
                    
                    // Traiter les liens sortants de la page source
                    const sourceUrl = context.fromUrl;
                    
                    // Créer la page source si elle n'existe pas encore
                    if (!pageDetails[sourceUrl]) {
                        const status = linkStatusData[sourceUrl] || { status: 'unknown' };
                        
                        pageDetails[sourceUrl] = {
                            inSitemap: sitemapUrlsSet.has(sourceUrl),
                            crawled: crawledUrlsSet.has(sourceUrl),
                            inboundLinks: 0,
                            outboundLinks: 0,
                            inboundImportance: 0,
                            outboundImportance: 0,
                            linkTypes: {},
                            depth: calculatePageDepth(sourceUrl),
                            httpStatus: status.status,
                            redirected: status.redirected || false,
                            redirectUrl: status.redirectUrl || null,
                            redirectedFrom: status.redirectedFrom || null,
                            brokenLinks: {
                                count: 0,
                                urls: []
                            }
                        };
                    }
                    
                    pageDetails[sourceUrl].outboundLinks++;
                    pageDetails[sourceUrl].outboundImportance += context.importance || 0;
                    
                    // Vérifier si c'est un lien cassé
                    const targetStatus = linkStatusData[targetUrl] || { status: 'unknown' };
                    if (targetStatus.status >= 400 || targetStatus.status === 0) {
                        pageDetails[sourceUrl].brokenLinks.count++;
                        if (!pageDetails[sourceUrl].brokenLinks.urls.includes(targetUrl)) {
                            pageDetails[sourceUrl].brokenLinks.urls.push(targetUrl);
                        }
                    }
                });
                
                pageDetails[targetUrl].inboundImportance = totalInboundImportance;
                pageDetails[targetUrl].avgInboundImportance = contexts.length > 0 
                    ? (totalInboundImportance / contexts.length).toFixed(3) 
                    : 0;
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
    
    /**
     * Vérifie si une URL a une variante canonique dans l'ensemble fourni
     * @param {string} url - URL à vérifier
     * @param {Set} urlSet - Ensemble d'URLs à comparer
     * @return {boolean} Vrai si une variante est trouvée
     */
    function hasCanonicalVariant(url, urlSet) {
        try {
            const normalizedUrl = url.replace(/\/$/, '').replace(/^http:/, 'https:');
            
            for (const candidate of urlSet) {
                const normalizedCandidate = candidate.replace(/\/$/, '').replace(/^http:/, 'https:');
                if (areUrlsEquivalent(normalizedUrl, normalizedCandidate)) {
                    return true;
                }
            }
            
            return false;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Génère un rapport statistique des codes HTTP
     * @param {Object} linkStatusData - Données de statut HTTP des liens
     * @return {Object} Statistiques des codes HTTP
     */
    function generateStatusReport(linkStatusData) {
        const stats = {
            total: Object.keys(linkStatusData).length,
            statusCodes: {},
            redirects: 0,
            brokenLinks: 0,
            successful: 0,
            unknown: 0
        };
        
        // Compiler les statistiques
        for (const url in linkStatusData) {
            const status = linkStatusData[url];
            const statusCode = status.status || 'unknown';
            
            // Compter par code HTTP
            if (!stats.statusCodes[statusCode]) {
                stats.statusCodes[statusCode] = {
                    count: 0,
                    urls: []
                };
            }
            stats.statusCodes[statusCode].count++;
            
            // Limiter le nombre d'URLs stockées pour éviter une surcharge mémoire
            if (stats.statusCodes[statusCode].urls.length < 100) {
                stats.statusCodes[statusCode].urls.push(url);
            }
            
            // Catégoriser par type
            if (statusCode >= 200 && statusCode < 300) {
                stats.successful++;
            } else if (statusCode >= 300 && statusCode < 400) {
                stats.redirects++;
            } else if (statusCode >= 400 || statusCode === 0) {
                stats.brokenLinks++;
            } else {
                stats.unknown++;
            }
        }
        
        // Calculer les pourcentages
        if (stats.total > 0) {
            stats.percentages = {
                successful: (stats.successful / stats.total * 100).toFixed(2),
                redirects: (stats.redirects / stats.total * 100).toFixed(2),
                brokenLinks: (stats.brokenLinks / stats.total * 100).toFixed(2),
                unknown: (stats.unknown / stats.total * 100).toFixed(2)
            };
        }
        
        return stats;
    }
    
    /**
     * Vérifie les statuts HTTP de toutes les URLs trouvées
     * @param {Array} urls - Liste d'URLs à vérifier
     * @param {Object} existingStatusData - Données de statut existantes (optionnel)
     * @return {Promise<Object>} Données de statut mises à jour
     */
    async function checkAllUrlsStatus(urls, existingStatusData = {}) {
        console.log(`Vérification des statuts HTTP pour ${urls.length} URLs...`);
        
        // Copier les données existantes
        const statusData = { ...existingStatusData };
        
        // Vérifier les statuts par lots
        const results = await checkLinksStatusInChunks(urls);
        
        // Fusionner les résultats
        Object.assign(statusData, results);
        
        return statusData;
    }

    // API publique du module
    return {
        crawlPage: crawlPage,
        calculatePageDepth: calculatePageDepth,
        generatePageDetails: generatePageDetails,
        
        // Nouvelles fonctions pour les statuts HTTP
        checkUrlStatus: checkUrlStatus,
        checkAllUrlsStatus: checkAllUrlsStatus,
        generateStatusReport: generateStatusReport,
        
        
// Exposer des fonctions utilitaires pour les tests
utils: {
    normalizeUrl: normalizeUrl,
    areUrlsEquivalent: areUrlsEquivalent,
    extractLinks: extractLinks,
    fetchWithTimeout: fetchWithTimeout
},

// Exposer la configuration pour permettre des modifications
getConfig: () => ({ ...CONFIG }),
setConfig: (newConfig) => {
    Object.assign(CONFIG, newConfig);
    return { ...CONFIG };
},

// Exposer les données de cache des statuts HTTP
getStatusCache: () => ({ ...httpStatusCache }),
clearStatusCache: () => {
    for (const key in httpStatusCache) {
        delete httpStatusCache[key];
    }
    return true;
}
};
})();