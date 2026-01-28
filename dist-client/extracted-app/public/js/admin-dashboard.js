const API_BASE = '/api';
let currentUser = null;

// Helper to make authenticated fetch requests with cookies
async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',  // Important: send cookies with each request
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

// Initialize Android Installer when tab is clicked
function initializeAndroidInstaller() {
  if (window.androidInstaller) return; // Already initialized
  if (typeof AndroidInstaller === 'undefined') return; // Script not loaded yet
  
  const installer = new AndroidInstaller();
  installer.initializeUI();
  window.androidInstaller = installer;
}

// Check auth
async function checkAuth() {
  try {
    const res = await authFetch(`${API_BASE}/me`);
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    if (data.user.role !== 'admin') throw new Error('Not an admin');
    currentUser = data.user;
    document.getElementById('userDisplay').textContent = `${data.user.username} (Admin)`;
  } catch (e) {
    console.error('Auth error:', e);
    alert('Not authenticated or not an admin. Redirecting to login.');
    window.location.href = '/account.html';
  }
}

// Load stats
async function loadStats() {
  try {
    const res = await authFetch(`${API_BASE}/admin/stats`);
    const data = await res.json();
    if (data.ok) {
      document.getElementById('totalUsers').textContent = data.stats.totalUsers;
      document.getElementById('activeSubscriptions').textContent = data.stats.activeSubscriptions;
      document.getElementById('unreadMessages').textContent = data.stats.unreadMessages;
    }
  } catch (e) {
    console.error('Error loading stats:', e);
  }
}

