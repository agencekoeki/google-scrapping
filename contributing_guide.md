# Contribution Guidelines

🎉 Merci de votre intérêt pour contribuer à Google Search Automation !

## 🚀 Comment contribuer

### 🐛 Signaler des bugs

1. Vérifiez d'abord si le bug n'a pas déjà été signalé dans les [Issues](../../issues)
2. Créez une nouvelle issue avec le template "Bug Report"
3. Incluez :
   - Description détaillée du problème
   - Étapes pour reproduire
   - Comportement attendu vs actuel
   - Version du navigateur et de l'extension
   - Screenshots/logs si applicable

### ✨ Suggérer des fonctionnalités

1. Vérifiez les [Issues](../../issues) et [Discussions](../../discussions) existantes
2. Créez une issue avec le template "Feature Request"
3. Décrivez clairement :
   - Le problème que ça résoudrait
   - La solution proposée
   - Les alternatives envisagées

### 🔧 Contribuer au code

1. **Fork** le repository
2. **Clonez** votre fork localement
   ```bash
   git clone https://github.com/votre-username/google-search-automation.git
   cd google-search-automation
   ```

3. **Créez une branche** pour votre fonctionnalité
   ```bash
   git checkout -b feature/nom-de-votre-feature
   ```

4. **Développez** votre fonctionnalité
   - Suivez les standards de code
   - Ajoutez des commentaires
   - Testez vos changements

5. **Committez** vos changements
   ```bash
   git add .
   git commit -m "feat: description de votre fonctionnalité"
   ```

6. **Poussez** vers votre fork
   ```bash
   git push origin feature/nom-de-votre-feature
   ```

7. **Créez une Pull Request**
   - Description claire des changements
   - Référencez les issues liées
   - Ajoutez des captures d'écran si applicable

## 📝 Standards de code

### JavaScript

- Utilisez des noms de variables descriptifs
- Commentez les fonctions complexes
- Gérez les erreurs avec try/catch
- Utilisez const/let au lieu de var

```javascript
// ✅ Bon
const searchResults = await performGoogleSearch(query, maxResults);

// ❌ Mauvais  
var res = await search(q, max);
```

### CSS

- Utilisez les variables CSS définies
- Nommage cohérent des classes
- Évitez les !important sauf si nécessaire

```css
/* ✅ Bon */
.button-primary {
    background: var(--primary-color);
    padding: var(--spacing-md);
}

/* ❌ Mauvais */
.btn {
    background: #4285f4 !important;
    padding: 16px !important;
}
```

### Commits

Utilisez la convention [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` documentation
- `style:` formatage
- `refactor:` refactoring
- `test:` tests
- `chore:` maintenance

## 🧪 Tests

Avant de soumettre une PR :

1. **Testez manuellement** votre fonctionnalité
2. **Vérifiez** qu'aucune régression n'est introduite
3. **Testez** sur différentes tailles d'écran
4. **Chargez** l'extension dans Chrome et testez

## 📋 Checklist PR

- [ ] Code testé manuellement
- [ ] Pas d'erreurs dans la console
- [ ] Documentation mise à jour si nécessaire
- [ ] Commits suivent la convention
- [ ] PR liée aux issues pertinentes

## 🎨 Design Guidelines

- Respectez la charte graphique existante
- Utilisez les couleurs et espacements définis
- Interface responsive (mobile-first)
- Accessibilité (contraintes, focus)

## 🏷️ Labels

Nous utilisons ces labels pour organiser les issues/PR :

- `bug` - Bugs confirmés
- `enhancement` - Nouvelles fonctionnalités
- `documentation` - Améliorations doc
- `good first issue` - Parfait pour débuter
- `help wanted` - Aide recherchée
- `priority: high/medium/low` - Priorité
- `status: in progress` - En cours
- `status: review needed` - Besoin de review

## 🤔 Questions ?

- 💬 [Discussions GitHub](../../discussions)
- 📧 Email: contact@example.com
- 🐛 [Issues](../../issues) pour les bugs

## 🙏 Remerciements

Merci d'aider à améliorer ce projet ! Chaque contribution compte, même la plus petite.

---

**Code of Conduct:** Soyez respectueux et bienveillant envers tous les contributeurs. Voir [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) pour plus de détails.