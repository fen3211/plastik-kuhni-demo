// Complete Luxury Catalog script with OCFilter Sidebar, Mobile Drawer, and Quick Order Modal
// Dope Motions Snappy Easing: cubic-bezier(0.16, 1, 0.3, 1)

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('catalog-grid');
  const countBadge = document.getElementById('catalog-count');
  const sidebarCountBadge = document.getElementById('sidebar-count-badge');
  const drawerCountBadge = document.getElementById('drawer-count-badge');
  const mobileActiveBadge = document.getElementById('mobile-active-badge');
  const searchInput = document.getElementById('catalog-search');
  const sortSelect = document.getElementById('catalog-sort');
  const paginationContainer = document.getElementById('catalog-pagination');
  const activeFiltersContainer = document.getElementById('active-filters-container');
  const activeFiltersChips = document.getElementById('active-filters-chips');
  const resetAllBtn = document.getElementById('reset-all-filters-btn');
  const sidebarClearBtn = document.querySelector('.sidebar-clear-btn');

  // Mobile Drawer elements
  const mobileFilterOpenBtn = document.getElementById('mobile-filter-open');
  const filterDrawerModal = document.getElementById('filter-drawer-modal');
  const filterDrawerBackdrop = document.getElementById('filter-drawer-backdrop');
  const filterDrawerPanel = document.getElementById('filter-drawer-panel');
  const filterDrawerCloseBtn = document.getElementById('filter-drawer-close');
  const drawerFilterContent = document.getElementById('drawer-filter-content');
  const drawerResetBtn = document.getElementById('drawer-reset-btn');
  const drawerApplyBtn = document.getElementById('drawer-apply-btn');

  // Modal Quick Order elements
  const modal = document.getElementById('quick-order-modal');
  const modalContainer = document.getElementById('modal-container');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalImage = document.getElementById('modal-image');
  const modalPrice = document.getElementById('modal-price');

  if (!grid) return;

  try {
    const res = await fetch('../data/products.json');
    const allProducts = await res.json();

    // Filter states
    const selectedFacades = new Set();
    const selectedShapes = new Set();
    const selectedStyles = new Set();
    const selectedColors = new Set();
    let minMeterPrice = null;
    let maxMeterPrice = null;
    let minLength = null;
    let maxLength = null;
    let searchQuery = new URLSearchParams(location.search).get('q') || '';
    if (searchInput) searchInput.value = searchQuery;
    let sortMode = 'default';
    let currentPage = 1;
    const itemsPerPage = 24;

    // --- ACCORDION FUNCTIONALITY ---
    function initAccordions(container) {
      container.querySelectorAll('.accordion-trigger').forEach(btn => {
        const targetId = btn.getAttribute('data-target');
        const panel = container.querySelector('#' + targetId) || document.getElementById(targetId);
        if (!panel) return;
        if (container.id === 'drawer-filter-content') {
          panel.id = `drawer-${targetId}`;
          btn.setAttribute('data-target', panel.id);
        }
        panel.hidden = btn.classList.contains('collapsed');
        btn.setAttribute('aria-controls', panel.id);
        btn.setAttribute('aria-expanded', String(!panel.hidden));
        btn.addEventListener('click', () => {
          panel.hidden = !panel.hidden;
          btn.classList.toggle('collapsed', panel.hidden);
          panel.classList.toggle('collapsed', panel.hidden);
          btn.setAttribute('aria-expanded', String(!panel.hidden));
        });
      });
    }

    initAccordions(document.getElementById('catalog-sidebar'));

    // --- POPULATE MOBILE DRAWER ---
    if (drawerFilterContent) {
      const sidebarContent = document.querySelector('#catalog-sidebar .space-y-6');
      if (sidebarContent) {
        drawerFilterContent.innerHTML = sidebarContent.innerHTML;
        drawerFilterContent.querySelectorAll('input[id]').forEach(input => {
          input.dataset.range = input.id;
          input.id = `drawer-${input.id}`;
        });
        initAccordions(drawerFilterContent);
      }
    }

    // --- MODAL FUNCTIONS ---
    let currentModalProduct = null;
    let currentModalTotal = 0;
    let modalOpener = null;
    modal?.setAttribute('role', 'dialog');
    modal?.setAttribute('aria-modal', 'true');
    modal?.setAttribute('aria-labelledby', 'modal-title');
    modalCloseBtn?.setAttribute('aria-label', 'Закрыть быстрый заказ');

    function openModal(p) {
      if (!modal) return;
      modalOpener = document.activeElement;
      currentModalProduct = p;
      modalTitle.textContent = p.title;
      modalImage.src = p.local_img || p.img;
      modalImage.alt = p.title;
      const deltas = { facade: 0, hardware: 0, gift: 0 };
      const updatePrice = () => {
        currentModalTotal = Math.max(0, (Number(p.price_num) || 0) + Object.values(deltas).reduce((sum, value) => sum + value, 0));
        modalPrice.textContent = currentModalTotal ? currentModalTotal.toLocaleString('ru-RU') + ' ₽' : 'По запросу';
      };
      for (const [kind, containerId, names] of [
        ['facade', 'modal-facade-options', p.facade_options],
        ['hardware', 'modal-hw-options', p.hardware_options],
        ['gift', 'modal-gift-options', p.gift_options]
      ]) {
        const container = document.getElementById(containerId);
        if (!container) continue;
        container.replaceChildren();
        if (!Array.isArray(names) || !names.length) {
          container.textContent = 'Уточняется при расчёте';
          continue;
        }
        names.forEach((name, idx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = name;
          btn.className = kind === 'gift' ? 'opt-gift-chip' : 'opt-chip';
          btn.classList.add('px-3', 'py-2', 'rounded-lg', 'border', 'text-xs');
          const delta = Number(p.option_prices?.[kind]?.find(option => option.name === name)?.delta) || 0;
          const select = () => {
            container.querySelectorAll('button').forEach(button => {
              button.classList.toggle('active', button === btn);
              button.setAttribute('aria-pressed', String(button === btn));
            });
            deltas[kind] = delta;
            updatePrice();
          };
          btn.addEventListener('click', select);
          container.appendChild(btn);
          if (idx === 0) select();
        });
      }
      updatePrice();

      const fb = document.getElementById('quick-form-feedback');
      if (fb) fb.classList.add('hidden');

      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      modal.querySelector('input')?.focus();
      setTimeout(() => {
        modalContainer.classList.remove('scale-95', 'opacity-0');
        modalContainer.classList.add('scale-100', 'opacity-100');
      }, 10);
    }

    function closeModal() {
      if (!modal || modal.classList.contains('hidden')) return;
      modalContainer.classList.remove('scale-100', 'opacity-100');
      modalContainer.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        modalOpener?.focus();
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200);
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Modal chip toggles
    document.querySelectorAll('#modal-facade-options .opt-chip, #modal-hw-options .opt-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        parent.querySelectorAll('.opt-chip').forEach(b => {
          b.classList.remove('active', 'border-luxury-gold', 'bg-luxury-gold/15');
          b.classList.add('border-gray-200', 'bg-gray-50');
        });
        btn.classList.add('active', 'border-luxury-gold', 'bg-luxury-gold/15');
        btn.classList.remove('border-gray-200', 'bg-gray-50');
      });
    });

    document.querySelectorAll('#modal-gift-options .opt-gift-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#modal-gift-options .opt-gift-chip').forEach(b => {
          b.classList.remove('active', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-700', 'font-semibold');
          b.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-600');
          b.textContent = b.textContent.replace('✓ ', '');
        });
        btn.classList.add('active', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-700', 'font-semibold');
        btn.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-600');
        if (!btn.textContent.startsWith('✓ ')) {
          btn.textContent = '✓ ' + btn.textContent;
        }
      });
    });

    // --- SUBMIT QUICK ORDER TO DATABASE ---
    const quickOrderForm = document.getElementById('quick-order-form');
    if (quickOrderForm) {
      quickOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('quick-submit-btn');
        const feedback = document.getElementById('quick-form-feedback');
        const nameVal = document.getElementById('quick-name')?.value || 'Клиент';
        const phoneVal = document.getElementById('quick-phone')?.value || '';

        const activeFacade = document.querySelector('#modal-facade-options .opt-chip.active')?.textContent.trim() || '';
        const activeHw = document.querySelector('#modal-hw-options .opt-chip.active')?.textContent.trim() || '';
        const activeGift = document.querySelector('#modal-gift-options .opt-gift-chip.active')?.textContent.replace('✓ ', '').trim() || '';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Отправка заявки...</span>';
        }

        try {
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameVal,
              phone: phoneVal,
              kitchen_title: currentModalProduct?.title || 'Кухня на заказ',
              kitchen_id: currentModalProduct?.id || null,
              facade_type: activeFacade,
              hardware: activeHw,
              gift: activeGift,
              total_price: currentModalTotal ? currentModalTotal.toLocaleString('ru-RU') + ' ₽' : '',
              source: 'quick_order'
            })
          });

          if (res.ok) {
            if (feedback) {
              feedback.textContent = '✓ Спасибо! Заказ передан на фабрику. Мы свяжемся с вами в течение 10 минут.';
              feedback.className = 'text-xs font-bold py-2 text-emerald-600 block';
            }
            setTimeout(() => {
              closeModal();
              quickOrderForm.reset();
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="shopping-cart" class="w-4 h-4"></i><span>Оформить заказ на фабрику</span>';
                if (window.lucide) window.lucide.createIcons();
              }
            }, 1800);
          } else {
            throw new Error('Server error');
          }
        } catch (err) {
          if (feedback) {
            feedback.textContent = 'Ошибка отправки. Пожалуйста, позвоните нам: +7 (800) 201-09-32';
            feedback.className = 'text-xs font-bold py-2 text-rose-500 block';
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Попробовать снова</span>';
          }
        }
      });
    }

    // --- MOBILE DRAWER OPEN/CLOSE ---
    filterDrawerModal?.setAttribute('role', 'dialog');
    filterDrawerModal?.setAttribute('aria-modal', 'true');
    filterDrawerModal?.setAttribute('aria-label', 'Фильтры каталога');
    filterDrawerCloseBtn?.setAttribute('aria-label', 'Закрыть фильтры');
    function openDrawer() {
      if (!filterDrawerModal) return;
      filterDrawerModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      filterDrawerCloseBtn?.focus();
      setTimeout(() => {
        filterDrawerBackdrop.classList.remove('opacity-0');
        filterDrawerBackdrop.classList.add('opacity-100');
        filterDrawerPanel.classList.remove('-translate-x-full');
        filterDrawerPanel.classList.add('translate-x-0');
      }, 10);
    }

    function closeDrawer() {
      if (!filterDrawerModal || filterDrawerModal.classList.contains('hidden')) return;
      filterDrawerBackdrop.classList.remove('opacity-100');
      filterDrawerBackdrop.classList.add('opacity-0');
      filterDrawerPanel.classList.remove('translate-x-0');
      filterDrawerPanel.classList.add('-translate-x-full');
      setTimeout(() => {
        filterDrawerModal.classList.add('hidden');
        document.body.style.overflow = '';
        mobileFilterOpenBtn?.focus();
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
    }

    if (mobileFilterOpenBtn) mobileFilterOpenBtn.addEventListener('click', openDrawer);
    if (filterDrawerCloseBtn) filterDrawerCloseBtn.addEventListener('click', closeDrawer);
    if (filterDrawerBackdrop) filterDrawerBackdrop.addEventListener('click', closeDrawer);
    if (drawerApplyBtn) {
      drawerApplyBtn.addEventListener('click', () => {
        closeDrawer();
        window.scrollTo({ top: 200, behavior: 'smooth' });
      });
    }

    document.addEventListener('keydown', event => {
      const dialog = [modal, filterDrawerModal].find(element => element && !element.classList.contains('hidden'));
      if (!dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); dialog === modal ? closeModal() : closeDrawer(); }
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button,input,select,a[href]')].filter(control => !control.disabled && control.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });

    // --- FILTER MATCH LOGIC ---
    function matchesProduct(p) {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = [p.title, p.specs || '', p.facade || '', p.category || '', ...(p.description || []), ...Object.values(p.detailed_specs || {}).map(item => item.value)].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Facades
      if (selectedFacades.size > 0) {
        const pF = p.facades || [];
        let hasF = false;
        for (const f of selectedFacades) {
          if (pF.includes(f)) { hasF = true; break; }
        }
        if (!hasF) return false;
      }

      // Shapes
      if (selectedShapes.size > 0) {
        const pS = p.shapes || [];
        let hasS = false;
        for (const s of selectedShapes) {
          if (pS.includes(s)) { hasS = true; break; }
        }
        if (!hasS) return false;
      }

      // Styles
      if (selectedStyles.size > 0) {
        const pSt = p.styles || [];
        let hasSt = false;
        for (const st of selectedStyles) {
          if (pSt.includes(st)) { hasSt = true; break; }
        }
        if (!hasSt) return false;
      }

      // Colors
      if (selectedColors.size > 0) {
        const pC = p.colors || [];
        let hasC = false;
        for (const c of selectedColors) {
          if (pC.includes(c)) { hasC = true; break; }
        }
        if (!hasC) return false;
      }

      // Meter price
      const mp = p.meter_price_num || 0;
      if (minMeterPrice !== null && mp > 0 && mp < minMeterPrice) return false;
      if (maxMeterPrice !== null && mp > 0 && mp > maxMeterPrice) return false;

      // Length
      const l = (p.length_num || 0) / 1000;
      if (minLength !== null && l > 0 && l < minLength) return false;
      if (maxLength !== null && l > 0 && l > maxLength) return false;

      return true;
    }

    function getFilteredList() {
      let list = allProducts.filter(matchesProduct);

      // Sort
      if (sortMode === 'price-asc') {
        list.sort((a, b) => (a.price_num || 0) - (b.price_num || 0));
      } else if (sortMode === 'price-desc') {
        list.sort((a, b) => (b.price_num || 0) - (a.price_num || 0));
      } else if (sortMode === 'length-asc') {
        list.sort((a, b) => (a.length_num || 0) - (b.length_num || 0));
      } else if (sortMode === 'length-desc') {
        list.sort((a, b) => (b.length_num || 0) - (a.length_num || 0));
      }

      return list;
    }

    // --- ACTIVE FILTER TAGS UI ---
    function renderActiveTags() {
      if (!activeFiltersContainer || !activeFiltersChips) return;
      activeFiltersChips.innerHTML = '';

      let activeCount = 0;

      selectedFacades.forEach(f => {
        activeCount++;
        addTagChip(`Фасад: ${f}`, () => {
          selectedFacades.delete(f);
          syncCheckboxes('facade', f, false);
          currentPage = 1;
          render();
        });
      });

      selectedShapes.forEach(s => {
        activeCount++;
        addTagChip(`Форма: ${s}`, () => {
          selectedShapes.delete(s);
          syncCheckboxes('shape', s, false);
          currentPage = 1;
          render();
        });
      });

      selectedStyles.forEach(st => {
        activeCount++;
        addTagChip(`Стиль: ${st}`, () => {
          selectedStyles.delete(st);
          syncCheckboxes('style', st, false);
          currentPage = 1;
          render();
        });
      });

      selectedColors.forEach(c => {
        activeCount++;
        addTagChip(`Цвет: ${c}`, () => {
          selectedColors.delete(c);
          syncCheckboxes('color', c, false);
          currentPage = 1;
          render();
        });
      });

      if (minMeterPrice !== null || maxMeterPrice !== null) {
        activeCount++;
        const pLabel = `Цена/м: ${minMeterPrice ? 'от ' + minMeterPrice.toLocaleString() : ''} ${maxMeterPrice ? 'до ' + maxMeterPrice.toLocaleString() : ''} ₽`;
        addTagChip(pLabel, () => {
          minMeterPrice = null;
          maxMeterPrice = null;
          document.querySelectorAll('#filter-meter-price-min, #filter-meter-price-max').forEach(inp => inp.value = '');
          currentPage = 1;
          render();
        });
      }

      if (minLength !== null || maxLength !== null) {
        activeCount++;
        const lLabel = `Длина: ${minLength ? 'от ' + minLength : ''} ${maxLength ? 'до ' + maxLength : ''} м`;
        addTagChip(lLabel, () => {
          minLength = null;
          maxLength = null;
          document.querySelectorAll('#filter-length-min, #filter-length-max').forEach(inp => inp.value = '');
          currentPage = 1;
          render();
        });
      }

      if (activeCount > 0) {
        activeFiltersContainer.classList.remove('hidden');
        activeFiltersContainer.classList.add('flex');
        if (sidebarClearBtn) sidebarClearBtn.classList.remove('hidden');
        if (mobileActiveBadge) {
          mobileActiveBadge.textContent = activeCount;
          mobileActiveBadge.classList.remove('hidden');
        }
      } else {
        activeFiltersContainer.classList.remove('flex');
        activeFiltersContainer.classList.add('hidden');
        if (sidebarClearBtn) sidebarClearBtn.classList.add('hidden');
        if (mobileActiveBadge) {
          mobileActiveBadge.classList.add('hidden');
        }
      }
    }

    function addTagChip(text, onRemove) {
      const chip = document.createElement('div');
      chip.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/30';
      chip.innerHTML = `
        <span>${text}</span>
        <button type="button" class="hover:text-rose-500 transition" aria-label="Удалить фильтр">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      `;
      chip.querySelector('button').addEventListener('click', onRemove);
      activeFiltersChips.appendChild(chip);
    }

    function syncCheckboxes(type, value, checked) {
      document.querySelectorAll(`input[data-type="${type}"][value="${value}"]`).forEach(cb => {
        cb.checked = checked;
      });
    }

    function resetAllFilters() {
      selectedFacades.clear();
      selectedShapes.clear();
      selectedStyles.clear();
      selectedColors.clear();
      minMeterPrice = null;
      maxMeterPrice = null;
      minLength = null;
      maxLength = null;
      searchQuery = '';
      if (searchInput) searchInput.value = '';

      document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
      document.querySelectorAll('#filter-meter-price-min, #filter-meter-price-max, #filter-length-min, #filter-length-max, [data-range]').forEach(inp => inp.value = '');

      document.querySelectorAll('.quick-pill').forEach(btn => {
        btn.classList.remove('active', 'bg-luxury-gold', 'text-white');
        btn.classList.add('bg-white/5', 'text-gray-400');
      });
      const firstPill = document.querySelector('.quick-pill[data-quick="all"]');
      if (firstPill) {
        firstPill.classList.add('active', 'bg-luxury-gold', 'text-white');
        firstPill.classList.remove('bg-white/5', 'text-gray-400');
      }

      currentPage = 1;
      render();
    }

    if (resetAllBtn) resetAllBtn.addEventListener('click', resetAllFilters);
    if (sidebarClearBtn) sidebarClearBtn.addEventListener('click', resetAllFilters);
    if (drawerResetBtn) drawerResetBtn.addEventListener('click', resetAllFilters);

    // --- CHECKBOX LISTENERS (Event Delegation on Document) ---
    document.addEventListener('change', (e) => {
      const cb = e.target.closest('.filter-checkbox');
      if (!cb) return;

      const type = cb.getAttribute('data-type');
      const val = cb.value;
      const checked = cb.checked;

      // Sync across both sidebar and drawer
      syncCheckboxes(type, val, checked);

      if (type === 'facade') {
        if (checked) selectedFacades.add(val);
        else selectedFacades.delete(val);
      } else if (type === 'shape') {
        if (checked) selectedShapes.add(val);
        else selectedShapes.delete(val);
      } else if (type === 'style') {
        if (checked) selectedStyles.add(val);
        else selectedStyles.delete(val);
      } else if (type === 'color') {
        if (checked) selectedColors.add(val);
        else selectedColors.delete(val);
      }

      currentPage = 1;
      render();
    });

    // --- PRICE & LENGTH INPUT LISTENERS ---
    function bindNumberInputs(selector, setter) {
      selector += `, [data-range="${selector.slice(1)}"]`;
      document.querySelectorAll(selector).forEach(inp => {
        inp.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          setter(isNaN(val) ? null : val);
          // Sync duplicate input
          document.querySelectorAll(selector).forEach(other => {
            if (other !== e.target) other.value = e.target.value;
          });
          currentPage = 1;
          render();
        });
      });
    }

    bindNumberInputs('#filter-meter-price-min', v => minMeterPrice = v);
    bindNumberInputs('#filter-meter-price-max', v => maxMeterPrice = v);
    bindNumberInputs('#filter-length-min', v => minLength = v);
    bindNumberInputs('#filter-length-max', v => maxLength = v);

    // Presets for price and length
    document.addEventListener('click', (e) => {
      const priceChip = e.target.closest('.price-preset-chip');
      if (priceChip) {
        minMeterPrice = parseFloat(priceChip.getAttribute('data-min'));
        maxMeterPrice = parseFloat(priceChip.getAttribute('data-max'));
        document.querySelectorAll('#filter-meter-price-min, [data-range="filter-meter-price-min"]').forEach(i => i.value = minMeterPrice);
        document.querySelectorAll('#filter-meter-price-max, [data-range="filter-meter-price-max"]').forEach(i => i.value = maxMeterPrice);
        currentPage = 1;
        render();
        return;
      }

      const lengthChip = e.target.closest('.length-preset-chip');
      if (lengthChip) {
        minLength = parseFloat(lengthChip.getAttribute('data-min'));
        maxLength = parseFloat(lengthChip.getAttribute('data-max'));
        document.querySelectorAll('#filter-length-min, [data-range="filter-length-min"]').forEach(i => i.value = minLength);
        document.querySelectorAll('#filter-length-max, [data-range="filter-length-max"]').forEach(i => i.value = maxLength);
        currentPage = 1;
        render();
        return;
      }
    });

    // --- QUICK PILLS BAR ---
    document.querySelectorAll('.quick-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quick-pill').forEach(b => {
          b.classList.remove('active', 'bg-luxury-gold', 'text-white');
          b.classList.add('bg-white/5', 'text-gray-400');
        });
        btn.classList.add('active', 'bg-luxury-gold', 'text-white');
        btn.classList.remove('bg-white/5', 'text-gray-400');

        const q = btn.getAttribute('data-quick');
        selectedShapes.clear();
        selectedStyles.clear();
        selectedFacades.clear();
        document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);

        if (q === 'Угловые') {
          selectedShapes.add('Угловые');
          syncCheckboxes('shape', 'Угловые', true);
        } else if (q === 'Прямые') {
          selectedShapes.add('Прямые');
          syncCheckboxes('shape', 'Прямые', true);
        } else if (q === 'П-образные') {
          selectedShapes.add('П-образные');
          syncCheckboxes('shape', 'П-образные', true);
        } else if (q === 'Fenix') {
          selectedFacades.add('Fenix');
          syncCheckboxes('facade', 'Fenix', true);
        } else if (q === 'Лофт') {
          selectedStyles.add('Лофт');
          syncCheckboxes('style', 'Лофт', true);
        } else if (q === 'С островом') {
          selectedShapes.add('С островом');
          syncCheckboxes('shape', 'С островом', true);
        }

        currentPage = 1;
        render();
      });
    });

    // --- SEARCH & SORT ---
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        render();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortMode = e.target.value;
        currentPage = 1;
        render();
      });
    }

    // --- MAIN RENDER FUNCTION ---
    function render() {
      const filtered = getFilteredList();
      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
      if (currentPage > totalPages) currentPage = 1;

      // Update counters
      if (countBadge) countBadge.textContent = `${totalItems} проектов`;
      if (sidebarCountBadge) sidebarCountBadge.textContent = `${totalItems}`;
      if (drawerCountBadge) drawerCountBadge.textContent = `${totalItems}`;

      renderActiveTags();

      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

      grid.innerHTML = '';
      if (paginatedItems.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-24 text-gray-500">
            <svg class="w-14 h-14 mx-auto mb-3 opacity-30 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <p class="text-lg font-bold text-gray-800 dark:text-gray-200">По вашим критериям проектов не найдено</p>
            <p class="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Попробуйте ослабить фильтры или сбросить выбранные параметры</p>
            <button id="empty-reset-btn" type="button" class="mt-4 px-5 py-2.5 rounded-full bg-luxury-gold text-white text-xs font-bold hover:bg-luxury-gold-hover transition">
              Сбросить фильтры
            </button>
          </div>
        `;
        const emptyBtn = grid.querySelector('#empty-reset-btn');
        if (emptyBtn) emptyBtn.addEventListener('click', resetAllFilters);
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
      }

      paginatedItems.forEach(p => {
        const imgSrc = p.local_img || p.img;
        const oldPriceHtml = p.old_price 
          ? `<span class="text-xs line-through text-gray-400 mr-2">${p.old_price}</span>` 
          : '';

        const meterPrice = p.meter_price || 'По запросу';
        const lengthVal = p.length || 'Уточняется';
        const facadeVal = p.facade || 'По проекту';

        const card = document.createElement('div');
        card.className = 'glass-panel rounded-3xl overflow-hidden border border-luxury-subtle group hover-lift flex flex-col justify-between';
        card.innerHTML = `
          <div>
            <!-- Top Image Area -->
            <a href="../product/index.html?id=${p.id}" class="block relative aspect-[4/3] overflow-hidden bg-luxury-dark group">
              <img 
                src="${imgSrc}" 
                alt="${p.title}" 
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                onerror="this.src='${p.img}'"
              >
              <div class="photo-badge absolute top-4 left-4 px-3 py-1 rounded-full bg-luxury-black/75 backdrop-blur-md text-[11px] font-semibold text-luxury-gold uppercase tracking-wider">
                ${p.category || 'Кухня на заказ'}
              </div>
              ${p.old_price ? '<div class="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">Скидка</div>' : ''}
            </a>

            <!-- Content Area with Authentic Card Specs -->
            <div class="p-6">
              <div class="pb-3 mb-3 border-b border-dashed border-gray-200 dark:border-white/10">
                <a href="../product/index.html?id=${p.id}" class="block text-xl font-display font-bold text-gray-900 dark:text-white tracking-tight hover:text-luxury-gold transition">${p.title}</a>
              </div>

              <!-- Specs Plashka -->
              <div class="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4 pb-3 border-b border-dashed border-gray-200 dark:border-white/10">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Цена за пог. метр:</span>
                  <span class="font-bold text-gray-900 dark:text-white">${meterPrice}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Общая длина:</span>
                  <span class="font-semibold text-gray-900 dark:text-white">${lengthVal}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Фасад:</span>
                  <span class="font-semibold text-luxury-gold">${facadeVal}</span>
                </div>
              </div>

              <!-- Price -->
              <div class="mb-4">
                <div class="text-[11px] text-gray-500 mb-0.5">Стоимость комплекта:</div>
                <div class="catalog-prices">
                  ${oldPriceHtml}
                  <span class="catalog-price text-2xl font-extrabold text-luxury-gold tracking-tight">${p.price}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Dual Buttons: Заказать расчет & Быстрый заказ -->
          <div class="px-6 pb-6 pt-2">
            <div class="grid grid-cols-2 gap-2">
              <a href="../calculator/index.html?model=${encodeURIComponent(p.title)}&price=${encodeURIComponent(p.price)}" class="py-2.5 px-3 rounded-xl bg-luxury-gold text-white text-center text-xs font-bold hover:bg-luxury-gold-hover transition shadow-sm flex items-center justify-center">
                Заказать расчет
              </a>
              <button type="button" class="quick-order-trigger py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-luxury-subtle text-center text-xs font-semibold text-gray-900 dark:text-white transition flex items-center justify-center gap-1">
                Быстрый заказ
              </button>
            </div>
          </div>
        `;

        // Bind clicks to open authentic modal on Quick Order button
        card.querySelectorAll('.quick-order-trigger').forEach(el => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal(p);
          });
        });

        grid.appendChild(card);
      });

      renderPagination(totalPages);

      if (window.lucide) {
        window.lucide.createIcons();
      }
    }

    function renderPagination(totalPages) {
      if (!paginationContainer) return;
      if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
      }

      let html = '<div class="flex items-center gap-2">';
      
      if (currentPage > 1) {
        html += `<button class="page-nav-btn px-3.5 py-2 rounded-xl bg-white/5 hover:bg-luxury-gold hover:text-white text-xs font-semibold transition" data-page="${currentPage - 1}">Назад</button>`;
      }

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
          const activeClass = i === currentPage ? 'bg-luxury-gold text-white font-bold' : 'bg-white/5 text-gray-400 hover:text-white';
          html += `<button class="page-num-btn w-9 h-9 rounded-xl text-xs font-semibold ${activeClass} transition" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
          html += `<span class="px-1 text-gray-500">...</span>`;
        }
      }

      if (currentPage < totalPages) {
        html += `<button class="page-nav-btn px-3.5 py-2 rounded-xl bg-white/5 hover:bg-luxury-gold hover:text-white text-xs font-semibold transition" data-page="${currentPage + 1}">Вперед</button>`;
      }

      html += '</div>';
      paginationContainer.innerHTML = html;

      paginationContainer.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.getAttribute('data-page'));
          render();
          const targetEl = document.getElementById('catalog-grid');
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    const facetFields = {facade: 'facades', shape: 'shapes', style: 'styles', color: 'colors'};
    document.querySelectorAll('.filter-checkbox').forEach(input => {
      const field = facetFields[input.dataset.type];
      if (!field) return;
      const total = allProducts.filter(product => (product[field] || []).includes(input.value)).length;
      const label = input.closest('label');
      const badge = label?.querySelector('.text-\\[10px\\]') || label?.lastElementChild;
      if (badge && badge !== input && /^\d+$/.test(badge.textContent.trim())) badge.textContent = String(total);
    });
    document.querySelectorAll('.quick-pill').forEach(button => {
      const shape = ['Прямые', 'Угловые', 'П-образные', 'С островом'].includes(button.dataset.quick) ? button.dataset.quick : null;
      const facet = button.dataset.quick === 'Fenix' ? 'facades' : button.dataset.quick === 'Лофт' ? 'styles' : null;
      const badge = button.querySelector('span');
      const total = shape ? allProducts.filter(product => (product.shapes || []).includes(shape)).length : facet ? allProducts.filter(product => (product[facet] || []).includes(button.dataset.quick)).length : allProducts.length;
      if (badge && /^\d+$/.test(badge.textContent.trim())) badge.textContent = String(total);
      button.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) node.textContent = node.textContent.replace(/\(\d+\)/g, `(${total})`); });
    });
    render();

  } catch (err) {
    console.error('Failed to load products or filter catalog:', err);
  }
});
