// Attach event listener when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const launchBtn = document.getElementById('launchBtn');
    if (launchBtn) {
        launchBtn.addEventListener('click', launchDashboard);
    }
});

async function launchDashboard() {
    const btn = document.getElementById('launchBtn');
    const successMsg = document.getElementById('successMsg');
    
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '⏳ Vérification du serveur...';
    successMsg.classList.remove('show');
    
    try {
        // Vérifier si le serveur est déjà en cours d'exécution
        console.log('[launcher] Checking if server is running on localhost:3000...');
        const checkResponse = await fetch('http://localhost:3000/ping', {
            method: 'GET',
            mode: 'no-cors'
        }).catch(() => ({ ok: false }));
        
        if (checkResponse.ok) {
            console.log('[launcher] Server already running!');
            btn.textContent = '🌐 Ouverture du dashboard...';
            setTimeout(() => {
                window.open('http://localhost:3000', '_blank');
                successMsg.classList.add('show');
                btn.textContent = '✓ Dashboard ouvert !';
                
                setTimeout(() => {
                    btn.disabled = false;
                    btn.classList.remove('loading');
                    btn.textContent = '🚀 Lancer le Dashboard';
                }, 3000);
            }, 500);
        } else {
            // Serveur non disponible - télécharger et exécuter le script
            console.log('[launcher] Server not running, downloading launcher script...');
            btn.textContent = '📥 Téléchargement du lanceur...';
            
            const response = await fetch('/download/launch-script');
            if (!response.ok) {
                throw new Error('Erreur lors du téléchargement du script');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'start-local-server.ps1';
            document.body.appendChild(a);
            
            btn.textContent = '📋 Script prêt - Exécution manuelle requise';
            
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Afficher les instructions
            showInstructions();
            
            setTimeout(() => {
                btn.disabled = false;
                btn.classList.remove('loading');
                btn.textContent = '🚀 Lancer le Dashboard';
            }, 3000);
        }
    } catch (error) {
        console.error('[launcher] Error:', error);
        btn.textContent = '✗ Erreur - Réessayez';
        btn.disabled = false;
        btn.classList.remove('loading');
        
        setTimeout(() => {
            btn.textContent = '🚀 Lancer le Dashboard';
        }, 5000);
    }
}

function showInstructions() {
    const msg = document.getElementById('successMsg');
    msg.innerHTML = `
        <strong>⚠️ Action requise</strong>
        <p style="margin: 10px 0;">Un script PowerShell a été téléchargé. Veuillez:</p>
        <ol style="text-align: left; margin: 10px 0;">
            <li>Ouvrir l'explorateur de fichiers</li>
            <li>Aller dans le dossier <code>Téléchargements</code></li>
            <li>Clic droit sur <code>start-local-server.ps1</code></li>
            <li>Sélectionner <code>Exécuter avec PowerShell</code></li>
        </ol>
        <p style="margin: 10px 0; font-size: 0.9em; color: #95a5a6;">
            Le script démarrera le serveur et ouvrira automatiquement le dashboard.
        </p>
    `;
    msg.classList.add('show');
}
