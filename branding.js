"use strict";
window.companyBranding = (() => {
  const storageKey = "dispersed-company-brand-v1";
  const root = document.documentElement;
  const originalLogo = document.querySelector("header .logo").innerHTML;
  const systemFont = '"Segoe UI", system-ui, sans-serif';
  const allowedFonts = [
    "Segoe UI",
    "Arial",
    "Helvetica",
    "Georgia",
    "Verdana",
    "Trebuchet MS",
    "Times New Roman",
    "system-ui"
  ];
  const defaults = {
    companyName: "Dispersed",
    showCompanyName: true,
    showLogo: true,
    logoWidth: 120,
    logo: "",
    font: "Segoe UI",
    fontData: "",
    fontName: "",
    primary: "#a13c23",
    secondary: "#08675d",
    tertiary: "#42475a",
    background: "#efefed",
    surface: "#ffffff",
    text: "#242423",
    muted: "#535351",
    header: "#222225",
    headerText: "#ffffff",
    border: "#c9c9c5",
    chart4: "#926000",
    chart5: "#514294",
    chart6: "#666564",
    sidebarWidth: 248,
    radius: 14,
    spacing: 24,
    textSize: 16,
    navigation: [
      { id: "overview", label: "Overview", visible: true },
      { id: "modules", label: "Projects", visible: true },
      { id: "data", label: "Data collection", visible: true },
      { id: "inbox", label: "Inbox", visible: true },
      { id: "reports", label: "Reports", visible: true }
    ]
  };
  let draft;
  let active = null;
  let enabled = false;
  let transientMessage = "";
  const colorFields = [
    "primary",
    "secondary",
    "tertiary",
    "background",
    "surface",
    "text",
    "muted",
    "header",
    "headerText",
    "border",
    "chart4",
    "chart5",
    "chart6"
  ];
  const labels = {
    primary: "Primary / buttons",
    secondary: "Secondary / charts",
    tertiary: "Third chart series",
    background: "Page background",
    surface: "Card surface",
    text: "Body text",
    muted: "Secondary text",
    header: "Header background",
    headerText: "Header text",
    border: "Borders",
    chart4: "Fourth chart series",
    chart5: "Fifth chart series",
    chart6: "Sixth chart series"
  };
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function valid(input) {
    const result = clone(defaults);
    if (!input || typeof input !== "object") return result;
    if (typeof input.companyName === "string")
      result.companyName = input.companyName.trim().slice(0, 60) || defaults.companyName;
    for (const key of ["showCompanyName", "showLogo"]) result[key] = input[key] !== false;
    for (const key of colorFields) if (/^#[0-9a-f]{6}$/i.test(input[key])) result[key] = input[key];
    if (allowedFonts.includes(input.font)) result.font = input.font;
    for (const [key, min, max] of [
      ["logoWidth", 40, 220],
      ["sidebarWidth", 190, 340],
      ["radius", 0, 24],
      ["spacing", 12, 36],
      ["textSize", 14, 20]
    ]) {
      const value = Number(input[key]);
      if (Number.isFinite(value)) result[key] = Math.max(min, Math.min(max, value));
    }
    if (
      typeof input.logo === "string" &&
      /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(input.logo) &&
      input.logo.length < 3000000
    )
      result.logo = input.logo;
    if (
      typeof input.fontData === "string" &&
      /^data:(font\/(woff2?|ttf|otf)|application\/(octet-stream|font-woff));base64,[a-z0-9+/=]+$/i.test(
        input.fontData
      ) &&
      input.fontData.length < 3000000
    ) {
      result.fontData = input.fontData;
      result.fontName = typeof input.fontName === "string" ? input.fontName.slice(0, 80) : "Uploaded font";
    }
    if (Array.isArray(input.navigation)) {
      result.navigation = defaults.navigation.map((item) => {
        const custom = input.navigation.find((entry) => entry && entry.id === item.id);
        const label = typeof custom?.label === "string" ? custom.label.trim().slice(0, 32) || item.label : item.label;
        return {
          id: item.id,
          label: item.id === "modules" && label === "Modules" ? "Projects" : label,
          visible: custom?.visible !== false
        };
      });
    }
    return result;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.settings) {
      active = valid(saved.settings);
      enabled = saved.enabled === true;
    }
  } catch (_) {}
  draft = clone(active || defaults);
  const style = document.createElement("style");
  style.id = "company-brand-overrides";
  document.head.appendChild(style);
  const palette = document.getElementById("pal");
  const companyOption = document.createElement("option");
  companyOption.value = "company";
  companyOption.textContent = "Company theme";
  palette.appendChild(companyOption);
  function rgb(hex) {
    return hex
      .slice(1)
      .match(/../g)
      .map((value) => parseInt(value, 16));
  }
  function luminance(hex) {
    return rgb(hex)
      .map((value) => {
        value /= 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  }
  function contrast(a, b) {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }
  function onColor(background) {
    return contrast(background, "#ffffff") >= contrast(background, "#111111") ? "#ffffff" : "#111111";
  }
  function styleFor(settings, selector) {
    return (
      selector +
      "{" +
      Object.entries({
        "--bg": settings.background,
        "--card": settings.surface,
        "--text": settings.text,
        "--muted": settings.muted,
        "--line": settings.border,
        "--head": settings.header,
        "--headtx": settings.headerText,
        "--accent": settings.primary,
        "--on-accent": onColor(settings.primary),
        "--s1": settings.tertiary,
        "--s2": settings.secondary,
        "--s3": settings.primary,
        "--travel": settings.chart4,
        "--fleet": settings.chart5,
        "--waste": settings.chart6,
        "--track": settings.border,
        "--hero": settings.surface,
        "--feature-bg": settings.primary,
        "--on-feature": onColor(settings.primary),
        "--on-feature-muted": onColor(settings.primary),
        "--nav-active-bg": settings.primary
      })
        .map(([key, value]) => key + ":" + value)
        .join(";") +
      ";}"
    );
  }
  function renderLogo() {
    const logo = document.querySelector("header .logo");
    const settings = active || defaults;
    logo.innerHTML = originalLogo;
    const wordmark = logo.querySelector("span:last-child");
    wordmark.textContent = settings.companyName;
    wordmark.hidden = !settings.showCompanyName;
    const symbol = logo.querySelector(".header-brand-mark");
    if (settings.logo) {
      symbol.replaceWith(
        Object.assign(document.createElement("img"), {
          className: "company-logo-image",
          alt: "",
          src: settings.logo
        })
      );
      const image = logo.querySelector(".company-logo-image");
      image.style.width = settings.logoWidth + "px";
      image.hidden = !settings.showLogo;
    } else symbol.hidden = !settings.showLogo;
    logo.hidden = !settings.showLogo && !settings.showCompanyName;
    logo.setAttribute("aria-label", settings.companyName + " home");
  }
  function activate() {
    renderLogo();
    let css = "";
    if (enabled && active) {
      const font = active.fontData ? '"CompanyUploadedFont"' : JSON.stringify(active.font) + ", " + systemFont;
      if (active.fontData)
        css += '@font-face{font-family:CompanyUploadedFont;src:url("' + active.fontData + '");font-display:swap;}';
      css +=
        styleFor(active, ":root:root") +
        "body{font-family:" +
        font +
        ";font-size:" +
        active.textSize +
        "px;}" +
        ".card{border-radius:" +
        active.radius +
        "px;padding:" +
        active.spacing +
        "px;}" +
        ".grid{gap:" +
        Math.round(active.spacing * 0.83) +
        "px;}" +
        "@media(min-width:901px){.shell{grid-template-columns:" +
        active.sidebarWidth +
        "px minmax(0,1fr);}}";
    }
    style.textContent = css;
    if (enabled) palette.value = "company";
    document.dispatchEvent(new Event("company-brand-updated"));
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ enabled, settings: active }));
      return "Brand saved on this device.";
    } catch (_) {
      return "Brand applied for this session. Browser storage is full or unavailable.";
    }
  }
  function renderPreview() {
    const box = document.getElementById("brand-preview");
    if (!box) return;
    box.style.cssText =
      "background:" +
      draft.background +
      ";color:" +
      draft.text +
      ";font-family:" +
      JSON.stringify(draft.font) +
      ",sans-serif;border-radius:" +
      draft.radius +
      "px";
    box.innerHTML =
      '<div style="background:' +
      draft.header +
      ";color:" +
      draft.headerText +
      ';padding:14px;">' +
      (draft.showLogo
        ? draft.logo
          ? '<img src="' +
            draft.logo +
            '" alt="" style="width:' +
            draft.logoWidth +
            'px;max-width:100%;max-height:56px;object-fit:contain;vertical-align:middle;margin-right:10px;">'
          : '<span aria-hidden="true" style="display:inline-block;margin-right:10px;">●</span>'
        : "") +
      "" +
      (draft.showCompanyName ? "<strong>" + escape(draft.companyName) + "</strong>" : "") +
      '</div><div style="padding:16px"><div style="background:' +
      draft.surface +
      ";border:1px solid " +
      draft.border +
      ";padding:16px;border-radius:" +
      draft.radius +
      'px">' +
      '<strong>Carbon footprint</strong><p style="font-size:28px;margin:8px 0;">4,820 tCO₂e</p>' +
      '<div style="display:flex;height:16px;margin-bottom:14px;"><span style="width:20%;background:' +
      draft.tertiary +
      '"></span><span style="width:13%;background:' +
      draft.secondary +
      '"></span><span style="width:67%;background:' +
      draft.primary +
      '"></span></div>' +
      '<span style="display:inline-block;padding:8px 12px;border-radius:6px;background:' +
      draft.primary +
      ";color:" +
      onColor(draft.primary) +
      '">View inventory</span></div></div>';
    const warnings = [];
    if (contrast(draft.text, draft.surface) < 4.5) warnings.push("Body text and card surface need more contrast.");
    if (contrast(draft.headerText, draft.header) < 4.5) warnings.push("Header text and background need more contrast.");
    document.getElementById("brand-contrast").textContent = warnings.length
      ? warnings.join(" ")
      : "Text contrast meets the 4.5:1 check for body and header text.";
  }
  function page() {
    return (
      '<div class="top"><div><h1>Settings</h1><p class="sub">Manage your company’s branding and appearance.</p></div><a class="btn g" href="#modules">Back to Modules</a></div>' +
      '<p id="brand-message" role="status">' +
      escape(transientMessage) +
      '</p><div class="brand-workspace"><section class="card">' +
      '<h2>Company branding</h2><p class="muted">Upload a guide and review the draft before applying it.</p><h3>1. Upload brand assets</h3><label for="brand-guide">Brand guide or specifications</label><input id="brand-guide" type="file" accept=".pdf,.txt,.json,.css">' +
      '<p class="muted">PDF with selectable text, TXT, CSS, or a saved brand JSON. Guides provide draft colors and recognized font names. Review their role assignments below.</p>' +
      '<label for="brand-logo">Company logo</label><input id="brand-logo" type="file" accept="image/png,image/jpeg,image/webp">' +
      '<p class="muted">PNG, JPEG or WebP, up to 2 MB. The logo retains its original colors.</p>' +
      '<label for="brand-font">Brand font</label><input id="brand-font" type="file" accept=".woff,.woff2,.ttf,.otf"><p class="muted">' +
      escape(draft.fontName || "Optional font file, up to 2 MB. Use a font you are licensed to use.") +
      "</p>" +
      '<h2>2. Theme settings</h2><label>Company name<input data-brand-field="companyName" maxlength="60" value="' +
      escape(draft.companyName) +
      '"></label>' +
      '<fieldset class="brand-visibility"><legend>Header identity</legend><label><input type="checkbox" data-brand-field="showLogo"' +
      (draft.showLogo ? " checked" : "") +
      '> Show logo</label><label><input type="checkbox" data-brand-field="showCompanyName"' +
      (draft.showCompanyName ? " checked" : "") +
      '> Show company name beside logo</label><label>Uploaded logo width (px)<input type="number" min="40" max="220" data-brand-field="logoWidth" value="' +
      draft.logoWidth +
      '"></label></fieldset>' +
      '<div class="brand-color-fields">' +
      colorFields
        .map(
          (key) =>
            "<label>" +
            labels[key] +
            '<input type="color" data-brand-field="' +
            key +
            '" value="' +
            draft[key] +
            '"></label>'
        )
        .join("") +
      "</div>" +
      '<label>System font<select data-brand-field="font">' +
      allowedFonts
        .map((name) => "<option" + (name === draft.font ? " selected" : "") + ">" + name + "</option>")
        .join("") +
      "</select></label>" +
      '<div class="brand-size-fields">' +
      [
        ["sidebarWidth", "Sidebar width", 190, 340],
        ["radius", "Card corners", 0, 24],
        ["spacing", "Card spacing", 12, 36],
        ["textSize", "Text size", 14, 20]
      ]
        .map(
          ([key, label, min, max]) =>
            "<label>" +
            label +
            ' (px)<input type="number" min="' +
            min +
            '" max="' +
            max +
            '" data-brand-field="' +
            key +
            '" value="' +
            draft[key] +
            '"></label>'
        )
        .join("") +
      "</div>" +
      "<h2>3. Navigation</h2>" +
      draft.navigation
        .map(
          (item) =>
            '<div class="brand-nav-row"><label><input type="checkbox" data-brand-nav-visible="' +
            item.id +
            '"' +
            (item.visible ? " checked" : "") +
            '> Show</label><input aria-label="' +
            escape(item.id) +
            ' navigation label" data-brand-nav-label="' +
            item.id +
            '" maxlength="32" value="' +
            escape(item.label) +
            '"></div>'
        )
        .join("") +
      "" +
      '<div class="brief-toolbar"><button class="btn" data-brand-apply>Apply brand</button><button class="btn g" data-brand-export>Export settings</button><button class="btn g" data-brand-reset>Reset branding</button></div></section>' +
      '<section class="card brand-preview-panel"><h2>Draft preview</h2><div id="brand-preview"></div><p id="brand-contrast" class="muted" role="status"></p><p class="muted">Branding saves in this browser. Export settings to reuse your brand on another device.</p></section></div>'
    );
  }
  function refreshPage() {
    if (location.hash !== "#settings") return;
    document.getElementById("app").innerHTML = page();
    renderPreview();
  }
  const readData = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsDataURL(file);
    });
  let pdfPromise;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () =>
        reject(new Error("The PDF reader could not load. Extract the full ZIP, including vendor, and try again."));
      document.head.appendChild(script);
    });
  }
  async function extractPdf(file) {
    pdfPromise ||= loadScript("vendor/pdf-worker.js")
      .then(() => loadScript("vendor/pdf.js"))
      .catch((error) => {
        pdfPromise = null;
        throw error;
      });
    await pdfPromise;
    const task = window.pdfjsLib.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
      useSystemFonts: true
    });
    let doc;
    try {
      doc = await task.promise;
      const text = [];
      const colors = [];
      for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text.push(content.items.map((item) => item.str || "").join(" "));
        const ops = await page.getOperatorList();
        for (let j = 0; j < ops.fnArray.length; j++) {
          if (
            ops.fnArray[j] === window.pdfjsLib.OPS.setFillRGBColor ||
            ops.fnArray[j] === window.pdfjsLib.OPS.setStrokeRGBColor
          ) {
            const args = ops.argsArray[j];
            const value = typeof args[0] === "string" ? args[0] : null;
            if (value && /^#[0-9a-f]{6}$/i.test(value)) colors.push(value);
          }
        }
        page.cleanup();
      }
      return { text: text.join("\n"), colors, limited: doc.numPages > 40 };
    } finally {
      await task.destroy();
    }
  }
  function infer(text, paintedColors = []) {
    const colors = [...new Set((text.match(/#[0-9a-f]{6}\b/gi) || []).concat(paintedColors))];
    const useful = colors.filter((color) => {
      const values = rgb(color);
      return Math.max(...values) - Math.min(...values) > 25 && luminance(color) > 0.025;
    });
    const assigned = {};
    for (const [role, aliases] of Object.entries({
      primary: "primary|primair|principal",
      secondary: "secondary|secundair",
      background: "background|achtergrond",
      text: "body text|text color|tekst",
      header: "header|navigation"
    })) {
      const match = text.match(new RegExp("(?:" + aliases + ")[^#\\n]{0,35}(#[0-9a-f]{6})", "i"));
      if (match) assigned[role] = match[1];
    }
    if (useful[0] && !assigned.primary) assigned.primary = useful[0];
    if (useful[1] && !assigned.secondary) assigned.secondary = useful[1];
    if (useful[2]) assigned.tertiary = useful[2];
    const font = allowedFonts.find((name) => text.toLowerCase().includes(name.toLowerCase()));
    draft = valid({ ...draft, ...assigned, ...(font ? { font } : {}) });
    return { colors: colors.length, font };
  }
  document.addEventListener("input", (event) => {
    const key = event.target.dataset?.brandField;
    if (key) {
      draft = valid({ ...draft, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
      renderPreview();
    }
    const id = event.target.dataset?.brandNavLabel;
    if (id)
      draft.navigation = draft.navigation.map((item) =>
        item.id === id ? { ...item, label: event.target.value } : item
      );
  });
  document.addEventListener("change", async (event) => {
    const target = event.target;
    const id = target.dataset?.brandNavVisible;
    if (id)
      draft.navigation = draft.navigation.map((item) => (item.id === id ? { ...item, visible: target.checked } : item));
    if (!["brand-guide", "brand-logo", "brand-font"].includes(target.id) || !target.files?.[0]) return;
    const file = target.files[0];
    transientMessage = "Reading " + file.name + "…";
    document.getElementById("brand-message").textContent = transientMessage;
    try {
      if (file.size > (target.id === "brand-guide" ? 12 : 2) * 1024 * 1024)
        throw new Error("File exceeds the size limit.");
      if (target.id === "brand-logo") {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Choose a PNG, JPEG or WebP logo.");
        draft = valid({ ...draft, logo: await readData(file) });
        transientMessage = "Logo added to the draft.";
      } else if (target.id === "brand-font") {
        if (!/\.(woff2?|ttf|otf)$/i.test(file.name)) throw new Error("Choose a supported font file.");
        const type = /\.woff2$/i.test(file.name)
          ? "font/woff2"
          : /\.woff$/i.test(file.name)
            ? "font/woff"
            : /\.ttf$/i.test(file.name)
              ? "font/ttf"
              : "font/otf";
        const data = await readData(file);
        draft = valid({ ...draft, fontData: data.replace(/^data:[^;]*;/, "data:" + type + ";"), fontName: file.name });
        transientMessage = "Font added to the draft.";
      } else if (/\.json$/i.test(file.name)) {
        const input = JSON.parse(await file.text());
        draft = valid(input.settings || input);
        transientMessage = "Brand specifications imported. Review and apply the draft.";
      } else {
        const pdf = /\.pdf$/i.test(file.name);
        const extracted = pdf ? await extractPdf(file) : { text: await file.text(), colors: [] };
        const result = infer(extracted.text, extracted.colors);
        transientMessage = result.colors
          ? "Found " +
            result.colors +
            " color candidates" +
            (result.font ? " and " + result.font : "") +
            ". Review their assignments before applying."
          : "No explicit brand colors found. Enter the colors manually or import brand JSON.";
        if (pdf && !extracted.text.trim())
          transientMessage += " This PDF may be scanned; text recognition is unavailable.";
        if (extracted.limited) transientMessage += " Only the first 40 pages were examined.";
      }
    } catch (error) {
      transientMessage = error.message || "The guide could not be read. Try TXT or JSON.";
    }
    refreshPage();
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-brand-apply]")) {
      active = valid(draft);
      enabled = true;
      activate();
      transientMessage = persist();
      refreshPage();
    }
    if (event.target.closest("[data-brand-reset]")) {
      active = null;
      enabled = false;
      draft = clone(defaults);
      style.textContent = "";
      palette.value = "";
      try {
        localStorage.removeItem(storageKey);
      } catch (_) {}
      root.removeAttribute("data-p");
      renderLogo();
      transientMessage = "Default branding restored.";
      document.dispatchEvent(new Event("company-brand-updated"));
      refreshPage();
    }
    if (event.target.closest("[data-brand-export]")) {
      const blob = new Blob([JSON.stringify({ version: 1, settings: valid(draft) }, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "company-brand.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  function paletteChange(value) {
    if (value === "company") {
      active ||= valid(draft);
      enabled = true;
      activate();
      persist();
      return;
    }
    enabled = false;
    style.textContent = "";
    persist();
    if (value) root.dataset.p = value;
    else root.removeAttribute("data-p");
  }
  function navigation(items) {
    return active?.navigation
      ? items.flatMap((item) => {
          const setting = active.navigation.find((entry) => entry.id === item[0]);
          return setting?.visible === false ? [] : [[item[0], setting?.label || item[1]]];
        })
      : items;
  }
  function ready() {
    renderPreview();
  }
  function content(markup) {
    return active
      ? markup
          .replaceAll("Demo Manufacturing B.V.", escape(active.companyName))
          .replaceAll("Demo Manufacturing", escape(active.companyName))
      : markup;
  }
  if (enabled && active) activate();
  else renderLogo();
  return { page, ready, paletteChange, navigation, content };
})();
