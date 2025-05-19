# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Non publié]

### Ajouté
- Support des fichiers Excel (XLS/XLSX) en cours
- Interface pour visualiser les résultats
- Recherches en parallèle

## [1.1.0] - 2025-01-XX

### Ajouté
- Section debug collapsible avec diagnostics
- Meilleure gestion des erreurs
- Indicateur de progression en temps réel
- Export JSON en plus du CSV

### Modifié
- Interface utilisateur redesignée et responsive
- Performance améliorée pour les gros fichiers
- Messages d'erreur plus explicites

### Corrigé
- Problème d'affichage étroit sur petits écrans
- Bug du toggle de la section debug
- Gestion des caractères spéciaux dans les CSV

## [1.0.1] - 2025-01-15

### Corrigé
- Erreur lors du chargement de gros fichiers CSV
- Problème d'encodage UTF-8
- Timeout trop court pour certaines recherches

### Modifié
- Délai par défaut augmenté à 2 secondes
- Limite de résultats par requête à 100

## [1.0.0] - 2025-01-10

### Ajouté
- Première version stable
- Support des fichiers CSV
- Recherches Google automatisées
- Export des résultats en CSV
- Interface utilisateur intuitive
- Système de debug avec logs détaillés
- Configuration personnalisable (délais, nombre de résultats)

### Sécurité
- Validation des entrées utilisateur
- Gestion sécurisée des permissions Chrome