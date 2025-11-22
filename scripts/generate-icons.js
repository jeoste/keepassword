#!/usr/bin/env node

/**
 * Script pour générer les icônes .ico (Windows) et .icns (macOS) à partir de l'icône PNG
 * 
 * Prérequis:
 * - macOS: brew install imagemagick (pour .icns)
 * - Windows: installer ImageMagick ou utiliser un outil en ligne
 * 
 * Alternative: Utiliser des outils en ligne comme:
 * - https://convertio.co/png-ico/
 * - https://cloudconvert.com/png-to-ico
 * - https://iconverticons.com/online/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const resourcesDir = path.join(__dirname, '../resources');
const buildDir = path.join(__dirname, '../build');
const iconPng = path.join(resourcesDir, 'icon.png');

// Créer le dossier build s'il n'existe pas
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('📦 Génération des icônes pour Mac et Windows...\n');

// Vérifier que l'icône source existe
if (!fs.existsSync(iconPng)) {
  console.error('❌ Erreur: resources/icon.png introuvable!');
  process.exit(1);
}

// Copier l'icône PNG pour Linux
const iconPngDest = path.join(buildDir, 'icon.png');
fs.copyFileSync(iconPng, iconPngDest);
console.log('✅ icon.png copié pour Linux');

// Générer l'icône Windows (.ico)
try {
  // Vérifier si ImageMagick est installé
  execSync('which convert', { stdio: 'ignore' });
  
  const iconIco = path.join(buildDir, 'icon.ico');
  // Générer un fichier ICO avec plusieurs tailles
  execSync(`convert "${iconPng}" -define icon:auto-resize=256,128,64,48,32,16 "${iconIco}"`, {
    stdio: 'inherit'
  });
  console.log('✅ icon.ico généré pour Windows');
} catch (error) {
  console.warn('⚠️  ImageMagick non trouvé. Pour générer icon.ico:');
  console.warn('   1. Installer ImageMagick: brew install imagemagick (macOS) ou télécharger depuis imagemagick.org (Windows)');
  console.warn('   2. Ou utiliser un convertisseur en ligne: https://convertio.co/png-ico/');
  console.warn('   3. Placer le fichier icon.ico dans le dossier build/');
}

// Générer l'icône macOS (.icns)
try {
  // Vérifier si iconutil est disponible (macOS uniquement)
  if (process.platform === 'darwin') {
    const iconsetDir = path.join(buildDir, 'icon.iconset');
    
    // Créer le dossier iconset
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }
    
    // Générer les différentes tailles nécessaires pour macOS
    const sizes = [
      { size: 16, scale: 1 },
      { size: 16, scale: 2 },
      { size: 32, scale: 1 },
      { size: 32, scale: 2 },
      { size: 128, scale: 1 },
      { size: 128, scale: 2 },
      { size: 256, scale: 1 },
      { size: 256, scale: 2 },
      { size: 512, scale: 1 },
      { size: 512, scale: 2 },
      { size: 1024, scale: 1 },
      { size: 1024, scale: 2 }
    ];
    
    // Vérifier si ImageMagick est disponible
    try {
      execSync('which convert', { stdio: 'ignore' });
      
      sizes.forEach(({ size, scale }) => {
        const actualSize = size * scale;
        const filename = scale === 1 
          ? `icon_${size}x${size}.png`
          : `icon_${size}x${size}@${scale}x.png`;
        const outputPath = path.join(iconsetDir, filename);
        
        execSync(`convert "${iconPng}" -resize ${actualSize}x${actualSize} "${outputPath}"`, {
          stdio: 'ignore'
        });
      });
      
      // Convertir iconset en icns
      const iconIcns = path.join(buildDir, 'icon.icns');
      execSync(`iconutil -c icns "${iconsetDir}" -o "${iconIcns}"`, {
        stdio: 'inherit'
      });
      
      // Nettoyer le dossier iconset
      fs.rmSync(iconsetDir, { recursive: true, force: true });
      
      console.log('✅ icon.icns généré pour macOS');
    } catch (error) {
      console.warn('⚠️  ImageMagick non trouvé. Pour générer icon.icns:');
      console.warn('   1. Installer ImageMagick: brew install imagemagick');
      console.warn('   2. Ou utiliser un convertisseur en ligne: https://cloudconvert.com/png-to-icns');
      console.warn('   3. Placer le fichier icon.icns dans le dossier build/');
    }
  } else {
    console.warn('⚠️  icon.icns ne peut être généré que sur macOS');
    console.warn('   Utiliser un convertisseur en ligne: https://cloudconvert.com/png-to-icns');
    console.warn('   Placer le fichier icon.icns dans le dossier build/');
  }
} catch (error) {
  console.warn('⚠️  Erreur lors de la génération de icon.icns:', error.message);
}

console.log('\n✨ Génération terminée!');
console.log('📁 Les icônes sont dans le dossier build/');


