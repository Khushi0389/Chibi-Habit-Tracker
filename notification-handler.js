const { ipcMain, Notification } = require('electron')

ipcMain.on('notify', (_event, { title, body }) => {
  new Notification({ title, body }).show()
})
