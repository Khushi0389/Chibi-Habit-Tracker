const { app, BrowserWindow, Notification } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    icon: path.join(__dirname, 'build', 'desk.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  })

  // load your local index.html
  mainWindow.loadFile('index.html')

  // Optional: open DevTools
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // on Windows & Linux, quit when all windows are closed
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  // on macOS, re-create window if there is none
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// allow renderer to call notifications
require('./notification-handler')
