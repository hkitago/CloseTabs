// for debug to open multiple tabs at once
//const collectExternalLinks = (limit = 30) => {
//  const anchors = [...document.querySelectorAll('a[href]')];
//  const currentHost = location.hostname;
//
//  const urls = anchors
//    .map(a => new URL(a.href, location.href).href)
//    .filter(url => {
//      try {
//        const u = new URL(url);
//        return u.hostname !== currentHost && u.protocol.startsWith('http');
//      } catch {
//        return false;
//      }
//    })
//    .slice(0, limit);
//
//  return urls;
//}
//
//browser.runtime.onMessage.addListener((request) => {
//  if (request.type === 'collectExternalLinks') {
//    return Promise.resolve(collectExternalLinks(request.limit));
//  }
//});
