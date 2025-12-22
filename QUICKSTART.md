# 🥽 VHR Dashboard - Quick Start Guide

## How to Launch the Dashboard

You have **3 options** to access VHR Dashboard:

### Option 1: Desktop Shortcut (Recommended) ⭐
1. Run `scripts/create-shortcut.bat` 
2. A **"VHR Dashboard"** shortcut will appear on your Desktop
3. Double-click it to launch the dashboard
4. **Server auto-starts if needed** and opens the dashboard

✅ **Best for**: Always having quick access

### Option 2: Smart Launcher Script
1. Double-click `scripts/launch-dashboard-smart.bat`
2. Script checks if server is running
3. If not running → starts server
4. Opens dashboard in browser

✅ **Best for**: Running from the VR-Manager folder

### Option 3: Browser Favorites (After Server is Running)
1. Launch the dashboard using Option 1 or 2
2. Click "⭐ Ajouter aux favoris" in the dashboard navbar
3. Next time, click the favorite to open dashboard
4. **Note**: Server must still be running!

⚠️ **Browser favorites won't auto-start the server** - use Option 1 or 2 for full automation

---

## Setup Instructions

### First Time Setup:

1. Open PowerShell in the VR-Manager folder
2. Run: `npm install`
3. Run: `scripts/create-shortcut.bat`
4. Double-click the new "VHR Dashboard" shortcut on Desktop

### That's it! 🚀

Now you can:
- ✅ Double-click Desktop shortcut to launch everything automatically
- ✅ Server auto-starts if not running
- ✅ Dashboard opens in your browser
- ✅ Close the command window when done

---

## For Advanced Users

### Keep Server Running in Background:
```bash
npm start
# Keep this window open (minimize it)
# Then access dashboard via browser favorites
```

### Access Dashboard URL:
- `http://localhost:3000/vhr-dashboard-pro.html` (par défaut)
- Pour les casques qui ne peuvent pas voir `localhost`, cliquez sur le bouton **Voix** dans le dashboard : il ouvre automatiquement l'URL LAN nécessaire.

### Stop Server:
- Close the server command window or press Ctrl+C

---

## Troubleshooting

**Error: "Node.js not installed"**
- Download from: https://nodejs.org/
- Install and restart PowerShell

**Port 3000 already in use**
- Another app is using port 3000
- Kill the process: `netstat -ano | find ":3000"` then `taskkill /PID <PID>`
- Or change PORT in `.env` file

**Dashboard won't open**
- Check if server started: Open browser → http://localhost:3000
- Check console for errors in the command window

---

Enjoy! 🎮
