import { getCurrentLangLabelString, applyRTLSupport } from './localization.js';
import { extractDomain } from './utils.js';

const settings = (() => {
  const DEFAULT_SETTINGS = {
    keepActive: true,
    keepPinned: true,
  };

  let cache = { ...DEFAULT_SETTINGS };

  const load = async () => {
    try {
      const { settings: stored } = await browser.storage.local.get('settings');
      cache = { ...DEFAULT_SETTINGS, ...stored };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const get = (key) => cache[key];

  const set = async (key, value) => {
    cache[key] = value;
    try {
      await browser.storage.local.set({ settings: cache });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return { load, get, set };
})();

const isIOS = () => {
  return /iPhone|iPod/.test(navigator.userAgent);
};

const isIPadOS = () => {
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
};

const isMacOS = () => {
  return navigator.platform.includes('Mac') && !isIPadOS();
};

const getIOSMajorVersion = () => {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : 0;
};

const closeWindow = () => {
  window.close();

  // In older iOS versions (<18), reloading the extension helped with some popup issues
  // Might no longer be necessary — safe to remove if no issues found
  if (getIOSMajorVersion() > 0 && getIOSMajorVersion() < 18) {
    setTimeout(() => {
      try {
        browser.runtime.reload();
      } catch (error) {
        console.warn('browser.runtime.reload failed:', error);
      }
    }, 100);
  }
};

const buildPopup = (settings) => {
  if (isMacOS()) {
    document.body.classList.add('os-macos');
  }

  // List View
  let tabsData = [];
  let domainCounts = new Map();

  const loadTabsData = async () => {
    try {
      tabsData = await browser.runtime.sendMessage({
        action: 'getDetailedTabsInfo'
      });

      domainCounts.clear();
      tabsData.forEach(tab => {
        const domain = extractDomain(tab.url);
        const count = domainCounts.get(domain) || 0;
        domainCounts.set(domain, count + 1);
      });
    } catch (error) {
      console.error('Error loading tabs data:', error);
    }
  }

  const renderDomainList = async () => {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';

    await loadTabsData();
    const sortedDomains = Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1]);

    sortedDomains.forEach(([domain, count]) => {
//      if (sortedDomains.length === 1 && count === 1) {
//        document.querySelector('main').innerHTML = `<div id="errorMsg"><p>${getCurrentLangLabelString('onError')}</div>`;
//        document.querySelector('footer').style.display = 'none';
//        return;
//      }

      const li = document.createElement('li');
      li.className = 'domain-item';

      const div = document.createElement('div');

      const label = document.createElement('label');
      label.htmlFor = `domain-${domain}`;
      label.className = 'domain-name';
      label.textContent = domain ? domain : `${getCurrentLangLabelString('startpage')}`;

      const spanCount = document.createElement('span');
      spanCount.className = 'tab-count';
      spanCount.textContent = count;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `domain-${domain}`;
      checkbox.value = domain;
      checkbox.checked = true;
      checkbox.className = 'toggle-disabled';

      const toggleSpan = document.createElement('span');
      toggleSpan.className = 'toggle';

      checkbox.addEventListener('click', (event) => {
        event.target.classList.remove('toggle-disabled');
      });

      toggleSpan.addEventListener('click', (event) => {
        checkbox.click();
      });

      div.appendChild(label);
      div.appendChild(spanCount);
      div.appendChild(checkbox);
      div.appendChild(toggleSpan);
      li.appendChild(div);
      domainList.appendChild(li);
    });
  };

  renderDomainList();

  // Settings View
  const settingItems = [
    { key: 'keepActive', label: `${getCurrentLangLabelString('settingsKeepActive')}` },
    { key: 'keepPinned', label: `${getCurrentLangLabelString('settingsKeepPinned')}` },
  ];

  const checkboxes = {};

  const renderSettingsList = () => {
    settingItems.forEach(({ key, label }) => {
      const checkbox = document.getElementById(key);
      const labelElement = document.querySelector(`label[for="${key}"]`);
      if (!checkbox || !labelElement) return;

      checkboxes[key] = checkbox;

      labelElement.textContent = label;

      checkbox.checked = settings.get(key);

      checkbox.addEventListener('click', (event) => {
        event.target.classList.remove('toggle-disabled');
      });

      const toggleSpan = checkbox.nextElementSibling;
      if (toggleSpan) {
        toggleSpan.addEventListener('click', () => {
          checkbox.click();
        });
      }

      checkbox.addEventListener('change', async () => {
        checkbox.classList.remove('toggle-disabled');
        await settings.set(key, checkbox.checked);
      });
    });
  };

  renderSettingsList();

  const settingsList = document.getElementById('settingsList');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsDoneBtn = document.getElementById('settingsDoneBtn');

  let isSettingsMode = false;

  const toggleSettingsMode = () => {
    isSettingsMode = !isSettingsMode;

    if (isSettingsMode) {
      settingsList.style.display = 'block';
      settingsBtn.style.display = 'none';
      settingsDoneBtn.style.display = 'block';
    } else {
      settingsList.style.display = 'none';
      settingsBtn.style.display = 'block';
      settingsDoneBtn.style.display = 'none';

      checkboxes.keepActive.classList.add('toggle-disabled');
      checkboxes.keepPinned.classList.add('toggle-disabled');
    }

    const html = document.documentElement;
    html.scrollTo({
      top: html.scrollHeight,
      behavior: 'smooth'
    });
  };

  settingsBtn.title = `${getCurrentLangLabelString('settings')}`;
  settingsBtn.textContent = `${getCurrentLangLabelString('settings')}`;
  settingsBtn.addEventListener('click', toggleSettingsMode);
  settingsBtn.addEventListener('touchstart', (event) => {
    event.target.classList.add('selected');
  });
  settingsBtn.addEventListener('touchend', (event) => {
    event.target.classList.remove('selected');
  });

  settingsDoneBtn.title = `${getCurrentLangLabelString('settingsDone')}`;
  settingsDoneBtn.textContent = `${getCurrentLangLabelString('settingsDone')}`;
  settingsDoneBtn.addEventListener('click', toggleSettingsMode);
  settingsDoneBtn.addEventListener('touchstart', (event) => {
    event.target.classList.add('selected');
  });
  settingsDoneBtn.addEventListener('touchend', (event) => {
    event.target.classList.remove('selected');
  });

  // Buttons View
  const actionBtunsDiv = document.getElementById('actionBtns');
  
  const closeTabsBtn = document.createElement('button');
  closeTabsBtn.id = 'closeTabsBtn';
  closeTabsBtn.textContent = `${getCurrentLangLabelString('closeTabsBtn')}`;
  actionBtunsDiv.appendChild(closeTabsBtn);

  const getCloseTabsOptions = () => {
    const selectedDomains = Array.from(
      document.querySelectorAll('#domainList input:checked')
    ).map(cb => cb.value);

    return {
      keepActive: checkboxes.keepActive?.checked ?? false,
      keepPinned: checkboxes.keepPinned?.checked ?? false,
      selectedDomains,
    };
  };
  
  closeTabsBtn.addEventListener('click', async (event) => {
    const options = getCloseTabsOptions();
    
    try {
      const result = await browser.runtime.sendMessage({
        action: 'closeTabs',
        options: options
      });
    } catch (error) {
      console.error('Fail to close tabs:', error);
    }
    
    closeWindow();
  });

  closeTabsBtn.addEventListener('touchstart', (event) => {
    event.target.classList.add('active');
  });

  closeTabsBtn.addEventListener('touchend', (event) => {
    event.target.classList.remove('active');
  });

  closeTabsBtn.addEventListener('touchcancel', (event) => {
    event.target.classList.remove('active');
  });

  // Button for debug to open multiple tabs at once
  const openLinksBtn = document.createElement('button');
  openLinksBtn.id = 'openLinksBtn';
  openLinksBtn.textContent = 'Open Links'; // Localization
  actionBtunsDiv.appendChild(openLinksBtn);

  openLinksBtn.addEventListener('click', async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const urls = await browser.tabs.sendMessage(tab.id, { type: 'collectExternalLinks', limit: 20 });
    for (const url of urls) {
      browser.tabs.create({ url });
    }

    closeWindow();
  });
//
//  const debugBtn = document.createElement('button');
//  debugBtn.id = 'debugBtn';
//  debugBtn.textContent = 'Debug';
//  document.querySelector('footer').appendChild(debugBtn);
//  
//  debugBtn.addEventListener('click', async () => {
//    console.log(document.documentElement.scrollTop);
//  });

};

let isInitialized = false;

const initializePopup = async () => {
  if (isInitialized) return;
  isInitialized = true;
  
  await settings.load();
  try {
    await buildPopup(settings);

    if (isIPadOS) {
      const html = document.documentElement;
      setTimeout(() => {
        if (html.scrollTop > 0) {
          html.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }, 750);
    }
  } catch (error) {
    console.error('Fail to initialize to build the popup:', error);
    isInitialized = false;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup, { once: true });
} else {
  initializePopup();
}
