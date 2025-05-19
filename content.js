// Content script pour interagir avec les pages Google
class GoogleSearchExtractor {
    constructor() {
        this.setupMessageListener();
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'performSearch') {
                this.handleSearchRequest(request, sendResponse);
                return true;
            }
        });
    }
    
    async handleSearchRequest(request, sendResponse) {
        try {
            const { query, maxResults } = request;
            
            if (!window.location.hostname.includes('google.com')) {
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                window.location.href = searchUrl;
                await this.waitForPageLoad();
            } else {
                await this.performSearch(query);
            }
            
            const results = this.extractSearchResults(maxResults);
            sendResponse({ success: true, results: results });
            
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async performSearch(query) {
        const searchBox = document.querySelector('input[name="q"]') || 
                         document.querySelector('textarea[name="q"]');
        
        if (searchBox) {
            searchBox.value = '';
            searchBox.focus();
            
            const inputEvent = new Event('input', { bubbles: true });
            searchBox.value = query;
            searchBox.dispatchEvent(inputEvent);
            
            await this.delay(500);
            
            const form = searchBox.closest('form');
            if (form) {
                form.submit();
            } else {
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    keyCode: 13,
                    bubbles: true
                });
                searchBox.dispatchEvent(enterEvent);
            }
            
            await this.waitForSearchResults();
        } else {
            throw new Error('Impossible de trouver la barre de recherche');
        }
    }
    
    extractSearchResults(maxResults = 50) {
        const results = [];
        
        const selectors = [
            'div[data-ved] h3',
            'h3[class*="LC20lb"]',
            '.g .yuRUbf h3 a',
            '.g h3 a'
        ];
        
        let searchItems = [];
        for (const selector of selectors) {
            searchItems = document.querySelectorAll(selector);
            if (searchItems.length > 0) break;
        }
        
        for (let i = 0; i < Math.min(searchItems.length, maxResults); i++) {
            try {
                const item = searchItems[i];
                const result = this.extractSingleResult(item, i + 1);
                if (result) {
                    results.push(result);
                }
            } catch (error) {
                console.warn(`Erreur lors de l'extraction du résultat ${i + 1}:`, error);
            }
        }
        
        return results;
    }
    
    extractSingleResult(element, position) {
        let link, titleElement, title, url, description;
        
        if (element.tagName === 'A') {
            link = element;
            titleElement = element.querySelector('h3') || element;
        } else if (element.tagName === 'H3') {
            titleElement = element;
            link = element.closest('a') || element.querySelector('a');
        } else {
            link = element.querySelector('a');
            titleElement = element;
        }
        
        if (!link) return null;
        
        title = titleElement.textContent || titleElement.innerText || '';
        title = title.trim();
        
        url = link.href || '';
        
        if (url.includes('/url?')) {
            const urlParams = new URLSearchParams(url.split('/url?')[1]);
            url = urlParams.get('url') || urlParams.get('q') || url;
        }
        
        description = this.extractDescription(link, titleElement);
        
        return {
            title: title,
            url: url,
            description: description,
            position: position
        };
    }
    
    extractDescription(linkElement, titleElement) {
        const parent = linkElement.closest('[data-ved]') || 
                      linkElement.closest('.g');
        
        if (!parent) return '';
        
        const descriptionSelectors = [
            '.VwiC3b',
            '[data-sncf] span',
            '.IsZvec span',
            '[style*="color"]:not(h3):not(cite)'
        ];
        
        for (const selector of descriptionSelectors) {
            const descElement = parent.querySelector(selector);
            if (descElement && 
                descElement.textContent && 
                !descElement.contains(titleElement)) {
                
                const text = descElement.textContent.trim();
                if (text.length > 20) {
                    return text;
                }
            }
        }
        
        return '';
    }
    
    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
    
    async waitForSearchResults(timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const results = document.querySelectorAll('[data-ved] h3, .g .yuRUbf');
            if (results.length > 0) {
                await this.delay(1000);
                return;
            }
            await this.delay(200);
        }
        
        throw new Error('Timeout: Les résultats de recherche ne se sont pas chargés');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const extractor = new GoogleSearchExtractor();