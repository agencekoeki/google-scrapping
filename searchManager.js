// searchManager.js - Orchestration des recherches Google
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { Utils } from './utils.js';
import { GoogleExtractor } from './googleExtractor.js';

export class SearchManager {
    constructor() {
        this.activeSearches = new Map();
        this.tabManager = null;
        this.currentSearchId = null;
    }
    
    async startBatchSearch(queries, config) {
        const searchId = this.generateSearchId();
        this.currentSearchId = searchId;
        
        logger.group('Démarrage recherche en lot');
        logger.info('Configuration:', {
            searchId,
            queryCount: queries.length,
            config
        });
        
        try {
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
                }
            };
            
            this.activeSearches.set(searchId, searchContext);
            
            // Initialiser le gestionnaire d'onglets
            this.tabManager = new TabManager();
            
            // Traiter les recherches
            const results = await this.processQueries(searchContext);
            
            searchContext.status = 'completed';
            searchContext.results = results;
            
            logger.success('Recherche terminée:', {
                searchId,
                resultsCount: results.length
            });
            
            return {
                searchId,
                results,
                summary: this.generateSummary(results)
            };
        } catch (error) {
            Utils.handleError(error, 'SearchManager.startBatchSearch');
            
            if (this.activeSearches.has(searchId)) {
                this.activeSearches.get(searchId).status = 'failed';
                this.activeSearches.get(searchId).error = error.message;
            }
            
            throw error;
        } finally {
            // Nettoyer
            if (this.tabManager) {
                await this.tabManager.cleanup();
                this.tabManager = null;
            }
            
            // Programmer la suppression du contexte
            setTimeout(() => {
                this.activeSearches.delete(searchId);
            }, 300000); // 5 minutes
            
            logger.groupEnd();
        }
    }
    
    async processQueries(searchContext) {
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
                
                // Effectuer la recherche
                const result = await this.performSingleSearch(query, config);
                
                results.push(result);
                searchContext.progress.completed++;
                searchContext.progress.results = results;
                
                // Notification de progression (si callback défini)
                this.notifyProgress(searchContext);
                
                // Délai avant la prochaine recherche
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
    
    async performSingleSearch(query, config) {
        const startTime = Date.now();
        
        try {
            // Obtenir ou créer un onglet Google
            const tab = await this.tabManager.getOrCreateTab();
            
            // Construire l'URL de recherche
            const searchUrl = `${CONFIG.URLS.GOOGLE_SEARCH}?q=${encodeURIComponent(query)}&num=${Math.min(config.maxResults, 100)}`;
            
            // Naviguer vers la recherche
            await this.tabManager.navigateTab(tab.id, searchUrl);
            
            // Attendre le chargement
            await this.tabManager.waitForLoad(tab.id);
            
            // Extraire les résultats
            const results = await this.tabManager.extractResults(tab.id, config.maxResults);
            
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
    
    cancelSearch(searchId) {
        const searchContext = this.activeSearches.get(searchId);
        
        if (!searchContext) {
            throw new Error(`Recherche ${searchId} non trouvée`);
        }
        
        searchContext.status = 'cancelled';
        logger.info('Recherche annulée:', searchId);
        
        return true;
    }
    
    getSearchProgress(searchId) {
        const searchContext = this.activeSearches.get(searchId);
        
        if (!searchContext) {
            return null;
        }
        
        return {
            searchId: searchId,
            status: searchContext.status,
            progress: searchContext.progress,
            startTime: searchContext.startTime,
            duration: Date.now() - searchContext.startTime
        };
    }
    
    generateSearchId() {
        return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateSummary(results) {
        const totalQueries = results.length;
        const successfulQueries = results.filter(r => r.results && r.results.length > 0).length;
        const failedQueries = results.filter(r => r.error).length;
        const totalResults = results.reduce((sum, r) => sum + (r.results?.length || 0), 0);
        
        return {
            totalQueries,
            successfulQueries,
            failedQueries,
            noResultQueries: totalQueries - successfulQueries - failedQueries,
            totalResults,
            averageResultsPerQuery: successfulQueries > 0 ? Math.round(totalResults / successfulQueries) : 0,
            averageDuration: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length) : 0
        };
    }
    
    notifyProgress(searchContext) {
        // Hook pour les callbacks de progression
        if (this.onProgress) {
            this.onProgress({
                searchId: searchContext.id,
                progress: searchContext.progress,
                status: searchContext.status
            });
        }
    }
    
    // Méthode pour définir un callback de progression
    setProgressCallback(callback) {
        this.onProgress = callback;
    }
}

// Gestionnaire d'onglets pour les recherches
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
        // Script d'extraction (exécuté dans le contexte de la page)
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
