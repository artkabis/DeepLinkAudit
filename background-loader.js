
// background-loader.js
// Ce script charge tous les modules nécessaires dans le contexte du service worker

// Charger d'abord le module qui définit le contexte global
importScripts('modules/shared/globalContext.js');

// Modules utilitaires
importScripts(
  'modules/utils/cmsDetection.js',
  'modules/utils/dataExport.js',
  'modules/utils/recommendations.js'
);

// Modules d'analyse
importScripts(
  'modules/analysis/linkContext.js',
  'modules/analysis/anchorQuality.js',
  'modules/analysis/contextDistribution.js',
  'modules/analysis/inTextAnalysis.js',
  'modules/analysis/pagerank.js',
  'modules/analysis/juiceLinkScore.js',
  'modules/analysis/performanceMetrics.js'
);

// Modules principaux
importScripts(
  'modules/core/sitemap.js',
  'modules/core/crawler.js',
  'modules/core/analyzer.js'
);

// Script principal du background
importScripts('background.js');