chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update" || details.reason === "install") {
    chrome.storage.local.set({
      fmk_updated: chrome.runtime.getManifest().version,
    });
  }
});
