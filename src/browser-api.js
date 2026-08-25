let dataApiPromise;

function getDataApi() {
  dataApiPromise ||= import('./api');
  return dataApiPromise;
}

function dataMethod(name) {
  return async (...args) => {
    const api = await getDataApi();
    return api[name](...args);
  };
}

export const electronAPI = {
  // Bmob is only needed by tools that read or persist user data.
  saveData: dataMethod('saveData'),
  loadData: dataMethod('loadData'),
  deleteData: dataMethod('deleteData'),
  async openExternal(url) {
    if (!url) return null;
    window.open(url, '_blank', 'noopener,noreferrer');
    return null;
  },
  async fetchFavicon(url) {
    try {
      const target = new URL(url.startsWith('http') ? url : `https://${url}`);
      return { ok: true, data: `https://favicon.im/${target.hostname}?larger=true` };
    } catch {
      return null;
    }
  },
  async systemInfo() {
    const cpus = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 8;
    return {
      electronVersion: 'web',
      cpus,
      freemem: mem * 1024 ** 3,
      platform: navigator.platform || 'web',
    };
  },
  async detectFfmpeg() { return null; },
  async getVideoWorkflowPath() { return null; },
  async openFolderDialog() { return null; },
  async openFilesDialog() { return null; },
  async saveFileDialog() { return null; },
  async mindmapStart() { return { ready: true, port: -1, url: '/mindmap-app/' }; },
  async mindmapStatus() { return { ready: true, port: -1, url: '/mindmap-app/' }; },
  async canvasStatus() { return { ready: true, port: -1, url: '/canvas' }; },
};

export default electronAPI;
