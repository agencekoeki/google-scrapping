# Google Search Automation

🔍 Une extension Chrome pour automatiser les recherches Google à partir de fichiers CSV et exporter les résultats.

## ✨ Fonctionnalités

- 📁 Import de fichiers CSV/Excel
- 🔍 Recherches Google automatisées
- ⚙️ Configuration personnalisable (nombre de résultats, délais)
- 📊 Export des résultats en CSV/JSON
- 🛠️ Outils de debug intégrés
- 🌐 Interface moderne et responsive

## 📥 Installation

### Installation depuis GitHub

1. **Télécharger l'extension**
   ```bash
   git clone https://github.com/votre-username/google-search-automation.git
   cd google-search-automation
   ```

2. **Charger l'extension dans Chrome**
   - Ouvrez Chrome et allez à `chrome://extensions/`
   - Activez le "Mode développeur" (en haut à droite)
   - Cliquez sur "Charger l'extension non empaquetée"
   - Sélectionnez le dossier de l'extension téléchargée

### Installation depuis Chrome Web Store

*Bientôt disponible*

## 🚀 Utilisation

1. **Préparer votre fichier CSV**
   - Format CSV avec en-têtes
   - Une colonne contenant les requêtes de recherche

2. **Configurer l'extension**
   - Cliquez sur l'icône de l'extension
   - Uploadez votre fichier CSV
   - Sélectionnez la colonne des requêtes
   - Configurez le nombre de résultats et les délais

3. **Lancer les recherches**
   - Cliquez sur "Commencer les recherches"
   - Attendez la fin du processus
   - Téléchargez les résultats

## 🛠️ Développement

### Prérequis

- Chrome Browser
- Éditeur de code

### Structure du projet

```
google-search-automation/
├── manifest.json          # Configuration de l'extension
├── popup.html             # Interface utilisateur
├── popup.js               # Logique principale
├── background.js          # Service worker (optionnel)
├── icons/                 # Icônes de l'extension
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # Documentation
└── LICENSE                # Licence
```

### Développement local

1. **Cloner le repository**
   ```bash
   git clone https://github.com/votre-username/google-search-automation.git
   cd google-search-automation
   ```

2. **Modifier le code**
   - Utilisez votre éditeur préféré
   - Les changements sont reflétés après rechargement de l'extension

3. **Tester**
   - Rechargez l'extension dans `chrome://extensions/`
   - Testez les nouvelles fonctionnalités

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📋 Roadmap

- [ ] Support des fichiers Excel
- [ ] Recherches en parallèle
- [ ] Interface graphique pour visualiser les résultats
- [ ] Support d'autres moteurs de recherche
- [ ] API REST pour l'intégration

## 🐛 Signaler un Bug

Si vous trouvez un bug, veuillez créer une [issue](https://github.com/votre-username/google-search-automation/issues) avec :

- Description détaillée du problème
- Étapes pour reproduire
- Navigateur et version
- Screenshots si applicable

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour les détails.

## 🙏 Remerciements

- Inspired by automated web scraping needs
- Built with ❤️ for the developer community

## 📞 Support

- 📧 Email: votre-email@exemple.com
- 🐛 Issues: [GitHub Issues](https://github.com/votre-username/google-search-automation/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/votre-username/google-search-automation/discussions)

---

⭐ N'oubliez pas de donner une étoile au projet si vous le trouvez utile !