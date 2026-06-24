document.documentElement.classList.add("js");

const header = document.getElementById("siteHeader");
const nav = document.getElementById("mainNav");
const navToggle = document.getElementById("navToggle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function autoPlayAllowed() {
  return !reduceMotion.matches;
}

function onMotionPreferenceChange(callback) {
  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", callback);
  } else if (typeof reduceMotion.addListener === "function") {
    reduceMotion.addListener(callback);
  }
}

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 32);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -30px 0px" });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

function setHiddenInteractiveState(element, isHidden) {
  element.setAttribute("aria-hidden", String(isHidden));
  element.toggleAttribute("inert", isHidden);
  element.querySelectorAll("a, button").forEach((control) => {
    if (isHidden) {
      control.dataset.previousTabindex = control.getAttribute("tabindex") || "";
      control.setAttribute("tabindex", "-1");
    } else if (control.dataset.previousTabindex) {
      control.setAttribute("tabindex", control.dataset.previousTabindex);
      delete control.dataset.previousTabindex;
    } else {
      control.removeAttribute("tabindex");
      delete control.dataset.previousTabindex;
    }
  });
}

function createSwipeNavigation(element, { onPrevious, onNext, onStart, onEnd }) {
  let startX = 0;
  let startY = 0;
  let isTracking = false;
  let isHorizontal = false;

  element.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    isTracking = true;
    isHorizontal = false;
    if (onStart) onStart();
  }, { passive: true });

  element.addEventListener("touchmove", (event) => {
    if (!isTracking || event.touches.length !== 1) return;
    const deltaX = event.touches[0].clientX - startX;
    const deltaY = event.touches[0].clientY - startY;

    if (!isHorizontal && Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      isHorizontal = true;
    }

    if (isHorizontal) {
      event.preventDefault();
    }
  }, { passive: false });

  element.addEventListener("touchend", (event) => {
    if (!isTracking) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const isSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

    if (isSwipe) {
      if (deltaX > 0) onPrevious();
      else onNext();
    }

    isTracking = false;
    isHorizontal = false;
    if (onEnd) onEnd();
  }, { passive: true });

  element.addEventListener("touchcancel", () => {
    isTracking = false;
    isHorizontal = false;
    if (onEnd) onEnd();
  }, { passive: true });
}

function createHeroCarousel(root) {
  const slides = Array.from(root.querySelectorAll(".hero-slide"));
  const prev = root.querySelector("[data-hero-prev]");
  const next = root.querySelector("[data-hero-next]");
  const dotsWrap = root.querySelector("[data-hero-dots]");
  let index = 0;
  let timer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `切换到第 ${i + 1} 张`);
    dot.addEventListener("click", () => show(i));
    dotsWrap.appendChild(dot);
  });

  const dots = Array.from(dotsWrap.children);

  function show(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const isActive = i === index;
      slide.classList.toggle("is-active", isActive);
      setHiddenInteractiveState(slide, !isActive);
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  }

  function start() {
    stop();
    if (!autoPlayAllowed()) return;
    timer = window.setInterval(() => show(index + 1), 3000);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  createSwipeNavigation(root, {
    onPrevious: () => show(index - 1),
    onNext: () => show(index + 1),
    onStart: stop,
    onEnd: start,
  });
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", start);
  onMotionPreferenceChange(start);
  show(0);
  start();
}

function createProductViewer() {
  const viewer = document.createElement("div");
  viewer.className = "image-viewer";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", "产品图片预览");
  viewer.innerHTML = `
    <button class="image-viewer-close" type="button" aria-label="关闭预览">&times;</button>
    <img class="image-viewer-image" alt="" />
    <p class="image-viewer-caption"></p>
  `;
  document.body.appendChild(viewer);

  const close = viewer.querySelector(".image-viewer-close");
  const image = viewer.querySelector(".image-viewer-image");
  const caption = viewer.querySelector(".image-viewer-caption");

  function open(source) {
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || "产品图片";
    caption.textContent = source.alt || "";
    viewer.classList.add("is-open");
    document.body.classList.add("viewer-open");
    close.focus();
  }

  function hide() {
    viewer.classList.remove("is-open");
    document.body.classList.remove("viewer-open");
    image.removeAttribute("src");
  }

  document.addEventListener("click", (event) => {
    const imageTarget = event.target.closest(".product-card img");
    if (!imageTarget) return;
    open(imageTarget);
  });
  document.addEventListener("keydown", (event) => {
    const card = event.target.closest(".product-card");
    if (!card || (event.key !== "Enter" && event.key !== " ")) return;
    const imageTarget = card.querySelector("img");
    if (!imageTarget) return;
    event.preventDefault();
    open(imageTarget);
  });

  close.addEventListener("click", hide);
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) hide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && viewer.classList.contains("is-open")) hide();
  });
}

