// fileProcessor.js - Gestion des fichiers (CSV et Excel)
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { Utils } from './utils.js';

export class FileProcessor {
    constructor() {
        this.supportedFormats = CONFIG.FILES.SUPPORTED_FORMATS;
    }
    
    async processFile(file) {
        logger.group('Traitement du fichier');
        logger.info('Début du traitement:', {
            name: file.name,
            size: Utils.formatFileSize(file.size),
            type: file.type
        });
        
        try {
            // Valider le fichier
            const fileInfo = Utils.validateFile(file);
            logger.debug('Validation réussie:', fileInfo);
            
            // Traiter selon l'extension
            let result;
            switch (fileInfo.extension) {
                case 'csv':
                    result = await this.processCsvFile(file);
                    break;
                case 'xls':
                case 'xlsx':
                    result = await this.processExcelFile(file);
                    break;
                default:
                    throw new Error(`Format non supporté: .${fileInfo.extension}`);
            }
            
            logger.success('Fichier traité avec succès:', {
                headers: result.headers,
                rowCount: result.data.length
            });
            
            return result;
        } catch (error) {
            Utils.handleError(error, 'FileProcessor.processFile');
            throw error;
        } finally {
            logger.groupEnd();
        }
    }
    
    async processCsvFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const result = this.parseCsvContent(text);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Erreur de lecture du fichier CSV'));
            };
            
            reader.readAsText(file, CONFIG.FILES.ENCODING);
        });
    }
    
    parseCsvContent(text) {
        logger.debug('Parsing CSV content:', {
            length: text.length,
            preview: text.substring(0, 100)
        });
        
        // Parser CSV simple mais robuste
        const lines = this.splitCsvLines(text);
        
        if (lines.length < 2) {
            throw new Error('Le fichier doit contenir au moins 2 lignes (en-têtes + données)');
        }
        
        // Parser avec gestion des guillemets et virgules
        const parsedLines = lines.map(line => this.parseCsvLine(line));
        
        return Utils.cleanCsvData(parsedLines);
    }
    
    splitCsvLines(text) {
        // Gérer les sauts de ligne dans les champs entre guillemets
        const lines = [];
        let currentLine = '';
        let insideQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            
            if (char === '"') {
                // Gérer les guillemets échappés
                if (nextChar === '"') {
                    currentLine += '""';
                    i++; // Skip next quote
                } else {
                    insideQuotes = !insideQuotes;
                    currentLine += char;
                }
            } else if (char === '\n' && !insideQuotes) {
                if (currentLine.trim()) {
                    lines.push(currentLine);
                }
                currentLine = '';
            } else if (char !== '\r') {
                currentLine += char;
            }
        }
        
        // Ajouter la dernière ligne
        if (currentLine.trim()) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    parseCsvLine(line) {
        const fields = [];
        let current = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    // Guillemets échappés
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quotes
                    insideQuotes = !insideQuotes;
                }
            } else if (char === CONFIG.FILES.CSV_DELIMITER && !insideQuotes) {
                // Fin de champ
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Ajouter le dernier champ
        fields.push(current.trim());
        
        return fields;
    }
    
    async processExcelFile(file) {
        // Vérifier si SheetJS est disponible
        if (typeof XLSX === 'undefined') {
            throw new Error('Bibliothèque SheetJS requise pour les fichiers Excel');
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    logger.time('Excel parsing');
                    
                    const data = new Uint8Array(e.target.result);
                    
                    // Lire le workbook avec toutes les options
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellStyles: true,
                        cellFormulas: true,
                        cellDates: true,
                        cellNF: true,
                        sheetStubs: true
                    });
                    
                    logger.debug('Excel workbook lu:', {
                        sheetNames: workbook.SheetNames,
                        sheetCount: workbook.SheetNames.length
                    });
                    
                    // Prendre la première feuille
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    
                    // Convertir en array avec headers
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { 
                        header: 1,
                        defval: '',
                        raw: false // Convertir tout en string
                    });
                    
                    logger.timeEnd('Excel parsing');
                    
                    if (jsonData.length === 0) {
                        throw new Error('Le fichier Excel est vide');
                    }
                    
                    const result = Utils.cleanCsvData(jsonData);
                    
                    logger.debug('Excel traité:', {
                        originalRows: jsonData.length,
                        cleanedRows: result.data.length,
                        headers: result.headers
                    });
                    
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Erreur lors de la lecture du fichier Excel: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Erreur lors de la lecture du fichier Excel'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Méthode pour obtenir un aperçu des données
    getDataPreview(data, maxRows = 5) {
        return {
            headers: data.headers,
            sampleRows: data.data.slice(0, maxRows),
            totalRows: data.data.length,
            availableColumns: data.headers.filter(h => h && h.trim())
        };
    }
    
    // Valider qu'une colonne contient des données utilisables
    validateColumn(data, columnName) {
        if (!data || !data.data || !Array.isArray(data.data)) {
            throw new Error('Données invalides');
        }
        
        if (!data.headers.includes(columnName)) {
            throw new Error(`Colonne "${columnName}" introuvable`);
        }
        
        const nonEmptyValues = data.data
            .map(row => row[columnName])
            .filter(value => value && String(value).trim());
        
        return {
            totalValues: data.data.length,
            nonEmptyValues: nonEmptyValues.length,
            emptyValues: data.data.length - nonEmptyValues.length,
            sampleValues: nonEmptyValues.slice(0, 5)
        };
    }
}