// Load users
async function loadUsers() {
  try {
    const res = await authFetch(`${API_BASE}/admin/users`);
    const data = await res.json();
    if (data.ok && data.users.length > 0) {
      const tbody = document.getElementById('usersList');
      tbody.innerHTML = '';
      data.users.forEach(user => {
        const createdAt = user.createdAt ? new Date(user.createdAt) : null;
        const createdLabel = createdAt ? createdAt.toLocaleDateString() : 'N/A';
        const lastActivity = user.lastActivity || user.lastLogin || user.updatedAt || null;
        const lastActivityLabel = lastActivity ? new Date(lastActivity).toLocaleString() : 'N/A';
        const access = user.accessSummary || {};
        const demoDays = Number.isFinite(access.demoRemainingDays) ? access.demoRemainingDays : 0;
        const demoText = access.hasDemo
          ? (access.demoExpired ? 'Expiré' : `${demoDays} jour(s)`)
          : 'N/A';
        const demoBadge = access.demoExpired ? 'badge-inactive' : 'badge-active';
        const subscriptionState = (access.subscriptionStatus || user.subscriptionStatus || 'none').toLowerCase();
        const subscriptionLabel = subscriptionState === 'none' ? 'aucun' : subscriptionState;
        const subscriptionBadge = subscriptionState === 'active'
          ? 'badge-active'
          : subscriptionState === 'cancelled'
            ? 'badge-unread'
            : 'badge-inactive';
        const licenseLabel = access.hasPerpetualLicense
          ? `Oui${access.licenseCount > 1 ? ` (${access.licenseCount})` : ''}`
          : 'Non';
        const licenseBadge = access.hasPerpetualLicense ? 'badge-active' : 'badge-inactive';
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email || 'N/A'}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-active' : 'badge-inactive'}">${user.role}</span></td>
            <td>${createdLabel}</td>
            <td>${lastActivityLabel}</td>
            <td><span class="badge ${demoBadge}">${demoText}</span></td>
            <td><span class="badge ${subscriptionBadge}">${subscriptionLabel}</span></td>
            <td><span class="badge ${licenseBadge}">${licenseLabel}</span></td>
            <td><button class="action-btn action-btn-view" onclick="viewUser('${user.username}')">View</button></td>
          `;
      });
    } else {
      document.getElementById('usersMessage').innerHTML = '<div class="empty-state"><p>No users found</p></div>';
    }
  } catch (e) {
    console.error('Error loading users:', e);
    document.getElementById('usersMessage').innerHTML = `<div class="error">Error loading users</div>`;
  }
}

// Load subscriptions
async function loadSubscriptions() {
  try {
    const res = await authFetch(`${API_BASE}/admin/subscriptions`);
    const data = await res.json();
    if (data.ok && data.subscriptions.length > 0) {
      const tbody = document.getElementById('subscriptionsList');
      tbody.innerHTML = '';
      data.subscriptions.forEach(sub => {
        const row = tbody.insertRow();
        const status = sub.status === 'active' ? 'badge-active' : 'badge-inactive';
        row.innerHTML = `
          <td>${sub.username}</td>
          <td>${sub.email}</td>
          <td>${sub.planName || 'N/A'}</td>
          <td><span class="badge ${status}">${sub.status}</span></td>
          <td>${new Date(sub.startDate).toLocaleDateString()}</td>
          <td>${sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}</td>
          <td><button class="action-btn action-btn-view" onclick="viewSubscription('${sub.id}')">View</button></td>
        `;
      });
    } else {
      document.getElementById('subscriptionsMessage').innerHTML = '<div class="empty-state"><p>No subscriptions found</p></div>';
    }
  } catch (e) {
    console.error('Error loading subscriptions:', e);
    document.getElementById('subscriptionsMessage').innerHTML = `<div class="error">Error loading subscriptions</div>`;
  }
}

// Load messages
async function loadMessages() {
  try {
    console.log('[messages] Loading messages...');
    const res = await authFetch(`${API_BASE}/admin/messages`);
    console.log('[messages] Response status:', res.status);
    const data = await res.json();
    console.log('[messages] Raw response data:', data);
    console.log('[messages] data.ok:', data.ok, 'type:', typeof data.ok);
    console.log('[messages] data.messages exists:', 'messages' in data);
    console.log('[messages] data.messages value:', data.messages);
    console.log('[messages] data.messages type:', typeof data.messages);
    if (data.messages) {
      console.log('[messages] Is array:', Array.isArray(data.messages));
      console.log('[messages] Length:', data.messages.length);
    }
    
    if (!res.ok) {
      console.error('[messages] API error:', data.error);
      document.getElementById('messagesMessage').innerHTML = `<div class="error">Error: ${data.error}</div>`;
      return;
    }
    
    if (data.ok && data.messages && data.messages.length > 0) {
      console.log('[messages] Found', data.messages.length, 'messages');
      const tbody = document.getElementById('messagesList');
      tbody.innerHTML = '';
      data.messages.forEach(msg => {
        const row = tbody.insertRow();
        let statusBadge, statusIcon;
        if (msg.status === 'unread') {
          statusBadge = 'badge-unread';
          statusIcon = '🔴';
        } else if (msg.status === 'responded') {
          statusBadge = 'badge-active';
          statusIcon = '✓';
        } else {
          statusBadge = 'badge-inactive';
          statusIcon = '✓';
        }
        row.innerHTML = `
          <td>${msg.name}</td>
          <td>${msg.email}</td>
          <td>${msg.subject}</td>
          <td><span class="badge ${statusBadge}">${statusIcon} ${msg.status}</span></td>
          <td>${new Date(msg.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="action-btn action-btn-view" onclick="viewMessage('${msg.id}')">View</button>
            <button class="action-btn action-btn-delete" onclick="deleteMessage('${msg.id}')">Delete</button>
          </td>
        `;
      });
    } else {
      console.log('[messages] No messages or empty response');
      document.getElementById('messagesMessage').innerHTML = '<div class="empty-state"><p>No messages found</p></div>';
    }
  } catch (e) {
    console.error('[messages] Error:', e);
    document.getElementById('messagesMessage').innerHTML = `<div class="error">Error loading messages: ${e.message}</div>`;
  }
}

// View subscription detail
async function viewSubscription(subscriptionId) {
  try {
    const res = await authFetch(`${API_BASE}/admin/subscriptions`);
    const data = await res.json();
    const sub = data.subscriptions.find(s => s.id == subscriptionId);
    if (sub) {
      const modalBody = document.getElementById('messageModalBody');
      const startDate = new Date(sub.startDate).toLocaleString();
      const endDate = sub.endDate ? new Date(sub.endDate).toLocaleString() : 'N/A';
      const status = sub.status === 'active' ? 'badge-active' : 'badge-inactive';
      
      modalBody.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Username:</strong> ${sub.username}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${sub.email}</p>
          <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> ${sub.planName || 'N/A'}</p>
          <p style="margin: 0 0 10px 0;"><strong>Status:</strong> <span class="badge ${status}">${sub.status}</span></p>
          <p style="margin: 0 0 10px 0;"><strong>Start Date:</strong> ${startDate}</p>
          <p style="margin: 0;"><strong>End Date:</strong> ${endDate}</p>
        </div>
      `;
      document.getElementById('messageModal').classList.add('active');
    }
  } catch (e) {
    console.error('Error viewing subscription:', e);
    alert('Error loading subscription details');
  }
}

// View user detail
async function viewUser(username) {
  try {
    const res = await authFetch(`${API_BASE}/admin/users`);
    const data = await res.json();
    const user = data.users.find(u => u.username === username);
    if (user) {
      const modalBody = document.getElementById('messageModalBody');
      const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A';
      const updatedDate = user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'N/A';
      const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A';
      const lastActivity = user.lastActivity ? new Date(user.lastActivity).toLocaleString() : 'N/A';
      const access = user.accessSummary || {};
      const demoStatusLabel = !access.hasDemo
        ? 'Non initialisé'
        : access.demoExpired
          ? 'Expiré'
          : `${Number.isFinite(access.demoRemainingDays) ? access.demoRemainingDays : 0} jour(s) restant(s)`;
      const subscriptionDetailLabel = access.subscriptionStatus || user.subscriptionStatus || 'aucun';
      const licenseDetailLabel = access.hasPerpetualLicense
        ? `Oui${access.licenseCount > 1 ? ` (${access.licenseCount})` : ''}`
        : 'Non';

      modalBody.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0;"><strong>Username:</strong> ${user.username}</p>
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${user.email || 'N/A'}</p>
          <p style="margin: 0 0 10px 0;"><strong>Role:</strong> <span class="badge ${user.role === 'admin' ? 'badge-active' : 'badge-inactive'}">${user.role}</span></p>
          <p style="margin: 0 0 10px 0;"><strong>Created:</strong> ${createdDate}</p>
          <p style="margin: 0 0 6px 0;"><strong>Updated:</strong> ${updatedDate}</p>
          <p style="margin: 0 0 6px 0;"><strong>Dernière connexion:</strong> ${lastLogin}</p>
          <p style="margin: 0 0 0 0;"><strong>Dernière activité:</strong> ${lastActivity}</p>
        </div>
        <div style="padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h4 style="margin-top: 0;">Subscription Info</h4>
          <p style="margin: 0 0 5px 0;"><strong>Status:</strong> ${subscriptionDetailLabel}</p>
          <p style="margin: 0;"><strong>Subscription ID:</strong> ${user.subscriptionId || 'N/A'}</p>
        </div>
        <div style="margin-top:16px; padding: 14px; background: #f1f5f9; border-radius: 8px; border: 1px dashed #cbd5e0;">
          <h4 style="margin-top: 0;">Statut d'accès</h4>
          <p style="margin: 4px 0;"><strong>Essai :</strong> ${demoStatusLabel}</p>
          <p style="margin: 4px 0;"><strong>Abonnement :</strong> ${subscriptionDetailLabel}</p>
          <p style="margin: 4px 0;"><strong>Licence à vie :</strong> ${licenseDetailLabel}</p>
        </div>
      `;
      document.getElementById('messageModal').classList.add('active');
    }
  } catch (e) {
    console.error('Error viewing user:', e);
    alert('Error loading user details');
  }
}

// View message detail
async function viewMessage(messageId) {
  try {
    console.log('[viewMessage] Loading message', messageId);
    const res = await authFetch(`${API_BASE}/admin/messages`);
    const data = await res.json();
    
    if (!data.ok || !data.messages) {
      console.error('[viewMessage] Error loading messages:', data.error);
      alert('❌ Error loading messages: ' + (data.error || 'Unknown error'));
      return;
    }
    
    const msg = data.messages.find(m => m.id == messageId);
    if (!msg) {
      console.error('[viewMessage] Message not found with id:', messageId);
      alert('❌ Message not found');
      return;
    }
    
    console.log('[viewMessage] Found message:', msg.subject);
    
    const modalBody = document.getElementById('messageModalBody');
    const responseForm = `
      <div class="form-group">
        <label>Response:</label>
        <textarea id="responseText" placeholder="Type your response here..." style="height: 150px; resize: vertical; width: 100%;"></textarea>
        <small style="color: #666; margin-top: 8px; display: block;">💬 A signature will be automatically added to your response</small>
      </div>
      <button class="btn-submit" onclick="respondToMessage('${msg.id}')">Send Response</button>
    `;
    
    const statusBadgeClass = msg.status === 'unread' ? 'badge-unread' : (msg.status === 'responded' ? 'badge-active' : 'badge-inactive');
    const statusLabel = msg.status === 'unread' ? '📧 Unread' : (msg.status === 'responded' ? '✓ Responded' : 'Read');
    
    const userAvatar = msg.name.charAt(0).toUpperCase();
    const respondedAt = msg.respondedAt ? new Date(msg.respondedAt).toLocaleString() : null;
    
    modalBody.innerHTML = `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${userAvatar}</div>
          <div style="flex: 1;">
            <p style="margin: 0; font-weight: 600; color: #333;">${msg.name}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${msg.email}</p>
            <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">${new Date(msg.createdAt).toLocaleString()}</p>
          </div>
          <span class="badge ${statusBadgeClass}" style="white-space: nowrap;">${statusLabel}</span>
        </div>
      </div>
      
      <h4 style="margin: 20px 0 10px 0; color: #333;">${msg.subject}</h4>
      
      <div style="background: white; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; line-height: 1.6; color: #555;">
        ${msg.message.replace(/\n/g, '<br>')}
      </div>
      
      ${msg.response ? `
        <div style="background: #f0f7ff; padding: 15px; border-left: 4px solid #667eea; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #667eea;">📨 Your Response (${respondedAt})</p>
          <div style="color: #555; line-height: 1.6; margin-bottom: 10px; white-space: pre-wrap; font-family: inherit;">
            ${msg.response.replace(/\n/g, '<br>')}
          </div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #999; border-top: 1px solid rgba(102, 126, 234, 0.2); padding-top: 10px;">
            Responded by: <strong>${msg.respondedBy || 'Admin'}</strong>
          </p>
        </div>
      ` : responseForm}
    `;
    document.getElementById('messageModal').classList.add('active');
  } catch (e) {
    console.error('[viewMessage] Exception:', e);
    alert('❌ Error viewing message:\n' + e.message);
  }
}

// Respond to message with automatic signature
async function respondToMessage(messageId) {
  const responseText = document.getElementById('responseText');
  if (!responseText) {
    console.error('[respond] responseText textarea not found');
    alert('❌ Error: Response field not found. Try refreshing the page.');
    return;
  }
  
  const response = responseText.value;
  if (!response || response.trim() === '') {
    alert('❌ Please write a response');
    return;
  }
  
  // Add VHR Dashboard signature to response
  const signature = `\n\n---\n📱 VHR Dashboard Support\nPeter Vhr Dashboard\nYour VR Management Solution\ncontact@vhr-dashboard-site.com`;
  const responseWithSignature = response + signature;
  
  console.log('[respond] Sending response for message', messageId);
  console.log('[respond] Response length:', responseWithSignature.length);
  
  try {
    const url = `${API_BASE}/admin/messages/${messageId}`;
    const body = JSON.stringify({ status: 'responded', response: responseWithSignature });
    
    console.log('[respond] URL:', url);
    console.log('[respond] Request body:', body);
    
    const res = await authFetch(url, {
      method: 'PATCH',
      body: body
    });
    
    console.log('[respond] Response status:', res.status);
    console.log('[respond] Response ok:', res.ok);
    
    const data = await res.json();
    console.log('[respond] Response data:', data);
    
    if (data.ok) {
      alert('✅ Response sent successfully!\n\n📧 Reply email sent to: ' + (data.emailSent ? 'Yes' : 'No (check email config)'));
      document.getElementById('messageModal').classList.remove('active');
      await loadMessages();
      await loadStats();
    } else {
      console.error('[respond] Error:', data.error);
      alert('❌ Error: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    console.error('[respond] Exception:', e);
    console.error('[respond] Stack:', e.stack);
    alert('❌ Error sending response:\n' + e.message);
  }
}

// Delete message
async function deleteMessage(messageId) {
  if (!confirm('Are you sure you want to delete this message?')) return;
  try {
    const res = await authFetch(`${API_BASE}/admin/messages/${messageId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.ok) {
      loadMessages();
      loadStats();
    }
  } catch (e) {
    console.error('Error deleting message:', e);
    alert('Error deleting message');
  }
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const tabName = this.dataset.tab + '-tab';
      document.getElementById(tabName).classList.add('active');
      
      // Load data for tab
      if (this.dataset.tab === 'users') loadUsers();
      else if (this.dataset.tab === 'subscriptions') loadSubscriptions();
      else if (this.dataset.tab === 'messages') loadMessages();
      else if (this.dataset.tab === 'android') initializeAndroidInstaller();
    });
  });

  // Modal close
  const closeBtn = document.getElementById('closeMessageModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('messageModal').classList.remove('active');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authFetch(`${API_BASE}/logout`, { method: 'POST' });
      window.location.href = '/account.html';
    });
  }

  // Initialize
  init();
});

// Initialize
async function init() {
  console.log('[admin-dashboard] Initializing...');
  await checkAuth();
  console.log('[admin-dashboard] Auth checked');
  await loadStats();
  console.log('[admin-dashboard] Stats loaded');
  await loadUsers();
  console.log('[admin-dashboard] Users loaded');
  await loadMessages();
  console.log('[admin-dashboard] Messages loaded - Init complete');
}
