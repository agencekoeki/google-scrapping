// exportManager.js - Gestionnaire d'export des résultats
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { Utils } from './utils.js';

export class ExportManager {
    constructor() {
        this.supportedFormats = ['csv', 'json'];
        this.defaultFormat = 'csv';
    }
    
    async exportResults(results, format = this.defaultFormat, customFilename = null) {
        logger.group('Export des résultats');
        logger.info('Début export:', {
            resultCount: results.length,
            format: format,
            customFilename: customFilename
        });
        
        try {
            // Valider les paramètres
            this.validateExportParams(results, format);
            
            // Générer le contenu selon le format
            const exportData = this.generateExportData(results, format);
            
            // Créer le nom de fichier
            const filename = customFilename || this.generateFilename(format);
            
            // Effectuer le téléchargement
            await this.downloadFile(exportData.content, filename, exportData.mimeType);
            
            logger.success('Export terminé:', {
                filename: filename,
                size: exportData.content.length,
                format: format
            });
            
            return {
                success: true,
                filename: filename,
                size: exportData.content.length,
                format: format
            };
        } catch (error) {
            Utils.handleError(error, 'ExportManager.exportResults');
            throw error;
        } finally {
            logger.groupEnd();
        }
    }
    
    validateExportParams(results, format) {
        if (!results || !Array.isArray(results)) {
            throw new Error('Résultats invalides pour l\'export');
        }
        
        if (results.length === 0) {
            throw new Error('Aucun résultat à exporter');
        }
        
        if (!this.supportedFormats.includes(format)) {
            throw new Error(`Format non supporté: ${format}. Formats disponibles: ${this.supportedFormats.join(', ')}`);
        }
        
        logger.debug('Paramètres d\'export validés');
    }
    
    generateExportData(results, format) {
        switch (format) {
            case 'csv':
                return this.generateCsvData(results);
            case 'json':
                return this.generateJsonData(results);
            default:
                throw new Error(`Générateur non implémenté pour le format: ${format}`);
        }
    }
    
    generateCsvData(results) {
        logger.debug('Génération des données CSV...');
        
        // En-têtes CSV
        const headers = [
            'Requête',
            'Position',
            'Titre',
            'URL',
            'Description',
            'Timestamp',
            'Statut'
        ];
        
        const csvLines = [headers.join(',')];
        let totalResults = 0;
        let totalQueries = results.length;
        let successfulQueries = 0;
        
        results.forEach(searchResult => {
            const baseData = {
                query: searchResult.query,
                timestamp: searchResult.timestamp,
                hasResults: searchResult.results && searchResult.results.length > 0,
                error: searchResult.error
            };
            
            if (baseData.hasResults) {
                // Ajouter chaque résultat sur une ligne séparée
                searchResult.results.forEach(result => {
                    const line = [
                        this.escapeCsvValue(baseData.query),
                        result.position || 0,
                        this.escapeCsvValue(result.title || ''),
                        this.escapeCsvValue(result.url || ''),
                        this.escapeCsvValue(result.description || ''),
                        this.escapeCsvValue(baseData.timestamp),
                        'Succès'
                    ].join(',');
                    csvLines.push(line);
                    totalResults++;
                });
                successfulQueries++;
            } else {
                // Ligne pour les requêtes sans résultats ou avec erreur
                const line = [
                    this.escapeCsvValue(baseData.query),
                    '0',
                    'Aucun résultat',
                    '',
                    this.escapeCsvValue(baseData.error || 'Aucun résultat trouvé'),
                    this.escapeCsvValue(baseData.timestamp),
                    baseData.error ? 'Erreur' : 'Aucun résultat'
                ].join(',');
                csvLines.push(line);
            }
        });
        
        // Ajouter des statistiques en commentaire
        const stats = [
            `# Statistiques d'export`,
            `# Requêtes traitées: ${totalQueries}`,
            `# Requêtes réussies: ${successfulQueries}`,
            `# Total résultats: ${totalResults}`,
            `# Taux de succès: ${Math.round((successfulQueries / totalQueries) * 100)}%`,
            `# Généré le: ${new Date().toISOString()}`,
            '#'
        ];
        
        const finalContent = [...stats, ...csvLines].join('\n');
        
        logger.debug('Données CSV générées:', {
            lines: csvLines.length,
            characters: finalContent.length,
            stats: { totalQueries, successfulQueries, totalResults }
        });
        
        return {
            content: finalContent,
            mimeType: 'text/csv;charset=utf-8;'
        };
    }
    
