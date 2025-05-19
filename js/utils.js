// utils.js - Utilitaires partagés
import { logger } from './logger.js';

export class Utils {
    // Validation des fichiers
    static validateFile(file) {
        if (!file) {
            throw new Error('Aucun fichier fourni');
        }
        
        // Vérifier la taille
        if (file.size > CONFIG.FILES.MAX_FILE_SIZE) {
            throw new Error(CONFIG.ERRORS.FILE_TOO_LARGE);
        }
        
        // Vérifier l'extension
        const extension = file.name.toLowerCase().split('.').pop();
        const supportedExtensions = CONFIG.FILES.SUPPORTED_FORMATS.map(f => f.substring(1));
        
        if (!supportedExtensions.includes(extension)) {
            throw new Error(`${CONFIG.ERRORS.FILE_FORMAT_NOT_SUPPORTED}: .${extension}`);
        }
        
        return { extension, size: file.size, name: file.name };
    }
    
    // Attendre un délai
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Formater la taille des fichiers
    static formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // Nettoyer les URLs Google
    static cleanGoogleUrl(url) {
        if (!url || !url.includes('/url?')) {
            return url;
        }
        
        try {
            const urlParams = new URLSearchParams(url.split('/url?')[1]);
            return urlParams.get('url') || urlParams.get('q') || url;
        } catch (error) {
            logger.warn('Erreur nettoyage URL Google:', { url, error });
            return url;
        }
    }
    
    // Nettoyer et valider les données CSV
    static cleanCsvData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(CONFIG.ERRORS.EMPTY_FILE);
        }
        
        // Nettoyer les headers
        const headers = data[0].map(header => 
            String(header || '').trim().replace(/"/g, '')
        );
        
        // Nettoyer les lignes de données
        const cleanedData = [];
        for (let i = 1; i < data.length; i++) {
            const row = {};
            let hasData = false;
            
            headers.forEach((header, index) => {
                const value = String(data[i][index] || '').trim().replace(/"/g, '');
                row[header] = value;
                if (value) hasData = true;
            });
            
            // N'ajouter que les lignes avec des données
            if (hasData) {
                cleanedData.push(row);
            }
        }
        
        return { headers, data: cleanedData };
    }
    
    // Extraire les requêtes d'une colonne
    static extractQueries(data, columnName) {
        if (!data || !Array.isArray(data)) {
            throw new Error('Données invalides');
        }
        
        const queries = data
            .map(row => row[columnName])
            .filter(query => query && String(query).trim())
            .map(query => String(query).trim());
        
        if (queries.length === 0) {
            throw new Error(CONFIG.ERRORS.NO_QUERIES_FOUND);
        }
        
        // Supprimer les doublons tout en préservant l'ordre
        return [...new Set(queries)];
    }
    
    // Générer un nom de fichier pour l'export
    static generateExportFilename(prefix = 'google_search_results') {
        const date = new Date();
        const timestamp = date.toISOString().split('T')[0];
        const time = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `${prefix}_${timestamp}_${time}.csv`;
    }
    
    // Convertir des résultats en CSV
    static convertResultsToCsv(results) {
        const headers = ['Requête', 'Position', 'Titre', 'URL', 'Description', 'Timestamp'];
        const csvLines = [headers.join(',')];
        
        results.forEach(searchResult => {
            if (searchResult.results && searchResult.results.length > 0) {
                searchResult.results.forEach(result => {
                    const line = [
                        `"${this.escapeCsvValue(searchResult.query)}"`,
                        result.position || 0,
                        `"${this.escapeCsvValue(result.title)}"`,
                        `"${result.url || ''}"`,
                        `"${this.escapeCsvValue(result.description)}"`,
                        `"${searchResult.timestamp}"`
                    ].join(',');
                    csvLines.push(line);
                });
            } else {
                // Ligne pour les requêtes sans résultats
                const line = [
                    `"${this.escapeCsvValue(searchResult.query)}"`,
                    '0',
                    '"Aucun résultat"',
                    '""',
                    `"${searchResult.error || 'Aucun résultat trouvé'}"`,
                    `"${searchResult.timestamp}"`
                ].join(',');
                csvLines.push(line);
            }
        });
        
        return csvLines.join('\n');
    }
    
    // Échapper les valeurs CSV
    static escapeCsvValue(value) {
        if (!value) return '';
        return String(value).replace(/"/g, '""');
    }
    
    // Détecter si on est dans un contexte d'extension
    static isExtensionContext() {
        return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    }
    
    // Gérer les erreurs de manière uniforme
    static handleError(error, context = '') {
        const errorReport = logger.createErrorReport(error, { context });
        logger.error(`Erreur dans ${context}:`, errorReport);
        return errorReport;
    }
    
    // Valider l'état de Google (détection captcha, blocage)
    static validateGooglePage(document) {
        // Détecter CAPTCHA
        const captchaSelectors = [
            '#captcha-form',
            '.captcha',
            'iframe[src*="captcha"]',
            'img[src*="captcha"]'
        ];
        
        for (const selector of captchaSelectors) {
            if (document.querySelector(selector)) {
                throw new Error(CONFIG.ERRORS.CAPTCHA_DETECTED);
            }
        }
        
        // Détecter blocage IP
        const blockingSelectors = [
            'text*="unusual traffic"',
            'text*="automated queries"',
            'text*="blocked"'
        ];
        
        const bodyText = document.body?.textContent?.toLowerCase() || '';
        const blockingKeywords = ['unusual traffic', 'automated queries', 'blocked', 'robot'];
        
        for (const keyword of blockingKeywords) {
            if (bodyText.includes(keyword)) {
                throw new Error(CONFIG.ERRORS.GOOGLE_BLOCKED);
            }
        }
        
        return true;
    }
}