/* ============================================
   SILKROADLAB - Main JavaScript
   ============================================ */

// ---- TRANSLATIONS ----
const translations = {
  uz: {
    nav_home: "Bosh sahifa",
    nav_about: "Loyiha haqida",
    nav_scenarios: "Ssenariylar",
    nav_ai: "AI imkoniyatlari",
    nav_lab: "Laboratoriya",
    nav_courses: "Kurslar",
    nav_results: "Natijalar",
    nav_contact: "Aloqa",
    nav_register: "Ro'yxatdan o'tish",
    footer_copy: "© 2024 SilkroadLab. Barcha huquqlar himoyalangan.",
    footer_desc: "VR va AI asosidagi virtual til o'rganish laboratoriyasi",
  },
  en: {
    nav_home: "Home",
    nav_about: "About",
    nav_scenarios: "Scenarios",
    nav_ai: "AI Features",
    nav_lab: "Laboratory",
    nav_courses: "Courses",
    nav_results: "Results",
    nav_contact: "Contact",
    nav_register: "Register",
    footer_copy: "© 2024 SilkroadLab. All rights reserved.",
    footer_desc: "VR and AI-based virtual language learning laboratory",
  }
};

let currentLang = localStorage.getItem('srl_lang') || 'uz';

function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('srl_lang', lang);
  document.querySelectorAll('[data-lang-key]').forEach(el => {
    const key = el.getAttribute('data-lang-key');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  // Update lang switcher button text
  const langBtn = document.querySelector('.lang-current');
  if (langBtn) langBtn.textContent = lang.toUpperCase();
  // Apply page-specific translations
  if (typeof applyPageTranslations === 'function') applyPageTranslations(lang);
}

function toggleLang() {
  const newLang = currentLang === 'uz' ? 'en' : 'uz';
  applyTranslations(newLang);
}

// ---- NAVBAR ----
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  // Hamburger
  hamburger?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    if (mobileMenu?.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Active link highlight
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) link.classList.add('active');
  });

  // Lang switcher
  const langBtn = document.querySelector('.lang-switcher');
  langBtn?.addEventListener('click', toggleLang);

  // Apply initial lang
  applyTranslations(currentLang);
}

// ---- SCROLL ANIMATIONS ----
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// ---- COUNTER ANIMATION ----
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start).toLocaleString();
    }
  }, 16);
}

function initCounters() {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'));
        if (!isNaN(target)) animateCounter(el, target);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));
}

// ---- NOTIFICATION ----
function showNotification(msg, type = 'success') {
  const existing = document.querySelector('.srl-notif');
  if (existing) existing.remove();
  const notif = document.createElement('div');
  notif.className = 'srl-notif';
  notif.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0077B6'};
    color:#fff;padding:14px 24px;border-radius:10px;
    font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:500;
    box-shadow:0 8px 32px rgba(0,0,0,0.2);
    display:flex;align-items:center;gap:10px;
    animation:slideInRight 0.3s ease;
  `;
  notif.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>${msg}`;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => notif.remove(), 300);
  }, 3500);
}

// Add notif animations to document
const notifStyle = document.createElement('style');
notifStyle.textContent = `
  @keyframes slideInRight { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }
  @keyframes slideOutRight { from { transform: translateX(0); opacity:1; } to { transform: translateX(120%); opacity:0; } }
`;
document.head.appendChild(notifStyle);

// ---- AUTH CHECK ----
function checkAuth() {
  const user = JSON.parse(localStorage.getItem('srl_user') || 'null');
  return user;
}

function updateNavAuth() {
  const user = checkAuth();
  const navRegister = document.querySelector('.nav-register');
  if (!navRegister) return;
  if (user) {
    navRegister.innerHTML = `
      <div class="nav-user-menu" style="position:relative;display:inline-block;">
        <button class="btn-primary" style="padding:10px 20px;gap:8px;" onclick="toggleUserMenu()">
          <span>👤</span> ${user.name?.split(' ')[0] || 'Profil'} <span>▾</span>
        </button>
        <div id="userDropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;
          background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.15);
          min-width:180px;overflow:hidden;z-index:1001;">
          <a href="dashboard.html" style="display:block;padding:12px 20px;font-size:0.88rem;
            color:#334155;transition:all 0.2s;text-decoration:none;border-bottom:1px solid #f1f5f9;">
            🏠 Shaxsiy kabinet
          </a>
          <a href="#" onclick="logout()" style="display:block;padding:12px 20px;font-size:0.88rem;
            color:#ef4444;transition:all 0.2s;text-decoration:none;">
            🚪 Chiqish
          </a>
        </div>
      </div>`;
  }
}

function toggleUserMenu() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function logout() {
  localStorage.removeItem('srl_user');
  localStorage.removeItem('srl_token');
  showNotification('Tizimdan chiqdingiz', 'info');
  setTimeout(() => window.location.href = 'index.html', 1000);
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user-menu')) {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.style.display = 'none';
  }
});

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollAnimations();
  initCounters();
  updateNavAuth();
});
