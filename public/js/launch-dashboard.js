// Launch Dashboard Script
// Downloads and executes PowerShell launcher

async function launchDashboard() {
    const btn = document.getElementById('launchBtn');
    const successMsg = document.getElementById('successMsg');
    
    // Disable button
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '⏳ Téléchargement et lancement...';
    successMsg.classList.remove('show');
    
    try {
        // Download the PowerShell script
        const response = await fetch('/download/launch-script');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
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
        
        // Automatic launch via Explorer (Windows)
        // Try to execute the script automatically on Windows
        if (navigator.platform && navigator.platform.includes('Win')) {
            // Create a simple exec that opens the file with default handler
            // This will auto-execute .bat files
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/api/launch-dashboard';
            form.style.display = 'none';
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }
        
        // Show page de statut
        successMsg.classList.add('show');
        btn.textContent = '✓ Lancement en cours...';
        
        // Automatically open the launch status page
        setTimeout(() => {
            window.open('/launch-status.html', '_blank', 'width=600,height=700');
        }, 500);
        
        // Reset button after 5 seconds
        setTimeout(() => {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.textContent = '🚀 Lancer le Dashboard';
        }, 5000);
        
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