function createProductCarousel(root) {
  const track = root.querySelector(".product-grid");
  const prev = root.querySelector("[data-product-prev]");
  const next = root.querySelector("[data-product-next]");
  const originalCards = Array.from(root.querySelectorAll(".product-card"));
  let cards = [];
  let index = 0;
  let timer = null;
  let moveFallback = null;
  let cloneCount = 0;
  let isMoving = false;

  function visibleCount() {
    return window.matchMedia("(max-width: 780px)").matches ? 2 : 4;
  }

  originalCards.forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${card.querySelector("img")?.alt || "产品图片"}，点击查看大图`);
  });

  function setPosition(withTransition = true) {
    const count = visibleCount();
    const first = cards[0];
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    const itemWidth = first ? first.getBoundingClientRect().width + gap : 0;
    track.classList.toggle("no-transition", !withTransition);
    track.style.transform = `translateX(${-index * itemWidth}px)`;
    cards.forEach((card, i) => {
      const isVisible = i >= index && i < index + count;
      const isClone = i >= originalCards.length;
      card.classList.toggle("is-visible", isVisible);
      card.tabIndex = isVisible && !isClone ? 0 : -1;
    });
    if (!withTransition) {
      void track.offsetWidth;
      track.classList.remove("no-transition");
    }
  }

  function slideTo(nextIndex) {
    index = nextIndex;
    isMoving = true;
    setPosition(true);
    window.clearTimeout(moveFallback);
    moveFallback = window.setTimeout(() => {
      normalizeLoop();
      isMoving = false;
    }, 750);
  }

  function buildLoop() {
    cloneCount = visibleCount();
    isMoving = false;
    window.clearTimeout(moveFallback);
    track.replaceChildren();

    if (originalCards.length <= cloneCount) {
      originalCards.forEach((card) => {
        card.classList.add("is-visible");
        card.tabIndex = 0;
        track.appendChild(card);
      });
      cards = Array.from(track.querySelectorAll(".product-card"));
      index = 0;
      track.style.transform = "translateX(0)";
      prev.disabled = true;
      next.disabled = true;
      return;
    }

    prev.disabled = false;
    next.disabled = false;
    const append = originalCards.slice(0, cloneCount).map((card) => card.cloneNode(true));
    [...originalCards, ...append].forEach((card, i) => {
      const isClone = i >= originalCards.length;
      card.classList.remove("is-visible");
      card.tabIndex = -1;
      if (isClone) card.setAttribute("aria-hidden", "true");
      track.appendChild(card);
    });

    cards = Array.from(track.querySelectorAll(".product-card"));
    index = 0;
    setPosition(false);
  }

  function normalizeLoop() {
    if (index >= originalCards.length) {
      index = 0;
      setPosition(false);
    }
  }

  function move(step) {
    if (isMoving || originalCards.length <= visibleCount()) return;

    if (step < 0 && index === 0) {
      index = originalCards.length;
      setPosition(false);
      requestAnimationFrame(() => slideTo(originalCards.length - 1));
      return;
    }

    if (step > 0 && index >= originalCards.length) {
      index = 0;
      setPosition(false);
      requestAnimationFrame(() => slideTo(1));
      return;
    }

    slideTo(index + step);
  }

  function start() {
    stop();
    if (!autoPlayAllowed()) return;
    timer = window.setInterval(() => move(1), 3000);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  prev.addEventListener("click", () => {
    move(-1);
    start();
  });
  next.addEventListener("click", () => {
    move(1);
    start();
  });
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", start);
  track.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "transform") return;
    window.clearTimeout(moveFallback);
    normalizeLoop();
    isMoving = false;
  });
  window.addEventListener("resize", () => {
    if (cloneCount !== visibleCount()) buildLoop();
    else {
      isMoving = false;
      window.clearTimeout(moveFallback);
      setPosition(false);
    }
  }, { passive: true });
  onMotionPreferenceChange(start);
  buildLoop();
  start();
}

const hero = document.querySelector("[data-hero-carousel]");
if (hero) createHeroCarousel(hero);

createProductViewer();
document.querySelectorAll("[data-product-carousel]").forEach(createProductCarousel);
