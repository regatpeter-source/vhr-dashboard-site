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
        // Download the PowerShell script
        const response = await fetch('/download/launch-script');
        
        if (!response.ok) {
            throw new Error('Erreur lors du téléchargement');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'launch-dashboard.bat';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        successMsg.classList.add('show');
        btn.textContent = '✓ Fichier téléchargé !';
        
        // Reset after 5 seconds
        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.textContent = '🚀 Lancer le Dashboard';
        }, 5000);
        
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
