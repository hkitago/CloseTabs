import { getCurrentLangLabelString, applyRTLSupport } from './localization.js';
import { isIPadOS, applyPlatformClass, extractDomain, settings, closeWindow } from './utils.js';

const buildPopup = (settings) => {
  applyPlatformClass();
  applyRTLSupport();

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
      console.error('[CloseTabsExtension] Failed to load tabs data:', error);
    }
  }

  const renderDomainList = async () => {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';

    await loadTabsData();
    const sortedDomains = Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1]);

    sortedDomains.forEach(([domain, count]) => {
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

  const settingsToggles = {};

  const renderSettingsList = () => {
    settingItems.forEach(({ key, label }) => {
      const checkbox = document.getElementById(key);
      const labelElement = document.querySelector(`label[for="${key}"]`);
      if (!checkbox || !labelElement) return;

      settingsToggles[key] = checkbox;

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

  // Settings View
  const settingsList = document.getElementById('settingsList');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsDoneBtn = document.getElementById('settingsDoneBtn');

  let isSettingsMode = settings.get('isSettingsMode');

  settingsList.style.display = isSettingsMode ? '' : 'none';
  settingsBtn.style.display = isSettingsMode ? 'none' : '';
  settingsDoneBtn.style.display = isSettingsMode ? '' : 'none';

  const toggleSettingsMode = async (event) => {
    isSettingsMode = !isSettingsMode;

    await settings.set('isSettingsMode', isSettingsMode);

    if (isSettingsMode) {
      settingsList.style.display = 'block';
      settingsBtn.style.display = 'none';
      settingsDoneBtn.style.display = 'block';
    } else {
      settingsList.style.display = 'none';
      settingsBtn.style.display = 'block';
      settingsDoneBtn.style.display = 'none';

      settingsToggles.keepActive.classList.add('toggle-disabled');
      settingsToggles.keepPinned.classList.add('toggle-disabled');
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
      keepActive: settingsToggles.keepActive?.checked ?? false,
      keepPinned: settingsToggles.keepPinned?.checked ?? false,
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
      console.error('[CloseTabsExtension] Failed to close tabs:', error);
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
    console.error('[CloseTabsExtension] Failed to initialize to build the popup:', error);
    isInitialized = false;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup, { once: true });
} else {
  initializePopup();
}
