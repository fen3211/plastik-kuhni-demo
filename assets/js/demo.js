'use strict';
(() => {
  const base = '/plastik-kuhni-demo/';
  const originalFetch = window.fetch.bind(window);
  let productsPromise;
  const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), {
    status, headers: {'Content-Type': 'application/json; charset=utf-8'}
  });
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const path = url.pathname.startsWith(base) ? '/' + url.pathname.slice(base.length) : url.pathname;
    if (url.origin !== location.origin || !path.startsWith('/api/')) return originalFetch(input, options);
    const method = options.method || (input instanceof Request ? input.method : 'GET');
    if (method.toUpperCase() !== 'GET') return jsonResponse({detail: 'Демонстрационный режим: данные не отправлены.'}, 405);
    if (path === '/api/reviews') return jsonResponse([]);
    if (/^\/api\/products(?:\/\d+)?$/.test(path)) {
      productsPromise ||= originalFetch(base + 'data/products.json').then(response => response.json());
      const products = await productsPromise;
      if (path === '/api/products') return jsonResponse(products);
      const product = products.find(item => item.id === Number(path.split('/').pop()));
      return product ? jsonResponse(product) : jsonResponse({detail: 'Модель не найдена'}, 404);
    }
    const routes = {
      '/api/works': 'works.json', '/api/social-reviews': 'social-reviews.json',
      '/api/site-config': 'site-config.json', '/api/calculator-rates': 'calculator-rates.json'
    };
    const filename = routes[path] || (/^\/api\/works\/\d+$/.test(path) ? 'works/' + path.split('/').pop() + '.json' : null);
    return filename ? originalFetch(base + 'data/' + filename) : jsonResponse({detail: 'Недоступно в демонстрации'}, 404);
  };
  document.addEventListener('submit', event => {
    if (event.target.method === 'dialog') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    let dialog = document.getElementById('demo-form-notice');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'demo-form-notice';
      dialog.setAttribute('aria-labelledby', 'demo-form-title');
      dialog.innerHTML = '<h2 id="demo-form-title">Это демонстрационная версия</h2><p>Заявка не отправлена. Здесь можно посмотреть дизайн и работу интерфейса. Приём заявок подключается при запуске сайта.</p><form method="dialog"><button type="submit">Понятно</button></form>';
      document.body.append(dialog);
    }
    if (!dialog.open) dialog.showModal();
  }, true);
})();
