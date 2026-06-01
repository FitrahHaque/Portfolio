// Portfolio script - Optimized scrolling and dynamic sidebar TOC behavior
(() => {
  let globalLinks = [];
  let animationQueue = [];
  let currentQueueIndex = 0;
  let animationTimeoutId = null;
  let isAnimationSkipped = false;
  let typeLoopInitialized = false;
  // 1 = name fully typed (sharp photo), 0 = name empty (most pixelated). Shared with initPixelate.
  let nameTypedRatio = 1;

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
        nameTypedRatio = text.length ? visibleCount / text.length : 1;
      };

      const tick = () => {
        if (isFirstTypeOut && isAnimationSkipped) {
          visibleCount = text.length;
          deleting = true;
          isFirstTypeOut = false;
          render();
          window.setTimeout(tick, 2000);
          return;
        }

        if (deleting) {
          visibleCount -= 1;
          if (visibleCount <= 0) {
            visibleCount = 0;
            deleting = false;
          render();
          window.setTimeout(tick, 220);
          return;
        }

        render();
        window.setTimeout(tick, 56);
        return;
      }

      visibleCount += 1;
      if (visibleCount >= text.length) {
        visibleCount = text.length;
        deleting = true;
        isFirstTypeOut = false;
        render();
        window.setTimeout(tick, 2000);
        return;
      }

      render();
      window.setTimeout(tick, 68);
    };

    render();
    window.setTimeout(tick, 560);
    });
  };

  const initCursorBlink = () => {
    const cursors = document.querySelectorAll(".cursor-name, .type-loop");
    if (!cursors.length) return;

    window.setInterval(() => {
      cursors.forEach((cursor) => {
        cursor.classList.toggle("cursor-hidden");
      });
    }, 560);
  };

  const initCopyEmail = () => {
    const buttons = document.querySelectorAll("[data-copy-email]");
    if (!buttons.length) return;

    const fallbackCopy = (text) => {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.top = "-999px";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      return copied;
    };

    const copyText = async (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      return fallbackCopy(text);
    };

    buttons.forEach((button) => {
      const label = button.querySelector("[data-copy-email-label]");
      if (!label || button.dataset.copyEmailReady === "true") return;

      button.dataset.copyEmailReady = "true";
      const defaultLabel = label.textContent;
      let resetTimeout = null;

      button.addEventListener("click", async () => {
        if (resetTimeout) {
          window.clearTimeout(resetTimeout);
        }

        try {
          await copyText(button.dataset.copyEmail);
          label.textContent = "Email address copied to clipboard";
        } catch {
          label.textContent = "Could not copy email";
        }

        resetTimeout = window.setTimeout(() => {
          label.textContent = defaultLabel;
        }, 2200);
      });
    });
  };

  const initEntryLinks = () => {
    const entries = document.querySelectorAll("[data-entry-link]");
    if (!entries.length) return;

    entries.forEach((entry) => {
      if (entry.dataset.entryLinkReady === "true") return;
      entry.dataset.entryLinkReady = "true";

      entry.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.target.closest("a, button, input, textarea, select, summary")) {
          return;
        }

        const href = entry.dataset.entryLink;
        if (href) {
          window.location.href = href;
        }
      });
    });
  };

  const initTopNavTouch = () => {
    // Any tap on the brand name or a nav link while already on the home page
    // should bypass the typing animation (same as back/forward navigation does).
    const brand = document.querySelector(".brand[href]");
    if (brand) {
      brand.addEventListener("click", () => {
        try { sessionStorage.setItem("skip-type-anim", "1"); } catch (_) {}
      });
      brand.addEventListener("touchend", () => {
        try { sessionStorage.setItem("skip-type-anim", "1"); } catch (_) {}
      }, { passive: true });
    }

    const links = document.querySelectorAll(".top-nav a[href]");
    if (!links.length) return;

    let touchStart = null;
    const tapDistance = 10;

    links.forEach((link) => {
      if (link.dataset.topNavTouchReady === "true") return;
      link.dataset.topNavTouchReady = "true";

      link.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) {
          touchStart = null;
          return;
        }

        const touch = event.touches[0];
        touchStart = {
          link,
          x: touch.clientX,
          y: touch.clientY
        };
      }, { passive: true });

      link.addEventListener("touchend", (event) => {
        if (!touchStart || touchStart.link !== link || event.changedTouches.length !== 1) {
          touchStart = null;
          return;
        }

        const touch = event.changedTouches[0];
        const moved = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y) > tapDistance;
        touchStart = null;
        if (moved) return;

        const href = link.getAttribute("href");
        if (!href) return;

        const target = new URL(href, window.location.href);
        if (target.href === window.location.href) return;

        // Let the home page know not to run the typing animation for this tap.
        try { sessionStorage.setItem("skip-type-anim", "1"); } catch (_) {}

        event.preventDefault();
        window.location.assign(target.href);
      });

      link.addEventListener("touchcancel", () => {
        touchStart = null;
      }, { passive: true });
    });
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
      // Build label from visible text only — skip aria-hidden spans (e.g. ↗ arrows).
      const clone = heading.cloneNode(true);
      clone.querySelectorAll("[aria-hidden]").forEach((el) => el.remove());
      const label = clone.textContent.trim();

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

    const mobileTocQuery = window.matchMedia("(max-width: 920px)");
    let mobileTocHideTimeout = null;

    const syncMobileTocTop = () => {
      if (!aside) return;
      const topbar = document.querySelector(".topbar");
      const top = topbar ? topbar.offsetHeight : 0;
      aside.style.setProperty("--mobile-toc-top", `${top}px`);
    };

    const hideMobileToc = () => {
      if (!aside) return;
      if (mobileTocHideTimeout) {
        window.clearTimeout(mobileTocHideTimeout);
        mobileTocHideTimeout = null;
      }
      aside.classList.remove("is-mobile-visible");
    };

    const scheduleMobileTocHide = () => {
      if (mobileTocHideTimeout) window.clearTimeout(mobileTocHideTimeout);
      mobileTocHideTimeout = window.setTimeout(() => {
        if (aside) aside.classList.remove("is-mobile-visible");
        mobileTocHideTimeout = null;
      }, 950);
    };

    const showMobileToc = () => {
      if (!aside || !mobileTocQuery.matches) {
        hideMobileToc();
        return;
      }

      syncMobileTocTop();
      // Bring it into view and (re)start the idle-hide countdown.
      aside.classList.add("is-mobile-visible");
      scheduleMobileTocHide();
    };

    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();
    let isScrollingUp = false;
    let isScrollingDownFast = false;

    const revealMobileToc = () => {
      if (!aside || !mobileTocQuery.matches) {
        hideMobileToc();
        return;
      }

      if (isScrollingUp || isScrollingDownFast) {
        showMobileToc();
      }
    };

    const onMobileTocViewportChange = () => {
      syncMobileTocTop();
      if (!mobileTocQuery.matches) {
        hideMobileToc();
      }
    };

    syncMobileTocTop();
    if (mobileTocQuery.addEventListener) {
      mobileTocQuery.addEventListener("change", onMobileTocViewportChange);
    } else if (mobileTocQuery.addListener) {
      mobileTocQuery.addListener(onMobileTocViewportChange);
    }

    const updateTocTruncation = () => {
      const isMobile = window.innerWidth <= 920;
      
      if (!isMobile) {
        // On desktop, show all links
        links.forEach(({ link }) => {
          link.style.display = "";
          link.style.removeProperty("--offset");
        });
        return;
      }
      
      const activeIndex = links.findIndex(({ link }) => link === activeLink);
      const targetActiveIndex = activeIndex === -1 ? 0 : activeIndex;

      links.forEach(({ link }, idx) => {
        const offset = idx - targetActiveIndex;
        link.style.setProperty("--offset", offset);
        
        // Show the active item, up to 2 items above, and up to 2 items below
        if (Math.abs(offset) <= 2) {
          link.style.display = "";
        } else {
          link.style.display = "none";
        }
      });
    };

    let activeLink = null;
    const setActive = (link) => {
      if (link === activeLink) return;
      if (activeLink) activeLink.classList.remove("is-active");
      if (link) link.classList.add("is-active");
      activeLink = link;
      updateTocTruncation();
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
        const targetHeight = link.target.offsetHeight;
        const headingY = link.heading.getBoundingClientRect().top + window.scrollY;
        return {
          link: link.link,
          target: link.target,
          heading: link.heading,
          y: Math.max(0, targetY - getTopOffset()),
          headingY: Math.max(0, headingY - getTopOffset()),
          targetBottom: Math.max(0, targetY + targetHeight - getTopOffset())
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

      const currentScroll = window.scrollY;
      const isMobile = window.innerWidth <= 920;

      if (!isMobile) {
        // Desktop view: keep currently active item as active as long as its content is still on screen (not out of screen from above/below)
        let activeItem = null;
        if (activeLink) {
          activeItem = snapTargets.find(item => item.link === activeLink);
        }

        if (activeItem && currentScroll >= activeItem.y - 2 && currentScroll < activeItem.targetBottom - 2) {
          return;
        }

        // Otherwise, fall back to default desktop scroll-spy using headingY
        let current = snapTargets[0];
        for (const item of snapTargets) {
          if (currentScroll >= item.headingY - 2) {
            current = item;
          } else {
            break;
          }
        }
        if (current) {
          setActive(current.link);
        }
        return;
      }

      // Mobile view: directional scroll-spy rules
      let current = null;
      if (isScrollingUp || isScrollingDownFast) {
        // Scrolling up or down fast: Find first heading visible / below current scroll position
        current = snapTargets.find(item => item.headingY >= currentScroll);
        if (!current && snapTargets.length > 0) {
          current = snapTargets[snapTargets.length - 1];
        }
      } else {
        // Default / normal scroll-spy
        current = snapTargets[0];
        for (const item of snapTargets) {
          if (currentScroll >= item.headingY - 2) {
            current = item;
          } else {
            break;
          }
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
      const currentScroll = window.scrollY;
      const currentTime = Date.now();
      const diffY = currentScroll - lastScrollY;
      const timeDiff = currentTime - lastScrollTime;

      if (timeDiff > 0 && Math.abs(diffY) > 2) {
        isScrollingUp = diffY < -2;
        const speed = Math.abs(diffY) / timeDiff;
        isScrollingDownFast = diffY > 2 && speed > 1.8;

        lastScrollY = currentScroll;
        lastScrollTime = currentTime;
      } else if (timeDiff > 100) {
        isScrollingUp = false;
        isScrollingDownFast = false;
        lastScrollY = currentScroll;
        lastScrollTime = currentTime;
      }

      revealMobileToc();

      // Keep the mobile TOC alive while the user is still scrolling.
      if (aside && aside.classList.contains("is-mobile-visible") && mobileTocQuery.matches) {
        scheduleMobileTocHide();
      }

      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          updateActive();
          updateTocTruncation();
          ticking = false;
        });
      }
    };

    const onResize = () => {
      syncMobileTocTop();
      updateSnapTargets();
      updateTocTruncation();
      onScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("load", onResize);

    updateSnapTargets();
    updateActive();
    updateTocTruncation();

    window.requestAnimationFrame(() => {
      updateSnapTargets();
      updateActive();
      updateTocTruncation();
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
  const tapSkipDistance = 12;
  let skipTouchStart = null;

  const getPrimaryTouch = (event, listName) => {
    const touches = event[listName];
    return touches && touches.length === 1 ? touches[0] : null;
  };

  const onSkipTouchStart = (event) => {
    const touch = getPrimaryTouch(event, "touches");
    if (!touch) {
      skipTouchStart = null;
      return;
    }

    skipTouchStart = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      moved: false
    };
  };

  const onSkipTouchMove = (event) => {
    if (!skipTouchStart) return;
    const touch = getPrimaryTouch(event, "touches");
    if (!touch) {
      skipTouchStart = null;
      return;
    }

    const distance = Math.hypot(touch.clientX - skipTouchStart.x, touch.clientY - skipTouchStart.y);
    if (distance > tapSkipDistance) {
      skipTouchStart.moved = true;
    }
  };

  const onSkipTouchEnd = (event) => {
    if (!skipTouchStart) return;

    const touch = getPrimaryTouch(event, "changedTouches");
    const distance = touch
      ? Math.hypot(touch.clientX - skipTouchStart.x, touch.clientY - skipTouchStart.y)
      : 0;
    const elapsed = Date.now() - skipTouchStart.time;
    const isTap = !skipTouchStart.moved && distance <= tapSkipDistance && elapsed < 750;

    skipTouchStart = null;

    if (isTap) {
      skipAnimation();
    }
  };

  const onSkipTouchCancel = () => {
    skipTouchStart = null;
  };

  const addSkipListeners = () => {
    skipEvents.forEach(evt => {
      window.addEventListener(evt, skipAnimation, { passive: true });
    });
    window.addEventListener("touchstart", onSkipTouchStart, { passive: true });
    window.addEventListener("touchmove", onSkipTouchMove, { passive: true });
    window.addEventListener("touchend", onSkipTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onSkipTouchCancel, { passive: true });
  };

  const removeSkipListeners = () => {
    skipEvents.forEach(evt => {
      window.removeEventListener(evt, skipAnimation);
    });
    window.removeEventListener("touchstart", onSkipTouchStart);
    window.removeEventListener("touchmove", onSkipTouchMove);
    window.removeEventListener("touchend", onSkipTouchEnd);
    window.removeEventListener("touchcancel", onSkipTouchCancel);
    skipTouchStart = null;
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
      addToQueue("#home .hero-copy .hero-identity", "fade", {
        onComplete: () => {
          initTypeLoop();
        }
      });
      addToQueue("#home .hero-copy .lead", "type");
      addToQueue("#home .hero-copy .hero-actions", "fade");

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
            sec.querySelectorAll(".contact-links .text-action").forEach(action => {
              animationQueue.push({ el: action, type: "type" });
            });
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
      addToQueue(".page-view .prose", "type");
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

  const initMascot = () => {
    const mascot = document.createElement("div");
    mascot.className = "mascot-container is-sleeping";
    mascot.setAttribute("aria-hidden", "true");
    
    mascot.innerHTML = `
      <div class="mascot-sprite">
        <svg viewBox="0 0 64 64" fill="none" style="display: block;">
          <!-- 1. Tail (background layer) -->
          <path class="mascot-tail" d="M20 40 C9 42 7 31 14 26 C21 21 24 29 18 32" stroke="#00f0ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          
          <!-- 2. Paws/Legs (drawn next so body covers their tops) -->
          <g class="mascot-paw leg-bl">
            <rect x="22" y="45" width="5.5" height="10" rx="2.75" fill="var(--mascot-fill)" stroke="#00f0ff" stroke-width="2.2" />
          </g>
          <g class="mascot-paw leg-br">
            <rect x="28" y="45.5" width="5.5" height="10" rx="2.75" fill="var(--mascot-fill)" stroke="#00f0ff" stroke-width="2.2" />
          </g>
          <g class="mascot-paw leg-fl">
            <rect x="38" y="45" width="5.5" height="10" rx="2.75" fill="var(--mascot-fill)" stroke="#00f0ff" stroke-width="2.2" />
          </g>
          <g class="mascot-paw leg-fr">
            <rect x="44" y="45.5" width="5.5" height="10" rx="2.75" fill="var(--mascot-fill)" stroke="#00f0ff" stroke-width="2.2" />
          </g>

          <!-- 3. Body Stroke -->
          <ellipse class="mascot-body-stroke" cx="35" cy="40" rx="17" ry="12" stroke="#00f0ff" stroke-width="3.2" fill="none" />
          <!-- 4. Body Fill (covers overlapping leg and tail strokes) -->
          <ellipse class="mascot-body-fill" cx="35" cy="40" rx="17" ry="12" fill="var(--mascot-fill)" stroke="none" />

          <!-- 5. Head Stroke -->
          <circle class="mascot-head-stroke" cx="49" cy="28" r="11" stroke="#00f0ff" stroke-width="3.2" fill="none" />
          <!-- 6. Head Fill (covers intersecting body strokes) -->
          <circle class="mascot-head-fill" cx="49" cy="28" r="11" fill="var(--mascot-fill)" stroke="none" />

          <!-- 7. Ears (filled and outlined, layered on head) -->
          <path class="mascot-ear-l" d="M40.5 20 L44 9.5 L50 19 Z" fill="var(--mascot-fill)" stroke="#00f0ff" stroke-width="3" stroke-linejoin="round" />
          <path class="mascot-ear-r" d="M50 19 L57.5 11.5 L58.5 23 Z" fill="var(--mascot-fill)" stroke="#00f0ff" stroke-width="3" stroke-linejoin="round" />

          <!-- 8. Details (Chest details, Eyes, Snout, Whiskers) -->
          <path class="mascot-chest" d="M25 38 C30 44 40 44 46 38" stroke="#00f0ff" stroke-width="1.6" stroke-linecap="round" opacity="0.45" fill="none" />
          <circle class="mascot-eye-l" cx="46" cy="27" r="1.5" fill="#00f0ff" />
          <circle class="mascot-eye-r" cx="53" cy="28" r="1.5" fill="#00f0ff" />
          <!-- Startled eyes (> <) -->
          <path class="mascot-eye-shock-l" d="M44.5 25 L47.5 27 L44.5 29" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <path class="mascot-eye-shock-r" d="M54.5 26 L51.5 28 L54.5 30" stroke="#00f0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <path class="mascot-nose" d="M49 31 L50.5 32.4 L52 31" stroke="#00f0ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <path class="mascot-whisker-l" d="M44 31.5 L38.5 30 M44 34 L38.5 35" stroke="#00f0ff" stroke-width="1.25" stroke-linecap="round" opacity="0.75" />
          <path class="mascot-whisker-r" d="M55 32 L60 31 M55 34.4 L59.5 36" stroke="#00f0ff" stroke-width="1.25" stroke-linecap="round" opacity="0.75" />
        </svg>
      </div>
    `;
    
    document.body.appendChild(mascot);
    
    const mascotSize = mascot.getBoundingClientRect().width || 36;

    const getBounds = () => {
      const size = mascotSize;
      const padding = 16;
      const topbar = document.querySelector(".topbar");
      const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : 0;
      const minY = Math.min(window.innerHeight - size - padding, Math.max(padding, topbarBottom + 10));
      const maxY = Math.max(minY, window.innerHeight - size - padding);
      const maxX = Math.max(padding, window.innerWidth - size - padding);

      return {
        minX: padding,
        maxX,
        minY,
        maxY
      };
    };

    const initialBounds = getBounds();
    let x = Math.min(46, initialBounds.maxX);
    let y = Math.min(Math.max(window.innerHeight * 0.68, initialBounds.minY), initialBounds.maxY);
    let targetX = x;
    let targetY = y;
    let activeUntil = 0;
    let route = null;
    let isWalking = false;
    let isMascotSleeping = true;
    let isReacting = false;
    let reactionTimeoutId = null;
    
    const renderPosition = () => {
      mascot.style.setProperty("--mascot-x", `${Math.round(x)}px`);
      mascot.style.setProperty("--mascot-y", `${Math.round(y)}px`);
    };

    const clampToViewport = () => {
      const bounds = getBounds();
      x = Math.min(Math.max(x, bounds.minX), bounds.maxX);
      y = Math.min(Math.max(y, bounds.minY), bounds.maxY);
      targetX = Math.min(Math.max(targetX, bounds.minX), bounds.maxX);
      targetY = Math.min(Math.max(targetY, bounds.minY), bounds.maxY);
      route = null;
      renderPosition();
    };

    renderPosition();

    const getAvoidRects = () => {
      const selectors = [
        ".topbar",
        "main h1",
        "main h2",
        "main h3",
        "main p",
        "main li",
        "main .hero-mark",
        "main .hero-panel",
        "main .entry",
        "main .skill-row",
        "main .text-action",
        "main .entry-links"
      ];

      return [...document.querySelectorAll(selectors.join(","))]
        .map(el => el.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight)
        .map(rect => ({
          left: Math.max(0, rect.left - 16),
          top: Math.max(0, rect.top - 14),
          right: Math.min(window.innerWidth, rect.right + 16),
          bottom: Math.min(window.innerHeight, rect.bottom + 14)
        }));
    };

    const getOverlapArea = (a, b) => {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return width * height;
    };

    const chooseTarget = () => {
      const bounds = getBounds();
      const size = mascotSize;
      const avoidRects = getAvoidRects();
      
      let best = null;
      let bestScore = Number.POSITIVE_INFINITY;
      
      // Decides whether to move horizontally or vertically
      // 60% chance horizontal, 40% vertical
      const moveHorizontal = Math.random() < 0.60;
      
      for (let i = 0; i < 30; i++) {
        let candidateX, candidateY;
        
        if (moveHorizontal) {
          candidateY = y; // Keep same Y
          
          // 70% chance to go to an extreme edge (left or right)
          if (Math.random() < 0.70) {
            candidateX = Math.random() < 0.5 ? bounds.minX : bounds.maxX;
          } else {
            candidateX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
          }
        } else {
          candidateX = x; // Keep same X
          
          // 70% chance to go to an extreme Y edge (top or bottom)
          if (Math.random() < 0.70) {
            candidateY = Math.random() < 0.5 ? bounds.minY : bounds.maxY;
          } else {
            candidateY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
          }
        }
        
        // Ensure it doesn't pick a target too close to its current position
        const dist = Math.hypot(candidateX - x, candidateY - y);
        if (dist < size * 1.5) continue;
        
        const candidateRect = {
          left: candidateX,
          top: candidateY,
          right: candidateX + size,
          bottom: candidateY + size
        };
        
        // Calculate overlap with text/elements
        const overlapScore = avoidRects.reduce((total, rect) => total + getOverlapArea(candidateRect, rect), 0);
        
        // Prefer edge locations
        const isOnEdge = (
          Math.abs(candidateX - bounds.minX) < 10 ||
          Math.abs(candidateX - bounds.maxX) < 10 ||
          Math.abs(candidateY - bounds.minY) < 10 ||
          Math.abs(candidateY - bounds.maxY) < 10
        );
        const edgePenalty = isOnEdge ? 0 : 600; // Prefer edges
        
        const score = overlapScore + edgePenalty;
        
        if (score < bestScore) {
          bestScore = score;
          best = { x: candidateX, y: candidateY };
        }
      }
      
      // Fallback if no candidate was found (e.g. all were too close or invalid)
      if (!best) {
        if (moveHorizontal) {
          best = { x: Math.abs(x - bounds.minX) < 2 ? bounds.maxX : bounds.minX, y };
        } else {
          best = { x, y: Math.abs(y - bounds.minY) < 2 ? bounds.maxY : bounds.minY };
        }
      }
      
      return best;
    };

    const beginRoute = target => {
      targetX = target.x;
      targetY = target.y;
      const dx = targetX - x;
      const dy = targetY - y;
      const distance = Math.hypot(dx, dy);

      if (distance < 10) {
        route = null;
        isWalking = false;
        mascot.classList.remove("is-walking");
        return;
      }

      // For purely straight horizontal and vertical paths,
      // control point is exactly the midpoint.
      route = {
        startX: x,
        startY: y,
        controlX: (x + targetX) / 2,
        controlY: (y + targetY) / 2,
        endX: targetX,
        endY: targetY,
        startedAt: performance.now(),
        duration: Math.max(3000, (distance / 20) * 1000)
      };

      isWalking = true;
      mascot.classList.add("is-walking");

      if (Math.abs(dx) > 6) {
        mascot.style.setProperty("--mascot-facing", dx > 0 ? "1" : "-1");
      }
    };
    
    const setRandomTarget = () => {
      if (isMascotSleeping || isReacting || route) return;
      
      if (Math.random() < 0.28) {
        isWalking = false;
        mascot.classList.remove("is-walking");
        return;
      }
      const target = chooseTarget();
      beginRoute(target);
    };
    
    const updatePosition = now => {
      if (!isMascotSleeping && route && !isReacting) {
        const t = Math.min((now - route.startedAt) / route.duration, 1);
        const eased = t;
        const inverse = 1 - eased;
        const nextX = inverse * inverse * route.startX + 2 * inverse * eased * route.controlX + eased * eased * route.endX;
        const nextY = inverse * inverse * route.startY + 2 * inverse * eased * route.controlY + eased * eased * route.endY;
        const stepX = nextX - x;
        const stepY = nextY - y;

        x = nextX;
        y = nextY;

        const totalDx = route.endX - route.startX;
        const totalDy = route.endY - route.startY;
        
        let facing = 1;
        let rotationDeg = 0;
        
        if (Math.abs(totalDx) > Math.abs(totalDy)) {
          // Horizontal movement
          facing = totalDx > 0 ? 1 : -1;
          rotationDeg = 0;
        } else {
          // Pure vertical movement (climbing)
          const bounds = getBounds();
          const isNearLeft = (x - bounds.minX) < (bounds.maxX - x);
          
          if (isNearLeft) {
            facing = -1;
            rotationDeg = totalDy < 0 ? 90 : -90;
          } else {
            facing = 1;
            rotationDeg = totalDy < 0 ? -90 : 90;
          }
        }
        
        const rotationDegRounded = Math.round(rotationDeg);
        mascot.style.setProperty("--mascot-facing", facing);
        mascot.style.setProperty("--mascot-rotation", `${rotationDegRounded}deg`);

        if (t >= 1) {
          x = route.endX;
          y = route.endY;
          route = null;
          isWalking = false;
          mascot.classList.remove("is-walking");
          mascot.style.setProperty("--mascot-rotation", "0deg");
        }
        renderPosition();
      }
      requestAnimationFrame(updatePosition);
    };
    
    const sleep = () => {
      isMascotSleeping = true;
      isWalking = false;
      activeUntil = 0;
      route = null;
      mascot.classList.remove("is-walking", "is-reacting");
      mascot.classList.add("is-sleeping");
      mascot.style.setProperty("--mascot-rotation", "0deg");
    };

    const wakeForWalk = (duration = 14000, startNow = true) => {
      activeUntil = Math.max(activeUntil, Date.now() + duration);
      if (isMascotSleeping) {
        isMascotSleeping = false;
        mascot.classList.remove("is-sleeping");
      }
      if (startNow) {
        setRandomTarget();
      }
    };
    
    const react = () => {
      wakeForWalk(45000, false);
      if (reactionTimeoutId) {
        clearTimeout(reactionTimeoutId);
      }
      isReacting = true;
      isWalking = false;
      route = null;
      mascot.classList.remove("is-walking");
      mascot.classList.add("is-reacting");

      reactionTimeoutId = window.setTimeout(() => {
        isReacting = false;
        mascot.classList.remove("is-reacting");
        
        // Force start walking immediately after getting hurt
        const target = chooseTarget();
        beginRoute(target);
      }, 800);
    };
    
    window.addEventListener("resize", () => {
      clampToViewport();
    }, { passive: true });

    window.addEventListener("scroll", sleep, { passive: true });
    window.addEventListener("keydown", sleep, { passive: true });
    
    window.setInterval(() => {
      if (isMascotSleeping || isReacting) return;

      if (Date.now() > activeUntil) {
        if (!isWalking) {
          sleep();
        }
        return;
      }

      if (!isWalking) {
        setRandomTarget();
      }
    }, 1600);
    
    mascot.addEventListener("pointerenter", () => {
      wakeForWalk(35000);
    }, { passive: true });

    mascot.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      react();
    });
    
    updatePosition();
  };

  // Pixelate/unpixelate the hero photo in lockstep with the name typing.
  const initPixelate = () => {
    const holder = document.querySelector("[data-pixelate]");
    if (!holder) return;
    const img = holder.querySelector("img");
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    holder.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const base = document.createElement("canvas");
    const bctx = base.getContext("2d");
    const temp = document.createElement("canvas");
    const tctx = temp.getContext("2d");
    if (!ctx || !bctx || !tctx) return;

    let w = 0;
    let h = 0;
    let ready = false;

    // Render the image once, cover-fitted, at device resolution.
    const buildBase = () => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (!iw || !ih) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = holder.getBoundingClientRect();
      w = Math.max(1, Math.round((rect.width || 72) * dpr));
      h = Math.max(1, Math.round((rect.height || 72) * dpr));
      canvas.width = w;
      canvas.height = h;
      base.width = w;
      base.height = h;
      temp.width = w;
      temp.height = h;

      const scale = Math.max(w / iw, h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      bctx.clearRect(0, 0, w, h);
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ready = true;
      return true;
    };

    // cell = 1 -> sharp; larger -> chunkier blocks.
    const drawCell = (cell) => {
      const cols = Math.max(1, Math.round(w / cell));
      const rows = Math.max(1, Math.round(h / cell));
      tctx.clearRect(0, 0, w, h);
      tctx.imageSmoothingEnabled = true;
      tctx.drawImage(base, 0, 0, w, h, 0, 0, cols, rows);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(temp, 0, 0, cols, rows, 0, 0, w, h);
    };

    let lastCell = -1;
    const frame = () => {
      if (ready) {
        const maxCell = Math.max(6, w / 9);
        // Mirror the name: fully typed -> sharp; empty -> most pixelated.
        const amount = Math.min(1, Math.max(0, 1 - nameTypedRatio));
        const cell = 1 + (maxCell - 1) * Math.pow(amount, 1.25);
        if (Math.abs(cell - lastCell) > 0.05) {
          drawCell(cell);
          lastCell = cell;
        }
      }
      window.requestAnimationFrame(frame);
    };

    const activate = () => {
      if (buildBase()) {
        holder.classList.add("is-pixelating");
        lastCell = -1;
      }
    };

    if (img.complete && img.naturalWidth) activate();
    img.addEventListener("load", activate);
    window.addEventListener("load", activate);
    window.setTimeout(activate, 300);

    let resizeTimer = 0;
    window.addEventListener(
      "resize",
      () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          buildBase();
          lastCell = -1;
        }, 150);
      },
      { passive: true }
    );

    window.requestAnimationFrame(frame);
  };

  const init = () => {
    const isAnimatedNav = document.documentElement.classList.contains("use-type-animation");
    
    initCursorBlink();
    initCopyEmail();
    initEntryLinks();
    initTopNavTouch();
    initPageToc();
    initPixelate();

    if (isAnimatedNav) {
      startTypeAnimation();
    } else {
      initTypeLoop();
    }

    if (document.getElementById("home")) {
      initMascot();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
