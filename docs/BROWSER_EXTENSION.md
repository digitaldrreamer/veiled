# Browser Extension - Access Log Viewer

**Simple extension: Shows what permissions current site has**

---

## Extension Structure

```
extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── content.js
├── background/
│   └── background.js
└── assets/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

---

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "Veiled - Privacy Monitor",
  "version": "1.0.0",
  "description": "See what permissions websites have accessed",
  
  "permissions": [
    "activeTab",
    "storage"
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_start"
    }
  ],
  
  "background": {
    "service_worker": "background/background.js"
  },
  
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

---

## popup/popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Veiled - Privacy Monitor</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <h1>🔒 Veiled</h1>
      <p class="domain" id="current-domain">Loading...</p>
    </header>

    <!-- Status -->
    <div class="status" id="status">
      <div class="status-indicator">●</div>
      <span id="status-text">Checking...</span>
    </div>

    <!-- Permissions -->
    <section class="section">
      <h2>Permissions Granted</h2>
      <div id="permissions-list" class="permissions-list">
        <p class="empty">No permissions granted</p>
      </div>
    </section>

    <!-- Access Log -->
    <section class="section">
      <h2>Access Log (Last 24 Hours)</h2>
      <div id="access-log" class="access-log">
        <p class="empty">No accesses recorded</p>
      </div>
    </section>

    <!-- Actions -->
    <div class="actions">
      <button id="revoke-btn" class="btn-danger" disabled>
        Revoke All Permissions
      </button>
      <button id="refresh-btn" class="btn-secondary">
        Refresh
      </button>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <a href="#" id="view-all">View all sites →</a>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

---

## popup/popup.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
}

.container {
  padding: 16px;
}

.header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.header h1 {
  font-size: 20px;
  color: #1f2937;
  margin-bottom: 4px;
}

.domain {
  font-size: 14px;
  color: #6b7280;
  font-family: monospace;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.status-indicator {
  font-size: 12px;
}

.status.no-session .status-indicator {
  color: #6b7280;
}

.status.active .status-indicator {
  color: #10b981;
}

.status.has-permissions .status-indicator {
  color: #f59e0b;
}

.status.high-risk .status-indicator {
  color: #dc2626;
}

#status-text {
  font-size: 14px;
  color: #1f2937;
}

.section {
  margin-bottom: 16px;
}

.section h2 {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.permissions-list,
.access-log {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.empty {
  color: #9ca3af;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.permission-item:last-child {
  margin-bottom: 0;
}

.permission-item.high-risk {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.permission-item.medium-risk {
  background: #fffbeb;
  border: 1px solid #fed7aa;
}

.permission-icon {
  font-size: 16px;
}

.permission-name {
  flex: 1;
  font-size: 13px;
  color: #1f2937;
}

.permission-expires {
  font-size: 11px;
  color: #6b7280;
}

.access-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.access-item:last-child {
  border-bottom: none;
}

.access-time {
  font-size: 11px;
  color: #6b7280;
  min-width: 60px;
}

.access-details {
  flex: 1;
}

.access-permission {
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
}

.access-metadata {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn-danger,
.btn-secondary {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-danger:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.footer {
  text-align: center;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.footer a {
  font-size: 13px;
  color: #3b82f6;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}
```

---

## popup/popup.js

