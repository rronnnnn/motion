(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -----------------------------------------------------
     Mobile nav toggle
  ----------------------------------------------------- */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* -----------------------------------------------------
     Nav background toggle once the hero scrolls past view.
     Uses IntersectionObserver, not a scroll listener.
  ----------------------------------------------------- */
  var nav = document.getElementById("siteNav");
  var hero = document.getElementById("hero");

  if (nav && hero && "IntersectionObserver" in window) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          nav.classList.toggle("is-scrolled", !entry.isIntersecting);
        });
      },
      { rootMargin: "-1px 0px 0px 0px", threshold: 0 }
    );
    navObserver.observe(hero);
  }

  /* -----------------------------------------------------
     GSAP scroll reveals + subtle hero parallax.
     Motivation: draw the eye down the page in sequence
     (storytelling) and give the hero image a sense of
     depth on load (hierarchy). Everything collapses to
     a static, fully-visible state under reduced motion.
  ----------------------------------------------------- */
  if (prefersReducedMotion || typeof gsap === "undefined") {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance
  gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: function () {
      document.querySelectorAll(".hero .reveal").forEach(function (el) {
        el.classList.add("is-visible");
      });
      gsap.set(".hero .reveal", { clearProps: "transform,opacity" });
    },
  })
    .to(".hero .eyebrow", { opacity: 1, y: 0, duration: 0.7 }, 0.1)
    .to(".hero h1", { opacity: 1, y: 0, duration: 0.9 }, 0.2)
    .to(".hero p", { opacity: 1, y: 0, duration: 0.8 }, 0.4)
    .to(".hero .hero__actions", { opacity: 1, y: 0, duration: 0.8 }, 0.55);

  // Section reveals below the fold
  var revealTargets = gsap.utils.toArray(".reveal:not(.hero .reveal)");
  revealTargets.forEach(function (el, i) {
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: function () {
        el.classList.add("is-visible");
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: (i % 3) * 0.08 }
        );
      },
    });
  });

  // Subtle hero image parallax, transform-only for GPU efficiency
  var heroImage = document.querySelector("[data-parallax]");
  if (heroImage) {
    gsap.to(heroImage, {
      yPercent: 8,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  }
})();
