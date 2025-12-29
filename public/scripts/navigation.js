// Mobile navigation toggle
(function() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  const navOverlay = document.getElementById('navOverlay');

  if (!hamburgerBtn || !navLinks || !navOverlay) return;

  function toggleMenu() {
    hamburgerBtn.classList.toggle('open');
    navLinks.classList.toggle('open');
    navOverlay.classList.toggle('show');

    // Prevent body scroll when menu is open
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  }

  function closeMenu() {
    hamburgerBtn.classList.remove('open');
    navLinks.classList.remove('open');
    navOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  // Toggle menu on hamburger click
  hamburgerBtn.addEventListener('click', toggleMenu);

  // Close menu when overlay is clicked
  navOverlay.addEventListener('click', closeMenu);

  // Close menu when nav link is clicked
  const links = navLinks.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      closeMenu();
    }
  });
})();
