process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';

// To see console.log output run with `DEBUGCONTROL=true electron .` or set environment variable for DEBUGCONTROL=true
// debug_log debug overhead
DEBUG = false;
if (process.env.DEBUGCONTROL) {
  DEBUG = true;
  console.log("Console Debugging Enabled")
}

function debug_log() {
  //if (DEBUG) {
  console.log.apply(this, arguments);
  //}
} // end Debug Logger

process.on("uncaughtException", (err) => {
  debug_log(err)
});

debug_log("Starting Electron-Builder 24 ASAR issue test: v" + require('./package').version)

// Serial
const {
  SerialPort
} = require('serialport')
const {
  ReadlineParser
} = require('@serialport/parser-readline');

// Electron app
const electron = require('electron');
const electronApp = electron.app;
const {
  dialog
} = require('electron')
electronApp.commandLine.appendSwitch('ignore-gpu-blacklist')
electronApp.commandLine.appendSwitch('enable-gpu-rasterization')
electronApp.commandLine.appendSwitch('enable-zero-copy')

if (isElectron()) {
  debug_log("Local User Data: " + electronApp.getPath('userData'))
}

const BrowserWindow = electron.BrowserWindow;
const Tray = electron.Tray;
const nativeImage = require('electron').nativeImage
const Menu = require('electron').Menu
var forceQuit

var fs = require('fs');
var path = require("path");
const join = require('path').join;


var appIcon = null,
  jogWindow = null,
  mainWindow = null
var autoUpdater

var oldportslist, oldiplist;
var oldpinslist;
const iconPath = path.join(__dirname, 'app/icon.png');

async function findPorts() {
  const ports = await SerialPort.list()
  // console.log(ports)
  oldportslist = ports;
  console.log(JSON.stringify(ports))
}
findPorts()

var PortCheckinterval = setInterval(function() {
  findPorts();
}, 1000);

function showJogWindow() {
  if (jogWindow === null) {
    createJogWindow();
  }
  jogWindow.show()
  jogWindow.setAlwaysOnTop(true);
  jogWindow.focus();
  jogWindow.setAlwaysOnTop(false);
}

// Electron
function isElectron() {
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }
  if (typeof process !== 'undefined' && process.versions && !!process.versions.electron) {
    return true;
  }
  return false;
}

