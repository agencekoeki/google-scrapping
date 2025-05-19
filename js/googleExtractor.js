// googleExtractor.js - Extraction des résultats Google
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { Utils } from './utils.js';

export class GoogleExtractor {
    constructor() {
        this.selectors = CONFIG.SELECTORS;
        this.extractionAttempts = 0;
        this.maxExtractionAttempts = 3;
    }
    
    async extractSearchResults(maxResults = CONFIG.SEARCH.DEFAULT_RESULT_COUNT) {
        logger.group('Extraction des résultats Google');
        logger.info('Démarrage extraction:', {
            maxResults,
            url: window.location.href,
            attempt: this.extractionAttempts + 1
        });
        
        try {
            // Vérifier que nous sommes sur Google
            this.validateGooglePage();
            
            // Attendre que les résultats soient chargés
            await this.waitForResults();
            
            // Extraire les résultats
            const results = this.performExtraction(maxResults);
            
            logger.success('Extraction terminée:', {
                resultsFound: results.length,
                expectedMax: maxResults
            });
            
            return results;
        } catch (error) {
            this.extractionAttempts++;
            Utils.handleError(error, 'GoogleExtractor.extractSearchResults');
            
            // Retry si possible
            if (this.extractionAttempts < this.maxExtractionAttempts) {
                logger.warn(`Tentative ${this.extractionAttempts}/${this.maxExtractionAttempts} échouée, retry...`);
                await Utils.delay(2000);
                return this.extractSearchResults(maxResults);
            }
            
            throw error;
        } finally {
            logger.groupEnd();
            this.extractionAttempts = 0;
        }
    }
    
    validateGooglePage() {
        // Vérifier que nous sommes sur Google
        const currentDomain = window.location.hostname;
        if (!currentDomain.includes('google.com') && !currentDomain.includes('google.fr')) {
            throw new Error(`Page non-Google détectée: ${currentDomain}`);
        }
        
        // Vérifier l'état de la page (captcha, blocage, etc.)
        Utils.validateGooglePage(document);
        
        logger.debug('Page Google validée:', {
            domain: currentDomain,
            url: window.location.href,
            title: document.title
        });
    }
    
    async waitForResults(timeout = CONFIG.SEARCH.TIMEOUT) {
        logger.debug('Attente des résultats de recherche...');
        
        const startTime = Date.now();
        const checkInterval = 500;
        
        while (Date.now() - startTime < timeout) {
            // Vérifier si des résultats sont présents
            const results = this.findResultElements();
            
            if (results.length > 0) {
                logger.debug('Résultats détectés:', {
                    count: results.length,
                    waitTime: Date.now() - startTime
                });
                
                // Attendre un peu plus pour s'assurer que tout est chargé
                await Utils.delay(1000);
                return;
            }
            
            // Vérifier s'il y a un message "Aucun résultat"
            const noResultsSelectors = [
                'div:contains("No results found")',
                'div:contains("Aucun résultat")',
                '.card-section p',
                '#res .g'
            ];
            
            const noResultsElement = document.querySelector('.card-section p');
            if (noResultsElement && noResultsElement.textContent.includes('résultat')) {
                logger.warn('Aucun résultat trouvé pour cette recherche');
                return;
            }
            
            await Utils.delay(checkInterval);
        }
        
        logger.warn('Timeout atteint en attendant les résultats');
    }
    
