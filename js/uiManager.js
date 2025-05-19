// uiManager.js - Gestion de l'interface utilisateur
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { Utils } from './utils.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.callbacks = {};
        this.currentFileData = null;
        this.progressUpdateInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeDebugMode();
    }
    
    initializeElements() {
        // Cacher tous les éléments de l'interface
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            fileInfo: document.getElementById('fileInfo'),
            fileName: document.getElementById('fileName'),
            fileDetails: document.getElementById('fileDetails'),
            queryColumn: document.getElementById('queryColumn'),
            resultCount: document.getElementById('resultCount'),
            delayBetween: document.getElementById('delayBetween'),
            startButton: document.getElementById('startButton'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            progressFill: document.querySelector('.progress-fill'),
            progressText: document.getElementById('progressText'),
            statusMessage: document.getElementById('statusMessage'),
            resultsSection: document.getElementById('resultsSection'),
            resultsSummary: document.getElementById('resultsSummary'),
            exportCsvButton: document.getElementById('exportCsvButton'),
            exportJsonButton: document.getElementById('exportJsonButton'),
            debugToggle: document.getElementById('debugToggle'),
            debugSection: document.getElementById('debugSection'),
            debugMode: document.getElementById('debugMode'),
            verboseMode: document.getElementById('verboseMode'),
            runDiagnostics: document.getElementById('runDiagnostics')
        };
        
        // Vérifier que tous les éléments sont présents
        const missingElements = Object.entries(this.elements)
            .filter(([name, element]) => !element)
            .map(([name]) => name);
        
        if (missingElements.length > 0) {
            logger.warn('Éléments UI manquants:', missingElements);
        }
        
        logger.debug('Éléments UI initialisés');
    }
    
    setupEventListeners() {
        // Upload de fichier
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e);
            });
        }
        
        // Drag & Drop
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.uploadArea.classList.add('dragover');
            });
            
            this.elements.uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.uploadArea.classList.remove('dragover');
            });
            
            this.elements.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelection({ target: { files: files } });
                }
            });
        }
        
        // Sélection de colonne
        if (this.elements.queryColumn) {
            this.elements.queryColumn.addEventListener('change', () => {
                this.handleColumnSelection();
            });
        }
        
        // Démarrage des recherches
        if (this.elements.startButton) {
            this.elements.startButton.addEventListener('click', () => {
                this.handleSearchStart();
            });
        }
        
        // Export
        if (this.elements.exportCsvButton) {
            this.elements.exportCsvButton.addEventListener('click', () => {
                this.handleExport('csv');
            });
        }
        
        if (this.elements.exportJsonButton) {
            this.elements.exportJsonButton.addEventListener('click', () => {
                this.handleExport('json');
            });
        }
        
        // Debug
        if (this.elements.debugToggle) {
            this.elements.debugToggle.addEventListener('click', () => {
                this.toggleDebugSection();
            });
        }
        
        if (this.elements.debugMode) {
            this.elements.debugMode.addEventListener('change', () => {
                this.handleDebugModeChange();
            });
        }
        
        if (this.elements.runDiagnostics) {
            this.elements.runDiagnostics.addEventListener('click', () => {
                this.runDiagnostics();
            });
        }
        
        logger.debug('Event listeners configurés');
    }
    
    initializeDebugMode() {
        // Charger les préférences de debug sauvegardées
        if (Utils.isExtensionContext()) {
            chrome.storage.local.get(['debugMode', 'verboseMode'], (result) => {
                if (this.elements.debugMode) {
                    this.elements.debugMode.checked = result.debugMode || false;
                }
                if (this.elements.verboseMode) {
                    this.elements.verboseMode.checked = result.verboseMode || false;
                }
            });
        }
    }
    
    handleFileSelection(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        
        logger.debug('Fichier sélectionné:', {
            name: file.name,
            size: Utils.formatFileSize(file.size),
            type: file.type
        });
        
        // Déclencher le callback de traitement de fichier
        if (this.callbacks.onFileSelected) {
            this.callbacks.onFileSelected(file);
        }
    }
    
    handleColumnSelection() {
        const selectedColumn = this.elements.queryColumn.value;
        
        // Activer/désactiver le bouton de démarrage
        if (this.elements.startButton) {
            this.elements.startButton.disabled = !selectedColumn || !this.currentFileData;
        }
        
        logger.debug('Colonne sélectionnée:', selectedColumn);
        
        if (this.callbacks.onColumnSelected) {
            this.callbacks.onColumnSelected(selectedColumn);
        }
    }
    
    handleSearchStart() {
        const config = this.getSearchConfig();
        
        logger.debug('Démarrage recherche avec config:', config);
        
        if (this.callbacks.onSearchStart) {
            this.callbacks.onSearchStart(config);
        }
    }
    
    handleExport(format) {
        logger.debug('Export demandé:', format);
        
        if (this.callbacks.onExport) {
            this.callbacks.onExport(format);
        }
    }
    
    handleDebugModeChange() {
        const debugEnabled = this.elements.debugMode.checked;
        const verboseEnabled = this.elements.verboseMode?.checked || false;
        
        // Sauvegarder les préférences
        if (Utils.isExtensionContext()) {
            chrome.storage.local.set({
                debugMode: debugEnabled,
                verboseMode: verboseEnabled
            });
        }
        
        // Mettre à jour le système de logging
        logger.updateSettings(debugEnabled, verboseEnabled ? 3 : 2);
        
        logger.info('Mode debug mis à jour:', {
            debug: debugEnabled,
            verbose: verboseEnabled
        });
    }
    
    getSearchConfig() {
        return {
            selectedColumn: this.elements.queryColumn?.value || '',
            maxResults: parseInt(this.elements.resultCount?.value || CONFIG.SEARCH.DEFAULT_RESULT_COUNT),
            delay: parseInt(this.elements.delayBetween?.value || CONFIG.SEARCH.DEFAULT_DELAY)
        };
    }
    
    // Méthodes pour mettre à jour l'interface
    
    showFileInfo(fileData) {
        this.currentFileData = fileData;
        
        if (this.elements.fileName) {
            this.elements.fileName.textContent = fileData.name || 'Fichier chargé';
        }
        
        if (this.elements.fileDetails) {
            this.elements.fileDetails.textContent = 
                `${fileData.data?.length || 0} lignes, ${fileData.headers?.length || 0} colonnes`;
        }
        
        if (this.elements.fileInfo) {
            this.elements.fileInfo.style.display = 'block';
        }
        
        // Remplir le sélecteur de colonnes
        this.populateColumnSelector(fileData.headers || []);
        
        logger.debug('Informations fichier affichées');
    }
    
    populateColumnSelector(headers) {
        if (!this.elements.queryColumn) return;
        
        // Vider les options existantes
        this.elements.queryColumn.innerHTML = '<option value="">Sélectionnez une colonne...</option>';
        
        // Ajouter les colonnes
        headers.forEach(header => {
            if (header && header.trim()) {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                this.elements.queryColumn.appendChild(option);
            }
        });
        
        // Activer le sélecteur
        this.elements.queryColumn.disabled = headers.length === 0;
    }
    
    showStatus(message, type = 'info') {
        if (!this.elements.statusMessage) return;
        
        this.elements.statusMessage.textContent = message;
        this.elements.statusMessage.className = `status ${type}`;
        this.elements.statusMessage.style.display = 'block';
        
        // Masquer automatiquement après 5 secondes pour success/error
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (this.elements.statusMessage) {
                    this.elements.statusMessage.style.display = 'none';
                }
            }, 5000);
        }
        
        logger.debug(`Status [${type}]: ${message}`);
    }
    
    showProgress(visible = true) {
        if (!this.elements.progressContainer) return;
        
        this.elements.progressContainer.style.display = visible ? 'block' : 'none';
        
        if (!visible) {
            this.clearProgressUpdates();
        }
    }
    
    updateProgress(progress) {
        if (!this.elements.progressFill || !this.elements.progressText) return;
        
        const percentage = Math.round((progress.completed / progress.total) * 100);
        
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = 
            `${progress.completed}/${progress.total} requêtes • ${percentage}%`;
        
        if (progress.failed > 0) {
            this.elements.progressText.textContent += ` • ${progress.failed} erreurs`;
        }
    }
    
    setSearchInProgress(inProgress = true) {
        if (!this.elements.startButton) return;
        
        this.elements.startButton.disabled = inProgress;
        this.elements.startButton.textContent = inProgress ? 
            'Recherche en cours...' : 'Commencer les recherches';
        
        if (inProgress) {
            this.elements.startButton.classList.add('loading');
        } else {
            this.elements.startButton.classList.remove('loading');
        }
        
        // Afficher/masquer la barre de progression
        this.showProgress(inProgress);
    }
    
    showResults(results, summary) {
        if (!this.elements.resultsSection) return;
        
        // Afficher la section résultats
        this.elements.resultsSection.classList.remove('hidden');
        
        // Mettre à jour le résumé
        if (this.elements.resultsSummary) {
            this.elements.resultsSummary.innerHTML = this.generateResultsSummaryHTML(summary);
        }
        
        // Activer les boutons d'export
        if (this.elements.exportCsvButton) {
            this.elements.exportCsvButton.disabled = false;
        }
        if (this.elements.exportJsonButton) {
            this.elements.exportJsonButton.disabled = false;
        }
        
        logger.debug('Résultats affichés:', summary);
    }
    
    generateResultsSummaryHTML(summary) {
        return `
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-value">${summary.totalQueries}</span>
                    <span class="stat-label">Requêtes traitées</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${summary.successfulQueries}</span>
                    <span class="stat-label">Succès</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${summary.totalResults}</span>
                    <span class="stat-label">Résultats totaux</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${Math.round((summary.successfulQueries / summary.totalQueries) * 100)}%</span>
                    <span class="stat-label">Taux de succès</span>
                </div>
            </div>
        `;
    }
    
    toggleDebugSection() {
        if (!this.elements.debugSection) return;
        
        const isCollapsed = this.elements.debugSection.classList.contains('collapsed');
        
        if (isCollapsed) {
            this.elements.debugSection.classList.remove('collapsed');
            this.elements.debugToggle.textContent = '🐛 Masquer outils développement';
        } else {
            this.elements.debugSection.classList.add('collapsed');
            this.elements.debugToggle.textContent = '🐛 Outils de développement';
        }
    }
    
    async runDiagnostics() {
        logger.group('Diagnostics système');
        
        this.showStatus('Exécution des diagnostics...', 'info');
        
        try {
            const diagnostics = {
                extension: this.checkExtensionStatus(),
                permissions: await this.checkPermissions(),
                storage: await this.checkStorage(),
                tabs: await this.checkTabsAccess(),
                google: await this.checkGoogleAccess()
            };
            
            const report = this.generateDiagnosticReport(diagnostics);
            
            console.log('=== RAPPORT DE DIAGNOSTICS ===');
            console.table(diagnostics);
            console.log(report);
            
            this.showStatus('Diagnostics terminés - voir console', 'success');
            
            logger.success('Diagnostics terminés');
        } catch (error) {
            logger.error('Erreur diagnostics:', error);
            this.showStatus('Erreur lors des diagnostics', 'error');
        } finally {
            logger.groupEnd();
        }
    }
    
    checkExtensionStatus() {
        return {
            isExtension: Utils.isExtensionContext(),
            manifestVersion: Utils.isExtensionContext() ? chrome.runtime.getManifest()?.manifest_version : 'N/A',
            extensionId: Utils.isExtensionContext() ? chrome.runtime.id : 'N/A'
        };
    }
    
    async checkPermissions() {
        if (!Utils.isExtensionContext()) return { available: false };
        
        try {
            const permissions = await chrome.permissions.getAll();
            return {
                available: true,
                permissions: permissions.permissions || [],
                origins: permissions.origins || []
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }
    
    async checkStorage() {
        if (!Utils.isExtensionContext()) return { available: false };
        
        try {
            const data = await chrome.storage.local.get(null);
            const keys = Object.keys(data);
            
            return {
                available: true,
                itemCount: keys.length,
                totalSize: JSON.stringify(data).length,
                keys: keys.slice(0, 10) // Premières 10 clés
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }
    
    async checkTabsAccess() {
        if (!Utils.isExtensionContext()) return { available: false };
        
        try {
            const tabs = await chrome.tabs.query({});
            return {
                available: true,
                tabCount: tabs.length,
                googleTabs: tabs.filter(tab => tab.url?.includes('google.com')).length
            };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }
    
    async checkGoogleAccess() {
        try {
            // Tester l'accès à Google (méthode simple)
            const testUrl = 'https://www.google.com';
            
            if (Utils.isExtensionContext()) {
                // Vérifier si on peut créer un onglet Google
                const tab = await chrome.tabs.create({ url: testUrl, active: false });
                await chrome.tabs.remove(tab.id);
                
                return {
                    available: true,
                    canCreateTabs: true,
                    testUrl: testUrl
                };
            } else {
                return {
                    available: true,
                    canCreateTabs: false,
                    testUrl: testUrl,
                    note: 'Test limité hors contexte extension'
                };
            }
        } catch (error) {
            return { available: false, error: error.message };
        }
    }
    
    generateDiagnosticReport(diagnostics) {
        const issues = [];
        const recommendations = [];
        
        // Analyser les résultats
        if (!diagnostics.extension.isExtension) {
            issues.push('Extension non détectée dans le contexte actuel');
        }
        
        if (diagnostics.permissions.available && diagnostics.permissions.permissions.length === 0) {
            issues.push('Aucune permission détectée');
            recommendations.push('Vérifier le manifest.json');
        }
        
        if (!diagnostics.tabs.available) {
            issues.push('Accès aux onglets non disponible');
            recommendations.push('Vérifier la permission "tabs"');
        }
        
        if (!diagnostics.google.available) {
            issues.push('Impossible d\'accéder à Google');
            recommendations.push('Vérifier les host_permissions');
        }
        
        return {
            issues: issues,
            recommendations: recommendations,
            overallStatus: issues.length === 0 ? 'OK' : 'ISSUES_FOUND',
            timestamp: new Date().toISOString()
        };
    }
    
    clearProgressUpdates() {
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
            this.progressUpdateInterval = null;
        }
    }
    
    // Méthodes pour définir les callbacks
    
    onFileSelected(callback) {
        this.callbacks.onFileSelected = callback;
    }
    
    onColumnSelected(callback) {
        this.callbacks.onColumnSelected = callback;
    }
    
    onSearchStart(callback) {
        this.callbacks.onSearchStart = callback;
    }
    
    onExport(callback) {
        this.callbacks.onExport = callback;
    }
    
    // Méthode de nettoyage
    destroy() {
        this.clearProgressUpdates();
        
        // Supprimer les event listeners si nécessaire
        // (dans ce cas, ils sont automatiquement nettoyés quand l'élément est supprimé)
        
        logger.debug('UIManager nettoyé');
    }
}