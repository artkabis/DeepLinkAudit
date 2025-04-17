// modules/analysis/linkContext.js
// Module pour la détection du contexte des liens et le calcul d'importance

LinkJuice.LinkContext = (function() {
    /**
     * Détermine le contexte d'un lien avec score d'importance
     * @param {string} linkHTML - HTML du lien
     * @param {string} fullHTML - HTML complet de la page
     * @return {Object} Type de contexte et score d'importance
     */
    function determineContext(linkHTML, fullHTML) {
        // Échapper les caractères spéciaux dans le HTML du lien pour l'utiliser dans une regex
        const escapedLinkHTML = linkHTML.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const classMatch = linkHTML.match(/class=["']([^"']*)["']/i);
        const classNames = classMatch ? classMatch[1].split(/\s+/) : [];

        // Vérification directe pour les éléments de navigation
        if (classNames.some(cls =>
            cls.includes('nav') ||
            cls.includes('menu') ||
            cls.includes('header') ||
            cls.includes('footer') ||
            cls.includes('unifiednav') ||  // Spécifique à Duda
            cls.includes('dmNav'))) {      // Spécifique à Duda
            return { type: 'menu', score: 0.6 };
        }

        // Détection spécifique de Duda
        if (classNames.some(cls => cls.startsWith('dm') || cls.includes('duda'))) {
            // Éléments de menu Duda
            if (classNames.some(cls => cls.includes('NavItem') || cls.includes('nav-item'))) {
                return { type: 'duda-menu', score: 0.6 };
            }
            // Boutons Duda
            if (classNames.some(cls => cls.includes('Button') || cls.includes('btn'))) {
                return { type: 'duda-button', score: 0.7 };
            }
            // Autres éléments Duda
            return { type: 'duda-element', score: 0.5 };
        }

        // Patterns génériques - basés sur la structure sémantique HTML
        const semanticPatterns = [
            // Navigation et menus
            { type: 'menu', regex: /<(nav|ul|menu)[^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/(nav|ul|menu)>/i, score: 0.6 },
            { type: 'menu', regex: /<div[^>]*class=["'][^"']*\b(menu|navigation|navbar|main-menu|primary-menu|menu-container)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/div>/i, score: 0.6 },

            // Boutons
            { type: 'button', regex: /<button[^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/button>/i, score: 0.7 },
            { type: 'button', regex: /<a[^>]*class=["'][^"']*\b(btn|button|wp-block-button__link)\b[^"']*["'][^>]*>/, score: 0.7 },

            // Appels à l'action
            { type: 'CTA', regex: /<div[^>]*class=["'][^"']*\b(cta|call-to-action|action)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/div>/i, score: 0.8 },
            { type: 'CTA', regex: /<a[^>]*class=["'][^"']*\b(cta|call-to-action|hero-button|primary-button)\b[^"']*["'][^>]*>/i, score: 0.8 },

            // Pieds de page
            { type: 'footer', regex: /<footer[^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/footer>/i, score: 0.5 },
            { type: 'footer', regex: /<div[^>]*class=["'][^"']*\b(footer|site-footer|page-footer)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/div>/i, score: 0.5 },
            { type: 'footer', regex: /<div[^>]*id=["'](footer|site-footer|page-footer)["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/div>/i, score: 0.5 },

            // En-têtes
            { type: 'header', regex: /<header[^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/header>/i, score: 0.6 },
            { type: 'header', regex: /<div[^>]*class=["'][^"']*\b(header|site-header|page-header)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/div>/i, score: 0.6 },
            { type: 'header', regex: /<div[^>]*id=["'](header|site-header|page-header)["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/div>/i, score: 0.6 },

            // Barre latérale
            { type: 'sidebar', regex: /<(aside|div)[^>]*class=["'][^"']*\b(sidebar|widget-area|side-column)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/(aside|div)>/i, score: 0.5 },

            // Breadcrumbs
            { type: 'breadcrumb', regex: /<(div|nav|ul)[^>]*class=["'][^"']*\b(breadcrumb|breadcrumbs|trail-items)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/(div|nav|ul)>/i, score: 0.7 },
        ];

        // Patterns spécifiques aux CMS et Builders
        const cmsPatterns = [
            // WordPress
            { type: 'wp-menu', regex: /<ul[^>]*class=["'][^"']*\b(menu|main-menu|primary-menu|nav-menu|wp-nav)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/ul>/i, score: 0.6 },
            { type: 'wp-widget', regex: /<(div|aside)[^>]*class=["'][^"']*\b(widget|wp-block-widget)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/(div|aside)>/i, score: 0.5 },
            { type: 'wp-post-navigation', regex: /<(div|nav)[^>]*class=["'][^"']*\b(post-navigation|nav-links|pagination)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/(div|nav)>/i, score: 0.7 },
            { type: 'wp-featured-image', regex: /<a[^>]*class=["'][^"']*\b(post-thumbnail|featured-image)\b[^"']*["'][^>]*>/i, score: 0.8 },

            // Autres CMS (Duda, Webflow, Wix, etc.)
            // ...
        ];

        // Patterns de contenu
        const contentPatterns = [
            // Liens dans le contenu principal
            { type: 'content-main', regex: /<(main|article|section)[^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/(main|article|section)>/i, score: 0.9 },
            { type: 'content-main', regex: /<div[^>]*class=["'][^"']*\b(content|main-content|entry-content|post-content|page-content)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/div>/i, score: 0.9 },

            // Paragraphes
            { type: 'paragraph', regex: /<p[^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/p>/i, score: 0.8 },

            // Liens d'image
            { type: 'image', regex: /<a[^>]*>[\s\S]*?<img[^>]+>[\s\S]*?<\/a>/i, score: 0.7 },

            // Cartes / Blocs
            { type: 'card', regex: /<(div|article)[^>]*class=["'][^"']*\b(card|block|box|item|tile)\b[^"']*["'][^>]*>[\s\S]*?LINK_PLACEHOLDER[\s\S]*?<\/(div|article)>/i, score: 0.7 },
        ];

        // Catégories spéciales
        const specialPatterns = [
            // Réseaux sociaux
            { type: 'social', regex: /<a[^>]*class=["'][^"']*\b(social|social-link|social-icon|share|facebook|twitter|instagram|linkedin)\b[^"']*["'][^>]*>/i, score: 0.4 },
            { type: 'social', regex: /<a[^>]*href=["']https?:\/\/(www\.)?(facebook|twitter|linkedin|instagram|youtube|pinterest)\.[a-z]+/i, score: 0.4 },

            // Liens externes
            { type: 'external', regex: /<a[^>]*target=["']_blank["'][^>]*>/i, score: 0.6 },
            { type: 'external', regex: /<a[^>]*rel=["'][^"']*noopener[^"']*["'][^>]*>/i, score: 0.6 },

            // Liens d'auteur
            { type: 'author', regex: /<a[^>]*class=["'][^"']*\b(author|byline)\b[^"']*["'][^>]*>/i, score: 0.7 },

            // Liens de tag ou catégorie
            { type: 'taxonomy', regex: /<a[^>]*class=["'][^"']*\b(tag|category|cat-link|term)\b[^"']*["'][^>]*>/i, score: 0.6 },
        ];

        // Combiner tous les patterns
        const allPatterns = [...semanticPatterns, ...cmsPatterns, ...contentPatterns, ...specialPatterns];

        // Structure pour stocker les correspondances trouvées
        const matches = [];

        // Tester chaque pattern et stocker les correspondances
        for (const pattern of allPatterns) {
            const regexPattern = pattern.regex.source.replace('LINK_PLACEHOLDER', escapedLinkHTML);
            const regex = new RegExp(regexPattern, 'i');
            if (regex.test(fullHTML)) {
                matches.push({
                    type: pattern.type,
                    score: pattern.score
                });
            }
        }

        // Si aucune correspondance n'est trouvée, retourner un type par défaut
        if (matches.length === 0) {
            if (linkHTML.includes('dmUDNavigationItem') || linkHTML.includes('unifiednav__item')) {
                return { type: 'duda-menu', score: 0.6 };
            }
            // Vérifier si le lien contient une image
            if (/<img[^>]+>/i.test(linkHTML)) {
                return { type: 'image', score: 0.7 };
            }
            return { type: 'content', score: 0.5 };
        }

        // Trier les correspondances par score (du plus élevé au plus bas)
        matches.sort((a, b) => b.score - a.score);

        // Retourner le type et le score du pattern avec le score le plus élevé
        return matches[0];
    }

    /**
     * Extrait et calcule les attributs supplémentaires du lien
     * @param {string} linkHTML - HTML du lien
     * @return {Object} Attributs du lien
     */
    function extractLinkAttributes(linkHTML) {
        const attributes = {
            hasImage: /<img[^>]+>/i.test(linkHTML),
            hasIcon: /<i[^>]*class=["'][^"']*\b(fa|icon|material-icons)\b[^"']*["'][^>]*>/i.test(linkHTML),
            hasButton: /class=["'][^"']*\b(btn|button)\b[^"']*["']/i.test(linkHTML),
            isDownload: /download(=["'][^"']*["'])?/i.test(linkHTML),
            isNewTab: /target=["']_blank["']/i.test(linkHTML),
            isNoFollow: /rel=["'][^"']*nofollow[^"']*["']/i.test(linkHTML),
            isExternal: /href=["']https?:\/\/(?!www\.yourdomain\.com)/i.test(linkHTML)
        };

        return attributes;
    }

    /**
     * Calcule l'importance d'un lien
     * @param {string} linkHTML - HTML du lien
     * @param {string} fullHTML - HTML complet de la page
     * @param {string} sourceUrl - URL source
     * @param {string} targetUrl - URL cible
     * @return {Object} Informations sur l'importance du lien
     */
    function calculateLinkImportance(linkHTML, fullHTML, sourceUrl, targetUrl) {
        // Déterminer le contexte du lien
        const context = determineContext(linkHTML, fullHTML);

        // Extraire les attributs du lien
        const attributes = extractLinkAttributes(linkHTML);

        // Extraire le texte d'ancrage
        const anchorTextMatch = linkHTML.match(/>([^<]+)</);
        const anchorText = anchorTextMatch ? anchorTextMatch[1].trim() : '';

        // Calculer l'importance initiale basée sur le contexte
        let importance = context.score;

        // Vérifier si le lien est inText (dans un paragraphe ou contenu principal)
        const isInText = ['paragraph', 'content', 'content-main'].includes(context.type);

        // Bonus d'importance pour les liens inText
        if (isInText) importance += 0.15;

        // Ajuster l'importance en fonction des attributs
        if (attributes.hasImage) importance += 0.1;
        if (attributes.hasButton) importance += 0.1;
        if (attributes.isDownload) importance += 0.05;
        if (attributes.isNewTab) importance -= 0.05;
        if (attributes.isNoFollow) importance -= 0.1;
        if (attributes.isExternal) importance -= 0.05;

        // Ajuster en fonction de la qualité du texte d'ancrage
        if (anchorText.length > 10) importance += 0.05;
        if (anchorText.length > 20) importance += 0.05;

        // Normaliser l'importance entre 0 et 1
        importance = Math.max(0, Math.min(1, importance));

        return {
            sourceUrl: sourceUrl,
            targetUrl: targetUrl,
            context: context.type,
            contextScore: context.score,
            importance: importance,
            attributes: attributes,
            anchorText: anchorText,
            isInText: isInText
        };
    }

    // API publique du module
    return {
        determineContext: determineContext,
        extractLinkAttributes: extractLinkAttributes,
        calculateLinkImportance: calculateLinkImportance
    };
})();