    findResultElements() {
        // Essayer tous les sélecteurs jusqu'à en trouver un qui fonctionne
        for (const selector of this.selectors.SEARCH_RESULTS) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                logger.debug(`Sélecteur fonctionnel trouvé: ${selector}`, {
                    elementCount: elements.length
                });
                return Array.from(elements);
            }
        }
        
        logger.debug('Aucun résultat trouvé avec les sélecteurs standard');
        return [];
    }
    
    performExtraction(maxResults) {
        const resultElements = this.findResultElements();
        
        if (resultElements.length === 0) {
            logger.warn('Aucun élément de résultat trouvé');
            return [];
        }
        
        const results = [];
        const actualMaxResults = Math.min(resultElements.length, maxResults);
        
        logger.debug(`Traitement de ${actualMaxResults} résultats...`);
        
        for (let i = 0; i < actualMaxResults; i++) {
            try {
                const element = resultElements[i];
                const result = this.extractSingleResult(element, i + 1);
                
                if (result && result.title && result.url) {
                    results.push(result);
                    logger.debug(`Résultat ${i + 1} extrait:`, {
                        title: result.title.substring(0, 50) + '...',
                        url: result.url.substring(0, 80) + '...'
                    });
                } else {
                    logger.warn(`Résultat ${i + 1} invalide ou incomplet`);
                }
            } catch (error) {
                logger.warn(`Erreur extraction résultat ${i + 1}:`, error);
            }
        }
        
        return results;
    }
    
    extractSingleResult(element, position) {
        try {
            // Trouver le lien et le titre
            const linkData = this.extractLink(element);
            if (!linkData) return null;
            
            // Extraire la description
            const description = this.extractDescription(element, linkData.linkElement);
            
            // Nettoyer l'URL Google
            const cleanUrl = Utils.cleanGoogleUrl(linkData.url);
            
            return {
                position: position,
                title: linkData.title,
                url: cleanUrl,
                description: description,
                rawUrl: linkData.url // Conserver l'URL originale pour debug
            };
        } catch (error) {
            logger.warn(`Erreur extraction résultat position ${position}:`, error);
            return null;
        }
    }
    
    extractLink(element) {
        let linkElement = null;
        let titleElement = element;
        
        // Stratégies pour trouver le lien
        if (element.tagName === 'A') {
            linkElement = element;
            titleElement = element.querySelector('h3') || element;
        } else if (element.tagName === 'H3') {
            titleElement = element;
            linkElement = element.closest('a') || element.querySelector('a') || element.parentElement.querySelector('a');
        } else {
            // Chercher un lien dans l'élément ou ses parents/enfants
            linkElement = element.querySelector('a') || element.closest('a');
            if (!linkElement) {
                // Chercher dans le parent
                const parent = element.closest('.g') || element.closest('[data-ved]');
                if (parent) {
                    linkElement = parent.querySelector('a');
                }
            }
        }
        
        if (!linkElement || !linkElement.href) {
            return null;
        }
        
        // Extraire le titre
        const title = this.extractTitle(titleElement, linkElement);
        if (!title) {
            return null;
        }
        
        return {
            linkElement: linkElement,
            title: title,
            url: linkElement.href
        };
    }
    
    extractTitle(titleElement, linkElement) {
        // Essayer d'extraire le titre de différentes manières
        let title = '';
        
        // 1. Titre de l'élément title directement
        if (titleElement && titleElement.textContent) {
            title = titleElement.textContent.trim();
        }
        
        // 2. Titre du lien si pas trouvé
        if (!title && linkElement) {
            if (linkElement.textContent) {
                title = linkElement.textContent.trim();
            } else if (linkElement.title) {
                title = linkElement.title.trim();
            }
        }
        
        // 3. Chercher un h3 dans les enfants
        if (!title) {
            const h3 = linkElement?.querySelector('h3') || titleElement?.querySelector('h3');
            if (h3) {
                title = h3.textContent.trim();
            }
        }
        
        // Nettoyer le titre
        if (title) {
            // Supprimer les caractères de contrôle et nettoyer
            title = title.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        return title;
    }
    
    extractDescription(element, linkElement) {
        const parent = linkElement.closest('.g') || linkElement.closest('[data-ved]') || element.closest('.g');
        
        if (!parent) {
            return '';
        }
        
        // Essayer différents sélecteurs pour la description
        for (const selector of this.selectors.DESCRIPTIONS) {
            const descElement = parent.querySelector(selector);
            
            if (descElement && descElement.textContent) {
                const text = descElement.textContent.trim();
                
                // Vérifier que ce n'est pas le titre ou un élément de navigation
                if (text.length > 20 && 
                    !descElement.contains(linkElement) && 
                    !text.includes('›') && 
                    !text.includes('...')) {
                    
                    // Nettoyer la description
                    return text.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
                }
            }
        }
        
        // Fallback: chercher tout texte dans le parent qui n'est pas le titre
        const allText = parent.textContent || '';
        const titleText = linkElement.textContent || '';
        
        if (allText.length > titleText.length) {
            const description = allText.replace(titleText, '').trim();
            if (description.length > 20) {
                return description.substring(0, 300) + (description.length > 300 ? '...' : '');
            }
        }
        
        return '';
    }
    
    // Méthodes utilitaires pour analyser la page
    analyzePage() {
        const analysis = {
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            hasResults: false,
            resultCount: 0,
            detectedSelectors: [],
            pageType: 'unknown'
        };
        
        // Détecter le type de page Google
        if (analysis.url.includes('/search?')) {
            analysis.pageType = 'search_results';
        } else if (analysis.url.includes('google.com')) {
            analysis.pageType = 'google_homepage';
        }
        
        // Compter les résultats avec chaque sélecteur
        for (const selector of this.selectors.SEARCH_RESULTS) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                analysis.detectedSelectors.push({
                    selector: selector,
                    count: elements.length
                });
                analysis.resultCount = Math.max(analysis.resultCount, elements.length);
                analysis.hasResults = true;
            }
        }
        
        // Détecter les éléments spéciaux
        analysis.specialElements = {
            hasCaptcha: !!document.querySelector('#captcha-form, .captcha'),
            hasNoResults: !!document.querySelector('.card-section p'),
            hasSearchBox: !!document.querySelector('input[name="q"], textarea[name="q"]'),
            hasNextPage: !!document.querySelector('#pnnext, a[aria-label*="Next"]')
        };
        
        logger.table(analysis);
        return analysis;
    }
    
    // Obtenir des statistiques d'extraction
    getExtractionStats() {
        const analysis = this.analyzePage();
        const resultElements = this.findResultElements();
        
        return {
            pageAnalysis: analysis,
            extractionCapable: resultElements.length > 0,
            availableResults: resultElements.length,
            recommendedDelay: analysis.hasResults ? 1000 : 3000,
            riskLevel: this.assessRiskLevel(analysis)
        };
    }
    
    assessRiskLevel(analysis) {
        if (analysis.specialElements.hasCaptcha) return 'HIGH';
        if (!analysis.hasResults && analysis.pageType === 'search_results') return 'MEDIUM';
        if (analysis.resultCount < 5) return 'MEDIUM';
        return 'LOW';
    }
}