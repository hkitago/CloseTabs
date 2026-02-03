//
//  utils.js
//  CloseTabs
//
//  Created by Hiroyuki KITAGO on 2025/09/27.
//
export const isIOS = () => {
  return /iPhone|iPod/.test(navigator.userAgent);
};

export const isIPadOS = () => {
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

export const isMacOS = () => {
  return navigator.platform.includes('Mac') && !isIPadOS();
};

export const getIOSMajorVersion = () => {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
};

export const applyPlatformClass = () => {
  const body = document.body;

  if (isIOS()) {
    body.classList.add('os-ios');
  } else if (isIPadOS()) {
    body.classList.add('os-ipados');
  } else if (isMacOS()) {
    body.classList.add('os-macos');
  }
};

export const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url;
  }
};

export const settings = (() => {
  const DEFAULT_SETTINGS = {
    keepActive: true,
    keepPinned: true,
    isSettingsMode: false,
  };

  let cache = { ...DEFAULT_SETTINGS };

  const load = async () => {
    try {
      const { settings: stored } = await browser.storage.local.get('settings');
      cache = { ...DEFAULT_SETTINGS, ...stored };
    } catch (error) {
      console.error('[CloseTabsExtension] Failed to load settings:', error);
    }
  };

  const get = (key) => {
    if (key === undefined) return { ...cache };
    return cache[key];
  };

  const set = async (key, value) => {
    cache[key] = value;
    try {
      await browser.storage.local.set({ settings: cache });
    } catch (error) {
      console.error('[CloseTabsExtension] Failed to save settings:', error);
    }
  };

  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes.settings) {
      cache = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };
    }
  });

  return { load, get, set };
})();

export const closeWindow = () => {
  window.close();

  // In older iOS versions (<18), reloading the extension helped with some popup issues
  // Might no longer be necessary — safe to remove if no issues found
  if (getIOSMajorVersion() > 0 && getIOSMajorVersion() < 18) {
    setTimeout(() => {
      try {
        browser.runtime.reload();
      } catch (error) {
        console.warn('[CloseTabsExtension] Failed to browser.runtime.reload:', error);
      }
    }, 100);
  }
};
