(function () {
  "use strict";

  var body = document.body;
  var header = document.getElementById("siteHeader");
  var backTop = document.getElementById("backTop");
  var readingBar = document.getElementById("readingBar");
  var ringProgress = document.getElementById("ringProgress");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ringLength = 2 * Math.PI * 23;
  var ticking = false;

  /* ------------------------------------------------------------------
     Header / scroll UI
     ------------------------------------------------------------------ */

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      header.classList.toggle("is-scrolled", y > 18);
    }

    if (backTop) {
      backTop.classList.toggle("show", y > 620);
    }

    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

    if (readingBar) {
      readingBar.style.width = (progress * 100).toFixed(2) + "%";
    }

    if (ringProgress) {
      ringProgress.style.strokeDashoffset = String(ringLength * (1 - progress));
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateScrollUI();

  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */

  var menuToggle = document.querySelector("[data-menu-toggle]");
  var menuClose = document.querySelector("[data-menu-close]");
  var mobileMenu = document.getElementById("mobileMenu");

  function setMenu(open) {
    if (!mobileMenu) return;
    body.classList.toggle("menu-open", open);
    mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    }
    if (open && menuClose) {
      window.setTimeout(function () { menuClose.focus(); }, 120);
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      setMenu(!body.classList.contains("menu-open"));
    });
  }

  if (menuClose) {
    menuClose.addEventListener("click", function () {
      setMenu(false);
      if (menuToggle) menuToggle.focus();
    });
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
  }

  /* ------------------------------------------------------------------
     Local search
     ------------------------------------------------------------------ */

  var searchOverlay = document.getElementById("searchOverlay");
  var searchInput = document.getElementById("searchInput");
  var searchResults = document.getElementById("searchResults");
  var searchEmpty = document.getElementById("searchEmpty");
  var searchCaption = document.getElementById("searchCaption");
  var searchHint = document.getElementById("searchHint");
  var searchData = document.getElementById("search-data");
  var searchPosts = [];
  var searchIndex = -1;
  var searchTrigger = null;

  if (searchData) {
    try {
      searchPosts = JSON.parse(searchData.textContent || "[]");
    } catch (err) {
      searchPosts = [];
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightTitle(title, query) {
    var safe = escapeHtml(title);
    if (!query) return safe;
    try {
      var re = new RegExp("(" + escapeRegExp(escapeHtml(query)) + ")", "ig");
      return safe.replace(re, "<mark>$1</mark>");
    } catch (err) {
      return safe;
    }
  }

  function contentSnippet(text, query) {
    if (!text || !query) return "";
    var lower = text.toLowerCase();
    var q = query.toLowerCase();
    var index = lower.indexOf(q);
    if (index === -1) return "";
    var start = Math.max(0, index - 24);
    var end = Math.min(text.length, index + q.length + 42);
    var snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    return highlightTitle(snippet, query);
  }

  function resultMarkup(post, index, query) {
    var tags = post.tags && post.tags.length ? post.tags.join(" · ") : "DIVE LOG";
    var snippet = contentSnippet(post.text || "", query);
    var titleHasQuery = query && post.title && post.title.toLowerCase().indexOf(query.toLowerCase()) !== -1;
    var subline = snippet && !titleHasQuery ? snippet : escapeHtml(tags);
    return (
      '<a class="search-result" data-index="' + index + '" href="' + escapeHtml(post.url) + '">' +
        "<time>" + escapeHtml(post.date) + "</time>" +
        '<span class="search-result-main">' +
          "<b>" + highlightTitle(post.title, query) + "</b>" +
          "<span>" + subline + "</span>" +
        "</span>" +
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</a>"
    );
  }

  function setActiveResult(index) {
    if (!searchResults) return;
    var items = searchResults.querySelectorAll(".search-result");
    if (!items.length) {
      searchIndex = -1;
      return;
    }
    searchIndex = (index + items.length) % items.length;
    items.forEach(function (item, i) {
      item.classList.toggle("active", i === searchIndex);
    });
    items[searchIndex].scrollIntoView({ block: "nearest" });
  }

  function renderSearch(query) {
    if (!searchResults || !searchEmpty) return;
    var q = (query || "").trim().toLowerCase();
    var results = searchPosts;

    if (q) {
      results = searchPosts.filter(function (post) {
        var haystack = [post.title, (post.tags || []).join(" "), post.date, post.text || ""]
          .join(" ")
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    } else {
      results = searchPosts.slice(0, 5);
    }

    if (searchCaption) {
      searchCaption.textContent = q ? "搜索结果 · " + results.length : "最近日志";
    }

    if (searchHint) {
      searchHint.textContent = q
        ? results.length ? "找到 " + results.length + " 篇日志" : "换个关键词试试"
        : "输入关键词开始搜索";
    }

    if (!results.length) {
      searchResults.innerHTML = "";
      searchEmpty.hidden = false;
      searchIndex = -1;
      return;
    }

    searchEmpty.hidden = true;
    searchResults.innerHTML = results
      .slice(0, 8)
      .map(function (post, i) { return resultMarkup(post, i, q); })
      .join("");
    searchIndex = -1;

    searchResults.querySelectorAll(".search-result").forEach(function (item) {
      item.addEventListener("mouseenter", function () {
        setActiveResult(Number(item.getAttribute("data-index")) || 0);
      });
    });
  }

  function openSearch(trigger) {
    if (!searchOverlay) return;
    searchTrigger = trigger || document.activeElement;
    searchOverlay.hidden = false;
    body.classList.add("search-open");
    renderSearch("");
    if (searchInput) {
      searchInput.value = "";
      window.setTimeout(function () { searchInput.focus(); }, 40);
    }
  }

  function closeSearch() {
    if (!searchOverlay || searchOverlay.hidden) return;
    searchOverlay.hidden = true;
    body.classList.remove("search-open");
    if (searchTrigger && typeof searchTrigger.focus === "function") {
      searchTrigger.focus();
    }
  }

  document.querySelectorAll("[data-search-open]").forEach(function (button) {
    button.addEventListener("click", function () { openSearch(button); });
  });

  document.querySelectorAll("[data-search-close]").forEach(function (button) {
    button.addEventListener("click", closeSearch);
  });

  if (searchOverlay) {
    searchOverlay.addEventListener("click", function (event) {
      if (event.target === searchOverlay) closeSearch();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () { renderSearch(searchInput.value); });
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveResult(searchIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveResult(searchIndex - 1);
      } else if (event.key === "Enter") {
        var items = searchResults ? searchResults.querySelectorAll(".search-result") : [];
        var target = searchIndex >= 0 ? items[searchIndex] : items[0];
        if (target) {
          event.preventDefault();
          window.location.href = target.getAttribute("href");
        }
      }
    });
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (searchOverlay && !searchOverlay.hidden) {
        closeSearch();
      } else if (body.classList.contains("menu-open")) {
        setMenu(false);
        if (menuToggle) menuToggle.focus();
      }
      return;
    }

    if (isTypingTarget(event.target)) return;

    if (event.key === "/" && searchOverlay) {
      event.preventDefault();
      openSearch(document.activeElement);
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && searchOverlay) {
      event.preventDefault();
      openSearch(document.activeElement);
    }
  });

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */

  var revealItems = document.querySelectorAll("[data-reveal]");

  if (revealItems.length) {
    if (!("IntersectionObserver" in window) || reduceMotion) {
      revealItems.forEach(function (item) { item.classList.add("is-visible"); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -36px 0px" });

      revealItems.forEach(function (item) { revealObserver.observe(item); });
    }
  }

  /* ------------------------------------------------------------------
     Code blocks — language + copy
     ------------------------------------------------------------------ */

  document.querySelectorAll(".post-body figure.highlight").forEach(function (figure) {
    var code = figure.querySelector(".code pre") || figure.querySelector("pre");
    if (!code) return;

    var language = "CODE";
    figure.classList.forEach(function (name) {
      if (name && name !== "highlight") language = name.toUpperCase();
    });

    var langLabel = document.createElement("span");
    langLabel.className = "code-lang";
    langLabel.textContent = language;
    figure.appendChild(langLabel);

    var copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "code-copy";
    copyButton.setAttribute("aria-label", "复制代码");
    copyButton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.6"/></svg><span>复制</span>';
    figure.appendChild(copyButton);

    copyButton.addEventListener("click", function () {
      var text = code.innerText.replace(/\n$/, "");
      var done = function () {
        copyButton.classList.add("is-copied");
        copyButton.querySelector("span").textContent = "已复制";
        window.setTimeout(function () {
          copyButton.classList.remove("is-copied");
          copyButton.querySelector("span").textContent = "复制";
        }, 1600);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  });

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (err) { /* noop */ }
    document.body.removeChild(area);
  }

  /* ------------------------------------------------------------------
     Heading anchors
     ------------------------------------------------------------------ */

  document.querySelectorAll(".article-body h2[id], .article-body h3[id], .article-body h4[id]").forEach(function (heading) {
    if (heading.querySelector(".heading-anchor")) return;
    var anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = "#" + heading.id;
    anchor.textContent = "#";
    anchor.setAttribute("aria-label", "链接到这一节");
    heading.appendChild(anchor);
  });

  /* ------------------------------------------------------------------
     TOC active section
     ------------------------------------------------------------------ */

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length) {
    var tocTargets = tocLinks.map(function (link) {
      var id = link.getAttribute("href").slice(1);
      try { id = decodeURIComponent(id); } catch (err) { /* noop */ }
      return { link: link, target: document.getElementById(id) };
    }).filter(function (item) { return item.target; });

    var setTocActive = function () {
      var active = null;
      tocTargets.forEach(function (item) {
        if (item.target.getBoundingClientRect().top <= 160) active = item;
      });
      tocLinks.forEach(function (link) { link.classList.remove("active"); });
      if (active) active.link.classList.add("active");
    };

    window.addEventListener("scroll", setTocActive, { passive: true });
    setTocActive();
  }

  /* ------------------------------------------------------------------
     Whale parallax
     ------------------------------------------------------------------ */

  var whaleStage = document.querySelector("[data-parallax]");
  var hero = document.querySelector(".hero");
  var pointerFine = window.matchMedia("(pointer: fine)").matches;

  if (whaleStage && hero && pointerFine && !reduceMotion) {
    var targetX = 0;
    var targetY = 0;
    var currentX = 0;
    var currentY = 0;
    var parallaxFrame = null;

    var animateParallax = function () {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      whaleStage.style.transform = "translate3d(" + currentX.toFixed(2) + "px," + currentY.toFixed(2) + "px,0)";

      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        parallaxFrame = window.requestAnimationFrame(animateParallax);
      } else {
        parallaxFrame = null;
      }
    };

    hero.addEventListener("pointermove", function (event) {
      var rect = hero.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 12;

      if (!parallaxFrame) parallaxFrame = window.requestAnimationFrame(animateParallax);
    });

    hero.addEventListener("pointerleave", function () {
      targetX = 0;
      targetY = 0;
      if (!parallaxFrame) parallaxFrame = window.requestAnimationFrame(animateParallax);
    });
  }

  /* ------------------------------------------------------------------
     Smooth anchors with fixed header offset
     ------------------------------------------------------------------ */

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      var target = hash === "#top" ? document.body : document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      var top = hash === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", hash);
    });
  });
})();
