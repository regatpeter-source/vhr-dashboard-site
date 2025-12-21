// Launch Dashboard Script
// Downloads and executes PowerShell launcher

async function launchDashboard() {
    const btn = document.getElementById('launchBtn');
    const successMsg = document.getElementById('successMsg');
    
    // Disable button
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '⏳ Téléchargement...';
    successMsg.classList.remove('show');
    
    try {
        // Download the launcher script (.bat). If blocked, fall back to .ps1
        let blob = null;
        let filename = 'launch-dashboard.bat';

        const tryDownload = async (url) => {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.blob();
        };

        try {
            blob = await tryDownload('/download/launch-script');
        } catch (e) {
            console.warn('BAT download blocked, trying PS1 fallback:', e.message);
            blob = await tryDownload('/download/launch-script-ps1');
            filename = 'launch-dashboard.ps1';
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        successMsg.classList.add('show');
        btn.textContent = '✓ Fichier téléchargé!';
        
        // Reset button after 3 seconds
        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.textContent = '🚀 Lancer le Dashboard';
        }, 3000);
        
    } catch (error) {
        console.error('Erreur de téléchargement:', error);
        btn.textContent = '✗ Erreur - Réessayez';
        btn.disabled = false;
        btn.classList.remove('loading');
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #ffebee; color: #c62828; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: left;';
        errorDiv.innerHTML = `
            <strong>Erreur de téléchargement:</strong><br>
            ${error.message}<br><br>
            Vérifiez votre connexion Internet et réessayez.
        `;
        successMsg.parentNode.insertBefore(errorDiv, successMsg.nextSibling);
        
        setTimeout(() => {
            btn.textContent = '🚀 Lancer le Dashboard';
        }, 3000);
    }
}

// Attach event listener when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const launchBtn = document.getElementById('launchBtn');
    if (launchBtn) {
        launchBtn.addEventListener('click', launchDashboard);
    }
});
