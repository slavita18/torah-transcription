(() => {
  // Reveal-on-scroll
  const targets = document.querySelectorAll(
    ".showcase-intro, .gallery-item, .who-text p, .who-ornament, .divider-ornament, .contact-landing, .contact-form, .contact-info-col"
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
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach((t) => io.observe(t));
})();
