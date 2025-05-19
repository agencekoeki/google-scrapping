// background.js - Service Worker refactorisé
import { CONFIG } from './js/config.js';
import { logger } from './js/logger.js';
import { Utils } from './js/utils.js';

class BackgroundService {
    constructor() {
        this.activeSearches = new Map();
        this.setupEventListeners();
        this.initializeService();
    }
    
    async initializeService() {
        logger.info('Service Worker démarré');
        
        try {
            // Vérifier et nettoyer les données orphelines au démarrage
            await this.cleanupOrphanedData();
            
            // Initialiser les paramètres par défaut si nécessaire
            await this.initializeDefaultSettings();
            
            logger.success('Service Worker initialisé avec succès');
        } catch (error) {
            Utils.handleError(error, 'BackgroundService.initializeService');
        }
    }
    
    setupEventListeners() {
        // Gestionnaire des messages de l'extension
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Maintenir le canal ouvert pour les réponses asynchrones
        });
        
        // Gestionnaire d'installation/mise à jour
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });
        
        // Gestionnaire de démarrage de Chrome
        chrome.runtime.onStartup.addListener(() => {
            logger.info('Chrome redémarré, réinitialisation du service');
            this.activeSearches.clear();
        });
        
        // Gestionnaire de fermeture d'onglets
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            this.handleTabClosed(tabId);
        });
        
        // Gestionnaire d'erreurs non capturées
        self.addEventListener('error', (event) => {
            Utils.handleError(event.error, 'BackgroundService.uncaughtError');
        });
        
        logger.debug('Event listeners configurés');
    }
    
    async handleMessage(request, sender, sendResponse) {
        const { action, data } = request;
        
        logger.debug('Message reçu:', { action, senderId: sender.id });
        
        try {
            switch (action) {
                case 'ping':
                    sendResponse({ status: 'ok', timestamp: Date.now() });
                    break;
                    
                case 'startBatchSearch':
                    await this.handleStartBatchSearch(data, sendResponse);
                    break;
                    
                case 'getSearchProgress':
                    this.handleGetSearchProgress(data.searchId, sendResponse);
                    break;
                    
                case 'cancelSearch':
                    await this.handleCancelSearch(data.searchId, sendResponse);
                    break;
                    
                case 'getActiveSearches':
                    sendResponse({ searches: Array.from(this.activeSearches.keys()) });
                    break;
                    
                case 'cleanupStorage':
                    await this.handleCleanupStorage(sendResponse);
                    break;
                    
                default:
                    sendResponse({ 
                        error: `Action non reconnue: ${action}`,
                        availableActions: [
                            'ping', 'startBatchSearch', 'getSearchProgress', 
                            'cancelSearch', 'getActiveSearches', 'cleanupStorage'
                        ]
                    });
            }
        } catch (error) {
            Utils.handleError(error, `BackgroundService.handleMessage.${action}`);
            sendResponse({ error: error.message });
        }
    }
    
    async handleInstallation(details) {
        logger.group('Gestion de l\'installation');
        
        try {
            const { reason, previousVersion } = details;
            
            switch (reason) {
                case 'install':
                    logger.info('Première installation de l\'extension');
                    await this.performFirstInstallation();
                    break;
                    
                case 'update':
                    logger.info('Mise à jour de l\'extension:', {
                        from: previousVersion,
                        to: chrome.runtime.getManifest().version
                    });
                    await this.performUpdate(previousVersion);
                    break;
                    
                case 'chrome_update':
                    logger.info('Mise à jour de Chrome détectée');
                    break;
                    
                default:
                    logger.warn('Raison d\'installation inconnue:', reason);
            }
        } catch (error) {
            Utils.handleError(error, 'BackgroundService.handleInstallation');
        } finally {
            logger.groupEnd();
        }
    }
    
    async performFirstInstallation() {
        // Définir les paramètres par défaut
        const defaultSettings = {
            debugMode: CONFIG.DEBUG.ENABLED,
            debugLevel: CONFIG.DEBUG.DEFAULT_LEVEL,
            defaultResultCount: CONFIG.SEARCH.DEFAULT_RESULT_COUNT,
            defaultDelay: CONFIG.SEARCH.DEFAULT_DELAY,
            installedVersion: chrome.runtime.getManifest().version,
            installDate: new Date().toISOString()
        };
        
        await chrome.storage.local.set(defaultSettings);
        
        // Ouvrir la page d'accueil si configurée
        const manifest = chrome.runtime.getManifest();
        if (manifest.homepage_url) {
            chrome.tabs.create({ url: manifest.homepage_url });
        }
        
        logger.success('Installation initiale terminée');
    }
    
    async performUpdate(previousVersion) {
        const currentVersion = chrome.runtime.getManifest().version;
        
        // Logique de migration selon les versions
        if (this.compareVersions(previousVersion, '2.0.0') < 0) {
            await this.migrateToV2();
        }
        
        // Mettre à jour la version stockée
        await chrome.storage.local.set({
            installedVersion: currentVersion,
            lastUpdateDate: new Date().toISOString(),
            previousVersion: previousVersion
        });
        
        logger.success('Mise à jour terminée');
    }
    
    async migrateToV2() {
        logger.info('Migration vers v2.0.0...');
        
        try {
            // Nettoyer les anciennes données si nécessaire
            const oldKeys = ['oldConfigKey1', 'oldConfigKey2']; // À adapter selon vos besoins
            await chrome.storage.local.remove(oldKeys);
            
            // Migrer les paramètres existants vers le nouveau format
            const existingData = await chrome.storage.local.get(null);
            
            // Exemples de migration
            if (existingData.oldDebugSetting !== undefined) {
                await chrome.storage.local.set({
                    debugMode: existingData.oldDebugSetting
                });
                await chrome.storage.local.remove(['oldDebugSetting']);
            }
            
            logger.success('Migration v2.0.0 terminée');
        } catch (error) {
            logger.error('Erreur lors de la migration:', error);
        }
    }
    
    compareVersions(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            
            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }
        
        return 0;
    }
    
    async handleStartBatchSearch(data, sendResponse) {
        const { queries, config, searchId } = data;
        
        logger.group('Démarrage recherche en lot');
        logger.info('Configuration:', { queries: queries.length, config, searchId });
        
        try {
            // Vérifier si une recherche avec cet ID est déjà active
            if (this.activeSearches.has(searchId)) {
                throw new Error(`Recherche ${searchId} déjà en cours`);
            }
            
            // Créer le contexte de recherche
            const searchContext = {
                id: searchId,
                queries: queries,
                config: config,
                startTime: Date.now(),
                status: 'running',
                progress: {
                    total: queries.length,
                    completed: 0,
                    failed: 0,
                    results: []
                },
                tabManager: new TabManager()
            };
            
            this.activeSearches.set(searchId, searchContext);
            
            // Démarrer le traitement asynchrone
            this.processBatchSearch(searchContext)
                .then(results => {
                    searchContext.status = 'completed';
                    searchContext.results = results;
                    logger.success('Recherche en lot terminée:', searchId);
                })
                .catch(error => {
                    searchContext.status = 'failed';
                    searchContext.error = error.message;
                    Utils.handleError(error, `BackgroundService.batchSearch.${searchId}`);
                })
                .finally(() => {
                    // Nettoyer après un délai
                    setTimeout(() => {
                        this.activeSearches.delete(searchId);
                    }, 300000); // 5 minutes
                });
            
            sendResponse({ 
                success: true, 
                searchId: searchId,
                message: 'Recherche démarrée' 
            });
        } catch (error) {
            Utils.handleError(error, 'BackgroundService.handleStartBatchSearch');
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        } finally {
            logger.groupEnd();
        }
    }
    
    async processBatchSearch(searchContext) {
        const { queries, config } = searchContext;
        const results = [];
        
        for (let i = 0; i < queries.length; i++) {
            // Vérifier si la recherche a été annulée
            if (searchContext.status === 'cancelled') {
                logger.warn('Recherche annulée:', searchContext.id);
                break;
            }
            
            const query = queries[i];
            
            try {
                logger.debug(`Traitement requête ${i + 1}/${queries.length}: "${query}"`);
                
                // Effectuer la recherche individuelle
                const result = await this.performSingleSearch(query, config, searchContext.tabManager);
                
                results.push(result);
                searchContext.progress.completed++;
                searchContext.progress.results = results;
                
                // Notifier la progression si nécessaire
                this.notifyProgress(searchContext);
                
                // Attendre avant la prochaine recherche (sauf pour la dernière)
                if (i < queries.length - 1) {
                    await Utils.delay(config.delay * 1000);
                }
                
            } catch (error) {
                searchContext.progress.failed++;
                
                const errorResult = {
                    query: query,
                    results: [],
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    duration: 0
                };
                
                results.push(errorResult);
                logger.warn(`Erreur requête "${query}":`, error.message);
            }
        }
        
        return results;
    }
    
    async performSingleSearch(query, config, tabManager) {
        const startTime = Date.now();
        
        try {
            // Obtenir ou créer un onglet Google
            const tab = await tabManager.getOrCreateTab();
            
            // Construire l'URL de recherche
            const searchUrl = `${CONFIG.URLS.GOOGLE_SEARCH}?q=${encodeURIComponent(query)}&num=${Math.min(config.maxResults, 100)}`;
            
            // Naviguer vers la recherche
            await tabManager.navigateTab(tab.id, searchUrl);
            
            // Attendre le chargement
            await tabManager.waitForLoad(tab.id);
            
            // Extraire les résultats
            const results = await tabManager.extractResults(tab.id, config.maxResults);
            
            const duration = Date.now() - startTime;
            
            return {
                query: query,
                results: results,
                timestamp: new Date().toISOString(),
                duration: duration
            };
        } catch (error) {
            throw new Error(`Échec recherche "${query}": ${error.message}`);
        }
    }
    
    notifyProgress(searchContext) {
        // Envoyer une notification de progression à tous les onglets intéressés
        // Note: dans une vraie implémentation, vous pourriez maintenir une liste
        // des onglets qui écoutent les mises à jour de progression
        
        const progressData = {
            searchId: searchContext.id,
            progress: searchContext.progress,
            status: searchContext.status
        };
        
        // Diffuser à tous les onglets (optionnel)
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'searchProgress',
                    data: progressData
                }).catch(() => {
                    // Ignorer les erreurs (onglet peut ne pas écouter)
                });
            });
        });
    }
    
    handleGetSearchProgress(searchId, sendResponse) {
        const searchContext = this.activeSearches.get(searchId);
        
        if (!searchContext) {
            sendResponse({ 
                error: `Recherche ${searchId} non trouvée`,
                available: Array.from(this.activeSearches.keys())
            });
            return;
        }
        
        sendResponse({
            success: true,
            searchId: searchId,
            status: searchContext.status,
            progress: searchContext.progress,
            startTime: searchContext.startTime,
            duration: Date.now() - searchContext.startTime
        });
    }
    
    async handleCancelSearch(searchId, sendResponse) {
        const searchContext = this.activeSearches.get(searchId);
        
        if (!searchContext) {
            sendResponse({ 
                error: `Recherche ${searchId} non trouvée` 
            });
            return;
        }
        
        // Marquer comme annulée
        searchContext.status = 'cancelled';
        
        // Nettoyer les ressources
        if (searchContext.tabManager) {
            await searchContext.tabManager.cleanup();
        }
        
        logger.info('Recherche annulée:', searchId);
        
        sendResponse({ 
            success: true,
            message: `Recherche ${searchId} annulée`
        });
    }
    
    handleTabClosed(tabId) {
        // Nettoyer les références aux onglets fermés
        this.activeSearches.forEach(searchContext => {
            if (searchContext.tabManager && searchContext.tabManager.isManaging(tabId)) {
                searchContext.tabManager.handleTabClosed(tabId);
            }
        });
    }
    
    async handleCleanupStorage(sendResponse) {
        try {
            // Nettoyer les données temporaires anciennes
            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 jours
            
            const allData = await chrome.storage.local.get(null);
            const keysToRemove = [];
            
            Object.entries(allData).forEach(([key, value]) => {
                // Supprimer les données temporaires anciennes
                if (key.startsWith('temp_') && value.timestamp && value.timestamp < cutoffTime) {
                    keysToRemove.push(key);
                }
                
                // Supprimer les résultats de recherche anciens
                if (key.startsWith('search_results_') && value.date && new Date(value.date).getTime() < cutoffTime) {
                    keysToRemove.push(key);
                }
            });
            
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                logger.info('Nettoyage effectué:', { removedKeys: keysToRemove.length });
            }
            
            sendResponse({ 
                success: true,
                cleaned: keysToRemove.length,
                message: `${keysToRemove.length} éléments supprimés`
            });
        } catch (error) {
            Utils.handleError(error, 'BackgroundService.handleCleanupStorage');
            sendResponse({ error: error.message });
        }
    }
    
    async cleanupOrphanedData() {
        // Nettoyer les recherches actives orphelines au démarrage
        this.activeSearches.clear();
        
        // Autres nettoyages au démarrage si nécessaire
        logger.debug('Nettoyage des données orphelines terminé');
    }
    
    async initializeDefaultSettings() {
        const existing = await chrome.storage.local.get([
            'debugMode', 'debugLevel', 'defaultResultCount', 'defaultDelay'
        ]);
        
        const defaults = {};
        
        if (existing.debugMode === undefined) {
            defaults.debugMode = CONFIG.DEBUG.ENABLED;
        }
        
        if (existing.debugLevel === undefined) {
            defaults.debugLevel = CONFIG.DEBUG.DEFAULT_LEVEL;
        }
        
        if (existing.defaultResultCount === undefined) {
            defaults.defaultResultCount = CONFIG.SEARCH.DEFAULT_RESULT_COUNT;
        }
        
        if (existing.defaultDelay === undefined) {
            defaults.defaultDelay = CONFIG.SEARCH.DEFAULT_DELAY;
        }
        
        if (Object.keys(defaults).length > 0) {
            await chrome.storage.local.set(defaults);
            logger.debug('Paramètres par défaut initialisés:', defaults);
        }
    }
}

