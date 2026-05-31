(() => {
  const initTypeLoop = () => {
    const targets = document.querySelectorAll("#home [data-type-loop]");
    if (!targets.length) return;

    targets.forEach((target) => {
      if (target.dataset.typeLoopReady === "true") return;

      const text = (target.dataset.typeText || target.textContent).trim();
      if (!text) return;

      target.dataset.typeLoopReady = "true";

      let visibleCount = text.length;
      let deleting = true;

      const render = () => {
        target.textContent = text.slice(0, visibleCount);
      };

      const tick = () => {
        if (deleting) {
          visibleCount -= 1;
          if (visibleCount <= 0) {
            visibleCount = 0;
            deleting = false;
            render();
            window.setTimeout(tick, 160);
            return;
          }

          render();
          window.setTimeout(tick, 42);
          return;
        }

        visibleCount += 1;
        if (visibleCount >= text.length) {
          visibleCount = text.length;
          deleting = true;
          render();
          window.setTimeout(tick, 1500);
          return;
        }

        render();
        window.setTimeout(tick, 52);
      };

      render();
      window.setTimeout(tick, 420);
    });
  };

  const initCursorBlink = () => {
    const cursors = document.querySelectorAll(".cursor-name, .type-loop");
    if (!cursors.length) return;

    window.setInterval(() => {
      cursors.forEach((cursor) => {
        cursor.classList.toggle("cursor-hidden");
      });
    }, 420);
  };

  const initPageToc = () => {
    const nav = document.querySelector("[data-toc]");
    const content = document.querySelector("[data-toc-content]");
    if (!nav || !content) return;

    const headings = [...content.querySelectorAll(
      ".entry-body h3, .skill-row h3, .post-content h2, .post-content h3"
    )].filter((heading) => heading.textContent.trim());

    if (headings.length < 2) return;

    const slugify = (text) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

    const used = new Set();
    const links = headings.map((heading) => {
      let label = heading.textContent.trim();
      const firstNode = heading.childNodes[0];
      if (heading.querySelector("span") && firstNode && firstNode.textContent.trim()) {
        label = firstNode.textContent.trim();
      }

      const base = slugify(label) || "section";
      let id = base;
      let suffix = 2;
      while (used.has(id) || (document.getElementById(id) && document.getElementById(id) !== heading)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      used.add(id);
      heading.id = id;
      const target = heading.closest(".entry, .skill-row") || heading;
      target.classList.add("toc-target");

      const link = document.createElement("a");
      link.className = "page-toc-link";
      link.href = `#${id}`;
      link.textContent = label;
      link.title = label;
      nav.appendChild(link);

      return { heading, target, link };
    });

    const aside = nav.closest("[data-page-toc]");
    if (aside) aside.hidden = false;

    let activeLink = null;
    const setActive = (link) => {
      if (link === activeLink) return;
      if (activeLink) activeLink.classList.remove("is-active");
      if (link) link.classList.add("is-active");
      activeLink = link;
    };

    const getTopOffset = () => {
      const topbar = document.querySelector(".topbar");
      return (topbar ? topbar.offsetHeight : 0) + 4;
    };

    let snapTargets = [];
    const spacer = document.createElement("div");
    spacer.className = "toc-scroll-spacer";
    spacer.setAttribute("aria-hidden", "true");
    content.appendChild(spacer);

    const updateSpacerHeight = () => {
      const last = links[links.length - 1];
      if (!last) return;

      const lastTarget = last.target;
      const lastTargetY = lastTarget.getBoundingClientRect().top + window.scrollY;
      const lastScrollTargetY = Math.max(0, lastTargetY - getTopOffset());

      const documentHeightWithoutSpacer = document.documentElement.scrollHeight - spacer.offsetHeight;
      const maxScrollWithoutSpacer = documentHeightWithoutSpacer - window.innerHeight;

      const extra = lastScrollTargetY - maxScrollWithoutSpacer;
      const newHeight = extra > 0 ? Math.ceil(extra) + 20 : 0;

      if (spacer.style.height !== `${newHeight}px`) {
        spacer.style.height = `${newHeight}px`;
      }
    };

    const updateSnapTargets = () => {
      updateSpacerHeight();
      snapTargets = links.map(link => {
        const targetY = link.target.getBoundingClientRect().top + window.scrollY;
        return {
          link: link.link,
          target: link.target,
          heading: link.heading,
          y: Math.max(0, targetY - getTopOffset())
        };
      });
    };

    let currentAnimationId = null;
    const animateScroll = (targetY, duration = 1200) => {
      if (currentAnimationId) {
        cancelAnimationFrame(currentAnimationId);
      }

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        window.scrollTo(0, targetY);
        return;
      }

      const startY = window.scrollY;
      const distance = targetY - startY;
      if (Math.abs(distance) < 1) return;

      const startTime = performance.now();
      const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeOutQuint(progress);

        window.scrollTo(0, startY + distance * ease);

        if (progress < 1) {
          currentAnimationId = requestAnimationFrame(step);
        } else {
          currentAnimationId = null;
        }
      };

      currentAnimationId = requestAnimationFrame(step);
    };

    const cancelActiveAnimation = () => {
      if (currentAnimationId) {
        cancelAnimationFrame(currentAnimationId);
        currentAnimationId = null;
      }
    };

    window.addEventListener("wheel", cancelActiveAnimation, { passive: true });
    window.addEventListener("touchmove", cancelActiveAnimation, { passive: true });
    window.addEventListener("mousedown", cancelActiveAnimation, { passive: true });
    window.addEventListener("keydown", cancelActiveAnimation, { passive: true });

    let lockUntil = 0;
    const updateActive = () => {
      if (Date.now() < lockUntil) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = scrollable > 40 && window.scrollY >= scrollable - 4;
      if (atBottom && snapTargets.length > 0) {
        setActive(snapTargets[snapTargets.length - 1].link);
        return;
      }

      let current = snapTargets[0];
      const currentScroll = window.scrollY;
      for (const item of snapTargets) {
        if (currentScroll >= item.y - 2) {
          current = item;
        } else {
          break;
        }
      }
      if (current) {
        setActive(current.link);
      }
    };

    links.forEach(({ heading, target, link }) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        
        updateSnapTargets();
        
        setActive(link);
        lockUntil = Date.now() + 1300;
        
        const snapTarget = snapTargets.find(t => t.heading === heading);
        if (snapTarget) {
          animateScroll(snapTarget.y, 1200);
        }

        if (history.replaceState) {
          history.replaceState(null, "", `#${heading.id}`);
        }
      });
    });

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
      }
    };

    const onResize = () => {
      updateSnapTargets();
      onScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("load", onResize);

    updateSnapTargets();
    updateActive();

    window.requestAnimationFrame(() => {
      updateSnapTargets();
      updateActive();
    });
    window.setTimeout(onResize, 250);

    if (window.location.hash) {
      const hashTarget = links.find(({ heading }) => `#${heading.id}` === window.location.hash);
      if (hashTarget) {
        window.setTimeout(() => {
          updateSnapTargets();
          const snapTarget = snapTargets.find(t => t.heading === hashTarget.heading);
          if (snapTarget) {
            animateScroll(snapTarget.y, 1200);
            setActive(snapTarget.link);
          }
        }, 80);
      }
    }
  };

  const init = () => {
    initTypeLoop();
    initCursorBlink();
    initPageToc();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
