const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("portfolioApp", {
  connect: (repositoryUrl) => ipcRenderer.invoke("repository:connect", repositoryUrl),
  save: (content) => ipcRenderer.invoke("portfolio:save", content),
  importMedia: () => ipcRenderer.invoke("portfolio:import-media"),
  preview: () => ipcRenderer.invoke("portfolio:preview"),
  publish: (message) => ipcRenderer.invoke("repository:publish", message),
  openRepository: () => ipcRenderer.invoke("repository:open"),
  configurePages: () => ipcRenderer.invoke("repository:configure-pages")
});
