// Global interactive scripts & Theme Switcher

// Theme management - Default is LIGHT
function initTheme() {
  const savedTheme = localStorage.getItem('pk_theme') || 'light';
  applyTheme(savedTheme);

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem('pk_theme', next);
    });
  });
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('theme-light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('dark');
  }
  updateThemeIcons();
}

function updateThemeIcons() {
  const isLight = document.documentElement.classList.contains('theme-light');
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.innerHTML = isLight 
      ? '<i data-lucide="moon" class="w-4 h-4"></i>' 
      : '<i data-lucide="sun" class="w-4 h-4"></i>';
  });
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileToggle && mobileMenu) {
    function closeMenu() {
      mobileMenu.hidden = true;
      mobileMenu.classList.add('hidden');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Открыть меню');
    }
    closeMenu();
    mobileToggle.addEventListener('click', () => {
      const expanded = mobileMenu.hidden;
      mobileMenu.hidden = !expanded;
      mobileMenu.classList.toggle('hidden', !expanded);
      mobileToggle.setAttribute('aria-expanded', String(expanded));
      mobileToggle.setAttribute('aria-label', expanded ? 'Закрыть меню' : 'Открыть меню');
    });
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !mobileMenu.hidden) {
        closeMenu();
        mobileToggle.focus();
      }
    });
    window.matchMedia('(min-width: 951px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  }

  fetch('/api/site-config').then(response => {
    if (!response.ok) throw new Error('Contacts unavailable');
    return response.json();
  }).then(config => {
    document.querySelectorAll('[data-social]').forEach(link => {
      const url = config[link.dataset.social];
      if (!url) { link.hidden = true; return; }
      try {
        if (new URL(url).protocol === 'https:') link.href = url;
      } catch { link.hidden = true; }
    });
    document.querySelectorAll('[data-contact]').forEach(link => {
      const value = config[link.dataset.contact];
      if (!value) return;
      link.textContent = value;
      link.href = link.dataset.contact === 'company_email' ? `mailto:${value}` : `tel:${value.replace(/[^+\d]/g, '')}`;
    });
  }).catch(() => { /* The static footer keeps its verified contact links. */ });

  // Smooth appearance on scroll with IntersectionObserver
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('opacity-100', 'translate-y-0');
        entry.target.classList.remove('opacity-0', 'translate-y-8');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    el.classList.add('transition-all', 'duration-700', 'ease-out', 'opacity-0', 'translate-y-8');
    observer.observe(el);
  });
});
