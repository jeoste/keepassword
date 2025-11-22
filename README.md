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

### Génération des icônes

Avant de construire l'application, générez les icônes pour chaque plateforme :

```bash
npm run generate-icons
```

**Note:** Ce script nécessite ImageMagick pour générer les icônes. Si ImageMagick n'est pas installé :
- **macOS**: `brew install imagemagick`
- **Windows**: Télécharger depuis [imagemagick.org](https://imagemagick.org/script/download.php)
- **Alternative**: Utiliser des convertisseurs en ligne et placer manuellement les fichiers dans `build/`:
  - `icon.ico` pour Windows (depuis `resources/icon.png`)
  - `icon.icns` pour macOS (depuis `resources/icon.png`)

### Construction de l'application

```bash
# Build pour Windows
npm run build:win

# Build pour macOS
npm run build:mac

# Build pour Linux
npm run build:linux
```

L'application est compatible avec :
- **Windows**: x64 et ia32
- **macOS**: x64 (Intel) et arm64 (Apple Silicon)
- **Linux**: x64

## Configuration de la mise à jour automatique

L'application utilise GitHub Actions pour les mises à jour automatiques. 

### Configuration requise

1. **Mettez à jour `electron-builder.yml`** avec vos informations GitHub :
```yaml
publish:
  provider: github
  owner: jeoste  # Remplacez par votre nom d'utilisateur GitHub
  repo: keepassword       # Remplacez par le nom de votre repository
  releaseType: release
```

2. **Mettez à jour `package.json`** avec votre URL GitHub :
```json
{
  "homepage": "https://github.com/jeoste/keepassword"
}
```

3. **Mettez à jour `src/main/index.ts`** si nécessaire (la configuration est automatique via electron-builder.yml)

### Workflows GitHub Actions

Deux workflows sont configurés :

1. **`build-on-push.yml`** : Construit l'application pour Mac et Windows à chaque push sur `main`
   - Les artefacts sont disponibles pendant 7 jours
   - Utile pour tester les builds

2. **`release.yml`** : Crée une release GitHub lors de :
   - Push d'un tag `v*` (ex: `v1.0.0`)
   - Création d'une release GitHub
   - Publie les fichiers d'installation sur GitHub Releases

### Créer une nouvelle release

#### Méthode 1 : Script automatique (recommandé)

Utilisez le script pour automatiser toutes les étapes :

**Sur macOS/Linux :**
```bash
# Avec la version en argument
npm run release:create 1.0.1

# Ou sans argument (le script vous demandera la version)
npm run release:create
```

**Sur Windows :**
```powershell
# Avec la version en argument
npm run release:create:win 1.0.1

# Ou sans argument (le script vous demandera la version)
npm run release:create:win
```

**Ou directement :**
```bash
# macOS/Linux
./scripts/release.sh 1.0.1

# Windows
powershell -ExecutionPolicy Bypass -File ./scripts/release.ps1 1.0.1
```

Le script va :
- ✅ Vérifier que vous êtes sur la branche `main`
- ✅ Vérifier que le working directory est propre
- ✅ Mettre à jour la version dans `package.json`
- ✅ Créer un commit avec le message approprié
- ✅ Créer un tag annoté
- ✅ Pousser les changements et le tag vers GitHub
- ✅ Déclencher automatiquement le workflow GitHub Actions

#### Méthode 2 : Manuellement

1. **Mettez à jour la version** dans `package.json` :
```json
{
  "version": "1.0.1"
}
```

2. **Créez un tag et poussez-le** :
```bash
git add package.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

#### Méthode 3 : Interface GitHub

- Allez dans "Releases" > "Create a new release"
- Choisissez un tag ou créez-en un nouveau
- Le workflow créera automatiquement la release avec les fichiers d'installation

### Fonctionnement des mises à jour

Lorsque vous créez une release (via tag ou interface GitHub) :

1. **GitHub Actions construit automatiquement** :
   - Application macOS (`.dmg` pour Intel et Apple Silicon)
   - Application Windows (`.exe` pour x64 et ia32)
   - Fichiers de métadonnées (`latest.yml`, `latest-mac.yml`) nécessaires pour les mises à jour

2. **Les fichiers sont publiés dans la release GitHub** :
   - Les utilisateurs peuvent télécharger manuellement les installateurs
   - Les fichiers de métadonnées permettent à l'application de détecter les nouvelles versions

3. **Mise à jour automatique pour les utilisateurs** :
   - L'application vérifie automatiquement les mises à jour au démarrage
   - Les utilisateurs peuvent également vérifier manuellement via l'interface
   - Les mises à jour sont téléchargées depuis GitHub Releases
   - L'installation se fait automatiquement au redémarrage de l'application

### Fichiers générés dans chaque release

Chaque release contient :

**macOS:**
- `Keepassword-{version}-mac.dmg` - Installateur pour macOS
- `Keepassword-{version}-mac.zip` - Archive ZIP
- `latest-mac.yml` - Métadonnées pour les mises à jour automatiques

**Windows:**
- `Keepassword Setup {version}.exe` - Installateur pour Windows
- `Keepassword-{version}-win.zip` - Archive ZIP
- `latest.yml` - Métadonnées pour les mises à jour automatiques

Les fichiers `.yml` sont essentiels pour que electron-updater détecte les nouvelles versions.

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


