// ===== SCRIPT PRINCIPAL =====

// Fonction pour afficher les messages de statut
function showStatus(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) return;
    
    debugLog(`Status [${type}]: ${message}`);
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Fonction principale d'initialisation
function initApp() {
    debugLog('=== INITIALISATION DE L\'APPLICATION ===');
    
    // Initialiser les différents systèmes
    initDebugSystem();
    initFileHandlers();
    initSearchHandlers();
    
    // Test immédiat
    showStatus('Extension chargée et prête !', 'success');
    successLog('Extension initialisée avec succès');
    
    debugLog('=== INITIALISATION TERMINÉE ===');
}

// Fonction pour initialiser les gestionnaires de recherche
function initSearchHandlers() {
    const queryColumn = document.getElementById('queryColumn');
    const startButton = document.getElementById('startButton');
    
    if (!queryColumn || !startButton) {
        errorLog('Éléments de recherche non trouvés');
        return;
    }
    
    // Gestionnaire de changement de colonne
    queryColumn.addEventListener('change', function() {
        debugLog('Colonne sélectionnée:', queryColumn.value);
        startButton.disabled = !queryColumn.value;
        
        if (queryColumn.value) {
            successLog(`Colonne "${queryColumn.value}" sélectionnée, bouton démarrage activé`);
        } else {
            infoLog('Aucune colonne sélectionnée, bouton démarrage désactivé');
        }
    });
    
    // Gestionnaire du bouton de démarrage
    startButton.addEventListener('click', function() {
        handleSearchStart();
    });
    
    debugLog('Gestionnaires de recherche initialisés');
}

// Fonction pour gérer le démarrage des recherches
async function handleSearchStart() {
    debugLog('=== DÉMARRAGE DES RECHERCHES ===');
    
    const queryColumn = document.getElementById('queryColumn');
    const resultCount = document.getElementById('resultCount');
    const delayBetween = document.getElementById('delayBetween');
    const startButton = document.getElementById('startButton');
    
    if (!fileData || !queryColumn.value) {
        errorLog('Données manquantes', {
            hasFileData: !!fileData,
            selectedColumn: queryColumn.value
        });
        showStatus('Veuillez sélectionner un fichier et une colonne', 'error');
        return;
    }
    
    const selectedColumn = queryColumn.value;
    const resultCountValue = parseInt(resultCount.value);
    const delayValue = parseInt(delayBetween.value);
    
    debugLog('Configuration de recherche:', {
        selectedColumn,
        resultCount: resultCountValue,
        delay: delayValue,
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
    
    try {
        // Démarrer le processus de scraping
        await startScraping(queries, resultCountValue, delayValue);
    } catch (error) {
        errorLog('Erreur during scraping:', error);
        showStatus('Erreur pendant le scraping', 'error');
    } finally {
        // Réactiver le bouton
        startButton.disabled = false;
        startButton.textContent = 'Commencer les recherches';
    }
}

// Attendre que la page soit entièrement chargée
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM chargé');
    
    // Ajouter un délai pour s'assurer que tous les scripts sont chargés
    setTimeout(() => {
        initApp();
    }, 100);
});