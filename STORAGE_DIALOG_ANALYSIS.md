# Storage Dialog & WiFi Button - Original vs Current Implementation

## Summary of Changes

The original `showStorageDialog` function was a **placeholder/demo UI** that displayed:
- Mock storage statistics (18.5 GB used, 46.5 GB free, etc.)
- APK upload/installation interface for developer games
- Calls to endpoints `/api/upload-dev-game` and `/api/install-dev-game` that **do not exist** in the current codebase

These endpoints were **never implemented** in the backend (backup-stable/server.js), making the storage dialog functionality non-functional.

---

## 1. Original showStorageDialog Implementation

**Location:** [public/dashboard-pro.js](public/dashboard-pro.js#L1608)

```javascript
window.showStorageDialog = function(device) {
	try {
		// Afficher le dialog de stockage avec les options d'installation
		// Données de placeholder pour demo (en prod, ces infos viendront du backend)
		const storageHTML = `
			<div style='margin-bottom:20px;'>
				<h3 style='color:#2ecc71;margin-top:0;'>💾 Stockage du casque: ${device.name}</h3>
				
				<div style='background:#2c3e50;padding:16px;border-radius:8px;margin-bottom:16px;'>
					<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;'>
						<div style='background:rgba(46,204,113,0.2);padding:12px;border-radius:6px;border-left:4px solid #2ecc71;'>
							<div style='font-size:11px;color:#95a5a6;text-transform:uppercase;margin-bottom:4px;'>Utilisé</div>
							<div style='font-size:18px;font-weight:bold;color:#2ecc71;'>18.5 GB</div>
						</div>
						<div style='background:rgba(52,152,219,0.2);padding:12px;border-radius:6px;border-left:4px solid #3498db;'>
							<div style='font-size:11px;color:#95a5a6;text-transform:uppercase;margin-bottom:4px;'>Libre</div>
							<div style='font-size:18px;font-weight:bold;color:#3498db;'>46.5 GB</div>
						</div>
						<div style='background:rgba(155,89,182,0.2);padding:12px;border-radius:6px;border-left:4px solid #9b59b6;'>
							<div style='font-size:11px;color:#95a5a6;text-transform:uppercase;margin-bottom:4px;'>Total</div>
							<div style='font-size:18px;font-weight:bold;color:#9b59b6;'>64 GB</div>
						</div>
					</div>
					
					<div style='margin-top:16px;'>
						<div style='font-size:12px;margin-bottom:6px;'>Utilisation: <strong>28.9%</strong></div>
						<div style='background:#1a1d24;border-radius:4px;height:24px;overflow:hidden;border:1px solid #34495e;'>
							<div style='background:linear-gradient(90deg, #2ecc71 0%, #27ae60 100%);height:100%;width:28.9%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:bold;'>
								28.9%
							</div>
						</div>
					</div>
				</div>
				
				<div style='background:#2c3e50;padding:16px;border-radius:8px;margin-bottom:16px;border-left:4px solid #e74c3c;'>
					<h4 style='margin-top:0;margin-bottom:12px;color:#fff;'>📦 Installer des jeux développeur</h4>
					<p style='margin:0 0 12px 0;font-size:12px;color:#ecf0f1;'>Téléchargez et installez des APK directement sur votre casque Meta Quest depuis votre PC.</p>
					<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;'>
						<button onclick='uploadDevGameToHeadset("${device.serial}", "${device.name}")' style='background:#9b59b6;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;transition:all 0.2s;'>
							📤 Uploader APK
						</button>
						<button onclick='installDevGameOnHeadset("${device.serial}", "${device.name}")' style='background:#3498db;color:#fff;border:none;padding:12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;transition:all 0.2s;'>
							⚙️ Installer APK
						</button>
					</div>
					<div style='font-size:12px;color:#ecf0f1;background:#1a1d24;padding:12px;border-radius:6px;'>
						<strong>📋 Étapes:</strong>
						<ol style='margin:8px 0;padding-left:20px;'>
							<li>Cliquez sur "Uploader APK"</li>
							<li>Sélectionnez un fichier APK depuis votre PC</li>
							<li>Attendez le transfert</li>
							<li>Cliquez sur "Installer APK"</li>
							<li>L'application apparaîtra dans votre bibliothèque</li>
						</ol>
					</div>
				</div>
			</div>
		`;
		
		showModal(storageHTML);
		
	} catch (error) {
		console.error('[storage dialog]', error);
		showToast('❌ Erreur lors de l\'accès au stockage', 'error');
	}
};
```

### Key Characteristics:
- **Placeholder UI only**: Shows hardcoded storage values (18.5 GB used, 46.5 GB free, 64 GB total)
- **Mock data**: Includes "28.9%" usage visualization with static numbers
- **Button functions called**:
  - `uploadDevGameToHeadset()` 
  - `installDevGameOnHeadset()`

---

## 2. APK Upload/Install Functions (Frontend)

**Location:** [public/dashboard-pro.js](public/dashboard-pro.js#L1650) - [1721](public/dashboard-pro.js#L1721)

```javascript
window.uploadDevGameToHeadset = async function(serial, deviceName) {
	// Créer un input file
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.apk';
	input.onchange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		
		const formData = new FormData();
		formData.append('serial', serial);
		formData.append('apk', file);
		
		try {
			showToast('📤 Envoi du fichier en cours...', 'info');
			const res = await fetch('/api/upload-dev-game', {
				method: 'POST',
				body: formData
			});
			
			const data = await res.json();
			if (data.ok) {
				showToast(`✅ APK envoyé avec succès: ${file.name}`, 'success');
				setTimeout(() => showStorageDialog({ serial, name: deviceName }), 1000);
			} else {
				showToast(`❌ ${data.error || 'Erreur lors de l\'envoi'}`, 'error');
			}
		} catch (error) {
			console.error('[upload dev game]', error);
			showToast('❌ Erreur lors de l\'envoi du fichier', 'error');
		}
	};
	input.click();
};

window.installDevGameOnHeadset = async function(serial, deviceName) {
	try {
		showToast('⚙️ Installation en cours...', 'info');
		const res = await api('/api/install-dev-game', { serial });
		
		if (!res || !res.ok) {
			showToast(`❌ ${res?.error || 'Erreur lors de l\'installation'}`, 'error');
			return;
		}
		
		showToast(`✅ APK installé avec succès sur ${deviceName}`, 'success');
		setTimeout(() => showStorageDialog({ serial, name: deviceName }), 1500);
		
	} catch (error) {
		console.error('[install dev game]', error);
		showToast('❌ Erreur lors de l\'installation', 'error');
	}
};
```

### Endpoints Called (Backend):
- **POST `/api/upload-dev-game`** - Expected to upload APK file
- **POST `/api/install-dev-game`** - Expected to install previously uploaded APK

**Status**: ❌ **NEITHER ENDPOINT EXISTS** in backup-stable/server.js or current server.js

---

## 3. Original WiFi Button Behavior

**Location:** [public/dashboard-pro.js](public/dashboard-pro.js#L1410) - [1419](public/dashboard-pro.js#L1419)

```javascript
// ========== WIFI AUTO ========== 
window.connectWifiAuto = async function(serial) {
	showToast('📶 Connexion WiFi automatique en cours...', 'info');
	const res = await api('/api/adb/wifi-auto', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serial })
	});
	if (res.ok) showToast('✅ WiFi connecté : ' + res.ip, 'success');
	else showToast('❌ Erreur WiFi: ' + (res.error || 'inconnue'), 'error');
	setTimeout(loadDevices, 1000);
};
```

### Endpoint Called:
- **POST `/api/adb/wifi-auto`** - Automatically detects device IP and establishes WiFi connection

### Button UI (Table View):
```html
${!d.serial.includes(':') && !d.serial.includes('.') ? `
	<button onclick='connectWifiAuto("${d.serial}")' style='background:#9b59b6;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;'>📶 WiFi Auto</button>
` : `<span style='color:#95a5a6;'>-</span>`}
```

**Logic**: Only shows the WiFi Auto button if the device is **NOT already WiFi-connected** (no `:` or `.` in serial number, which indicates a USB-connected device).

---

## 4. Storage Button UI

**Location:** [public/dashboard-pro.js](public/dashboard-pro.js#L1036) and [1111](public/dashboard-pro.js#L1111)

### Table View:
```html
<button onclick='showStorageDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#34495e;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;margin:2px;'>💾</button>
```

### Card View:
```html
<button onclick='showStorageDialog({serial:"${d.serial}",name:"${d.name}"})' style='background:#34495e;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;'>💾 Stockage</button>
```

**Always visible** - No conditional logic, shown for all devices

---

## 5. Backend WiFi Endpoint Implementation

**Location:** [backup-stable/server.js](backup-stable/server.js#L2416) - [2474](backup-stable/server.js#L2474)

```javascript
// WiFi Auto (détection automatique IP)
app.post('/api/adb/wifi-auto', async (req, res) => {
  const { serial } = req.body || {};
  if (!serial) {
    return res.status(400).json({ ok: false, error: 'serial required' });
  }

  try {
    let targetIp = null;

    // Méthode 1: ip route
    try {
      const routeOut = await runAdbCommand(serial, ['shell', 'ip', 'route']);
      const routeStdout = routeOut.stdout || '';
      const match = routeStdout.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1]) targetIp = match[1];
    } catch (e) {
      console.log('[wifi-auto] ip route failed:', e.message);
    }

    // Méthode 2: ip addr show wlan0
    if (!targetIp) {
      try {
        const addrOut = await runAdbCommand(serial, ['shell', 'ip', '-4', 'addr', 'show', 'wlan0']);
        const addrStdout = addrOut.stdout || '';
        const match2 = addrStdout.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\//);
        if (match2 && match2[1]) targetIp = match2[1];
      } catch (e) {
        console.log('[wifi-auto] ip addr failed:', e.message);
      }
    }

    // Méthode 3: getprop dhcp.wlan0.ipaddress
    if (!targetIp) {
      try {
        const propOut = await runAdbCommand(serial, ['shell', 'getprop', 'dhcp.wlan0.ipaddress']);
        const propIp = (propOut.stdout || '').trim();
        if (propIp && /^\d+\.\d+\.\d+\.\d+$/.test(propIp)) targetIp = propIp;
      } catch (e) {
        console.log('[wifi-auto] getprop failed:', e.message);
      }
    }

    if (!targetIp) {
      return res.status(400).json({ ok: false, error: 'Impossible de détecter l\'IP automatiquement. Vérifiez que le WiFi est activé sur le casque.' });
    }

    console.log('[wifi-auto] IP détectée:', targetIp);

    // Enable TCP on 5555 and connect
    await runAdbCommand(serial, ['tcpip', '5555']);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
    const connectOut = await runAdbCommand(null, ['connect', `${targetIp}:5555`]);
    const connectStdout = connectOut.stdout || '';
    const ok = /connected|already connected/i.test(connectStdout);
    
    refreshDevices().catch(() => { });
    res.json({ ok, ip: targetIp, msg: connectStdout });
  } catch (e) {
    console.error('[api] wifi-auto:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});
```

### What It Does:
1. Receives `serial` from frontend
2. Attempts 3 methods to detect device IP:
   - `ip route` (extract src IP)
   - `ip addr show wlan0` (parse inet address)
   - `getprop dhcp.wlan0.ipaddress` (property lookup)
3. Enables TCP port 5555 via `adb tcpip 5555`
4. Connects via `adb connect <IP>:5555`
5. Returns `{ ok, ip, msg }` response

---

## 6. Comparison Table

| Aspect | Original | Current Status |
|--------|----------|-----------------|
| **showStorageDialog()** | Placeholder UI with mock data | Still exists, same implementation |
| **Storage Statistics** | Hardcoded (18.5 GB used, 46.5 GB free) | No real data source |
| **Upload APK Button** | Calls `/api/upload-dev-game` | Endpoint doesn't exist ❌ |
| **Install APK Button** | Calls `/api/install-dev-game` | Endpoint doesn't exist ❌ |
| **WiFi Auto Button** | Calls `/api/adb/wifi-auto` | Endpoint fully implemented ✅ |
| **WiFi Auto Endpoint** | Implements IP detection (3 methods) | Same implementation exists ✅ |
| **Storage Button** | Always visible | Always visible |
| **localStorage Panel** | `showStoragePanel()` function | Browser localStorage viewer (different purpose) |

---

## 7. Additional Storage-Related Functions

### showStoragePanel() - Browser Storage Viewer

**Location:** [public/dashboard-pro.js](public/dashboard-pro.js#L623) - [693](public/dashboard-pro.js#L693)

```javascript
window.showStoragePanel = function() {
	let panel = document.getElementById('storagePanel');
	if (panel) panel.remove();
	
	const localStorageSize = Object.keys(localStorage).reduce((total, key) => {
		return total + localStorage.getItem(key).length;
	}, 0);
	
	const localStorageSizeKB = (localStorageSize / 1024).toFixed(2);
	const localStorageSizeMB = (localStorageSize / (1024 * 1024)).toFixed(4);
	
	const storageItems = Object.keys(localStorage).filter(key => key.startsWith('vhr_')).map(key => {
		const size = (localStorage.getItem(key).length / 1024).toFixed(2);
		return `
			<tr style='border-bottom:1px solid #2ecc71;'>
				<td style='padding:12px;font-size:13px;'>${key}</td>
				<td style='padding:12px;font-size:13px;text-align:right;'>${size} KB</td>
				<td style='padding:12px;text-align:center;'>
					<button onclick="localStorage.removeItem('${key}'); window.showStoragePanel();" style='background:#e74c3c;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:bold;'>Supprimer</button>
				</td>
			</tr>
		`;
	}).join('');
	
	// ... renders storage management UI
}
```

**Purpose**: Manages browser localStorage (separate from headset storage)
- Shows all stored keys starting with `vhr_`
- Allows individual deletion
- "Clear all" functionality
- Shows total storage used

---

## Conclusion

### What Was Originally Intended:
The storage dialog was designed to provide device storage management with APK upload/installation capabilities for developers.

### What Actually Exists:
1. ✅ **WiFi Auto**: Fully functional endpoint for automatic WiFi device connection
2. ❌ **APK Upload**: Frontend UI only, no backend endpoint
3. ❌ **APK Install**: Frontend UI only, no backend endpoint
4. ⚠️ **Storage Stats**: Placeholder/hardcoded data only

### Missing Backend Implementation:
- `/api/upload-dev-game` - Never implemented
- `/api/install-dev-game` - Never implemented

The current implementation uses `/api/adb/install-apk` for APK installation (requires file path), not the upload/install workflow that the storage dialog was designed for.
