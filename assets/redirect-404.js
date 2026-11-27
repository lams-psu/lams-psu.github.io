(function () {
  var ROUTES = {
    'lams-document-hub': 'https://script.google.com/a/macros/psu.ac.th/s/AKfycbzV0dwFv5vwHiqp-Cmka6dalVt-D1BzDOtzD_eeswgQ2ZP0uHD8MBXakUCdhoD_qwch/exec',
    'lams-congrats-apps': 'https://script.google.com/a/macros/psu.ac.th/s/AKfycbxQCGHfNh5lvt-AuGD89apaccK1dMZ23TMsG4d5uCZO0sn4eavbk-6HCb6LClvFq8b5XQ/exec'
  };
  var slug = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ROUTES, slug)) {
    window.location.replace(ROUTES[slug] + (window.location.search || '') + (window.location.hash || ''));
  }
})();
