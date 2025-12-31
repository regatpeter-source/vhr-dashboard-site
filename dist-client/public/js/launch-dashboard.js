// Launch Dashboard Script
// Now downloads the full client pack (Dashboard + Voix)

// Servez le ZIP depuis le backend pour éviter les 404 GitHub
// Endpoint défini dans server.js => /download/client-full
const ZIP_URL_FULL = '/download/client-full';

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