    generateJsonData(results) {
        logger.debug('Génération des données JSON...');
        
        // Créer un objet JSON structuré
        const exportObject = {
            metadata: {
                exportDate: new Date().toISOString(),
                totalQueries: results.length,
                successfulQueries: results.filter(r => r.results && r.results.length > 0).length,
                totalResults: results.reduce((sum, r) => sum + (r.results?.length || 0), 0),
                generatedBy: 'Google Search Automation Extension',
                version: '1.0'
            },
            searches: results.map(searchResult => ({
                query: searchResult.query,
                timestamp: searchResult.timestamp,
                duration: searchResult.duration || 0,
                status: searchResult.error ? 'error' : 
                        (searchResult.results && searchResult.results.length > 0 ? 'success' : 'no_results'),
                error: searchResult.error || null,
                resultCount: searchResult.results?.length || 0,
                results: searchResult.results || []
            })),
            statistics: {
                queries: {
                    total: results.length,
                    successful: results.filter(r => r.results && r.results.length > 0).length,
                    failed: results.filter(r => r.error).length,
                    noResults: results.filter(r => !r.error && (!r.results || r.results.length === 0)).length
                },
                results: {
                    total: results.reduce((sum, r) => sum + (r.results?.length || 0), 0),
                    avgPerQuery: 0,
                    maxPerQuery: 0,
                    minPerQuery: Infinity
                },
                performance: {
                    totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
                    avgDuration: 0,
                    maxDuration: Math.max(...results.map(r => r.duration || 0)),
                    minDuration: Math.min(...results.map(r => r.duration || 0))
                }
            }
        };
        
        // Calculer les moyennes
        const successfulResults = results.filter(r => r.results && r.results.length > 0);
        if (successfulResults.length > 0) {
            exportObject.statistics.results.avgPerQuery = 
                Math.round(exportObject.statistics.results.total / successfulResults.length);
            exportObject.statistics.results.maxPerQuery = 
                Math.max(...successfulResults.map(r => r.results.length));
            exportObject.statistics.results.minPerQuery = 
                Math.min(...successfulResults.map(r => r.results.length));
        }
        
        if (results.length > 0) {
            exportObject.statistics.performance.avgDuration = 
                Math.round(exportObject.statistics.performance.totalDuration / results.length);
        }
        
        const jsonContent = JSON.stringify(exportObject, null, 2);
        
        logger.debug('Données JSON générées:', {
            size: jsonContent.length,
            queries: exportObject.metadata.totalQueries,
            results: exportObject.metadata.totalResults
        });
        
        return {
            content: jsonContent,
            mimeType: 'application/json;charset=utf-8;'
        };
    }
    
    escapeCsvValue(value) {
        if (!value) return '';
        const stringValue = String(value);
        
        // Échapper les guillemets et encapsuler si nécessaire
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    }
    
    generateFilename(format) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        
        return `google_search_results_${dateStr}_${timeStr}.${format}`;
    }
    
    async downloadFile(content, filename, mimeType) {
        return new Promise((resolve, reject) => {
            try {
                // Créer le blob
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                // Utiliser l'API Chrome pour télécharger
                if (Utils.isExtensionContext()) {
                    chrome.downloads.download({
                        url: url,
                        filename: filename,
                        saveAs: true
                    }, (downloadId) => {
                        if (chrome.runtime.lastError) {
                            URL.revokeObjectURL(url);
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            URL.revokeObjectURL(url);
                            logger.debug('Téléchargement initié:', { downloadId, filename });
                            resolve(downloadId);
                        }
                    });
                } else {
                    // Fallback pour les contextes non-extension
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Méthodes utilitaires pour l'aperçu
    previewExportData(results, format = 'csv', maxLines = 10) {
        try {
            const exportData = this.generateExportData(results, format);
            
            if (format === 'csv') {
                const lines = exportData.content.split('\n');
                return {
                    format: format,
                    totalLines: lines.length,
                    preview: lines.slice(0, maxLines).join('\n'),
                    truncated: lines.length > maxLines
                };
            } else if (format === 'json') {
                return {
                    format: format,
                    size: exportData.content.length,
                    preview: exportData.content.substring(0, 1000),
                    truncated: exportData.content.length > 1000
                };
            }
        } catch (error) {
            logger.error('Erreur génération aperçu:', error);
            return null;
        }
    }
    
    // Obtenir les métadonnées d'export sans générer le contenu complet
    getExportMetadata(results) {
        const totalQueries = results.length;
        const successfulQueries = results.filter(r => r.results && r.results.length > 0).length;
        const totalResults = results.reduce((sum, r) => sum + (r.results?.length || 0), 0);
        
        return {
            totalQueries,
            successfulQueries,
            failedQueries: results.filter(r => r.error).length,
            noResultQueries: totalQueries - successfulQueries - results.filter(r => r.error).length,
            totalResults,
            avgResultsPerQuery: successfulQueries > 0 ? Math.round(totalResults / successfulQueries) : 0,
            estimatedCsvSize: this.estimateFileSize(results, 'csv'),
            estimatedJsonSize: this.estimateFileSize(results, 'json')
        };
    }
    
    estimateFileSize(results, format) {
        // Estimation approximative basée sur les données
        const avgQueryLength = 30;
        const avgTitleLength = 60;
        const avgUrlLength = 80;
        const avgDescriptionLength = 150;
        
        const totalResults = results.reduce((sum, r) => sum + (r.results?.length || 0), 0);
        
        if (format === 'csv') {
            // Headers + data rows
            const csvLineLength = avgQueryLength + avgTitleLength + avgUrlLength + avgDescriptionLength + 100;
            const estimatedBytes = (results.length + totalResults) * csvLineLength;
            return Math.round(estimatedBytes / 1024); // En KB
        } else if (format === 'json') {
            // Plus verbeux à cause de la structure JSON
            const jsonPerResult = avgQueryLength + avgTitleLength + avgUrlLength + avgDescriptionLength + 200;
            const estimatedBytes = (totalResults * jsonPerResult) + (results.length * 100) + 1000; // +metadata
            return Math.round(estimatedBytes / 1024); // En KB
        }
        
        return 0;
    }
}