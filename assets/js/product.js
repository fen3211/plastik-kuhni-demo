// ========================================================
// Product Detail Page Logic — Dope Motions Easing & Reactive State
// Connects to SQLite FastAPI Backend & Handles Dynamic Configurator
// ========================================================

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = Number(urlParams.get('id'));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const optionDeltas = { facade: 0, hardware: 0, gift: 0 };
  const dialogOpeners = new WeakMap();
  function showDialog(modal) {
    if (modal.classList.contains('hidden')) {
      dialogOpeners.set(modal, document.activeElement);
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      modal.querySelector('input, button, textarea, a[href]')?.focus();
    }
  }
  function hideDialog(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    dialogOpeners.get(modal)?.focus();
  }
  document.addEventListener('keydown', (event) => {
    const modal = document.querySelector('[role="dialog"]:not(.hidden)');
    if (!modal) return;
    if (event.key === 'Escape') hideDialog(modal);
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button, input, textarea, a[href]')].filter(el => !el.disabled && el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });


  // DOM Elements
  const pageTitle = document.getElementById('page-title');
  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  const productTitle = document.getElementById('product-title');
  const productShortDesc = document.getElementById('product-short-desc');
  const productPrice = document.getElementById('product-price');
  const productOldPrice = document.getElementById('product-old-price');
  const productMeterPrice = document.getElementById('product-meter-price');
  const productBadgeCategory = document.getElementById('product-badge-category');
  const productBadgeDiscount = document.getElementById('product-badge-discount');
  const productMainImg = document.getElementById('product-main-img');
  const productThumbnails = document.getElementById('product-thumbnails');

  // Options Containers
  const facadeOptionsContainer = document.getElementById('detail-facade-options');
  const hardwareOptionsContainer = document.getElementById('detail-hardware-options');
  const giftOptionsContainer = document.getElementById('detail-gift-options');

  // Specs
  const specMeterPrice = document.getElementById('spec-meter-price');
  const specLength = document.getElementById('spec-length');
  const specShape = document.getElementById('spec-shape');
  const specFacade = document.getElementById('spec-facade');

  // Video Section
  const productVideoIframe = document.getElementById('product-video-iframe');
  const productVideoTitle = document.querySelector('section:has(#product-video-iframe) h2') || document.querySelector('#product-video-section h2');
  const productVideoSubtitle = document.querySelector('section:has(#product-video-iframe) p') || document.querySelector('#product-video-section p');

  // Description
  const productFullDesc = document.getElementById('product-full-desc');

  // Modal elements
  const quickOrderModal = document.getElementById('quick-order-modal');
  const btnQuickOrderTrigger = document.getElementById('btn-quick-order-trigger');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalKitchenTitle = document.getElementById('modal-kitchen-title');
  const modalSummaryTitle = document.getElementById('modal-summary-title');
  const modalSummaryFacade = document.getElementById('modal-summary-facade');
  const modalSummaryGift = document.getElementById('modal-summary-gift');
  const modalSummaryPrice = document.getElementById('modal-summary-price');
  const productQuickForm = document.getElementById('product-quick-form');
  const modalFormFeedback = document.getElementById('modal-form-feedback');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');

  // Bottom CTA
  const ctaLeadForm = document.getElementById('cta-lead-form');
  const ctaFormFeedback = document.getElementById('cta-form-feedback');
  const ctaSubmitBtn = document.getElementById('cta-submit-btn');

  // Containers
  const similarGrid = document.getElementById('similar-products-grid');
  const faqContainer = document.getElementById('faq-accordion-container');

  let currentProduct = null;
  let basePriceNum = 0;
  let currentDelta = 0;
  let selectedFacadeName = '';
  let selectedHwName = '';
  let selectedGiftName = '';

  // --- 11. Tab Switching Logic (Snappy Dope Motions) ---
  const tabButtons = document.querySelectorAll('.product-tab-btn');
  const tabPanes = document.querySelectorAll('.product-tab-pane');

  function switchTab(targetPaneId) {
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('aria-controls') === targetPaneId;
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      btn.tabIndex = isTarget ? 0 : -1;
      if (isTarget) {
        btn.className = 'product-tab-btn active px-6 py-3.5 rounded-t-2xl border-t border-x border-luxury-subtle bg-white dark:bg-[#12151B] text-gray-900 dark:text-white font-bold text-sm sm:text-base flex items-center gap-2.5 transition shadow-sm -mb-px';
      } else {
        btn.className = 'product-tab-btn px-6 py-3.5 rounded-t-2xl border-t border-x border-transparent hover:border-luxury-subtle bg-black/[0.02] dark:bg-white/[0.02] text-gray-500 hover:text-gray-900 dark:hover:text-white font-semibold text-sm sm:text-base flex items-center gap-2.5 transition';
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === targetPaneId) {
        pane.classList.remove('hidden');
        pane.style.opacity = '0';
        pane.style.transform = 'translateY(6px)';
        requestAnimationFrame(() => {
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            pane.style.opacity = '1';
            pane.style.transform = 'none';
            return;
          }
          pane.style.transition = 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
          pane.style.opacity = '1';
          pane.style.transform = 'translateY(0)';
        });
      } else {
        pane.classList.add('hidden');
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  tabButtons.forEach(btn => {
    btn.tabIndex = btn.getAttribute('aria-selected') === 'true' ? 0 : -1;
    btn.addEventListener('click', () => {
      const targetPaneId = btn.getAttribute('aria-controls');
      if (targetPaneId) switchTab(targetPaneId);
    });
    btn.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(tabButtons);
      const idx = buttons.indexOf(btn);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (idx + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].click();
      buttons[next].focus();
    });
  });


  // 1. Fetch Product Data
  try {
    if (!Number.isSafeInteger(productId) || productId < 1) throw new Error('Product not found');
    let p = null;
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        p = await res.json();
      }
    } catch (e) {
      console.warn('API fetch failed, falling back to JSON:', e);
    }

    if (!p) {
      const res = await fetch('../data/products.json');
      const all = await res.json();
      p = all.find(item => item.id === productId);
    }

    if (!p) throw new Error('Product not found');
    currentProduct = p;

    // Base price numeric
    basePriceNum = Number(p.price_num) || parseInt((p.price || '').replace(/\D/g, ''), 10) || 0;

    // Populate Hero & Header
    const formattedTitle = p.title.startsWith('Кухня') ? p.title : `Кухня ${p.title}`;
    if (pageTitle) pageTitle.textContent = `${formattedTitle} — Фабрика «Пластик Кухни»`;
    if (breadcrumbTitle) breadcrumbTitle.textContent = formattedTitle;
    if (productTitle) productTitle.textContent = formattedTitle;

    // Badges
    if (productBadgeCategory) {
      productBadgeCategory.textContent = p.category || (p.shapes && p.shapes[0]) || 'Кухня на заказ';
    }
    if (p.old_price && productBadgeDiscount && productOldPrice) {
      productBadgeDiscount.classList.remove('hidden');
      productOldPrice.textContent = p.old_price;
      productOldPrice.classList.remove('hidden');
    }

    // Main Image
    const mainImgSrc = p.gallery?.[0] || p.local_img || p.img;
    if (productMainImg) {
      productMainImg.src = mainImgSrc;
      productMainImg.alt = formattedTitle;
    }

    // Build Gallery Thumbnails from AUTHENTIC GALLERY PHOTOS ONLY
    const galleryTotalCount = document.getElementById('gallery-total-count');
    const toggleGalleryGridBtn = document.getElementById('toggle-gallery-grid-btn');
    const galleryToggleLabel = document.getElementById('gallery-toggle-label');
    const productThumbnailsGrid = document.getElementById('product-thumbnails-grid');

    // Lightbox elements
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    // Scraped gallery photos for THIS exact kitchen
    let galleryList = Array.isArray(p.gallery) && p.gallery.length > 0 ? p.gallery : [mainImgSrc];
    galleryList = [...new Set(galleryList)];
    let currentPhotoIdx = 0;

    if (galleryTotalCount) galleryTotalCount.textContent = galleryList.length;
    if (galleryToggleLabel) galleryToggleLabel.textContent = `Показать сеткой (${galleryList.length})`;

    let photoRequest = 0;
    async function setActiveThumbnail(idx) {
      currentPhotoIdx = idx;
      const targetSrc = galleryList[idx] || mainImgSrc;

      const request = ++photoRequest;
      const preview = new Image();
      preview.src = targetSrc;
      try { await preview.decode(); } catch { return; }
      if (request !== photoRequest) return;
      if (productMainImg) {
        productMainImg.src = targetSrc;
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          productMainImg.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
        }
      }

      // Update strip buttons
      if (productThumbnails) {
        productThumbnails.querySelectorAll('button').forEach((b, i) => {
          b.setAttribute('aria-pressed', String(i === idx));
          if (i === idx) {
            b.className = 'w-20 h-16 rounded-xl overflow-hidden border-2 border-luxury-gold ring-2 ring-luxury-gold/40 transition shrink-0';
          } else {
            b.className = 'w-20 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100 transition shrink-0';
          }
        });
      }

      // Update grid buttons
      if (productThumbnailsGrid) {
        productThumbnailsGrid.querySelectorAll('button').forEach((b, i) => {
          b.setAttribute('aria-pressed', String(i === idx));
          if (i === idx) {
            b.className = 'aspect-[4/3] rounded-xl overflow-hidden border-2 border-luxury-gold ring-2 ring-luxury-gold/40 transition';
          } else {
            b.className = 'aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 opacity-75 hover:opacity-100 hover:scale-[1.02] transition';
          }
        });
      }
    }

    // 1. Populate Horizontal Strip
    if (productThumbnails) {
      productThumbnails.innerHTML = '';
      galleryList.forEach((imgSrc, idx) => {
        const thumbBtn = document.createElement('button');
        thumbBtn.type = 'button';
        thumbBtn.className = `w-20 h-16 rounded-xl overflow-hidden border transition shrink-0 ${
          idx === 0 ? 'border-2 border-luxury-gold ring-2 ring-luxury-gold/40' : 'border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100'
        }`;
        thumbBtn.setAttribute('aria-label', `Фото ${idx + 1}: ${formattedTitle}`);
        thumbBtn.setAttribute('aria-pressed', String(idx === 0));
        thumbBtn.innerHTML = `<img src="${escapeHtml(imgSrc)}" class="w-full h-full object-cover" loading="lazy" alt="${escapeHtml(formattedTitle)} фото ${idx + 1}">`;
        thumbBtn.addEventListener('click', () => setActiveThumbnail(idx));
        productThumbnails.appendChild(thumbBtn);
      });
    }

    // 2. Populate 6-Column Grid (Matching user screenshot media_1791282016266.png)
    if (productThumbnailsGrid) {
      productThumbnailsGrid.innerHTML = '';
      galleryList.forEach((imgSrc, idx) => {
        const gridBtn = document.createElement('button');
        gridBtn.type = 'button';
        gridBtn.className = `aspect-[4/3] rounded-xl overflow-hidden border transition ${
          idx === 0 ? 'border-2 border-luxury-gold ring-2 ring-luxury-gold/40' : 'border-gray-200 dark:border-white/10 opacity-75 hover:opacity-100 hover:scale-[1.02]'
        }`;
        gridBtn.setAttribute('aria-label', `Фото ${idx + 1}: ${formattedTitle}`);
        gridBtn.setAttribute('aria-pressed', String(idx === 0));
        gridBtn.innerHTML = `<img src="${escapeHtml(imgSrc)}" class="w-full h-full object-cover" loading="lazy" alt="${escapeHtml(formattedTitle)} фото ${idx + 1}">`;
        gridBtn.addEventListener('click', () => setActiveThumbnail(idx));
        productThumbnailsGrid.appendChild(gridBtn);
      });
    }

    // 3. Grid View Toggle Button
    if (toggleGalleryGridBtn && productThumbnailsGrid) {
      let isGridOpen = false;
      toggleGalleryGridBtn.addEventListener('click', () => {
        isGridOpen = !isGridOpen;
        toggleGalleryGridBtn.setAttribute('aria-expanded', String(isGridOpen));
        if (isGridOpen) {
          productThumbnailsGrid.classList.remove('hidden');
          if (productThumbnails) productThumbnails.classList.add('hidden');
          galleryToggleLabel.textContent = 'Свернуть в ленту';
        } else {
          productThumbnailsGrid.classList.add('hidden');
          if (productThumbnails) productThumbnails.classList.remove('hidden');
          galleryToggleLabel.textContent = `Показать сеткой (${galleryList.length})`;
        }
      });
    }

    // 4. Lightbox Modal Integration
    function openLightbox(idx) {
      if (!lightboxModal || !lightboxImg) return;
      currentPhotoIdx = idx;
      lightboxImg.src = galleryList[idx] || mainImgSrc;
      if (lightboxCounter) lightboxCounter.textContent = `Кадр ${idx + 1} из ${galleryList.length}`;
      showDialog(lightboxModal);
    }

    function closeLightbox() {
      if (!lightboxModal) return;
      hideDialog(lightboxModal);
    }

    function prevLightbox() {
      currentPhotoIdx = (currentPhotoIdx - 1 + galleryList.length) % galleryList.length;
      openLightbox(currentPhotoIdx);
      setActiveThumbnail(currentPhotoIdx);
    }

    function nextLightbox() {
      currentPhotoIdx = (currentPhotoIdx + 1) % galleryList.length;
      openLightbox(currentPhotoIdx);
      setActiveThumbnail(currentPhotoIdx);
    }

    if (productMainImg) {
      productMainImg.classList.add('cursor-zoom-in');
      document.getElementById('product-photo-open')?.addEventListener('click', () => openLightbox(currentPhotoIdx));
    }
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', prevLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', nextLightbox);
    if (lightboxModal) {
      lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeLightbox();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (!lightboxModal || lightboxModal.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') prevLightbox();
      else if (e.key === 'ArrowRight') nextLightbox();
    });

    // Only source specifications describe the photographed project.
    const specsData = p.detailed_specs && typeof p.detailed_specs === 'object' ? p.detailed_specs : {};
    const specValue = (key) => specsData[key]?.value || 'Не указано';
    if (productMeterPrice) productMeterPrice.textContent = specValue('Цена за погонный метр');
    if (specMeterPrice) specMeterPrice.textContent = specValue('Цена за погонный метр');
    if (specLength) specLength.textContent = specValue('Общая длина');
    if (specShape) specShape.textContent = specValue('Форма');
    if (specFacade) specFacade.textContent = specValue('Фасад');
    const specDepth = document.getElementById('spec-depth');
    const specHeight = document.getElementById('spec-height');
    if (specDepth) specDepth.textContent = `${specValue('Глубина нижних секций по фасаду')} / ${specValue('Глубина верхних секций по фасаду')}`;
    if (specHeight) specHeight.textContent = specValue('Высота кухни по столешнице');

    function renderOptions(container, kind, names, onSelect) {
      if (!container) return;
      container.replaceChildren();
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', { facade: 'Материал фасада', hardware: 'Направляющие', gift: 'Подарок' }[kind]);
      if (!Array.isArray(names) || !names.length) {
        const empty = document.createElement('p');
        empty.className = 'option-empty';
        empty.textContent = 'Варианты уточняются при расчёте проекта';
        container.appendChild(empty);
        onSelect('');
        return;
      }
      names.forEach((name, idx) => {
        const option = p.option_prices?.[kind]?.find((item) => item.name === name);
        const delta = Number(option?.delta) || 0;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `project-option${idx === 0 ? ' active' : ''}`;
        btn.setAttribute('aria-pressed', String(idx === 0));
        btn.textContent = name;
        const select = () => {
          container.querySelectorAll('button').forEach((button) => {
            const active = button === btn;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
          });
          optionDeltas[kind] = delta;
          currentDelta = Object.values(optionDeltas).reduce((sum, value) => sum + value, 0);
          onSelect(name);
          updateCalculatedPrice();
        };
        btn.addEventListener('click', select);
        container.appendChild(btn);
        if (idx === 0) select();
      });
    }
    renderOptions(facadeOptionsContainer, 'facade', p.facade_options, (name) => { selectedFacadeName = name; renderOrderInfo(); });
    renderOptions(hardwareOptionsContainer, 'hardware', p.hardware_options, (name) => { selectedHwName = name; renderOrderInfo(); });
    renderOptions(giftOptionsContainer, 'gift', p.gift_options, (name) => { selectedGiftName = name; renderOrderInfo(); });

    const benefits = document.getElementById('product-benefits');
    if (benefits) {
      benefits.replaceChildren();
      (Array.isArray(p.benefits) ? p.benefits : []).forEach((benefit) => {
        const badge = document.createElement('span');
        badge.className = 'project-benefit';
        badge.textContent = benefit.label;
        badge.title = benefit.description;
        benefits.appendChild(badge);
      });
    }
    function renderOrderInfo() {
      const orderInfo = document.getElementById('pane-order-info');
      if (!orderInfo) return;
      orderInfo.replaceChildren();
      const header = document.createElement('div');
      header.className = 'project-order-header';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'project-eyebrow';
      eyebrow.textContent = 'Ваш проект';
      const title = document.createElement('h3');
      title.textContent = `Заказ: ${formattedTitle}`;
      const intro = document.createElement('p');
      intro.textContent = 'Параметры кухни на фотографиях и выбранная вами комплектация. Размеры будущего гарнитура согласуем после замера.';
      header.append(eyebrow, title, intro);
      const summary = document.createElement('dl');
      summary.className = 'project-order-summary';
      const fields = [
        ['Размер проекта', specValue('Размер')],
        ['Общая длина', specValue('Общая длина')],
        ['Форма кухни', specValue('Форма')],
        ['Высота гарнитура', specValue('Общая высота кухонного гарнитура')],
        ['Цвет на фотографиях', specValue('Цвет')],
        ['Фасады на фотографиях', specValue('Фасад')],
        ['Выбранный материал', selectedFacadeName || 'Уточняется при расчёте'],
        ['Выбранные направляющие', selectedHwName || 'Уточняются при расчёте'],
        ['Выбранный подарок', selectedGiftName || 'Уточняется при расчёте'],
        ['Стоимость с выбранными опциями', basePriceNum ? Math.max(0, basePriceNum + currentDelta).toLocaleString('ru-RU') + ' ₽' : 'По запросу']
      ];
      fields.forEach(([label, text]) => {
        const row = document.createElement('div');
        const key = document.createElement('dt');
        const value = document.createElement('dd');
        key.textContent = label;
        value.textContent = text;
        row.append(key, value);
        summary.appendChild(row);
      });
      orderInfo.append(header, summary);
      if (Array.isArray(p.order_info) && p.order_info.length) {
        const common = document.createElement('details');
        common.className = 'project-common-terms';
        const label = document.createElement('summary');
        label.textContent = 'Общие условия фабрики — для всех моделей';
        common.appendChild(label);
        p.order_info.forEach((text) => {
          const paragraph = document.createElement('p');
          paragraph.textContent = text;
          common.appendChild(paragraph);
        });
        orderInfo.appendChild(common);
      }
    }
    renderOrderInfo();

    // 5. Authentic YouTube Video Review for THIS Model
    const tabVideoTitle = document.getElementById('tab-video-title');
    if (tabVideoTitle) {
      const cleanTitle = formattedTitle.replace(/^Кухня\s+/i, '');
      tabVideoTitle.textContent = `Видеообзор модели ${cleanTitle}`;
    }

    const videoSection = document.getElementById('product-video-section');
    if (videoSection) videoSection.hidden = !p.video;
    if (productVideoIframe && p.video) {
      const play = document.getElementById('product-video-play');
      if (play) play.addEventListener('click', () => {
        const videoUrl = new URL(p.video);
        videoUrl.searchParams.set('autoplay', '1');
        productVideoIframe.src = videoUrl.href;
        productVideoIframe.hidden = false;
        play.hidden = true;
      }, { once: true });
    }

    // 6. Authentic Description Paragraphs
    if (p.description && Array.isArray(p.description) && p.description.length > 0) {
      if (productShortDesc) productShortDesc.textContent = p.description[0];
      if (productFullDesc) {
        productFullDesc.innerHTML = '';
        p.description.forEach(para => {
          const pEl = document.createElement('p');
          pEl.className = 'leading-relaxed text-gray-700 dark:text-gray-300';
          pEl.textContent = para;
          productFullDesc.appendChild(pEl);
        });
      }
    }

    // Render the actual source keys. Missing dimensions are never manufactured.
    const specsTableContainer = document.getElementById('specs-table-container');
    if (specsTableContainer) {
      specsTableContainer.replaceChildren();
      Object.entries(specsData).forEach(([key, spec]) => {
        if (!spec?.value) return;
        const row = document.createElement('div');
        row.className = 'project-spec-row';
        row.dataset.specKey = key;
        const label = document.createElement('div');
        label.className = 'project-spec-label';
        const name = document.createElement('span');
        name.textContent = key;
        label.appendChild(name);
        if (spec.tip) {
          const hint = document.createElement('details');
          hint.className = 'project-spec-hint';
          const summary = document.createElement('summary');
          summary.textContent = '?';
          summary.setAttribute('aria-label', `Пояснение: ${key}`);
          const text = document.createElement('p');
          text.textContent = spec.tip;
          hint.append(summary, text);
          label.appendChild(hint);
        }
        const value = document.createElement('strong');
        value.textContent = spec.value;
        row.append(label, value);
        specsTableContainer.appendChild(row);
      });
      if (!Object.keys(specsData).length) specsTableContainer.textContent = 'Характеристики этой модели уточняются при расчёте.';
    }

    // 8. Load Reviews for Tab 3
    await loadReviews();

    // Update Initial Price with formatted thousands
    updateCalculatedPrice();

    // Link calculator with params
    const calcLink = document.getElementById('btn-calc-direct-link');
    if (calcLink) {
      calcLink.href = `../calculator/index.html?model=${encodeURIComponent(formattedTitle)}&facade=${encodeURIComponent(selectedFacadeName)}&price=${encodeURIComponent(p.price)}`;
    }

  } catch (err) {
    console.error('Error loading product details:', err);
    if (productTitle) productTitle.textContent = 'Проект не найден';
    document.getElementById('product-error').hidden = false;
    document.getElementById('product-hero').hidden = true;
    document.getElementById('product-information').hidden = true;
    if (btnQuickOrderTrigger) btnQuickOrderTrigger.disabled = true;
  }

  // Reactive price recalculation
  function updateCalculatedPrice() {
    const finalPrice = Math.max(0, basePriceNum + currentDelta);
    const formattedStr = basePriceNum ? finalPrice.toLocaleString('ru-RU') + ' ₽' : 'По запросу';
    if (productPrice) productPrice.textContent = formattedStr;
    if (modalSummaryPrice) modalSummaryPrice.textContent = formattedStr;
  }

  // 7. Quick Order Modal Management
  function openQuickModal() {
    if (!quickOrderModal) return;
    if (modalKitchenTitle) modalKitchenTitle.textContent = currentProduct?.title || 'Кухня на заказ';
    if (modalSummaryTitle) modalSummaryTitle.textContent = currentProduct?.title || 'Кухня на заказ';
    if (modalSummaryFacade) modalSummaryFacade.textContent = selectedFacadeName;
    if (modalSummaryGift) modalSummaryGift.textContent = selectedGiftName;
    updateCalculatedPrice();

    showDialog(quickOrderModal);
  }

  function closeQuickModal() {
    if (!quickOrderModal) return;
    hideDialog(quickOrderModal);
    if (modalFormFeedback) modalFormFeedback.classList.add('hidden');
  }

  if (btnQuickOrderTrigger) btnQuickOrderTrigger.addEventListener('click', openQuickModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeQuickModal);
  if (quickOrderModal) {
    quickOrderModal.addEventListener('click', (e) => {
      if (e.target === quickOrderModal) closeQuickModal();
    });
  }

  // Handle Quick Order Submission to /api/leads
  if (productQuickForm) {
    productQuickForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('modal-lead-name')?.value || 'Клиент';
      const phoneVal = document.getElementById('modal-lead-phone')?.value || '';

      if (modalSubmitBtn) {
        modalSubmitBtn.disabled = true;
        modalSubmitBtn.innerHTML = '<span>Отправка заказа на фабрику...</span>';
      }

      const finalPrice = Math.max(0, basePriceNum + currentDelta);

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            phone: phoneVal,
            kitchen_title: currentProduct?.title || 'Кухня на заказ',
            kitchen_id: currentProduct?.id || productId,
            facade_type: selectedFacadeName,
            hardware: selectedHwName,
            gift: selectedGiftName,
            total_price: finalPrice.toLocaleString('ru-RU') + ' руб.',
            source: 'product_page_quick_order'
          })
        });

        if (res.ok) {
          if (modalFormFeedback) {
            modalFormFeedback.textContent = '✓ Заказ успешно передан на фабрику! Технолог свяжется с вами для уточнения проекта.';
            modalFormFeedback.className = 'text-xs font-bold py-2 text-emerald-600 block text-center';
            modalFormFeedback.classList.remove('hidden');
          }
          setTimeout(() => {
            closeQuickModal();
            productQuickForm.reset();
            if (modalSubmitBtn) {
              modalSubmitBtn.disabled = false;
              modalSubmitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Получить расчёт</span>';
              if (window.lucide) window.lucide.createIcons();
            }
          }, 2000);
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        console.error('Lead submission failed:', err);
        if (modalFormFeedback) {
          modalFormFeedback.textContent = 'Ошибка отправки. Позвоните на фабрику: +7 (800) 201-09-32';
          modalFormFeedback.className = 'text-xs font-bold py-2 text-rose-500 block text-center';
          modalFormFeedback.classList.remove('hidden');
        }
        if (modalSubmitBtn) {
          modalSubmitBtn.disabled = false;
          modalSubmitBtn.innerHTML = '<span>Попробовать снова</span>';
        }
      }
    });
  }

  // 8. Handle Bottom CTA Lead Form (/api/leads)
  if (ctaLeadForm) {
    ctaLeadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('cta-name')?.value || 'Клиент';
      const phoneVal = document.getElementById('cta-phone')?.value || '';

      if (ctaSubmitBtn) {
        ctaSubmitBtn.disabled = true;
        ctaSubmitBtn.innerHTML = '<span>Запись на замер...</span>';
      }

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameVal,
            phone: phoneVal,
            kitchen_title: `Замер: ${currentProduct?.title || 'Кухня на заказ'}`,
            kitchen_id: currentProduct?.id || productId,
            facade_type: selectedFacadeName,
            hardware: selectedHwName,
            gift: selectedGiftName,
            total_price: (basePriceNum + currentDelta).toLocaleString('ru-RU') + ' руб.',
            source: 'product_bottom_cta'
          })
        });

        if (res.ok) {
          if (ctaFormFeedback) {
            ctaFormFeedback.textContent = '✓ Заявка принята! Замерщик со всеми образцами свяжется с вами для согласования удобного времени.';
            ctaFormFeedback.className = 'text-xs font-bold py-2 text-emerald-400 block text-center';
            ctaFormFeedback.classList.remove('hidden');
          }
          ctaLeadForm.reset();
          if (ctaSubmitBtn) {
            ctaSubmitBtn.disabled = false;
            ctaSubmitBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i><span>Заявка отправлена</span>';
            if (window.lucide) window.lucide.createIcons();
          }
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        console.error('CTA lead submission failed:', err);
        if (ctaFormFeedback) {
          ctaFormFeedback.textContent = 'Ошибка отправки. Пожалуйста, позвоните нам: +7 (800) 201-09-32';
          ctaFormFeedback.className = 'text-xs font-bold py-2 text-rose-400 block text-center';
          ctaFormFeedback.classList.remove('hidden');
        }
        if (ctaSubmitBtn) {
          ctaSubmitBtn.disabled = false;
          ctaSubmitBtn.innerHTML = '<span>Попробовать снова</span>';
        }
      }
    });
  }

  // 9. Render Authentic Factory FAQ (Accordion with Dope Motions curve)
  try {
    const faqRes = await fetch('../data/faq.json');
    if (faqRes.ok && faqContainer) {
      const faqList = await faqRes.json();
      faqContainer.innerHTML = '';

      faqList.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'border border-luxury-subtle rounded-2xl overflow-hidden glass-panel';
        itemEl.innerHTML = `
          <button 
            type="button" 
            class="faq-header w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-gray-900 dark:text-white text-xs sm:text-sm hover:text-luxury-gold transition gap-4"
            aria-expanded="false"
          >
            <span class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-luxury-gold/15 text-luxury-gold text-xs font-bold flex items-center justify-center shrink-0">
                ${index + 1}
              </span>
              <span>${item.q}</span>
            </span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-luxury-gold shrink-0 transition-transform duration-300"></i>
          </button>
          <div hidden class="faq-content bg-black/[0.02] dark:bg-white/[0.02]">
            <div class="px-6 pb-5 pt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed border-t border-luxury-subtle">
              ${item.a}
            </div>
          </div>
        `;

        const headerBtn = itemEl.querySelector('.faq-header');
        const contentDiv = itemEl.querySelector('.faq-content');
        contentDiv.id = `project-faq-${index}`;
        headerBtn.setAttribute('aria-controls', contentDiv.id);
        headerBtn.addEventListener('click', () => {
          const isOpen = headerBtn.getAttribute('aria-expanded') === 'true';
          faqContainer.querySelectorAll('.faq-header').forEach(button => {
            button.setAttribute('aria-expanded', 'false');
            button.nextElementSibling.hidden = true;
          });
          if (!isOpen) {
            headerBtn.setAttribute('aria-expanded', 'true');
            contentDiv.hidden = false;
            if (!matchMedia('(prefers-reduced-motion: reduce)').matches) contentDiv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
          }
        });

        faqContainer.appendChild(itemEl);
      });
    }
  } catch (err) {
    console.error('Error loading FAQ:', err);
  }

  // 10. Render Similar / Related Kitchens
  try {
    let allProducts = [];
    try {
      const res = await fetch('/api/products');
      if (res.ok) allProducts = await res.json();
    } catch (e) {
      const res = await fetch('../data/products.json');
      allProducts = await res.json();
    }

    if (similarGrid && allProducts.length > 0) {
      similarGrid.innerHTML = '';
      const similar = allProducts
        .filter(p => p.id !== productId)
        .sort((a, b) => {
          const score = (item) => Number(item.facade === currentProduct?.facade) * 2 + Number(item.shapes?.[0] === currentProduct?.shapes?.[0]);
          return score(b) - score(a);
        })
        .slice(0, 4);

      similar.forEach(sim => {
        const imgSrc = sim.local_img || sim.img;
        const card = document.createElement('div');
        card.className = 'glass-panel rounded-3xl overflow-hidden border border-luxury-subtle group hover-lift flex flex-col justify-between';
        card.innerHTML = `
          <div>
            <a href="index.html?id=${sim.id}" class="block relative aspect-[4/3] overflow-hidden bg-luxury-dark">
              <img 
                src="${imgSrc}" 
                alt="${sim.title}" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                onerror="this.src='${sim.img}'"
              >
              <div class="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-luxury-black/75 backdrop-blur-md text-[10px] font-semibold text-luxury-gold uppercase tracking-wider">
                ${sim.category || 'Кухня на заказ'}
              </div>
            </a>
            <div class="p-5">
              <a href="index.html?id=${sim.id}" class="block font-display font-bold text-base text-gray-900 dark:text-white hover:text-luxury-gold transition mb-2">
                ${sim.title}
              </a>
              <div class="text-[11px] text-gray-500 dark:text-gray-400 space-y-1 mb-3 pb-3 border-b border-dashed border-gray-200 dark:border-white/10">
                <div class="flex justify-between"><span>Длина:</span> <strong class="text-gray-700 dark:text-gray-300">${sim.length || 'Не указано'}</strong></div>
                <div class="flex justify-between"><span>Фасад:</span> <strong class="text-luxury-gold">${sim.facade || 'Не указано'}</strong></div>
              </div>
              <div class="flex items-baseline justify-between">
                <span class="text-[10px] text-gray-400 uppercase">Стоимость:</span>
                <span class="text-lg font-extrabold text-luxury-gold">${sim.price}</span>
              </div>
            </div>
          </div>
          <div class="px-5 pb-5 pt-1">
            <a href="index.html?id=${sim.id}" class="w-full py-2.5 px-3 rounded-xl bg-luxury-gold hover:bg-luxury-gold-hover text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm text-center">
              <span>Смотреть проект</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
          </div>
        `;
        similarGrid.appendChild(card);
      });
    }
  } catch (err) {
    console.error('Error rendering similar products:', err);
  }

  // --- 12. Reviews Management & Submission ---
  async function loadReviews() {
    const reviewsCountBadge = document.getElementById('reviews-count-badge');
    const reviewsEmptyState = document.getElementById('reviews-empty-state');
    const reviewsItemsWrapper = document.getElementById('reviews-items-wrapper');

    let reviewsList = Array.isArray(currentProduct?.source_reviews) ? [...currentProduct.source_reviews] : [];
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`);
      if (res.ok) {
        reviewsList.push(...await res.json());
      }
    } catch (e) {
      console.warn('Reviews fetch failed:', e);
    }

    if (reviewsCountBadge) {
      reviewsCountBadge.textContent = reviewsList.length;
    }

    if (reviewsList.length === 0) {
      if (reviewsEmptyState) reviewsEmptyState.classList.remove('hidden');
      if (reviewsItemsWrapper) reviewsItemsWrapper.classList.add('hidden');
    } else {
      if (reviewsEmptyState) reviewsEmptyState.classList.add('hidden');
      if (reviewsItemsWrapper) {
        reviewsItemsWrapper.classList.remove('hidden');
        reviewsItemsWrapper.innerHTML = '';

        reviewsList.forEach(rev => {
          const starsHtml = '★'.repeat(Math.max(0, Math.min(5, rev.rating || 0))) + '☆'.repeat(5 - Math.max(0, Math.min(5, rev.rating || 0)));
          const dateStr = rev.source_url ? 'Отзыв с сайта фабрики' : rev.created_at ? new Date(rev.created_at).toLocaleDateString('ru-RU') : '';

          const card = document.createElement('div');
          card.className = 'p-5 sm:p-6 rounded-2xl glass-panel border border-luxury-subtle space-y-3';
          card.innerHTML = `
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-luxury-gold/20 text-luxury-gold font-bold flex items-center justify-center text-sm">
                  ${escapeHtml((rev.author || 'К')[0].toUpperCase())}
                </div>
                <div>
                  <strong class="text-sm font-bold text-gray-900 dark:text-white block">${escapeHtml(rev.author)}</strong>
                  <span class="text-[10px] text-gray-400">${dateStr}</span>
                </div>
              </div>
              <div class="text-amber-400 text-sm tracking-widest">${starsHtml}</div>
            </div>

            ${rev.pros ? `
              <div class="text-xs text-emerald-600 dark:text-emerald-400">
                <strong>Достоинства:</strong> ${escapeHtml(rev.pros)}
              </div>
            ` : ''}

            ${rev.cons ? `
              <div class="text-xs text-rose-500">
                <strong>Недостатки:</strong> ${escapeHtml(rev.cons)}
              </div>
            ` : ''}

            <div class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-2 border-t border-gray-100 dark:border-white/5">
              ${escapeHtml(rev.comment)}
            </div>
          `;
          reviewsItemsWrapper.appendChild(card);
        });
      }
    }
  }

  // Review Modal Logic
  const reviewModal = document.getElementById('review-modal');
  const btnOpenReviewModal = document.getElementById('btn-open-review-modal');
  const reviewModalClose = document.getElementById('review-modal-close');
  const reviewModalKitchenTitle = document.getElementById('review-modal-kitchen-title');
  const productReviewForm = document.getElementById('product-review-form');
  const reviewFormFeedback = document.getElementById('review-form-feedback');
  const reviewSubmitBtn = document.getElementById('review-submit-btn');
  const reviewRatingStars = document.getElementById('review-rating-stars');
  const reviewInputRating = document.getElementById('review-input-rating');

  if (reviewRatingStars) {
    const stars = reviewRatingStars.querySelectorAll('.star-btn');
    stars.forEach((star, idx) => {
      star.addEventListener('click', () => {
        const val = idx + 1;
        if (reviewInputRating) reviewInputRating.value = val;
        stars.forEach((s, i) => {
          s.textContent = i < val ? '★' : '☆';
          s.className = `star-btn text-2xl cursor-pointer hover:scale-110 transition ${i < val ? 'text-luxury-gold' : 'text-gray-400'}`;
        });
      });
    });
  }

  function openReviewModal() {
    if (!reviewModal) return;
    if (reviewModalKitchenTitle) reviewModalKitchenTitle.textContent = currentProduct?.title || 'Кухня';
    showDialog(reviewModal);
  }

  function closeReviewModal() {
    if (!reviewModal) return;
    hideDialog(reviewModal);
    if (reviewFormFeedback) reviewFormFeedback.classList.add('hidden');
  }

  if (btnOpenReviewModal) btnOpenReviewModal.addEventListener('click', openReviewModal);
  if (reviewModalClose) reviewModalClose.addEventListener('click', closeReviewModal);
  if (reviewModal) {
    reviewModal.addEventListener('click', (e) => {
      if (e.target === reviewModal) closeReviewModal();
    });
  }

  if (productReviewForm) {
    productReviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = document.getElementById('review-input-author')?.value || '';
      const rating = parseInt(reviewInputRating?.value || '5', 10);
      const pros = document.getElementById('review-input-pros')?.value || '';
      const cons = document.getElementById('review-input-cons')?.value || '';
      const comment = document.getElementById('review-input-comment')?.value || '';

      if (reviewSubmitBtn) {
        reviewSubmitBtn.disabled = true;
        reviewSubmitBtn.innerHTML = '<span>Отправка отзыва...</span>';
      }

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            author,
            rating,
            pros,
            cons,
            comment
          })
        });

        if (res.ok) {
          if (reviewFormFeedback) {
            reviewFormFeedback.textContent = '✓ Отзыв успешно опубликован! Спасибо за ваше мнение.';
            reviewFormFeedback.className = 'text-xs font-bold py-2 text-emerald-600 block text-center';
            reviewFormFeedback.classList.remove('hidden');
          }
          await loadReviews();
          setTimeout(() => {
            closeReviewModal();
            productReviewForm.reset();
            if (reviewSubmitBtn) {
              reviewSubmitBtn.disabled = false;
              reviewSubmitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Опубликовать отзыв</span>';
              if (window.lucide) window.lucide.createIcons();
            }
          }, 1800);
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        console.error('Review submit failed:', err);
        if (reviewFormFeedback) {
          reviewFormFeedback.textContent = 'Ошибка отправки отзыва. Пожалуйста, попробуйте позже.';
          reviewFormFeedback.className = 'text-xs font-bold py-2 text-rose-500 block text-center';
          reviewFormFeedback.classList.remove('hidden');
        }
        if (reviewSubmitBtn) {
          reviewSubmitBtn.disabled = false;
          reviewSubmitBtn.innerHTML = '<span>Попробовать снова</span>';
        }
      }
    });
  }

  document.body.dataset.productReady = 'true';

  // Refresh Lucide icons across dynamically rendered elements
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
