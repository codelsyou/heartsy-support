(() => {
  "use strict";

  const codes = ["en", "de", "es", "fr", "pt-BR"];
  const storageKey = "heartsy.legal.language";
  const nodes = [...document.querySelectorAll("[data-i18n]")];
  const control = document.querySelector(".language-control");
  const select = document.querySelector("#legal-language");
  if (!control || !select) return;

  const english = { language: "Language", messages: [] };
  for (const node of nodes) {
    english.messages[Number(node.dataset.i18n.slice(1))] = node.innerHTML;
  }
  const catalogs = new Map([["en", Promise.resolve(english)]]);
  let current = "en";
  let revision = 0;

  function normalize(value) {
    const primary = String(value || "").trim().toLowerCase().replaceAll("_", "-").split("-")[0];
    if (primary === "pt") return "pt-BR";
    return codes.includes(primary) ? primary : null;
  }

  function requestedLanguage() {
    const url = new URL(window.location.href);
    // App 传来的语言始终优先于网页上一次的手动选择。
    if (url.searchParams.has("lang")) {
      return normalize(url.searchParams.get("lang")) || "en";
    }
    try {
      const saved = normalize(window.localStorage.getItem(storageKey));
      if (saved) return saved;
    } catch (_) {
      // 浏览器禁用存储时仍可通过 URL 和选择器切换。
    }
    return normalize(navigator.language) || "en";
  }

  function loadCatalog(code) {
    if (!catalogs.has(code)) {
      const request = fetch(`./locales/${code}.json?v=1`)
        .then((response) => {
          if (!response.ok) throw new Error("Language unavailable");
          return response.json();
        })
        .then((catalog) => {
          if (typeof catalog.language !== "string" || !Array.isArray(catalog.messages)) {
            throw new Error("Incomplete language");
          }
          for (const node of nodes) {
            const message = catalog.messages[Number(node.dataset.i18n.slice(1))];
            if (typeof message !== "string" || !message.trim()) {
              throw new Error("Incomplete language");
            }
          }
          return catalog;
        })
        .catch((error) => {
          catalogs.delete(code);
          throw error;
        });
      catalogs.set(code, request);
    }
    return catalogs.get(code);
  }

  function updateLinks(code) {
    for (const link of document.querySelectorAll("a[href]")) {
      const target = new URL(link.getAttribute("href"), window.location.href);
      if (target.origin !== window.location.origin) continue;
      if (!/\/(privacy|terms)\.html$/.test(target.pathname)) continue;
      // 页内目录仍使用锚点；跨协议跳转才补上当前语言。
      if (link.getAttribute("href").startsWith("#")) continue;
      target.searchParams.set("lang", code);
      link.setAttribute("href", `${target.pathname}${target.search}${target.hash}`);
    }
  }

  function updateUrl(code) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", code);
    window.history.replaceState(window.history.state, "", url);
  }

  async function changeLanguage(input, save = false) {
    const code = normalize(input) || "en";
    const request = ++revision;
    document.querySelector("main").setAttribute("aria-busy", "true");
    try {
      const catalog = await loadCatalog(code);
      if (request !== revision) return;
      // 译文仅来自本站固定白名单中的静态文件，保留正文原有链接。
      for (const node of nodes) {
        node.innerHTML = catalog.messages[Number(node.dataset.i18n.slice(1))];
      }
      document.documentElement.lang = code;
      document.title = document.querySelector(".site-footer p").textContent;
      document.querySelector('meta[name="description"]').content = document.querySelector(".hero p").textContent;
      document.querySelector(".toc-desktop").setAttribute("aria-label", catalog.messages[8]);
      document.querySelector(".nav").setAttribute("aria-label", `${catalog.messages[1]} / ${catalog.messages[2]}`);
      control.querySelector("label").textContent = catalog.language;
      current = code;
      select.value = code;
      updateLinks(code);
      updateUrl(code);
      if (save) {
        try {
          window.localStorage.setItem(storageKey, code);
        } catch (_) {
          // 手动切换不依赖持久化成功。
        }
      }
    } catch (_) {
      if (request !== revision) return;
      // 失败时保留已显示的完整版本，避免正文与语言选项不一致。
      select.value = current;
      updateLinks(current);
      updateUrl(current);
    } finally {
      if (request === revision) {
        document.querySelector("main").removeAttribute("aria-busy");
      }
    }
  }

  control.hidden = false;
  select.addEventListener("change", () => changeLanguage(select.value, true));
  window.addEventListener("popstate", () => changeLanguage(requestedLanguage()));
  changeLanguage(requestedLanguage());
})();
