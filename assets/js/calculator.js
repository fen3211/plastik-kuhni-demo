// Exact Calculator logic connected to SQLite Database and Factory Settings API
// Base rates per meter:
// Пленка ПВХ: 25 000 руб
// Пластик HPL: 30 000 руб
// Эмаль: 36 000 руб
// Массив дуба: 60 000 руб

document.addEventListener('DOMContentLoaded', async () => {
  let pricePerMeter = 30000; // default Пластик HPL
  let kitchenWidth = 3.0; // default 3 meters
  let materialName = 'Пластик HPL';

  const widthSlider = document.getElementById('kitchen-width-slider');
  const lengthDisplay = document.getElementById('length-display');
  const basePriceDisplay = document.getElementById('base-price-display');
  const finalPriceDisplay = document.getElementById('final-price-display');
  const savingsDisplay = document.getElementById('savings-display');

  // Modal elements
  const calcOpenModalBtn = document.getElementById('calc-open-modal-btn');
  const calcLeadModal = document.getElementById('calc-lead-modal');
  const calcModalClose = document.getElementById('calc-modal-close');
  const calcLeadForm = document.getElementById('calc-lead-form');
  const modalCalcMaterial = document.getElementById('modal-calc-material');
  const modalCalcWidth = document.getElementById('modal-calc-width');
  const modalCalcPrice = document.getElementById('modal-calc-price');
  const calcFormFeedback = document.getElementById('calc-form-feedback');
  const calcSubmitBtn = document.getElementById('calc-submit-btn');

  // Fetch dynamic rates from settings if API available
  try {
    const res = await fetch('/api/calculator-rates');
    if (res.ok) {
      const settings = await res.json();
      if (settings.calc_rate_mdf) {
        const btnMdf = document.querySelector('.material-btn[data-price-pm="25000"]');
        if (btnMdf) btnMdf.setAttribute('data-price-pm', settings.calc_rate_mdf.value);
      }
      if (settings.calc_rate_plastic) {
        const btnPlastic = document.querySelector('.material-btn[data-price-pm="30000"]');
        if (btnPlastic) {
          btnPlastic.setAttribute('data-price-pm', settings.calc_rate_plastic.value);
          pricePerMeter = parseFloat(settings.calc_rate_plastic.value);
        }
      }
      if (settings.calc_rate_enamel) {
        const btnEnamel = document.querySelector('.material-btn[data-price-pm="36000"]');
        if (btnEnamel) btnEnamel.setAttribute('data-price-pm', settings.calc_rate_enamel.value);
      }
      if (settings.calc_rate_wood) {
        const btnWood = document.querySelector('.material-btn[data-price-pm="60000"]');
        if (btnWood) btnWood.setAttribute('data-price-pm', settings.calc_rate_wood.value);
      }
    }
  } catch (e) {
    // offline or static fallback
  }

  function calculate() {
    const basePrice = Math.round(pricePerMeter * kitchenWidth);
    const finalPrice = Math.round(basePrice * 0.9);
    const savings = Math.round(basePrice * 0.1);

    if (finalPriceDisplay) {
      finalPriceDisplay.style.transform = 'scale(0.96)';
      setTimeout(() => {
        finalPriceDisplay.textContent = finalPrice.toLocaleString('ru-RU') + ' ₽';
        finalPriceDisplay.style.transform = 'scale(1)';
      }, 50);
    }

    if (basePriceDisplay) {
      basePriceDisplay.textContent = basePrice.toLocaleString('ru-RU') + ' ₽';
    }

    if (savingsDisplay) {
      savingsDisplay.textContent = savings.toLocaleString('ru-RU') + ' ₽';
    }
  }

  // Slider change
  if (widthSlider) {
    widthSlider.addEventListener('input', (e) => {
      kitchenWidth = parseFloat(e.target.value);
      if (lengthDisplay) {
        lengthDisplay.textContent = kitchenWidth.toFixed(1) + ' м';
      }
      calculate();
    });
  }

  // Material selection
  const materialBtns = document.querySelectorAll('.material-btn');
  materialBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      materialBtns.forEach(b => {
        b.classList.remove('active', 'border-luxury-gold', 'bg-luxury-gold/10');
        b.classList.add('border-white/10', 'bg-white/5');
      });
      btn.classList.add('active', 'border-luxury-gold', 'bg-luxury-gold/10');
      btn.classList.remove('border-white/10', 'bg-white/5');

      pricePerMeter = parseFloat(btn.getAttribute('data-price-pm'));
      materialName = btn.querySelector('.font-bold')?.textContent.trim() || 'Пластик HPL';
      calculate();
    });
  });

  // Modal handlers
  function openCalcModal() {
    if (!calcLeadModal) return;
    const finalPriceText = finalPriceDisplay?.textContent || '81 000 ₽';
    if (modalCalcMaterial) modalCalcMaterial.textContent = materialName;
    if (modalCalcWidth) modalCalcWidth.textContent = kitchenWidth.toFixed(1) + ' м';
    if (modalCalcPrice) modalCalcPrice.textContent = finalPriceText;
    if (calcFormFeedback) calcFormFeedback.classList.add('hidden');

    calcLeadModal.classList.remove('hidden');
  }

  function closeCalcModal() {
    if (calcLeadModal) calcLeadModal.classList.add('hidden');
  }

  if (calcOpenModalBtn) calcOpenModalBtn.addEventListener('click', openCalcModal);
  if (calcModalClose) calcModalClose.addEventListener('click', closeCalcModal);
  if (calcLeadModal) {
    calcLeadModal.addEventListener('click', (e) => {
      if (e.target === calcLeadModal) closeCalcModal();
    });
  }

  // Submit calculation lead to database
  if (calcLeadForm) {
    calcLeadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('calc-name')?.value || 'Клиент';
      const phone = document.getElementById('calc-phone')?.value || '';
      const finalPriceText = finalPriceDisplay?.textContent || '81 000 ₽';

      if (calcSubmitBtn) {
        calcSubmitBtn.disabled = true;
        calcSubmitBtn.innerHTML = '<span>Отправка заявки...</span>';
      }

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            phone: phone,
            kitchen_title: `Индивидуальный расчет: ${materialName}`,
            facade_type: materialName,
            hardware: 'Blum (Австрия)',
            gift: 'Каменная мойка GranFest + 3D-проект',
            width_meters: kitchenWidth,
            total_price: finalPriceText,
            source: 'calculator'
          })
        });

        if (res.ok) {
          if (calcFormFeedback) {
            calcFormFeedback.textContent = '✓ Расчет передан дизайнеру! Скоро напишем вам в WhatsApp.';
            calcFormFeedback.className = 'text-xs font-bold py-2 text-emerald-600 block';
          }
          setTimeout(() => {
            closeCalcModal();
            calcLeadForm.reset();
            if (calcSubmitBtn) {
              calcSubmitBtn.disabled = false;
              calcSubmitBtn.innerHTML = '<span>Получить расчет и подарок</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
              if (window.lucide) window.lucide.createIcons();
            }
          }, 1800);
        } else {
          throw new Error('Error saving lead');
        }
      } catch (err) {
        if (calcFormFeedback) {
          calcFormFeedback.textContent = 'Ошибка отправки. Позвоните нам: +7 (800) 201-09-32';
          calcFormFeedback.className = 'text-xs font-bold py-2 text-rose-500 block';
        }
        if (calcSubmitBtn) {
          calcSubmitBtn.disabled = false;
          calcSubmitBtn.innerHTML = '<span>Попробовать снова</span>';
        }
      }
    });
  }

  calculate();
});
