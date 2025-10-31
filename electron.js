const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { createEmbeddedServer } = require('./electron-server');

let mainWindow;
let server;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, '_internal', 'icon.ico'),
    title: 'Assessment Matrix Tool',
    focusable: true,
    acceptFirstMouse: true,
    show: false
  });

  try {
    console.log('Starting embedded server...');
    server = await createEmbeddedServer();
    console.log('Server started, loading app...');
    
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.show();
  } catch (error) {
    console.error('Failed to start server:', error);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});