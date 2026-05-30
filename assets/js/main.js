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
      heading.classList.add("toc-target");

      const link = document.createElement("a");
      link.className = "page-toc-link";
      link.href = `#${id}`;
      link.textContent = label;
      link.title = label;
      nav.appendChild(link);

      return { heading, link };
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

    const offset = 110;
    let lockUntil = 0;
    const updateActive = () => {
      if (Date.now() < lockUntil) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = scrollable > 40 && window.scrollY >= scrollable - 4;
      if (atBottom) {
        setActive(links[links.length - 1].link);
        return;
      }

      let current = links[0];
      for (const item of links) {
        if (item.heading.getBoundingClientRect().top - offset <= 0) {
          current = item;
        } else {
          break;
        }
      }
      setActive(current.link);
    };

    const topbar = document.querySelector(".topbar");
    links.forEach(({ heading, link }) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const gap = 18;
        const topOffset = (topbar ? topbar.offsetHeight : 0) + gap;
        const targetY = Math.max(
          0,
          window.scrollY + heading.getBoundingClientRect().top - topOffset
        );

        setActive(link);
        lockUntil = Date.now() + 700;
        window.scrollTo({ top: targetY, behavior: "smooth" });

        if (history.replaceState) {
          history.replaceState(null, "", `#${heading.id}`);
        }
      });
    });

    const spacer = document.createElement("div");
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.width = "100%";
    spacer.style.flex = "0 0 auto";
    const shell = content.closest(".content-shell") || content.parentElement;
    const footer = shell.querySelector(".site-footer");
    if (footer) {
      shell.insertBefore(spacer, footer);
    } else {
      shell.appendChild(spacer);
    }

    const ensureScrollRoom = () => {
      spacer.style.height = "0px";
      const last = links[links.length - 1].heading;
      const topOffset = (topbar ? topbar.offsetHeight : 0) + 18;
      const lastTop = window.scrollY + last.getBoundingClientRect().top;
      const needed = lastTop - topOffset + window.innerHeight;
      const extra = needed - document.documentElement.scrollHeight;
      spacer.style.height = extra > 0 ? `${Math.ceil(extra)}px` : "0px";
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateActive();
        ticking = false;
      });
    };

    const onResize = () => {
      ensureScrollRoom();
      onScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("load", onResize);
    ensureScrollRoom();
    updateActive();
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
