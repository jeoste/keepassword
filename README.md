# Keepassword

Application de gestion de mots de passe moderne compatible avec KeePass (.kdbx).

## Fonctionnalités

- 🔒 Compatible avec les fichiers .kdbx de KeePass
- 🎨 Interface moderne avec shadcn UI
- 🔍 Recherche et filtrage des entrées
- ⭐ Favoris
- 📋 Presse-papiers sécurisé (effacement automatique après 30 secondes)
- 🔄 Mise à jour automatique via GitHub Releases
- 💾 Sauvegarde automatique
- 🔐 Verrouillage automatique

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

## Build

```bash
# Build pour Windows
npm run build:win

# Build pour macOS
npm run build:mac

# Build pour Linux
npm run build:linux
```

## Configuration de la mise à jour automatique

Pour activer les mises à jour automatiques, configurez votre repository GitHub dans `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: votre-username
  repo: keepassword
  releaseType: release
```

## Technologies

- Electron
- React
- TypeScript
- Tailwind CSS
- shadcn UI
- kdbxweb (compatibilité KeePass)
- Zustand (gestion d'état)
- electron-updater (mises à jour automatiques)

## Licence

MIT


