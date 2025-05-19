// logger.js - Système de logging unifié
import { CONFIG } from './config.js';

class Logger {
    constructor() {
        this.level = CONFIG.DEBUG.DEFAULT_LEVEL;
        this.enabled = CONFIG.DEBUG.ENABLED;
        this.loadSettings();
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['debugLevel', 'debugEnabled']);
            this.level = result.debugLevel ?? this.level;
            this.enabled = result.debugEnabled ?? this.enabled;
        } catch (error) {
            // Fallback si chrome.storage non disponible
            console.warn('Impossible de charger les paramètres de debug:', error);
        }
    }
    
    async updateSettings(enabled, level) {
        this.enabled = enabled;
        this.level = level;
        
        try {
            await chrome.storage.local.set({ 
                debugEnabled: enabled, 
                debugLevel: level 
            });
        } catch (error) {
            console.warn('Impossible de sauvegarder les paramètres de debug:', error);
        }
    }
    
    log(level, message, data = null, emoji = '') {
        if (!this.enabled || level > this.level) return;
        
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = `${emoji} [${timestamp}]`;
        
        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
    
    error(message, error = null) {
        this.log(CONFIG.DEBUG.LOG_LEVELS.ERROR, message, error, '❌');
        
        // Toujours afficher les erreurs même si debug désactivé
        if (!this.enabled) {
            console.error(`❌ ${message}`, error);
        }
    }
    
    warn(message, data = null) {
        this.log(CONFIG.DEBUG.LOG_LEVELS.WARN, message, data, '⚠️');
    }
    
    info(message, data = null) {
        this.log(CONFIG.DEBUG.LOG_LEVELS.INFO, message, data, 'ℹ️');
    }
    
    debug(message, data = null) {
        this.log(CONFIG.DEBUG.LOG_LEVELS.DEBUG, message, data, '🔍');
    }
    
    success(message, data = null) {
        this.log(CONFIG.DEBUG.LOG_LEVELS.INFO, message, data, '✅');
    }
    
    // Méthodes utilitaires
    group(name) {
        if (this.enabled) console.group(`🗂️ ${name}`);
    }
    
    groupEnd() {
        if (this.enabled) console.groupEnd();
    }
    
    time(label) {
        if (this.enabled) console.time(`⏱️ ${label}`);
    }
    
    timeEnd(label) {
        if (this.enabled) console.timeEnd(`⏱️ ${label}`);
    }
    
    table(data) {
        if (this.enabled && this.level >= CONFIG.DEBUG.LOG_LEVELS.DEBUG) {
            console.table(data);
        }
    }
    
    // Méthode pour créer un rapport d'erreur détaillé
    createErrorReport(error, context = {}) {
        return {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location?.href
        };
    }
}

// Instance singleton
export const logger = new Logger();