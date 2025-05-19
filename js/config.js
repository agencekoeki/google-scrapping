// config.js - Configuration centralisée de l'extension
export const CONFIG = {
    // Paramètres de recherche
    SEARCH: {
        DEFAULT_RESULT_COUNT: 50,
        MAX_RESULT_COUNT: 100,
        DEFAULT_DELAY: 2,
        MIN_DELAY: 1,
        MAX_DELAY: 10,
        TIMEOUT: 20000,
        MAX_RETRIES: 3
    },
    
    // Sélecteurs CSS pour l'extraction Google
    SELECTORS: {
        SEARCH_RESULTS: [
            'h3.LC20lb',
            'div[data-ved] h3',
            '.g .yuRUbf h3',
            '.rc h3',
            '[data-sokoban-container] h3',
            '.g h3'
        ],
        RESULT_LINKS: [
            'a',
            '.yuRUbf a',
            '.g a'
        ],
        DESCRIPTIONS: [
            '.VwiC3b',
            '[data-sncf] span',
            '.IsZvec span',
            '[style*="color"]:not(h3):not(cite)'
        ]
    },
    
    // URLs et patterns
    URLS: {
        GOOGLE_SEARCH: 'https://www.google.com/search',
        GOOGLE_DOMAINS: [
            'https://www.google.com/*',
            'https://google.com/*',
            'https://google.fr/*'
        ]
    },
    
    // Configuration des fichiers
    FILES: {
        SUPPORTED_FORMATS: ['.csv', '.xls', '.xlsx'],
        CSV_DELIMITER: ',',
        ENCODING: 'utf-8',
        MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB
    },
    
    // Messages d'erreur
    ERRORS: {
        FILE_TOO_LARGE: 'Le fichier est trop volumineux (max 10MB)',
        FILE_FORMAT_NOT_SUPPORTED: 'Format de fichier non supporté',
        EMPTY_FILE: 'Le fichier est vide',
        NO_QUERIES_FOUND: 'Aucune requête trouvée dans la colonne sélectionnée',
        EXTRACTION_FAILED: 'Échec de l\'extraction des résultats',
        GOOGLE_BLOCKED: 'Google semble bloquer les requêtes automatisées',
        CAPTCHA_DETECTED: 'CAPTCHA détecté - veuillez attendre avant de continuer'
    },
    
    // Messages de succès
    SUCCESS: {
        FILE_LOADED: 'Fichier chargé avec succès',
        SEARCH_COMPLETED: 'Recherches terminées avec succès',
        RESULTS_EXPORTED: 'Résultats exportés avec succès'
    },
    
    // Configuration du debug
    DEBUG: {
        ENABLED: true,
        LOG_LEVELS: {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        },
        DEFAULT_LEVEL: 2 // INFO
    }
};