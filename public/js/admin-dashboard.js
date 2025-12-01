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
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${user.username}</td>
          <td>${user.email || 'N/A'}</td>
          <td><span class="badge ${user.role === 'admin' ? 'badge-active' : 'badge-inactive'}">${user.role}</span></td>
          <td>${new Date(user.createdAt).toLocaleDateString()}</td>
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
    const res = await authFetch(`${API_BASE}/admin/messages`);
    const data = await res.json();
    if (data.ok && data.messages.length > 0) {
      const tbody = document.getElementById('messagesList');
      tbody.innerHTML = '';
      data.messages.forEach(msg => {
        const row = tbody.insertRow();
        const statusBadge = msg.status === 'unread' ? 'badge-unread' : 'badge-read';
        row.innerHTML = `
          <td>${msg.name}</td>
          <td>${msg.email}</td>
          <td>${msg.subject}</td>
          <td><span class="badge ${statusBadge}">${msg.status}</span></td>
          <td>${new Date(msg.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="action-btn action-btn-view" onclick="viewMessage('${msg.id}')">View</button>
            <button class="action-btn action-btn-delete" onclick="deleteMessage('${msg.id}')">Delete</button>
          </td>
        `;
      });
    } else {
      document.getElementById('messagesMessage').innerHTML = '<div class="empty-state"><p>No messages found</p></div>';
    }
  } catch (e) {
    console.error('Error loading messages:', e);
    document.getElementById('messagesMessage').innerHTML = `<div class="error">Error loading messages</div>`;
  }
}

// View message detail
async function viewMessage(messageId) {
  try {
    const res = await authFetch(`${API_BASE}/admin/messages`);
    const data = await res.json();
    const msg = data.messages.find(m => m.id == messageId);
    if (msg) {
      const modalBody = document.getElementById('messageModalBody');
      const responseForm = `
        <div class="form-group">
          <label>Response:</label>
          <textarea id="responseText" placeholder="Type your response here..."></textarea>
        </div>
        <button class="btn-submit" onclick="respondToMessage('${msg.id}')">Send Response</button>
      `;
      modalBody.innerHTML = `
        <p><strong>From:</strong> ${msg.name} (${msg.email})</p>
        <p><strong>Subject:</strong> ${msg.subject}</p>
        <p><strong>Date:</strong> ${new Date(msg.createdAt).toLocaleString()}</p>
        <p><strong>Status:</strong> <span class="badge ${msg.status === 'unread' ? 'badge-unread' : 'badge-read'}">${msg.status}</span></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p><strong>Message:</strong></p>
        <p>${msg.message}</p>
        ${msg.response ? `<hr style="margin: 20px 0;"><p><strong>Your Response:</strong></p><p>${msg.response}</p>` : responseForm}
      `;
      document.getElementById('messageModal').classList.add('active');
    }
  } catch (e) {
    console.error('Error viewing message:', e);
  }
}

// Respond to message
async function respondToMessage(messageId) {
  const response = document.getElementById('responseText').value;
  if (!response) {
    alert('Please write a response');
    return;
  }
  try {
    const res = await authFetch(`${API_BASE}/admin/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'responded', response })
    });
    const data = await res.json();
    if (data.ok) {
      alert('Response sent!');
      document.getElementById('messageModal').classList.remove('active');
      loadMessages();
      loadStats();
    }
  } catch (e) {
    console.error('Error responding:', e);
    alert('Error sending response');
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
  await checkAuth();
  await loadStats();
  await loadUsers();
}
