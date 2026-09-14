const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const root = path.join(__dirname, "..");
const codes = ["en", "de", "es", "fr", "pt-BR"];
const catalogs = Object.fromEntries(codes.map(code => [code,
  JSON.parse(fs.readFileSync(path.join(root, "locales", `${code}.json`), "utf8"))
]));
const script = fs.readFileSync(path.join(root, "legal-language.js"), "utf8");

function element(html = "") {
  const attrs = new Map();
  return {
    innerHTML: html,
    get textContent() { return this.innerHTML.replace(/<[^>]*>/g, ""); },
    set textContent(value) { this.innerHTML = value; },
    getAttribute(key) { return attrs.get(key); },
    setAttribute(key, value) { attrs.set(key, value); },
    removeAttribute(key) { attrs.delete(key); }
  };
}

function setup({ url = "http://example.test/privacy.html?lang=en", saved,
  browserLanguage = "en", storageDisabled = false, fetchCatalog } = {}) {
  const nodes = catalogs.en.messages.map((text, index) =>
    Object.assign(element(text), { dataset: { i18n: `m${index}` } }));
  const select = { value: "en", addEventListener(_, callback) { this.change = callback; } };
  const label = element("Language");
  const control = { hidden: true, querySelector: () => label };
  const main = element();
  const links = ["./privacy.html#rights", "./terms.html", "#collect", "mailto:support@heartsyapp.com"].map(href => {
    const link = element(); link.setAttribute("href", href); return link;
  });
  const selectors = {
    ".language-control": control, "#legal-language": select, main,
    ".site-footer p": nodes[82], ".hero p": nodes[5],
    'meta[name="description"]': {}, ".toc-desktop": element(), ".nav": element()
  };
  const document = {
    documentElement: { lang: "en" }, title: "Heartsy Privacy Policy",
    querySelector: key => selectors[key],
    querySelectorAll: key => key === "[data-i18n]" ? nodes : links
  };
  const storage = new Map(saved ? [["heartsy.legal.language", saved]] : []);
  const location = { href: url, get origin() { return new URL(this.href).origin; } };
  const window = {
    location, addEventListener() {},
    history: { state: null, replaceState(_, __, next) { location.href = String(next); } },
    localStorage: {
      getItem(key) { if (storageDisabled) throw new Error("Blocked"); return storage.get(key); },
      setItem(key, value) { if (storageDisabled) throw new Error("Blocked"); storage.set(key, value); }
    }
  };
  const fetches = [];
  vm.runInNewContext(script, {
    document, window, navigator: { language: browserLanguage }, URL,
    fetch: async resource => {
      fetches.push(resource);
      const code = /locales\/(.+)\.json/.exec(resource)[1];
      const value = fetchCatalog ? await fetchCatalog(code) : catalogs[code];
      return { ok: true, json: async () => value };
    }
  });
  return { document, nodes, select, links, location, storage, control, fetches,
    async choose(code) { select.value = code; await select.change(); } };
}

const settled = () => new Promise(resolve => setImmediate(resolve));

test("五种语言覆盖全部正文，保留原链接、标签和数字边界", () => {
  const tags = text => text.match(/<[^>]+>/g) || [];
  for (const code of codes) {
    assert.equal(catalogs[code].messages.length, 148);
    for (const [index, text] of catalogs[code].messages.entries()) {
      assert.ok(text.trim(), `${code}: ${index}`);
      assert.deepEqual(tags(text), tags(catalogs.en.messages[index]), `${code}: ${index}`);
    }
    assert.match(catalogs[code].messages[105], /18/);
    assert.match(catalogs[code].messages[140], /12/);
    assert.match(catalogs[code].messages[140], /50/);
  }
  for (const page of ["privacy", "terms"]) {
    const html = fs.readFileSync(path.join(root, `${page}.html`), "utf8");
    for (const match of html.matchAll(/data-i18n="m(\d+)"/g)) {
      assert.ok(catalogs.en.messages[Number(match[1])]);
    }
  }
});

test("App 的 URL 语言覆盖网页缓存，区域代码归一，未知语言回退英文", async () => {
  for (const [input, expected] of [["en", "en"], ["de_DE", "de"], ["es-MX", "es"], ["fr-FR", "fr"], ["pt", "pt-BR"], ["pt_BR", "pt-BR"], ["unknown", "en"]]) {
    const page = setup({ url: `http://example.test/privacy.html?lang=${input}`, saved: "es" });
    await settled();
    assert.equal(page.document.documentElement.lang, expected);
    assert.equal(page.select.value, expected);
    assert.equal(page.nodes[20].innerHTML, catalogs[expected].messages[20]);
  }
  const saved = setup({ url: "http://example.test/privacy.html", saved: "de" });
  const browser = setup({ url: "http://example.test/privacy.html", browserLanguage: "pt-BR" });
  await settled();
  assert.equal(saved.select.value, "de");
  assert.equal(browser.select.value, "pt-BR");
});

test("手动切换保存语言，保留查询参数和锚点，跨协议链接带语言", async () => {
  const page = setup({ url: "http://example.test/privacy.html?lang=fr&from=app#collect" });
  await settled();
  await page.choose("pt-BR");
  assert.equal(page.storage.get("heartsy.legal.language"), "pt-BR");
  assert.equal(page.document.title, catalogs["pt-BR"].messages[82]);
  assert.equal(new URL(page.location.href).searchParams.get("from"), "app");
  assert.equal(new URL(page.location.href).hash, "#collect");
  assert.equal(page.links[0].getAttribute("href"), "/privacy.html?lang=pt-BR#rights");
  assert.equal(page.links[1].getAttribute("href"), "/terms.html?lang=pt-BR");
  assert.equal(page.links[2].getAttribute("href"), "#collect");
  assert.equal(page.links[3].getAttribute("href"), "mailto:support@heartsyapp.com");
  await page.choose("en");
  assert.equal(page.nodes[20].innerHTML, catalogs.en.messages[20]);
});

test("存储不可用仍可切换，下载失败或译文不完整保留当前正文且可重试", async () => {
  let fail = true;
  const page = setup({ storageDisabled: true, fetchCatalog: code => {
    if (code === "es" && fail) throw new Error("Offline");
    if (code === "de") return { language: "Deutsch", messages: [] };
    return catalogs[code];
  } });
  await settled();
  await page.choose("fr");
  await page.choose("es");
  assert.equal(page.select.value, "fr");
  assert.equal(page.nodes[20].innerHTML, catalogs.fr.messages[20]);
  await page.choose("de");
  assert.equal(page.select.value, "fr");
  fail = false;
  await page.choose("es");
  assert.equal(page.select.value, "es");
});

test("慢请求完成后不覆盖用户最新选择", async () => {
  let finishFrench;
  const page = setup({ fetchCatalog: code => code === "fr"
    ? new Promise(resolve => { finishFrench = resolve; }) : catalogs[code] });
  await settled();
  const french = page.choose("fr");
  await page.choose("de");
  finishFrench(catalogs.fr);
  await french;
  assert.equal(page.select.value, "de");
  assert.equal(page.nodes[20].innerHTML, catalogs.de.messages[20]);
  assert.equal(page.storage.get("heartsy.legal.language"), "de");
});
