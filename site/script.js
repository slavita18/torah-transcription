(() => {
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("navToggle");
  const links = document.querySelector(".nav-links");

  // Sticky header shadow
  const onScroll = () => {
    if (window.scrollY > 8) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  toggle?.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? "סגירת תפריט" : "פתיחת תפריט");
  });

  links?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      if (links.classList.contains("open")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  // Reveal-on-scroll
  const targets = document.querySelectorAll(
    ".section-head, .pillars, .heritage-card, .service-card, .book-card, .process-list li, .testi-card, .contact-list, .contact-form, .hero-stats"
  );
  targets.forEach((el) => el.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach((t) => io.observe(t));

  // Contact form — graceful demo handler
  const form = document.getElementById("contactForm");
  form?.addEventListener("submit", (e) => {
    // Allow native mailto submission, but show a small confirmation hint first
    const note = form.querySelector(".form-note");
    if (note) {
      note.textContent = "פותח את תוכנת הדוא\"ל שלכם… תודה על הפנייה.";
      note.style.color = "#e9d6b3";
    }
  });
})();
