console.log('=== SCRIPT CHARGÉ ===');

// ===== SYSTÈME DE DEBUG =====
let DEBUG_MODE = true; // Variable globale pour le mode debug

function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        if (data) {
            console.log(`🔍 DEBUG: ${message}`, data);
        } else {
            console.log(`🔍 DEBUG: ${message}`);
        }
    }
}

function errorLog(message, error = null) {
    console.error(`❌ ERROR: ${message}`, error);
}

function successLog(message, data = null) {
    if (DEBUG_MODE) {
        if (data) {
            console.log(`✅ SUCCESS: ${message}`, data);
        } else {
            console.log(`✅ SUCCESS: ${message}`);
        }
    }
}

function infoLog(message, data = null) {
    if (DEBUG_MODE) {
        if (data) {
            console.log(`ℹ️ INFO: ${message}`, data);
        } else {
            console.log(`ℹ️ INFO: ${message}`);
        }
    }
}

function warningLog(message, data = null) {
    if (DEBUG_MODE) {
        if (data) {
            console.warn(`⚠️ WARNING: ${message}`, data);
        } else {
            console.warn(`⚠️ WARNING: ${message}`);
        }
    }
}

// Variables globales
let fileData = null;
let headers = [];

// Attendre que la page soit entièrement chargée
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM chargé, initialisation...');
    
    // Récupérer les éléments
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileDetails = document.getElementById('fileDetails');
    const queryColumn = document.getElementById('queryColumn');
    const startButton = document.getElementById('startButton');
    const statusMessage = document.getElementById('statusMessage');
    const debugModeCheckbox = document.getElementById('debugMode');
    
    debugLog('Éléments récupérés:', {
        uploadArea: !!uploadArea,
        fileInput: !!fileInput,
        fileInfo: !!fileInfo,
        debugModeCheckbox: !!debugModeCheckbox
    });
    
    // Gestionnaire du mode debug
    if (debugModeCheckbox) {
        debugModeCheckbox.addEventListener('change', function() {
            DEBUG_MODE = debugModeCheckbox.checked;
            infoLog(`Mode debug ${DEBUG_MODE ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
            
            // Sauvegarder la préférence
            chrome.storage.local.set({ debugMode: DEBUG_MODE });
        });
        
        // Charger la préférence debug sauvegardée
        chrome.storage.local.get(['debugMode'], function(result) {
            if (result.debugMode !== undefined) {
                DEBUG_MODE = result.debugMode;
                debugModeCheckbox.checked = DEBUG_MODE;
                debugLog(`Préférence debug chargée: ${DEBUG_MODE}`);
            }
        });
    }
    
    // Fonction pour afficher les messages
    function showStatus(message, type) {
        debugLog(`Status [${type}]: ${message}`);
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status ${type}`;
            statusMessage.style.display = 'block';
            
            if (type === 'success' || type === 'error') {
                setTimeout(() => {
                    statusMessage.style.display = 'none';
                }, 5000);
            }
        }
    }
    
    // Test immédiat
    showStatus('Extension chargée et prête !', 'success');
    successLog('Extension initialisée avec succès');
    
    // Gestionnaire du sélecteur de fichier
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            debugLog('=== CHANGEMENT DE FICHIER ===');
            debugLog('Nombre de fichiers détectés:', e.target.files.length);
            
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                debugLog('Fichier sélectionné:', {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: new Date(file.lastModified).toISOString()
                });
                handleFileUpload(file);
            } else {
                warningLog('Aucun fichier sélectionné');
            }
        });
    }
    
    // Gestionnaires drag & drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            debugLog('=== DRAG OVER ===');
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            debugLog('=== DRAG LEAVE ===');
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            debugLog('=== DROP EVENT ===');
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            debugLog('Nombre de fichiers droppés:', files.length);
            
            if (files.length > 0) {
                const file = files[0];
                debugLog('Premier fichier droppé:', {
                    name: file.name,
                    type: file.type,
                    size: file.size
                });
                handleFileUpload(file);
            } else {
                warningLog('Aucun fichier dans le drop event');
            }
        });
    }
    
    // Gestionnaire de changement de colonne
    if (queryColumn) {
        queryColumn.addEventListener('change', function() {
            debugLog('Colonne sélectionnée:', queryColumn.value);
            if (startButton) {
                startButton.disabled = !queryColumn.value;
            }
            
            if (queryColumn.value) {
                successLog(`Colonne "${queryColumn.value}" sélectionnée, bouton démarrage activé`);
            } else {
                infoLog('Aucune colonne sélectionnée, bouton démarrage désactivé');
            }
        });
    }
    
    // Gestionnaire du bouton de démarrage
    if (startButton) {
        startButton.addEventListener('click', function() {
            debugLog('=== DÉMARRAGE DES RECHERCHES ===');
            
            if (!fileData || !queryColumn.value) {
                errorLog('Données manquantes', {
                    hasFileData: !!fileData,
                    selectedColumn: queryColumn.value
                });
                showStatus('Veuillez sélectionner un fichier et une colonne', 'error');
                return;
            }
            
            const selectedColumn = queryColumn.value;
            const resultCount = parseInt(document.getElementById('resultCount').value);
            const delay = parseInt(document.getElementById('delayBetween').value);
            
            debugLog('Configuration de recherche:', {
                selectedColumn,
                resultCount,
                delay,
                totalRows: fileData.length
            });
            
            const queries = fileData
                .map(row => row[selectedColumn])
                .filter(query => query && query.trim())
                .map(query => query.trim());
            
            debugLog('Requêtes extraites:', {
                totalQueries: queries.length,
                queries: queries.slice(0, 3).concat(queries.length > 3 ? ['...'] : [])
            });
            
            if (queries.length === 0) {
                errorLog('Aucune requête trouvée dans la colonne', { selectedColumn });
                showStatus('Aucune requête trouvée dans la colonne sélectionnée', 'error');
                return;
            }
            
            successLog(`Démarrage du scraping de ${queries.length} requêtes`);
            
            // Désactiver le bouton pendant le traitement
            startButton.disabled = true;
            startButton.textContent = 'Scraping en cours...';
            
            // Démarrer le processus de scraping
            startScraping(queries, resultCount, delay);
        });
    }
    
    // Fonction de traitement du fichier
    function handleFileUpload(file) {
        debugLog('=== TRAITEMENT DU FICHIER ===');
        debugLog('Informations du fichier:', {
            name: file.name,
            size: `${file.size} bytes`,
            type: file.type,
            lastModified: new Date(file.lastModified).toISOString()
        });
        
        showStatus('Lecture du fichier en cours...', 'info');
        
        const extension = file.name.split('.').pop().toLowerCase();
        debugLog('Extension détectée:', extension);
        
        if (extension !== 'csv') {
            errorLog('Format non supporté', { extension, supportedFormats: ['csv'] });
            showStatus('Seuls les fichiers CSV sont supportés pour le moment', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            debugLog('Fichier lu, début du parsing...');
            
            try {
                const text = e.target.result;
                debugLog('Contenu du fichier (statistiques):', {
                    totalLength: text.length,
                    preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                    encoding: 'Détecté automatiquement'
                });
                
                const lines = text.split('\n').filter(line => line.trim());
                debugLog('Parsing des lignes:', {
                    totalLines: lines.length,
                    emptyLinesRemoved: text.split('\n').length - lines.length
                });
                
                if (lines.length < 2) {
                    throw new Error('Le fichier doit contenir au moins 2 lignes (en-têtes + données)');
                }
                
                // Parser simple
                headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                debugLog('En-têtes détectés:', headers);
                
                fileData = [];
                let parseErrors = 0;
                
                for (let i = 1; i < lines.length; i++) {
                    try {
                        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });
                        fileData.push(row);
                    } catch (error) {
                        parseErrors++;
                        warningLog(`Erreur parsing ligne ${i + 1}:`, error);
                    }
                }
                
                debugLog('Parsing terminé:', {
                    rowsParsed: fileData.length,
                    parseErrors: parseErrors,
                    sampleRow: fileData[0]
                });
                
                if (parseErrors > 0) {
                    warningLog(`${parseErrors} erreurs de parsing détectées`);
                }
                
                // Afficher les informations
                if (fileName) fileName.textContent = file.name;
                if (fileDetails) fileDetails.textContent = `${fileData.length} lignes, ${headers.length} colonnes`;
                if (fileInfo) fileInfo.style.display = 'block';
                
                // Remplir le sélecteur
                if (queryColumn) {
                    queryColumn.innerHTML = '<option value="">Sélectionnez une colonne...</option>';
                    headers.forEach(header => {
                        const option = document.createElement('option');
                        option.value = header;
                        option.textContent = header;
                        queryColumn.appendChild(option);
                    });
                    queryColumn.disabled = false;
                }
                
                successLog('Fichier traité avec succès', {
                    headers: headers,
                    rowCount: fileData.length
                });
                showStatus('Fichier chargé avec succès !', 'success');
                
            } catch (error) {
                errorLog('Erreur de traitement du fichier:', error);
                showStatus(`Erreur: ${error.message}`, 'error');
            }
        };
        
        reader.onerror = function(error) {
            errorLog('Erreur de lecture du fichier:', error);
            showStatus('Erreur de lecture du fichier', 'error');
        };
        
        reader.readAsText(file, 'utf-8');
    }
    
    // Fonction de scraping
    async function startScraping(queries, resultCount, delay) {
        debugLog('=== DÉBUT DU SCRAPING ===');
        debugLog('Paramètres de scraping:', {
            numberOfQueries: queries.length,
            resultCount,
            delayBetweenQueries: delay,
            startTime: new Date().toISOString()
        });
        
        showStatus(`Démarrage du scraping de ${queries.length} requêtes...`, 'info');
        
        const results = [];
        const errors = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            const queryStartTime = performance.now();
            
            debugLog(`=== REQUÊTE ${i + 1}/${queries.length} ===`);
            debugLog(`Traitement de: "${query}"`);
            
            showStatus(`Recherche ${i + 1}/${queries.length}: "${query}"`, 'info');
            
            try {
                const searchResults = await performGoogleSearch(query, resultCount);
                const queryEndTime = performance.now();
                const queryDuration = Math.round(queryEndTime - queryStartTime);
                
                results.push({
                    query: query,
                    results: searchResults,
                    timestamp: new Date().toISOString(),
                    duration: queryDuration
                });
                
                successCount++;
                successLog(`Requête "${query}" terminée`, {
                    resultsFound: searchResults.length,
                    duration: `${queryDuration}ms`,
                    successRate: `${successCount}/${i + 1}`
                });
                
                // Attendre avant la prochaine recherche (sauf pour la dernière)
                if (i < queries.length - 1) {
                    debugLog(`Attente de ${delay} secondes avant la prochaine recherche...`);
                    showStatus(`Attente de ${delay} secondes avant la prochaine recherche...`, 'info');
                    await sleep(delay * 1000);
                }
                
            } catch (error) {
                const queryEndTime = performance.now();
                const queryDuration = Math.round(queryEndTime - queryStartTime);
                
                errorCount++;
                errorLog(`Erreur pour la requête "${query}":`, error);
                
                const errorResult = {
                    query: query,
                    results: [],
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    duration: queryDuration
                };
                
                results.push(errorResult);
                errors.push(errorResult);
                
                warningLog(`Requête "${query}" échouée`, {
                    error: error.message,
                    duration: `${queryDuration}ms`,
                    errorRate: `${errorCount}/${i + 1}`
                });
            }
        }
        
        debugLog('=== SCRAPING TERMINÉ ===');
        debugLog('Statistiques finales:', {
            totalQueries: queries.length,
            successCount,
            errorCount,
            successRate: `${Math.round((successCount / queries.length) * 100)}%`,
            totalResults: results.reduce((sum, r) => sum + (r.results?.length || 0), 0),
            endTime: new Date().toISOString()
        });
        
        // Réactiver le bouton
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = 'Commencer les recherches';
        }
        
        if (errors.length > 0) {
            warningLog(`${errors.length} requêtes ont échoué`, errors);
            showStatus(`Scraping terminé avec ${errors.length} erreurs sur ${queries.length} requêtes`, 'warning');
        } else {
            successLog('Scraping terminé sans erreur');
            showStatus(`Scraping terminé ! ${results.length} requêtes traitées avec succès`, 'success');
        }
        
        // Proposer le téléchargement des résultats
        downloadResults(results);
    }
    
    // Fonction pour effectuer une recherche Google
    function performGoogleSearch(query, maxResults) {
        return new Promise((resolve, reject) => {
            debugLog(`🔍 Recherche Google pour: "${query}" (${maxResults} résultats demandés)`);
            
            // Calculer le nombre de résultats par page à demander
            const resultsPerPage = Math.min(maxResults, 100); // Google limite à 100 max
            
            // D'abord vérifier si on a déjà un onglet Google ouvert
            chrome.tabs.query({}, (tabs) => {
                let googleTab = null;
                
                // Chercher un onglet Google existant
                for (const tab of tabs) {
                    if (tab.url && tab.url.includes('google.com/search')) {
                        googleTab = tab;
                        debugLog(`Onglet Google trouvé: ${tab.id} - ${tab.url}`);
                        break;
                    }
                }
                
                // Créer l'URL avec le paramètre num pour plus de résultats
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${resultsPerPage}`;
                debugLog('URL de recherche:', searchUrl);
                
                if (googleTab) {
                    // Réutiliser l'onglet Google existant
                    debugLog(`Réutilisation de l'onglet Google existant: ${googleTab.id}`);
                    chrome.tabs.update(googleTab.id, { url: searchUrl, active: false }, () => {
                        handleTabSearch(googleTab.id, query, maxResults, resolve, reject);
                    });
                } else {
                    // Créer un nouvel onglet Google
                    debugLog('Création d\'un nouvel onglet Google');
                    chrome.tabs.create({ url: searchUrl, active: false }, (tab) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        handleTabSearch(tab.id, query, maxResults, resolve, reject);
                    });
                }
            });
        });
    }
    
    // Fonction pour gérer la recherche dans un onglet
    function handleTabSearch(tabId, query, maxResults, resolve, reject) {
        debugLog(`Onglet Google configuré: ${tabId} pour "${query}"`);
        
        // Attendre que la page soit chargée
        const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                
                debugLog(`Page chargée pour "${query}", extraction des résultats...`);
                
                setTimeout(() => {
                    extractResultsFromTab(tabId, maxResults)
                        .then(results => {
                            debugLog(`${results.length} résultats extraits pour "${query}"`);
                            resolve(results);
                        })
                        .catch(error => {
                            reject(error);
                        });
                }, 3000);
            }
        };
        
        chrome.tabs.onUpdated.addListener(listener);
        
        // Timeout de sécurité
        setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            reject(new Error(`Timeout pour la requête "${query}"`));
        }, 20000);
    }
    
    // Fonction pour extraire les résultats d'un onglet
    function extractResultsFromTab(tabId, maxResults) {
        return new Promise((resolve, reject) => {
            debugLog(`=== EXTRACTION ONGLET ${tabId} ===`);
            
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: extractGoogleResults,
                args: [maxResults]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    errorLog('Erreur extraction:', chrome.runtime.lastError.message);
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (results && results[0] && results[0].result) {
                    debugLog(`${results[0].result.length} résultats extraits de l'onglet ${tabId}`);
                    resolve(results[0].result);
                } else {
                    warningLog('Aucun résultat extrait, résultats:', results);
                    resolve([]);
                }
            });
        });
    }
    
    // Fonction pour télécharger les résultats
    function downloadResults(results) {
        debugLog('=== PRÉPARATION DU TÉLÉCHARGEMENT ===');
        
        // Préparer les données CSV
        const csvLines = ['Requête,Position,Titre,URL,Description,Timestamp'];
        
        results.forEach(searchResult => {
            if (searchResult.results && searchResult.results.length > 0) {
                searchResult.results.forEach(result => {
                    const line = [
                        `"${searchResult.query.replace(/"/g, '""')}"`,
                        result.position,
                        `"${result.title.replace(/"/g, '""')}"`,
                        `"${result.url}"`,
                        `"${result.description.replace(/"/g, '""')}"`,
                        `"${searchResult.timestamp}"`
                    ].join(',');
                    csvLines.push(line);
                });
            } else {
                // Ligne pour les requêtes sans résultats
                const line = [
                    `"${searchResult.query.replace(/"/g, '""')}"`,
                    '0',
                    '"Aucun résultat"',
                    '""',
                    `"${searchResult.error || 'Aucun résultat trouvé'}"`,
                    `"${searchResult.timestamp}"`
                ].join(',');
                csvLines.push(line);
            }
        });
        
        const csvContent = csvLines.join('\n');
        
        // Créer et télécharger le fichier
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const filename = `google_search_results_${new Date().toISOString().slice(0, 10)}.csv`;
        
        chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                errorLog('Erreur de téléchargement:', chrome.runtime.lastError);
                showStatus('Erreur lors du téléchargement', 'error');
            } else {
                successLog('Téléchargement initié:', downloadId);
                showStatus('Téléchargement des résultats initié !', 'success');
            }
            URL.revokeObjectURL(url);
        });
    }
    
    // Fonction utilitaire pour les délais
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    debugLog('=== INITIALISATION TERMINÉE ===');
});

