// Launch Dashboard Script
// Now downloads the full client pack (Dashboard + Voix)

// Lien direct vers le release GitHub du pack client
const ZIP_URL_FULL = 'https://github.com/regatpeter-source/vhr-dashboard-site/releases/download/v1.0.0-client/vhr-dashboard-pro-client-full-updated-new.zip';

function launchDashboard() {
    const btn = document.getElementById('launchBtn');
    const successMsg = document.getElementById('successMsg');

    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '⏳ Téléchargement...';
    successMsg.classList.remove('show');

    // Ouvre le téléchargement dans un nouvel onglet pour éviter les blocages navigateur
    window.open(ZIP_URL_FULL, '_blank');

    successMsg.classList.add('show');
    btn.textContent = '✓ Téléchargement lancé';

    setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = '🚀 Télécharger le pack complet';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('launchBtn');
    if (launchBtn) {
        launchBtn.addEventListener('click', launchDashboard);
    }
});