// Gestionnaire d'onglets pour le service worker
class TabManager {
    constructor() {
        this.managedTab = null;
        this.reuseTab = true;
    }
    
    async getOrCreateTab() {
        if (this.reuseTab && this.managedTab) {
            try {
                const tab = await this.getTabInfo(this.managedTab.id);
                if (tab && tab.url && tab.url.includes('google.com')) {
                    return tab;
                }
            } catch (error) {
                // Onglet probablement fermé
                this.managedTab = null;
            }
        }
        
        return this.createNewTab();
    }
    
    async createNewTab() {
        return new Promise((resolve, reject) => {
            chrome.tabs.create({
                url: 'https://www.google.com',
                active: false
            }, (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    this.managedTab = tab;
                    resolve(tab);
                }
            });
        });
    }
    
    async navigateTab(tabId, url) {
        return new Promise((resolve, reject) => {
            chrome.tabs.update(tabId, { url: url }, (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(tab);
                }
            });
        });
    }
    
    async waitForLoad(tabId, timeout = CONFIG.SEARCH.TIMEOUT) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                reject(new Error('Timeout: page non chargée'));
            }, timeout);
            
            const listener = (updatedTabId, changeInfo, tab) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    clearTimeout(timeoutId);
                    chrome.tabs.onUpdated.removeListener(listener);
                    setTimeout(() => resolve(tab), 2000); // Délai supplémentaire
                }
            };
            
            chrome.tabs.onUpdated.addListener(listener);
        });
    }
    
    async extractResults(tabId, maxResults) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: this.extractionScript,
                args: [maxResults]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (results && results[0]) {
                    resolve(results[0].result || []);
                } else {
                    resolve([]);
                }
            });
        });
    }
    
    extractionScript(maxResults) {
        // Script d'extraction simplifié (exécuté dans le contexte de la page)
        const selectors = [
            'h3.LC20lb',
            'div[data-ved] h3',
            '.g .yuRUbf h3',
            '.g h3'
        ];
        
        const results = [];
        let elements = [];
        
        for (const selector of selectors) {
            elements = document.querySelectorAll(selector);
            if (elements.length > 0) break;
        }
        
        for (let i = 0; i < Math.min(elements.length, maxResults); i++) {
            try {
                const element = elements[i];
                let link = element.closest('a') || element.querySelector('a');
                
                if (!link) continue;
                
                const title = element.textContent.trim();
                let url = link.href;
                
                // Nettoyer l'URL Google
                if (url.includes('/url?')) {
                    const params = new URLSearchParams(url.split('/url?')[1]);
                    url = params.get('url') || params.get('q') || url;
                }
                
                // Extraire description
                const parent = link.closest('.g') || link.closest('[data-ved]');
                let description = '';
                
                if (parent) {
                    const descSelectors = ['.VwiC3b', '[data-sncf]', '.IsZvec'];
                    for (const sel of descSelectors) {
                        const desc = parent.querySelector(sel);
                        if (desc && desc.textContent && desc.textContent.length > 20) {
                            description = desc.textContent.trim();
                            break;
                        }
                    }
                }
                
                results.push({
                    position: i + 1,
                    title: title,
                    url: url,
                    description: description
                });
            } catch (error) {
                console.warn(`Erreur extraction ${i + 1}:`, error);
            }
        }
        
        return results;
    }
    
    async getTabInfo(tabId) {
        return new Promise((resolve) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    resolve(null);
                } else {
                    resolve(tab);
                }
            });
        });
    }
    
    isManaging(tabId) {
        return this.managedTab && this.managedTab.id === tabId;
    }
    
    handleTabClosed(tabId) {
        if (this.isManaging(tabId)) {
            this.managedTab = null;
        }
    }
    
    async cleanup() {
        if (this.managedTab) {
            try {
                await chrome.tabs.remove(this.managedTab.id);
            } catch (error) {
                // Onglet déjà fermé probablement
            }
            this.managedTab = null;
        }
    }
}

// Initialiser le service
const backgroundService = new BackgroundService();