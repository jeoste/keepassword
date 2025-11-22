#!/bin/bash

# Script pour tester la génération des fichiers d'installation localement
# Usage: ./scripts/test-build.sh [mac|win]

set -e

PLATFORM=${1:-mac}

echo "🧪 Test de build pour $PLATFORM"
echo ""

# Vérifier les icônes
echo "=== Vérification des icônes ==="
if [ "$PLATFORM" == "mac" ]; then
  if [ -f "build/icon.icns" ]; then
    echo "✅ icon.icns trouvé"
  else
    echo "⚠️  icon.icns non trouvé"
    if [ -f "build/icon.png" ]; then
      echo "✅ icon.png disponible comme fallback"
    else
      echo "❌ Aucune icône trouvée!"
      exit 1
    fi
  fi
else
  if [ -f "build/icon.ico" ]; then
    echo "✅ icon.ico trouvé"
  else
    echo "⚠️  icon.ico non trouvé"
    if [ -f "build/icon.png" ]; then
      echo "✅ icon.png disponible comme fallback"
    else
      echo "❌ Aucune icône trouvée!"
      exit 1
    fi
  fi
fi

echo ""
echo "=== Build de l'application ==="
npm run build

echo ""
echo "=== Build pour $PLATFORM ==="
if [ "$PLATFORM" == "mac" ]; then
  npm run build:mac
else
  npm run build:win
fi

echo ""
echo "=== Vérification des fichiers générés ==="
if [ "$PLATFORM" == "mac" ]; then
  if ls dist/*.dmg 1> /dev/null 2>&1; then
    echo "✅ Fichier .dmg trouvé:"
    ls -lh dist/*.dmg
  else
    echo "❌ ERREUR: Aucun fichier .dmg trouvé!"
    exit 1
  fi
  
  if [ -f "dist/latest-mac.yml" ]; then
    echo "✅ latest-mac.yml trouvé"
  else
    echo "⚠️  latest-mac.yml non trouvé"
  fi
else
  if ls dist/*.exe 1> /dev/null 2>&1; then
    echo "✅ Fichier .exe trouvé:"
    ls -lh dist/*.exe
  else
    echo "❌ ERREUR: Aucun fichier .exe trouvé!"
    exit 1
  fi
  
  if [ -f "dist/latest.yml" ]; then
    echo "✅ latest.yml trouvé"
  else
    echo "⚠️  latest.yml non trouvé"
  fi
fi

echo ""
echo "✅ Build réussi! Les fichiers sont dans le dossier dist/"

