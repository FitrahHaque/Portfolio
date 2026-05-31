// Portfolio script - Optimized scrolling and dynamic sidebar TOC behavior
(() => {
  let globalLinks = [];
  let animationQueue = [];
  let currentQueueIndex = 0;
  let animationTimeoutId = null;
  let isAnimationSkipped = false;
  let typeLoopInitialized = false;

  const initTypeLoop = (forceNormal = false) => {
    const targets = document.querySelectorAll("#home [data-type-loop]");
    if (!targets.length) return;

    targets.forEach((target) => {
      if (target.dataset.typeLoopReady === "true") return;

      const text = (target.dataset.typeText || target.textContent).trim();
      if (!text) return;

      target.dataset.typeLoopReady = "true";
      typeLoopInitialized = true;

      const isAnimatedNav = document.documentElement.classList.contains("use-type-animation") && !forceNormal;
      let visibleCount = isAnimatedNav ? 0 : text.length;
      let deleting = !isAnimatedNav;
      let isFirstTypeOut = isAnimatedNav;

      const render = () => {
        target.textContent = text.slice(0, visibleCount);
      };

      const tick = () => {
        if (isFirstTypeOut && isAnimationSkipped) {
          visibleCount = text.length;
          deleting = true;
          isFirstTypeOut = false;
          render();
          window.setTimeout(tick, 1500);
          return;
        }

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
          isFirstTypeOut = false;
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

    if (headings.length < 1) return;

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
      if (document.documentElement.classList.contains("use-type-animation")) {
        link.classList.add("type-animate-hidden");
      }
      nav.appendChild(link);

      return { heading, target, link };
    });

    globalLinks = links;

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

  const getTextNodes = (element) => {
    const nodes = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) {
          nodes.push(node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (tag !== "script" && tag !== "style" && tag !== "svg" && tag !== "iframe" && !node.closest(".icon") && !node.closest(".section-heading .eyebrow")) {
          for (let child = node.firstChild; child; child = child.nextSibling) {
            walk(child);
          }
        }
      }
    };
    walk(element);
    return nodes;
  };

  const typeNodes = (nodes, charIndex, nodeIndex, callback) => {
    if (isAnimationSkipped) return;
    if (nodeIndex >= nodes.length) {
      callback();
      return;
    }

    const item = nodes[nodeIndex];
    const fullText = item.originalText;
    
    let parent = item.node.parentElement;
    while (parent) {
      const tag = parent.tagName.toLowerCase();
      if (
        parent.classList.contains("tag-list") ||
        parent.classList.contains("entry-links") ||
        tag === "li" ||
        tag === "a"
      ) {
        parent.classList.add("type-animate-visible");
      }
      if (parent.classList.contains("entry") || parent.classList.contains("content-section") || parent.classList.contains("page-view")) {
        break;
      }
      parent = parent.parentElement;
    }

    const parentHeading = item.node.parentElement.closest("h1, h2, h3, h4, h5, h6");
    if (parentHeading) {
      const matchingLink = globalLinks.find(linkItem => linkItem.heading === parentHeading);
      if (matchingLink && matchingLink.link) {
        matchingLink.link.classList.remove("type-animate-hidden");
      }
    }
    
    const chunkSize = 2;
    let nextIndex = charIndex + chunkSize;
    if (nextIndex > fullText.length) {
      nextIndex = fullText.length;
    }
    
    item.node.textContent = fullText.slice(0, nextIndex);
    
    if (nextIndex < fullText.length) {
      animationTimeoutId = window.setTimeout(() => {
        typeNodes(nodes, nextIndex, nodeIndex, callback);
      }, 8);
    } else {
      animationTimeoutId = window.setTimeout(() => {
        typeNodes(nodes, 0, nodeIndex + 1, callback);
      }, 8);
    }
  };

  const playQueueItem = (index) => {
    if (isAnimationSkipped) return;
    if (index >= animationQueue.length) {
      console.log("Type-out animation queue finished successfully.");
      cleanupAnimation();
      return;
    }

    currentQueueIndex = index;
    const item = animationQueue[index];
    console.log("Playing queue item:", index, item.el, item.type);
    
    if (item.type === "type") {
      if (item.textNodes) {
        item.textNodes.forEach(tn => {
          tn.node.textContent = "";
        });
      }
      
      item.el.classList.add("type-animate-visible");
      
      typeNodes(item.textNodes || [], 0, 0, () => {
        if (item.onComplete) {
          item.onComplete();
        }
        animationTimeoutId = window.setTimeout(() => {
          playQueueItem(index + 1);
        }, 15);
      });
    } else if (item.type === "fade") {
      item.el.classList.add("type-animate-visible");
      if (item.onComplete) {
        item.onComplete();
      }
      animationTimeoutId = window.setTimeout(() => {
        playQueueItem(index + 1);
      }, 80);
    } else if (item.type === "custom") {
      if (item.action) {
        item.action();
      }
      if (item.onComplete) {
        item.onComplete();
      }
      playQueueItem(index + 1);
    }
  };

  const skipAnimation = () => {
    if (isAnimationSkipped) return;
    isAnimationSkipped = true;

    if (animationTimeoutId) {
      clearTimeout(animationTimeoutId);
      animationTimeoutId = null;
    }

    removeSkipListeners();
    document.documentElement.classList.add("type-animate-done");

    animationQueue.forEach(item => {
      if (item.type === "type" && item.textNodes) {
        item.textNodes.forEach(tn => {
          tn.node.textContent = tn.originalText;
        });
      }
      if (item.el) {
        item.el.classList.add("type-animate-visible");
      }
    });

    globalLinks.forEach(item => {
      if (item.link) {
        item.link.classList.remove("type-animate-hidden");
      }
    });

    if (!typeLoopInitialized) {
      initTypeLoop(true);
    }
  };

  const cleanupAnimation = () => {
    removeSkipListeners();
    document.documentElement.classList.add("type-animate-done");
    if (!typeLoopInitialized) {
      initTypeLoop(true);
    }
  };

  const skipEvents = ["mousedown", "keydown"];

  const addSkipListeners = () => {
    skipEvents.forEach(evt => {
      window.addEventListener(evt, skipAnimation, { passive: true });
    });
  };

  const removeSkipListeners = () => {
    skipEvents.forEach(evt => {
      window.removeEventListener(evt, skipAnimation);
    });
  };

  const startTypeAnimation = () => {
    document.documentElement.classList.remove("type-animate-done");
    animationQueue = [];
    currentQueueIndex = 0;
    isAnimationSkipped = false;

    const addToQueue = (selector, type, options = {}) => {
      const el = document.querySelector(selector);
      if (el) {
        animationQueue.push({ el, type, ...options });
      }
    };

    const addMultipleToQueue = (selector, type, options = {}) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        animationQueue.push({ el, type, ...options });
      });
    };

    const homeSection = document.getElementById("home");
    const pageView = document.querySelector(".page-view");

    if (homeSection) {
      addToQueue("#home .hero-copy .eyebrow", "type");
      addToQueue("#home .hero-copy .hero-identity", "fade", {
        onComplete: () => {
          initTypeLoop();
        }
      });
      addToQueue("#home .hero-copy .lead", "type");
      addToQueue("#home .hero-panel", "fade");
      addToQueue("#home .hero-copy .hero-actions", "fade");
      addMultipleToQueue("#home .hero-panel dl > div", "type");

      const sections = ["#research", "#projects", "#blog", "#experience", "#skills", "#education", "#contact"];
      sections.forEach(secId => {
        const sec = document.querySelector(secId);
        if (sec) {
          const heading = sec.querySelector(".section-heading");
          if (heading) {
            animationQueue.push({ el: heading, type: "type" });
          }
          if (secId === "#skills") {
            const rows = sec.querySelectorAll(".skill-row");
            rows.forEach(row => {
              animationQueue.push({ el: row, type: "type" });
            });
          } else if (secId === "#contact") {
            const p = sec.querySelector("p:not(.eyebrow)");
            if (p) {
              animationQueue.push({ el: p, type: "type" });
            }
            const a = sec.querySelector(".text-action");
            if (a) {
              animationQueue.push({ el: a, type: "type" });
            }
          } else {
            const entries = sec.querySelectorAll(".entry");
            entries.forEach(entry => {
              animationQueue.push({ el: entry, type: "type" });
            });
          }
        }
      });
    } else if (pageView) {
      addToQueue(".page-view .crumb", "type");
      addToQueue(".page-view .section-heading", "type");
      addToQueue(".page-view .post-header", "type");
      addToQueue(".page-view .post-content", "type");
      addMultipleToQueue(".page-view .about-grid .prose p", "type");
      addMultipleToQueue(".page-view .about-grid .highlights > div", "type");
      addMultipleToQueue(".page-view .entry", "type");
      addMultipleToQueue(".page-view .skill-row", "type");
      addToQueue(".page-view .contact-row", "type");
    }

    animationQueue.forEach(item => {
      if (item.type === "type") {
        item.textNodes = getTextNodes(item.el).map(node => ({
          node,
          originalText: node.textContent
        }));
      }
    });

    animationQueue.forEach(item => {
      if (item.type === "type") {
        const match = globalLinks.find(linkItem => linkItem.target === item.el || linkItem.heading === item.el);
        if (match && match.link) {
          const oldOnComplete = item.onComplete;
          item.onComplete = () => {
            if (oldOnComplete) oldOnComplete();
            match.link.classList.remove("type-animate-hidden");
          };
        }
      }
    });

    addSkipListeners();
    playQueueItem(0);
  };

  const init = () => {
    const isAnimatedNav = document.documentElement.classList.contains("use-type-animation");
    
    initCursorBlink();
    initPageToc();

    if (isAnimatedNav) {
      startTypeAnimation();
    } else {
      initTypeLoop();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
