#!/bin/bash

# Script pour créer une nouvelle release
# Usage: ./scripts/release.sh [version]
# Exemple: ./scripts/release.sh 1.0.1

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que nous sommes dans un repository git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Ce script doit être exécuté dans un repository git"
    exit 1
fi

# Vérifier que nous sommes sur la branche main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    error "Vous devez être sur la branche 'main' (actuellement sur '$CURRENT_BRANCH')"
    exit 1
fi

# Vérifier que le working directory est propre
if ! git diff-index --quiet HEAD --; then
    error "Le working directory n'est pas propre. Veuillez commit ou stash vos changements."
    exit 1
fi

# Récupérer la version actuelle
CURRENT_VERSION=$(node -p "require('./package.json').version")
info "Version actuelle: $CURRENT_VERSION"

# Demander la nouvelle version si elle n'est pas fournie en argument
if [ -z "$1" ]; then
    echo -n "Entrez la nouvelle version (ex: 1.0.1): "
    read NEW_VERSION
else
    NEW_VERSION=$1
fi

# Valider le format de version (semver)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    error "Format de version invalide. Utilisez le format semver (ex: 1.0.1)"
    exit 1
fi

# Vérifier que la nouvelle version est différente
if [ "$CURRENT_VERSION" == "$NEW_VERSION" ]; then
    error "La nouvelle version ($NEW_VERSION) est identique à la version actuelle"
    exit 1
fi

# Confirmation
warn "Vous allez créer la release v$NEW_VERSION"
echo "  - Version actuelle: $CURRENT_VERSION"
echo "  - Nouvelle version: $NEW_VERSION"
echo "  - Tag: v$NEW_VERSION"
echo "  - Branche: $CURRENT_BRANCH"
echo ""
read -p "Continuer? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    info "Annulé"
    exit 0
fi

# Mettre à jour la version dans package.json
info "Mise à jour de la version dans package.json..."
node -e "
const fs = require('fs');
const pkg = require('./package.json');
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Vérifier que la mise à jour a fonctionné
UPDATED_VERSION=$(node -p "require('./package.json').version")
if [ "$UPDATED_VERSION" != "$NEW_VERSION" ]; then
    error "Erreur lors de la mise à jour de la version"
    exit 1
fi

info "Version mise à jour avec succès: $UPDATED_VERSION"

# Ajouter package.json au staging
info "Ajout de package.json au staging..."
git add package.json

# Créer le commit
COMMIT_MESSAGE="chore: bump version to $NEW_VERSION"
info "Création du commit: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

# Créer le tag
TAG_NAME="v$NEW_VERSION"
info "Création du tag: $TAG_NAME"
git tag -a "$TAG_NAME" -m "Release $TAG_NAME"

# Afficher un résumé
echo ""
info "=== Résumé ==="
echo "  Version: $NEW_VERSION"
echo "  Tag: $TAG_NAME"
echo "  Commit: $(git rev-parse --short HEAD)"
echo ""

# Demander confirmation avant de push
read -p "Pousser vers GitHub? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warn "Les changements ont été commités localement mais pas poussés vers GitHub"
    warn "Pour pousser plus tard, exécutez:"
    echo "  git push origin main"
    echo "  git push origin $TAG_NAME"
    exit 0
fi

# Push vers GitHub
info "Push de la branche main vers GitHub..."
git push origin main

info "Push du tag vers GitHub..."
git push origin "$TAG_NAME"

echo ""
info "=== Release créée avec succès! ==="
info "Le workflow GitHub Actions va maintenant:"
info "  1. Construire l'application pour Mac et Windows"
info "  2. Créer une release GitHub avec les fichiers d'installation"
info ""
info "Vous pouvez suivre la progression ici:"
info "  https://github.com/jeoste/keepassword/actions"
info ""
info "Une fois le workflow terminé, la release sera disponible ici:"
info "  https://github.com/jeoste/keepassword/releases"

