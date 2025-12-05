// Launch Dashboard Script

async function launchDashboard() {
    const btn = document.getElementById('launchBtn');
    const successMsg = document.getElementById('successMsg');
    
    // Disable button
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '⏳ Lancement en cours...';
    successMsg.classList.remove('show');
    
    try {
        // Call server endpoint to download the script
        const response = await fetch('/download/launch-script');
        
        if (!response.ok) {
            throw new Error('Erreur lors du téléchargement du script');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'launch-dashboard.ps1';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        successMsg.classList.add('show');
        btn.textContent = '✓ Script téléchargé !';
        
        // Reset after 3 seconds
        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.textContent = '🚀 Lancer le Dashboard';
        }, 3000);
        
    } catch (error) {
        console.error('Erreur:', error);
        btn.textContent = '✗ Erreur - Réessayez';
        btn.disabled = false;
        btn.classList.remove('loading');
        
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