// Fonction d'extraction à injecter dans la page Google
function extractGoogleResults(maxResults) {
    console.log('=== EXTRACTION DES RÉSULTATS GOOGLE ===');
    console.log('URL actuelle:', window.location.href);
    console.log('Titre de la page:', document.title);
    
    const results = [];
    
    // Attendre un peu que la page soit complètement chargée
    const waitTime = 1000;
    console.log(`Attente de ${waitTime}ms pour le chargement complet...`);
    
    return new Promise(resolve => {
        setTimeout(() => {
            // Différents sélecteurs pour les résultats de recherche
            const selectors = [
                'h3.LC20lb',
                'div[data-ved] h3',
                '.g .yuRUbf h3',
                '.rc h3',
                '[data-sokoban-container] h3',
                '.g h3'
            ];
            
            let elements = [];
            let usedSelector = '';
            
            for (const selector of selectors) {
                elements = document.querySelectorAll(selector);
                console.log(`Sélecteur "${selector}": ${elements.length} éléments`);
                if (elements.length > 0) {
                    usedSelector = selector;
                    break;
                }
            }
            
            console.log(`Utilisation du sélecteur: ${usedSelector}`);
            console.log(`${elements.length} éléments trouvés`);
            
            if (elements.length === 0) {
                console.warn('Aucun résultat trouvé. Structure de la page:');
                console.log('Classes disponibles:', Array.from(document.querySelectorAll('[class]')).map(el => el.className).slice(0, 10));
                console.log('IDs disponibles:', Array.from(document.querySelectorAll('[id]')).map(el => el.id).slice(0, 10));
            }
            
            for (let i = 0; i < Math.min(elements.length, maxResults); i++) {
                try {
                    const element = elements[i];
                    console.log(`Traitement élément ${i + 1}:`, element);
                    
                    // Trouver le lien parent
                    let link = element.closest('a') || element.querySelector('a') || element.parentElement.querySelector('a');
                    
                    if (!link) {
                        console.warn(`Aucun lien trouvé pour l'élément ${i + 1}`);
                        continue;
                    }
                    
                    const title = element.textContent.trim();
                    let url = link.href;
                    
                    console.log(`Élément ${i + 1} - Titre: ${title.substring(0, 50)}...`);
                    console.log(`Élément ${i + 1} - URL brute: ${url}`);
                    
                    // Nettoyer l'URL de Google
                    if (url.includes('/url?')) {
                        try {
                            const urlParams = new URLSearchParams(url.split('/url?')[1]);
                            url = urlParams.get('url') || urlParams.get('q') || url;
                            console.log(`Élément ${i + 1} - URL nettoyée: ${url}`);
                        } catch (e) {
                            console.warn(`Erreur nettoyage URL pour élément ${i + 1}:`, e);
                        }
                    }
                    
                    // Extraire la description
                    const parent = link.closest('.g') || link.closest('[data-ved]') || link.closest('div');
                    let description = '';
                    
                    if (parent) {
                        const descSelectors = [
                            '.VwiC3b',
                            '.s .st',
                            '[data-sncf]',
                            '.IsZvec',
                            '[style*="-webkit-line-clamp"]'
                        ];
                        
                        for (const descSelector of descSelectors) {
                            const descElement = parent.querySelector(descSelector);
                            if (descElement && descElement.textContent.trim()) {
                                description = descElement.textContent.trim();
                                break;
                            }
                        }
                    }
                    
                    const result = {
                        position: i + 1,
                        title: title,
                        url: url,
                        description: description
                    };
                    
                    results.push(result);
                    console.log(`Élément ${i + 1} ajouté:`, result);
                    
                } catch (error) {
                    console.error(`Erreur extraction élément ${i + 1}:`, error);
                }
            }
            
            console.log(`=== EXTRACTION TERMINÉE: ${results.length} résultats ===`);
            resolve(results);
        }, waitTime);
    });
}

// Ajouter ce code dans votre fichier popup.js
// Gestionnaire pour la section debug collapsible

document.addEventListener('DOMContentLoaded', function() {
    // Gestionnaire pour le toggle de la section debug
    const debugToggle = document.getElementById('debugToggle');
    const debugSection = document.getElementById('debugSection');
    
    if (debugToggle && debugSection) {
        debugToggle.addEventListener('click', function() {
            // Toggle la classe collapsed
            debugSection.classList.toggle('collapsed');
            
            // Optionnel: changer le texte du bouton selon l'état
            if (debugSection.classList.contains('collapsed')) {
                debugToggle.textContent = '🐛 Outils de développement';
            } else {
                debugToggle.textContent = '🐛 Masquer outils développement';
            }
            
            console.log('Debug section toggled:', !debugSection.classList.contains('collapsed'));
        });
        
        console.log('Debug toggle handler initialized');
    } else {
        console.error('Debug elements not found:', {
            toggle: !!debugToggle,
            section: !!debugSection
        });
    }
});