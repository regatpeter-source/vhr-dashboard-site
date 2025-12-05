// Launch Dashboard Script
// Opens localhost:3000 in a new window

async function launchDashboard() {
    const btn = document.getElementById('launchBtn');
    const successMsg = document.getElementById('successMsg');
    
    // Disable button
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = '🚀 Ouverture en cours...';
    successMsg.classList.remove('show');
    
    try {
        // Wait a moment before opening for visual feedback
        setTimeout(() => {
            // Open local dashboard directly
            window.open('http://localhost:3000', '_blank');
            
            // Show success message
            successMsg.classList.add('show');
            btn.textContent = '✓ Dashboard ouvert !';
            
            // Reset after 3 seconds
            setTimeout(() => {
                btn.disabled = false;
                btn.classList.remove('loading');
                btn.textContent = '🚀 Lancer le Dashboard';
            }, 3000);
        }, 500);
        
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
