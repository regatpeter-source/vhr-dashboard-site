// Launch Dashboard Script
// Now downloads the Windows installer for VHR Dashboard

// Lien direct vers le release GitHub de l'installateur
const INSTALLER_URL = 'https://github.com/regatpeter-source/vhr-dashboard-site/releases/download/v1.0.4-client/VHR.Dashboard.Setup.1.0.4.exe';

function launchDashboard() {
    const btn = document.getElementById('launchBtn');
    const successMsg = document.getElementById('successMsg');

    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = 'Téléchargement...';
    successMsg.classList.remove('show');

    // Ouvre le téléchargement dans un nouvel onglet pour éviter les blocages navigateur
    window.open(INSTALLER_URL, '_blank');

    successMsg.classList.add('show');
    btn.textContent = '✓ Téléchargement lancé';

    setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.textContent = 'Télécharger l\'installateur';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('launchBtn');
    if (launchBtn) {
        launchBtn.addEventListener('click', launchDashboard);
    }
});