if (isElectron()) {
  const gotTheLock = electronApp.requestSingleInstanceLock()
  var lauchGUI = true;
  if (!gotTheLock) {
    debug_log("Already running! Check the System Tray")
    electronApp.exit(0);
    electronApp.quit();
  } else {
    electronApp.on('second-instance', (event, commandLine, workingDirectory) => {
      //Someone tried to run a second instance, we should focus our window.
      // debug_log('SingleInstance')

      function checkFileType(fileName) {
        var fileNameLC = fileName.toLowerCase();
        if (fileNameLC.endsWith('.obc') || fileName.endsWith('.gcode') || fileName.endsWith('.gc') || fileName.endsWith('.tap') || fileName.endsWith('.nc') || fileName.endsWith('.cnc')) {
          return fileName;
        }
      }

      debug_log(commandLine)
      lauchGUI = true;



      if (lauchGUI) {
        showJogWindow()
      }
    })
    // Create myWindow, load the rest of the app, etc...
    electronApp.on('ready', () => {
      if (process.platform == 'win32') {
        // Don't show window - sit in Tray
        showJogWindow()
      } else {
        showJogWindow() // Macos and Linux - launch GUI
      }
    })
  }

  if (electronApp) {
    // Module to create native browser window.

    function createApp() {
      createTrayIcon();
      if (process.platform == 'darwin') {
        debug_log("Creating MacOS Menu");
        createMenu();
      }
    }

    function createMenu() {

      var template = [{
        label: "Application",
        submenu: [{
          label: "Quit",
          accelerator: "Command+Q",
          click: function() {
            if (appIcon) {
              appIcon.destroy();
            }
            electronApp.exit(0);
          }
        }]
      }, {
        label: "Edit",
        submenu: [{
            label: "Cut",
            accelerator: "CmdOrCtrl+X",
            selector: "cut:"
          },
          {
            label: "Copy",
            accelerator: "CmdOrCtrl+C",
            selector: "copy:"
          },
          {
            label: "Paste",
            accelerator: "CmdOrCtrl+V",
            selector: "paste:"
          },
          {
            label: "Select All",
            accelerator: "CmdOrCtrl+A",
            selector: "selectAll:"
          }
        ]
      }, {
        label: "View",
        submenu: [{
            label: "Reload",
            accelerator: "F5",
            click: (item, focusedWindow) => {
              if (focusedWindow) {
                // on reload, start fresh and close any old
                // open secondary windows
                if (focusedWindow.id === 1) {
                  BrowserWindow.getAllWindows().forEach(win => {
                    if (win.id > 1) win.close();
                  });
                }
                focusedWindow.reload();
              }
            }
          },
          {
            label: "Toggle Dev Tools",
            accelerator: "F12",
            click: () => {
              jogWindow.webContents.toggleDevTools();
            }
          }
        ]
      }];

      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }

    function createTrayIcon() {
      if (process.platform !== 'darwin') {
        appIcon = new Tray(
          nativeImage.createFromPath(iconPath)
        )
        const contextMenu = Menu.buildFromTemplate([{
          label: 'Open User Interface (GUI)',
          click() {
            // debug_log("Clicked Systray")
            showJogWindow()
          }
        }, {
          label: 'Quit OpenBuilds TestAPP (Disables all integration until started again)',
          click() {
            if (appIcon) {
              appIcon.destroy();
            }
            electronApp.exit(0);
          }
        }])
        if (appIcon) {
          appIcon.on('click', function() {
            // debug_log("Clicked Systray")
            showJogWindow()
          })
        }

        if (appIcon) {
          appIcon.on('balloon-click', function() {
            // debug_log("Clicked Systray")
            showJogWindow()
          })
        }

        // Call this again for Linux because we modified the context menu
        if (appIcon) {
          appIcon.setContextMenu(contextMenu)
        }

        if (appIcon) {
          appIcon.displayBalloon({
            icon: nativeImage.createFromPath(iconPath),
            title: "OpenBuilds TestApp Started",
            // content: "OpenBuilds CONTROL has started successfully: Active on " + ip.address() + ":" + config.webPort
            content: "OpenBuilds TestApp has started successfully"
          })
        }
      } else {
        const dockMenu = Menu.buildFromTemplate([{
          label: 'Quit OpenBuilds TestApp (Disables all integration until started again)',
          click() {
            // appIcon.destroy();
            electronApp.exit(0);
          }
        }])
        electronApp.dock.setMenu(dockMenu)
      };

    }

    function createJogWindow() {
      // Create the browser window.
      jogWindow = new BrowserWindow({
        // 1366 * 768 == minimum to cater for
        width: 1000,
        height: 850,
        fullscreen: false,
        center: true,
        resizable: true,
        maximizable: true,
        title: "OpenBuilds TestApp ",
        frame: true,
        autoHideMenuBar: true,
        //icon: '/app/favicon.png',
        icon: nativeImage.createFromPath(
          path.join(__dirname, "/app/favicon.png")
        ),
        webgl: true,
        experimentalFeatures: true,
        experimentalCanvasFeatures: true,
        offscreen: true,
        backgroundColor: "#fff",
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      jogWindow.setOverlayIcon(nativeImage.createFromPath(iconPath), 'Icon');

      jogWindow.loadURL("http://openbuilds.com/");
      //jogWindow.webContents.openDevTools()

      jogWindow.on('close', function(event) {
        if (!forceQuit) {
          jogWindow.hide();
          return false;
        }
      });

      // Emitted when the window is closed.
      jogWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        jogWindow = null;
      });
      jogWindow.once('ready-to-show', () => {
        showJogWindow()
      })
    }

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    electronApp.on('ready', createApp);

    electronApp.on('before-quit', function() {
      forceQuit = true;
    })

    electronApp.on('will-quit', function(event) {
      // On OS X it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      // We don't take that route, we close it completely
      if (appIcon) {
        appIcon.destroy();
      }
      electronApp.exit(0);
    });

    // Quit when all windows are closed.
    electronApp.on('window-all-closed', function() {
      // On OS X it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (appIcon) {
        appIcon.destroy();
      }
      electronApp.exit(0);
    });

    electronApp.on('activate', function() {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) {
        createApp();
      }
    });

    // Autostart on Login
    if (process.platform == 'win32') {
      electronApp.setLoginItemSettings({
        openAtLogin: true,
        args: []
      })
    }
  }
} else { // if its not running under Electron, lets get Chrome up.
  var isPi = require('detect-rpi');
  if (isPi()) {
    DEBUG = true;
    debug_log('Running on Raspberry Pi!');
    status.driver.operatingsystem = 'rpi'
    startChrome();
  } else {
    debug_log("Running under NodeJS...");
  }
}

process.on('exit', () => debug_log('exit'))