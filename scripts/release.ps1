# Script PowerShell pour créer une nouvelle release
# Usage: .\scripts\release.ps1 [version]
# Exemple: .\scripts\release.ps1 1.0.1

param(
    [Parameter(Mandatory=$false)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

# Fonction pour afficher les messages
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Vérifier que nous sommes dans un repository git
try {
    $null = git rev-parse --git-dir 2>&1
} catch {
    Write-Error "Ce script doit être exécuté dans un repository git"
    exit 1
}

# Vérifier que nous sommes sur la branche main
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Error "Vous devez être sur la branche 'main' (actuellement sur '$currentBranch')"
    exit 1
}

# Vérifier que le working directory est propre
$status = git status --porcelain
if ($status) {
    Write-Error "Le working directory n'est pas propre. Veuillez commit ou stash vos changements."
    exit 1
}

# Récupérer la version actuelle
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Info "Version actuelle: $currentVersion"

# Demander la nouvelle version si elle n'est pas fournie
if (-not $Version) {
    $Version = Read-Host "Entrez la nouvelle version (ex: 1.0.1)"
}

# Valider le format de version (semver)
if ($Version -notmatch '^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$') {
    Write-Error "Format de version invalide. Utilisez le format semver (ex: 1.0.1)"
    exit 1
}

# Vérifier que la nouvelle version est différente
if ($currentVersion -eq $Version) {
    Write-Error "La nouvelle version ($Version) est identique à la version actuelle"
    exit 1
}

# Confirmation
Write-Warn "Vous allez créer la release v$Version"
Write-Host "  - Version actuelle: $currentVersion"
Write-Host "  - Nouvelle version: $Version"
Write-Host "  - Tag: v$Version"
Write-Host "  - Branche: $currentBranch"
Write-Host ""
$confirm = Read-Host "Continuer? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Info "Annulé"
    exit 0
}

# Mettre à jour la version dans package.json
Write-Info "Mise à jour de la version dans package.json..."
$content = Get-Content "package.json" -Raw -Encoding UTF8
# Supprimer le BOM s'il existe
if ($content[0] -eq [char]0xFEFF) {
    $content = $content.Substring(1)
}
$content = $content -replace '"version":\s*"[^"]*"', "`"version`": `"$Version`""
# Écrire sans BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path "package.json"), $content, $utf8NoBom)

# Vérifier que la mise à jour a fonctionné
$updatedPackageJson = Get-Content "package.json" | ConvertFrom-Json
if ($updatedPackageJson.version -ne $Version) {
    Write-Error "Erreur lors de la mise à jour de la version"
    exit 1
}

Write-Info "Version mise à jour avec succès: $($updatedPackageJson.version)"

# Ajouter package.json au staging
Write-Info "Ajout de package.json au staging..."
git add package.json

# Créer le commit
$commitMessage = "chore: bump version to $Version"
Write-Info "Création du commit: $commitMessage"
git commit -m $commitMessage

# Créer le tag
$tagName = "v$Version"
Write-Info "Création du tag: $tagName"
git tag -a $tagName -m "Release $tagName"

# Afficher un résumé
Write-Host ""
Write-Info "=== Résumé ==="
Write-Host "  Version: $Version"
Write-Host "  Tag: $tagName"
$commitHash = git rev-parse --short HEAD
Write-Host "  Commit: $commitHash"
Write-Host ""

# Demander confirmation avant de push
$pushConfirm = Read-Host "Pousser vers GitHub? (y/N)"
if ($pushConfirm -ne "y" -and $pushConfirm -ne "Y") {
    Write-Warn "Les changements ont été commités localement mais pas poussés vers GitHub"
    Write-Warn "Pour pousser plus tard, exécutez:"
    Write-Host "  git push origin main"
    Write-Host "  git push origin $tagName"
    exit 0
}

# Push vers GitHub
Write-Info "Push de la branche main vers GitHub..."
git push origin main

Write-Info "Push du tag vers GitHub..."
git push origin $tagName

Write-Host ""
Write-Info "=== Release créée avec succès! ==="
Write-Info "Le workflow GitHub Actions va maintenant:"
Write-Info "  1. Construire l'application pour Mac et Windows"
Write-Info "  2. Créer une release GitHub avec les fichiers d'installation"
Write-Host ""
Write-Info "Vous pouvez suivre la progression ici:"
Write-Host "  https://github.com/jeoste/keepassword/actions"
Write-Host ""
Write-Info "Une fois le workflow terminé, la release sera disponible ici:"
Write-Host "  https://github.com/jeoste/keepassword/releases"