```javascript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentSiteData();
  
  // Setup event listeners
  document.getElementById('revoke-btn').onclick = revokePermissions;
  document.getElementById('refresh-btn').onclick = loadCurrentSiteData;
});

/**
 * Load data for current site
 */
async function loadCurrentSiteData() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const domain = new URL(tab.url).hostname;
    
    // Update UI
    document.getElementById('current-domain').textContent = domain;
    
    // Get stored session for this domain
    const session = await getSessionForDomain(domain);
    
    if (!session) {
      updateStatus('no-session', 'No active session');
      return;
    }
    
    // Fetch permissions from Solana
    const permissions = await fetchPermissionsFromSolana(
      session.nullifier,
      domain
    );
    
    if (permissions.length === 0) {
      updateStatus('active', '✅ Active (No permissions)');
      displayNoPermissions();
    } else {
      const riskLevel = calculateRiskLevel(permissions);
      updateStatus(riskLevel, getRiskText(riskLevel, permissions.length));
      displayPermissions(permissions);
      document.getElementById('revoke-btn').disabled = false;
    }
    
    // Fetch access log
    const accessLog = await fetchAccessLog(session.nullifier, domain);
    displayAccessLog(accessLog);
    
  } catch (error) {
    console.error('Error loading data:', error);
    updateStatus('error', 'Error loading data');
  }
}

/**
 * Get session from local storage
 */
async function getSessionForDomain(domain) {
  const result = await chrome.storage.local.get('sessions');
  const sessions = result.sessions || {};
  return sessions[domain] || null;
}

/**
 * Fetch permissions from Solana
 */
async function fetchPermissionsFromSolana(nullifier, domain) {
  const connection = new Connection('https://api.devnet.solana.com');
  
  // Load program (you'd bundle this with extension)
  const programId = new PublicKey('YOUR_PROGRAM_ID');
  const provider = new AnchorProvider(connection, null, {});
  const program = new Program(IDL, programId, provider);
  
  // Derive permission PDA
  const [appPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('app'), Buffer.from(domain)],
    programId
  );
  
  const [permissionPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('permission'),
      Buffer.from(nullifier, 'base64'),
      appPDA.toBuffer()
    ],
    programId
  );
  
  try {
    const account = await program.account.permissionGrant.fetch(permissionPDA);
    
    if (account.revoked || account.expiresAt * 1000 < Date.now()) {
      return [];
    }
    
    return account.permissions.map(p => ({
      permission: p,
      expiresAt: account.expiresAt * 1000,
      grantedAt: account.grantedAt * 1000,
    }));
  } catch (e) {
    // No permissions granted
    return [];
  }
}

/**
 * Fetch access log from Solana
 */
async function fetchAccessLog(nullifier, domain) {
  const connection = new Connection('https://api.devnet.solana.com');
  const programId = new PublicKey('YOUR_PROGRAM_ID');
  const provider = new AnchorProvider(connection, null, {});
  const program = new Program(IDL, programId, provider);
  
  // Get permission grant PDA
  const [appPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('app'), Buffer.from(domain)],
    programId
  );
  
  const [permissionPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('permission'),
      Buffer.from(nullifier, 'base64'),
      appPDA.toBuffer()
    ],
    programId
  );
  
  // Fetch all access logs for this permission grant
  const accessAccounts = await program.account.permissionAccess.all([
    {
      memcmp: {
        offset: 8, // After discriminator
        bytes: permissionPDA.toBase58()
      }
    }
  ]);
  
  // Filter last 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  return accessAccounts
    .filter(acc => acc.account.accessedAt * 1000 > oneDayAgo)
    .map(acc => ({
      permission: acc.account.permissionUsed,
      accessedAt: acc.account.accessedAt * 1000,
      metadata: acc.account.metadata,
    }))
    .sort((a, b) => b.accessedAt - a.accessedAt);
}

/**
 * Update status indicator
 */
function updateStatus(status, text) {
  const statusEl = document.getElementById('status');
  statusEl.className = `status ${status}`;
  document.getElementById('status-text').textContent = text;
}

/**
 * Display permissions
 */
function displayPermissions(permissions) {
  const container = document.getElementById('permissions-list');
  container.innerHTML = '';
  
  permissions.forEach(perm => {
    const item = document.createElement('div');
    const info = getPermissionInfo(perm.permission);
    item.className = `permission-item ${info.risk}`;
    
    item.innerHTML = `
      <span class="permission-icon">${info.icon}</span>
      <span class="permission-name">${info.name}</span>
      <span class="permission-expires">
        ${formatExpiry(perm.expiresAt)}
      </span>
    `;
    
    container.appendChild(item);
  });
}

/**
 * Display access log
 */
function displayAccessLog(accessLog) {
  const container = document.getElementById('access-log');
  
  if (accessLog.length === 0) {
    container.innerHTML = '<p class="empty">No accesses in last 24 hours</p>';
    return;
  }
  
  container.innerHTML = '';
  
  accessLog.forEach(access => {
    const item = document.createElement('div');
    const info = getPermissionInfo(access.permission);
    item.className = 'access-item';
    
    item.innerHTML = `
      <span class="access-time">${formatTime(access.accessedAt)}</span>
      <div class="access-details">
        <div class="access-permission">${info.icon} ${info.name}</div>
        ${access.metadata ? `<div class="access-metadata">${access.metadata}</div>` : ''}
      </div>
    `;
    
    container.appendChild(item);
  });
}

/**
 * Display no permissions state
 */
function displayNoPermissions() {
  const container = document.getElementById('permissions-list');
  container.innerHTML = '<p class="empty">✅ No permissions granted<br>Maximum privacy</p>';
}

/**
 * Revoke all permissions
 */
async function revokePermissions() {
  if (!confirm('Revoke all permissions for this site?')) {
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const domain = new URL(tab.url).hostname;
    const session = await getSessionForDomain(domain);
    
    if (!session) {
      alert('No active session');
      return;
    }
    
    // Send message to content script to revoke
    await chrome.tabs.sendMessage(tab.id, {
      type: 'REVOKE_PERMISSIONS',
      nullifier: session.nullifier,
      domain
    });
    
    // Refresh display
    await loadCurrentSiteData();
    
    alert('Permissions revoked successfully');
  } catch (error) {
    alert('Error revoking permissions: ' + error.message);
  }
}

/**
 * Helper: Get permission info
 */
function getPermissionInfo(permission) {
  const map = {
    revealWalletAddress: {
      icon: '🔑',
      name: 'Wallet Address',
      risk: 'high-risk'
    },
    revealExactBalance: {
      icon: '💰',
      name: 'Exact Balance',
      risk: 'medium-risk'
    },
    revealTokenBalances: {
      icon: '🪙',
      name: 'Token Balances',
      risk: 'medium-risk'
    },
    revealNftList: {
      icon: '🖼️',
      name: 'NFT Collection',
      risk: 'medium-risk'
    },
    revealTransactionHistory: {
      icon: '📜',
      name: 'Transaction History',
      risk: 'high-risk'
    },
    revealStakingPositions: {
      icon: '🎯',
      name: 'Staking Positions',
      risk: 'medium-risk'
    },
    revealDefiPositions: {
      icon: '🏦',
      name: 'DeFi Positions',
      risk: 'high-risk'
    },
    signTransactions: {
      icon: '✍️',
      name: 'Sign Transactions',
      risk: 'high-risk'
    },
  };
  
  return map[permission] || { icon: '❓', name: permission, risk: 'medium-risk' };
}

/**
 * Helper: Calculate risk level
 */
function calculateRiskLevel(permissions) {
  const highRisk = ['revealWalletAddress', 'revealTransactionHistory', 'revealDefiPositions', 'signTransactions'];
  const hasHighRisk = permissions.some(p => highRisk.includes(p.permission));
  
  if (hasHighRisk) return 'high-risk';
  if (permissions.length >= 3) return 'has-permissions';
  return 'active';
}

/**
 * Helper: Get risk text
 */
function getRiskText(level, count) {
  if (level === 'high-risk') return `⚠️ High Risk (${count} permissions)`;
  if (level === 'has-permissions') return `⚠️ ${count} permissions granted`;
  return `✅ Active (${count} permission${count > 1 ? 's' : ''})`;
}

/**
 * Helper: Format expiry time
 */
function formatExpiry(timestamp) {
  const remaining = timestamp - Date.now();
  if (remaining < 0) return 'Expired';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    return `${Math.floor(hours / 24)}d`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Helper: Format time
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}
```

