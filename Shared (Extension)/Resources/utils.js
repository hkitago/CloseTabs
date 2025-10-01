//
//  utils.js
//  CloseTabs
//
//  Created by Hiroyuki KITAGO on 2025/09/27.
//
export const isMacOS = () => {
  const isPlatformMac = navigator.platform.toLowerCase().indexOf('mac') !== -1;

  const isUserAgentMac = /Mac/.test(navigator.userAgent) &&
                         !/iPhone/.test(navigator.userAgent) &&
                         !/iPad/.test(navigator.userAgent);

  return (isPlatformMac || isUserAgentMac) && !('ontouchend' in document);
};

export const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url;
  }
};
