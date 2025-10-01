import { extractDomain } from './utils.js';

const filterTabsToClose = async (tabs, activeTabId, options) => {
  const filteredTabs = [];

  for (const tab of tabs) {
    if (options.keepActive && tab.id === activeTabId) continue;
    if (options.keepPinned && tab.pinned) continue;

    if (options.selectedDomains) {
      const domain = extractDomain(tab.url);
      if (options.selectedDomains.includes(domain)) {
        filteredTabs.push(tab);
      }
    }
  }

  return filteredTabs;
};

browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'closeTabs') {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTabId = activeTabs[0].id;

      const tabsToClose = await filterTabsToClose(tabs, activeTabId, request.options);

      if (tabsToClose.length === 0) {
        console.warn('No tabs to close');
        return;
      }

      const batchSize = 20;
      let totalClosed = 0;

      for (let i = 0; i < tabsToClose.length; i += batchSize) {
        const batch = tabsToClose.slice(i, i + batchSize);
        const tabIds = batch.map(tab => tab.id);

        await browser.tabs.remove(tabIds);

        if (tabsToClose.length > 50 && i + batchSize < tabsToClose.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error closing background tabs:', error);
    }
    return;
  }

  if (request.action === 'getDetailedTabsInfo') {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });

      const detailedTabs = await Promise.all(
        tabs.map(async (tab) => {
          const domain = extractDomain(tab.url);

          return {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            domain: domain,
            pinned: tab.pinned,
            active: tab.active
          };
        })
      );

      return detailedTabs;
    } catch (error) {
      console.error('Error getting detailed tabs info:', error);
      return [];
    }
  }
});