---

## content/content.js

```javascript
// Listen for revoke requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REVOKE_PERMISSIONS') {
    handleRevokePermissions(message.nullifier, message.domain)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Async response
  }
});

/**
 * Handle permission revocation
 */
async function handleRevokePermissions(nullifier, domain) {
  // Check if Veiled SDK is loaded on page
  if (typeof window.Veiled === 'undefined') {
    throw new Error('Veiled SDK not found on this page');
  }
  
  // Get SDK instance (injected by page)
  const veiled = window.__veiledInstance;
  if (!veiled) {
    throw new Error('Veiled not initialized');
  }
  
  // Call revoke method
  await veiled.revokePermissions();
}
```

---

## Summary

**Browser extension provides:**

1. ✅ **Current site status** - Active, permissions granted, risk level
2. ✅ **Permission list** - What this site can see
3. ✅ **Access log** - When permissions were actually used (last 24h)
4. ✅ **Revoke button** - One-click revoke all permissions
5. ✅ **Risk indicators** - Visual warnings for high-risk permissions

**Simple UI shows:**
- Domain name
- Active session status (✅ or ⚠️)
- List of granted permissions with expiry times
- Chronological access log
- One button to revoke everything

**Time estimate:** 2 days

**Total permission system:** 6-7 days
- Solana program: 2 days
- SDK integration: 2-3 days
- Browser extension: 2 days

Ready to implement! 🚀
