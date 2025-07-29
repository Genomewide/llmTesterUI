const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Project management
  loadProjects: () => ipcRenderer.invoke('load-projects'),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  processLargeFile: (filePath, projectId) => ipcRenderer.invoke('process-large-file', filePath, projectId),
  getFilePreview: (filePath, maxRecords) => ipcRenderer.invoke('get-file-preview', filePath, maxRecords),
  
  // Export functionality
  exportProject: (project, format) => ipcRenderer.invoke('export-project', project, format),
  
  // ARS API functionality
  fetchArsData: (pk, environment) => ipcRenderer.invoke('fetch-ars-data', pk, environment),
  
  // File export functionality
  saveCSVFile: (filePath, content) => ipcRenderer.invoke('save-csv-file', filePath, content),
  saveJSONFile: (filePath, content) => ipcRenderer.invoke('save-json-file', filePath, content),
  
  // Utility functions
  getAppVersion: () => process.versions.app,
  getNodeVersion: () => process.versions.node,
  getChromeVersion: () => process.versions.chrome,
  getElectronVersion: () => process.versions.electron,
  
  // Platform info
  platform: process.platform,
  arch: process.arch
}); 