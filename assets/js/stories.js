'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('story-status');
  const container = document.querySelector('[data-collection]');
  const more = document.getElementById('story-more');
  const count = document.getElementById('story-count');
  let gallery = [];
  let currentImage = 0;
  const dialog = document.getElementById('story-lightbox');
  const preview = document.getElementById('lightbox-image');
  const safeUrl = value => {
    try { const url = new URL(value, location.origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  function showImage(index) {
    if (!gallery.length) return;
    currentImage = (index + gallery.length) % gallery.length;
    const item = gallery[currentImage];
    preview.src = safeUrl(item.src);
    preview.alt = item.alt;
    document.getElementById('lightbox-label').textContent = item.alt || 'Фото проекта';
    document.getElementById('lightbox-count').textContent = `${currentImage + 1} / ${gallery.length}`;
    document.getElementById('lightbox-original').href = safeUrl(item.src);
    if (!dialog.open) dialog.showModal();
  }
  if (dialog) {
    document.getElementById('lightbox-close').addEventListener('click', () => dialog.close());
    document.getElementById('lightbox-prev').addEventListener('click', () => showImage(currentImage - 1));
    document.getElementById('lightbox-next').addEventListener('click', () => showImage(currentImage + 1));
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); showImage(currentImage + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { preview.removeAttribute('src'); document.body.style.overflow = ''; });
    const open = showImage;
    showImage = index => { document.body.style.overflow = 'hidden'; open(index); };
  }
  function element(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text) result.textContent = text;
    return result;
  }
  function image(src, alt) {
    const result = element('img'); result.src = safeUrl(src); result.alt = alt; result.loading = 'lazy'; result.decoding = 'async';
    return result;
  }
  function failure(retry) {
    status.hidden = false; status.textContent = 'Не удалось загрузить раздел.';
    const button = element('button', 'story-button', 'Повторить');
    button.type = 'button'; button.addEventListener('click', retry); status.append(button);
  }
  if (container) {
    let records = []; let filtered = []; let visible = 12;
    const reviews = container.dataset.collection === 'social-reviews';
    const grid = document.getElementById(reviews ? 'reviews-grid' : 'works-grid');
    function render() {
      grid.replaceChildren();
      count.textContent = String(filtered.length);
      gallery = reviews ? filtered.map(item => ({src: item.image, alt: item.title})) : [];
      status.hidden = filtered.length > 0;
      status.textContent = records.length ? 'По этому запросу проектов нет. Попробуйте другой материал или город.' : 'В этом разделе пока нет публикаций.';
      filtered.slice(0, visible).forEach((item, index) => {
        let card;
        if (reviews) {
          card = element('button', 'review-shot'); card.type = 'button'; card.setAttribute('aria-label', `Открыть ${item.title}`);
          card.append(image(item.image, item.title));
          const caption = element('span', 'review-caption', item.title); caption.append(element('span', '', 'Читать ↗')); card.append(caption);
          card.addEventListener('click', () => showImage(index));
        } else {
          card = element('a', 'work-card'); card.href = `/plastik-kuhni-demo/works/project.html?id=${item.id}`;
          const visual = element('div', 'work-card-visual'); visual.append(image(item.cover, item.title), element('span', 'work-card-arrow', '↗'));
          card.append(visual, element('time', '', item.date), element('h3', '', item.title), element('p', '', item.excerpt));
        }
        card.classList.add('story-item-enter'); card.style.setProperty('--delay', `${index % 3 * 40}ms`); grid.append(card);
      });
      more.hidden = visible >= filtered.length;
    }
    const search = document.getElementById('works-search');
    if (search) search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('ru');
      filtered = records.filter(item => `${item.title} ${item.full_title} ${item.excerpt} ${item.date}`.toLocaleLowerCase('ru').includes(query));
      visible = 12; render();
    });
    more.addEventListener('click', () => { visible += 12; render(); });
    async function load() {
      status.hidden = false; status.textContent = 'Загружаем публикации…';
      try {
        const response = await fetch(`/api/${container.dataset.collection}`);
        if (!response.ok) throw new Error('Collection request failed');
        records = await response.json(); filtered = records; render();
      } catch { failure(load); }
    }
    load();
  } else if (document.getElementById('work-article')) {
    async function loadProject() {
      try {
        const id = Number(new URLSearchParams(location.search).get('id'));
        if (!Number.isInteger(id) || id < 1) throw new Error('Проект не найден');
        const response = await fetch(`/api/works/${id}`);
        if (response.status === 404) { status.textContent = 'Проект не найден. Вернитесь к списку выполненных работ.'; return; }
        if (!response.ok) throw new Error('Project request failed');
        const project = await response.json();
        if (!project.is_active) { status.textContent = 'Этот проект пока не опубликован.'; return; }
        document.title = `${project.title} — Пластик Кухни`;
        document.getElementById('work-title').textContent = project.full_title || project.title;
        document.getElementById('work-date').textContent = project.date ? `Выполненный проект / ${project.date}` : 'Выполненный проект';
        const source = document.getElementById('work-source'); source.href = safeUrl(project.source_url); source.hidden = !project.source_url;
        const body = document.getElementById('work-body'); body.replaceChildren(); gallery = [];
        project.body.forEach(block => {
          if (block.type === 'text' || block.type === 'heading') body.append(element(block.type === 'text' ? 'p' : 'h2', '', block.text));
          if (block.type === 'image' && safeUrl(block.src)) {
            const index = gallery.length; const alt = block.alt || `Фото проекта ${index + 1}`;
            gallery.push({src: block.src, alt}); const button = element('button', 'work-photo'); button.type = 'button'; button.setAttribute('aria-label', `Увеличить: ${alt}`); button.append(image(block.src, alt)); button.addEventListener('click', () => showImage(index)); body.append(button);
          }
          if (block.type === 'video') {
            const url = safeUrl(block.src);
            if (!url || !['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'rutube.ru'].includes(new URL(url).hostname)) return;
            const frame = element('iframe'); frame.src = url; frame.title = block.text || 'Видео проекта'; frame.loading = 'lazy'; frame.allowFullscreen = true; body.append(frame);
          }
        });
        status.hidden = true; document.getElementById('work-article').hidden = false;
      } catch { failure(loadProject); }
    }
    loadProject();
  }
});
