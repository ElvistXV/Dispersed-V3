"use strict";

(() => {
  const categories = [
    [
      "Electricity",
      "Scope 2",
      "var(--s2)",
      255,
      "Measured",
      "Electricity bought from the grid. Your biggest single source."
    ],
    ["Purchased goods", "Scope 3", "var(--s3)", 190, "Estimated", "Emissions from suppliers who make what you buy."],
    ["Business travel", "Scope 3", "var(--travel)", 140, "Estimated", "Flights, trains and hotel stays for work."],
    ["Heating", "Scope 1", "var(--s1)", 120, "Measured", "Fuel burned to heat your buildings. Peaks in winter."],
    ["Company cars", "Scope 1", "var(--fleet)", 70, "Measured", "Fuel used by vehicles the company owns."],
    ["Waste", "Scope 3", "var(--waste)", 70, "Estimated", "Waste collected and processed."]
  ];
  const monthlyTotals = [78, 72, 74, 70, 66, 64, 60, 62, 68, 72, 76, 83];
  const monthLabels = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const seasonalWeights = {
    Electricity: [1.1, 1, 1, 0.95, 0.95, 0.95, 0.9, 0.9, 0.95, 1, 1.05, 1.1],
    "Purchased goods": [1, 1, 1, 1, 1, 1, 0.9, 0.9, 1.1, 1.1, 1.1, 1.1],
    "Business travel": [0.6, 0.9, 1.2, 1.1, 1, 0.8, 0.5, 0.4, 1.3, 1.4, 1.1, 0.7],
    Heating: [1.8, 1.7, 1.3, 0.8, 0.4, 0.2, 0.1, 0.1, 0.3, 0.8, 1.4, 1.7],
    "Company cars": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    Waste: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  };
  function tooltipAttributes(html) {
    return `data-tip="${html.replace(/"/g, "&quot;")}" tabindex="0"`;
  }
  function categoryTooltip(category, total = 845, year = 2025) {
    return `<b>${category[0]} · ${category[1]}</b><br>${category[3]} tCO2e in ${year} (${Math.round((category[3] / total) * 100)}% of total)<br>Data: ${category[4]}<br><span style="opacity:.8">${category[5]}</span>`;
  }
  function sourceBars() {
    return categories
      .map((c) =>
        bar(
          c[0] + " (" + c[1] + ")",
          (c[3] / 255) * 100,
          c[2],
          c[3] + (c[4] === "Estimated" ? " est." : ""),
          0,
          categoryTooltip(c)
        )
      )
      .join("");
  }
  function estimateMonthlyBreakdown() {
    const breakdown = monthlyTotals.map((total, monthIndex) =>
      categories.map((category) => seasonalWeights[category[0]][monthIndex])
    );
    for (let iteration = 0; iteration < 40; iteration++) {
      breakdown.forEach((row, monthIndex) => {
        const total = row.reduce((sum, value) => sum + value, 0);
        row.forEach((value, categoryIndex) => {
          row[categoryIndex] = (value * monthlyTotals[monthIndex]) / total;
        });
      });
      categories.forEach((category, categoryIndex) => {
        let total = 0;
        breakdown.forEach((row) => {
          total += row[categoryIndex];
        });
        breakdown.forEach((row) => {
          row[categoryIndex] = (row[categoryIndex] * category[3]) / total;
        });
      });
    }
    const selected = inventoryCategories();
    return breakdown.map((row) => row.map((value, index) => (value * selected[index][3]) / categories[index][3]));
  }
  function renderMonthlyPlot(height) {
    const baseline = height - 29;
    const categories = inventoryCategories();
    const breakdown = estimateMonthlyBreakdown();
    const monthlyTotals = breakdown.map((row) => row.reduce((sum, value) => sum + value, 0));
    let marks = "";
    const isVisible = (categoryIndex) => selectedCategories === null || selectedCategories.indexOf(categoryIndex) > -1;
    const visibleTotals = breakdown.map((row) =>
      row.reduce((sum, v, categoryIndex) => sum + (isVisible(categoryIndex) ? v : 0), 0)
    );
    const maxTotal = Math.max(1, ...visibleTotals);
    const tickStep = maxTotal <= 12 ? 2 : maxTotal <= 30 ? 5 : maxTotal <= 60 ? 10 : 25;
    const axisMax = Math.ceil(maxTotal / tickStep) * tickStep;
    const scale = (baseline - 30) / axisMax;
    for (let value = 0; value <= axisMax; value += tickStep) {
      marks += `<line x1="40" x2="620" y1="${baseline - value * scale}" y2="${baseline - value * scale}" stroke="var(--line)"/><text class="m" x="32" y="${baseline - value * scale + 4}" text-anchor="end" style="font-size:12px">${value}</text>`;
    }
    breakdown.forEach((row, monthIndex) => {
      const x = 40 + monthIndex * 48;
      let y = baseline;
      row.forEach((v, categoryIndex) => {
        if (!isVisible(categoryIndex) || !v) return;
        const category = categories[categoryIndex];
        const segmentHeight = v * scale;
        y -= segmentHeight;
        marks += `<rect class="sg" role="button" aria-label="Filter to ${category[0]}" data-c="${categoryIndex}" x="${x}" y="${y}" width="32" height="${segmentHeight}" fill="${category[2]}" stroke="var(--card)" stroke-width="1.5" ${tooltipAttributes(`<b>${category[0]} · ${category[1]}</b><br>${monthLabels[monthIndex]}: ${v.toFixed(1)} tCO2e<br>${Math.round((v / monthlyTotals[monthIndex]) * 100)}% of the month (${monthlyTotals[monthIndex].toFixed(1)} in total)<br>Year: ${category[3]} tCO2e · ${category[4]}`)}/>`;
      });
      marks += `<text x="${x + 16}" y="${y - 6}" text-anchor="middle" style="font-size:12px;font-weight:600">${Math.round(visibleTotals[monthIndex])}</text><text class="m" x="${x + 16}" y="${baseline + 19}" text-anchor="middle" style="font-size:12px">${monthLabels[monthIndex]}</text>`;
    });
    return `<svg viewBox="0 0 640 ${height}" role="group" aria-label="Monthly emissions by source in ${inventoryYear}">${marks}</svg>`;
  }
  function sizeMonthlyPlot() {
    const plot = document.getElementById("monthly-plot");
    if (!plot || !plot.clientWidth || !plot.clientHeight) return;
    const height = Math.round((plot.clientHeight * 640) / plot.clientWidth);
    if (plot.firstElementChild?.getAttribute("viewBox") !== `0 0 640 ${height}`) {
      plot.innerHTML = renderMonthlyPlot(height);
    }
  }
  function renderMonthlyChart() {
    const categories = inventoryCategories();
    const isVisible = (categoryIndex) => selectedCategories === null || selectedCategories.includes(categoryIndex);
    return `<div id="monthly-plot">${renderMonthlyPlot(244)}</div><div class="lg">${categories
      .map((category, categoryIndex) => {
        if (!category[3]) return "";
        return `<button type="button" class="lgi${isVisible(categoryIndex) ? "" : " off"}" data-c="${categoryIndex}" aria-pressed="${isVisible(categoryIndex)}" ${tooltipAttributes(
          categoryTooltip(
            category,
            categories.reduce((sum, item) => sum + item[3], 0),
            inventoryYear
          )
        )}><i style="background:${category[2]}"></i>${category[0]} <span class="muted">${number(category[3], 1)}</span></button>`;
      })
      .join(
        ""
      )}${selectedCategories !== null ? '<button type="button" class="lgi" data-all="1"><b>Show all</b></button>' : ""}</div><p class="muted monthly-chart-note">${selectedCategories === null ? "Click a bar segment to isolate a source, or use the legend to combine sources." : `Showing ${selectedCategories.length} of ${categories.length} sources.`}</p>`;
  }
  function renderPathwayLegend() {
    const items = [
      ["Actual", "border-top:3px solid var(--s1)", "Measured emissions from your data."],
      [
        "Projection",
        "border-top:3px dashed var(--s2)",
        "Expected emissions if current trends continue. An estimate, not a result."
      ],
      [
        "Target path",
        "border-top:2px solid var(--muted)",
        "Straight path from the base year to the target. A placeholder until confirmed."
      ],
      [
        "Gap",
        "width:5px;height:14px;background:var(--s3);border-radius:2px",
        "How far the projection sits above the target at the target year."
      ]
    ];
    return `<div class="lg">${items.map((item) => `<button type="button" class="lgi" ${tooltipAttributes(`<b>${item[0]}</b><br>${item[2]}`)}><i class="${item[1].indexOf("border") > -1 ? "sw" : ""}" style="${item[1]}"></i>${item[0]}</button>`).join("")}</div>`;
  }
  function highlightCategory(categoryIndex) {
    document.querySelectorAll("rect.sg").forEach((segment) => {
      segment.style.opacity = categoryIndex === null || segment.dataset.c === categoryIndex ? 1 : 0.22;
    });
  }
  const tooltip = document.createElement("div");
  tooltip.className = "tip";
  document.body.appendChild(tooltip);
  function positionTooltip(pointerX, pointerY) {
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    tooltip.style.left = Math.max(8, Math.min(pointerX + 14, innerWidth - width - 8)) + "px";
    tooltip.style.top =
      (pointerY + 16 + height > innerHeight ? Math.max(8, pointerY - height - 12) : pointerY + 16) + "px";
  }
  function showTooltip(element, pointerX, pointerY) {
    tooltip.innerHTML = element.getAttribute("data-tip");
    tooltip.style.display = "block";
    positionTooltip(pointerX, pointerY);
  }
  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest("[data-tip]");
    const c = e.target.closest("[data-c]");
    highlightCategory(c ? c.dataset.c : null);
    if (t) showTooltip(t, e.clientX, e.clientY);
    else tooltip.style.display = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (tooltip.style.display === "block") positionTooltip(e.clientX, e.clientY);
  });
  document.addEventListener("focusin", (e) => {
    const t = e.target.closest("[data-tip]");
    const c = e.target.closest("[data-c]");
    highlightCategory(c ? c.dataset.c : null);
    if (t) {
      const r = t.getBoundingClientRect();
      showTooltip(t, r.left + r.width / 2, r.top);
    }
  });
  document.addEventListener("focusout", () => {
    tooltip.style.display = "none";
    highlightCategory(null);
  });
  function filterFootprint(event) {
    const scope = event.target.closest("[data-scope-filter]");
    if (scope) {
      const value = scope.dataset.scopeFilter;
      if (!["Scope 1", "Scope 2", "Scope 3"].includes(value)) return;
      inventoryScope = inventoryScope === value ? "All scopes" : value;
      redrawInventoryFilters("inventory-scope");
      return;
    }
    const legend = event.target.closest(".lgi[data-c]");
    const segment = event.target.closest(".sg[data-c]");
    const reset = event.target.closest("[data-all]");
    if (!legend && !segment && !reset) return;
    const category = legend || segment;
    const index = category ? Number(category.dataset.c) : null;
    if (reset) {
      inventoryScope = "All scopes";
      redrawInventoryFilters("inventory-scope");
      return;
    }
    if (segment) {
      selectedCategories = selectedCategories?.length === 1 && selectedCategories[0] === index ? null : [index];
    } else {
      const previous = selectedCategories || [];
      const next = previous.includes(index) ? previous.filter((i) => i !== index) : [...previous, index];
      selectedCategories = next.length && next.length < categories.length ? next : null;
    }
    tooltip.style.display = "none";
    const monthly = document.getElementById("sc");
    if (monthly) monthly.innerHTML = renderMonthlyChart();
    watchMonthlyPlot();
    const donut = document.getElementById("scope-donut");
    if (donut) donut.innerHTML = renderScopeDonut();
    const annual = document.getElementById("annual-trend");
    if (annual) annual.innerHTML = renderAnnualTrend();
    const focus = `.lgi[data-c="${index}"]`;
    document.querySelector(focus)?.focus({
      preventScroll: true
    });
  }
  document.addEventListener("click", filterFootprint);
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".scope-segment, .sg, .annual-segment")) {
      event.preventDefault();
      filterFootprint(event);
    }
  });
  window.addEventListener("hashchange", () => {
    tooltip.style.display = "none";
  });
  let currentRoute = "";
  let selectedCategories = null;
  let activeScope = null;
  const moduleLinks = [
    ["modules", "All modules"],
    ["mod-footprint", "Scope 1-2-3"],
    ["mod-lca", "LCA"],
    ["mod-roadmap", "Roadmap"],
    ["mod-users", "Users"],
    ["mod-cockpit", "Client cockpit"],
    ["mod-simulation", "Simulation"]
  ];
  const navIcons = {
    overview: '<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',
    modules: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    data: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>',
    reports: '<path d="M6 3h8l5 5v13H6zM14 3v5h5"/>'
  };
  const navigationLinks = [
    ["overview", "Overview"],
    ["modules", "Projects"],
    ["data", "Data collection"],
    ["inbox", "Inbox"],
    ["reports", "Reports"],
    ["settings", "Settings"]
  ];
  navIcons.settings =
    '<circle cx="12" cy="12" r="3"/><path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z"/>';
  function bar(label, percent, color, value, marker, tooltipHtml) {
    return `<div class="row"${tooltipHtml ? ` ${tooltipAttributes(tooltipHtml)}` : ""}><span class="l">${label}</span><div class="trk" role="img" aria-label="${label}: ${value}"><b style="width:${percent}%;background:${color}"></b>${marker ? `<u style="left:${marker}%"></u>` : ""}</div><span class="val">${value}</span></div>`;
  }
  function pageHeading(title, subtitle, actions) {
    return `<div class="top"><div><h1>${title}</h1><p class="sub">${subtitle}</p></div>${actions || ""}</div>`;
  }
  function pill(className, icon, text) {
    return `<span class="pill ${className}">${icon} ${text}</span>`;
  }
  const actualEmissions = {
    2023: 1300,
    2024: 1050,
    2025: 845
  };
  const projectedEmissions = {
    2026: 700,
    2027: 560
  };
  const targetEmissions = {
    2023: 1300,
    2024: 1070,
    2025: 840,
    2026: 610,
    2027: 380
  };
  function pathwayTooltip(year) {
    const actual = actualEmissions[year];
    const projection = projectedEmissions[year];
    const target = targetEmissions[year];
    let html = `<b>${year}${year === 2023 ? " · Base year" : year === 2025 ? " · Today" : year === 2027 ? " · Target year*" : ""}</b><br>`;
    if (actual !== undefined) html += `Actual: ${actual.toLocaleString()} tCO2e<br>`;
    if (projection !== undefined) html += `Projection: ${projection} tCO2e<br>`;
    html += `Target path: ${target.toLocaleString()} tCO2e`;
    const gap = (actual !== undefined ? actual : projection) - target;
    if (year > 2023) html += `<br><b>${gap > 0 ? gap + " above the path" : -gap + " below the path"}</b>`;
    return html;
  }
  function renderPathwayChart(width, height) {
    const left = 64;
    const right = 80;
    const top = 24;
    const bottom = 54;
    const baseline = height - bottom;
    const xPosition = (year) => left + ((year - 2023) * (width - left - right)) / 4;
    const yPosition = (value) => top + (baseline - top) * (1 - value / 1400);
    let grid = "";
    [0, 400, 800, 1200].forEach((value) => {
      grid += `<line x1="${left}" x2="${width - right}" y1="${yPosition(value)}" y2="${yPosition(value)}" stroke="var(--line)"/><text class="m" x="${left - 8}" y="${yPosition(value) + 4}" text-anchor="end">${value.toLocaleString()}</text>`;
    });
    [
      [2023, "Base year"],
      [2024, ""],
      [2025, "Today"],
      [2026, ""],
      [2027, "Target year*"]
    ].forEach((values) => {
      grid += `<text x="${xPosition(values[0])}" y="${baseline + 22}" text-anchor="middle">${values[0]}</text>${values[1] ? `<text class="m" x="${xPosition(values[0])}" y="${baseline + 40}" text-anchor="middle">${values[1]}</text>` : ""}`;
    });
    const points = (values, offset) =>
      values.map((value, index) => xPosition(2023 + offset + index) + "," + yPosition(value)).join(" ");
    const actualValues = [1300, 1050, 845];
    const actualMarkers = actualValues
      .map(
        (value, index) =>
          `<circle cx="${xPosition(2023 + index)}" cy="${yPosition(value)}" r="5" fill="var(--s1)"/><text x="${xPosition(2023 + index)}" y="${yPosition(value) - 12}" text-anchor="middle" font-weight="600">${value.toLocaleString()}</text>`
      )
      .join("");
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Emissions pathway in tCO2e. Actual: 1,300 in 2023, 1,050 in 2024, 845 in 2025. Projected 560 in 2027. Illustrative target path ends at 380 in 2027, leaving a gap of 180.">${grid}<text class="m" x="14" y="${(top + baseline) / 2}" transform="rotate(-90 14 ${(top + baseline) / 2})" text-anchor="middle">tCO2e</text><line x1="${xPosition(2025)}" x2="${xPosition(2025)}" y1="${top}" y2="${baseline}" stroke="var(--muted)" stroke-dasharray="3 4"/><polyline fill="none" stroke="var(--muted)" stroke-width="2" points="${points([1300, 1070, 840, 610, 380], 0)}"/><polyline fill="none" stroke="var(--s1)" stroke-width="3.5" points="${points(actualValues, 0)}"/><polyline fill="none" stroke="var(--s2)" stroke-width="3" stroke-dasharray="7 5" points="${points([845, 700, 560], 2)}"/>${actualMarkers}<text x="${xPosition(2023.5) + 10}" y="${yPosition(1175) - 12}" font-weight="650">Actual</text><text x="${xPosition(2026) - 26}" y="${yPosition(700) - 12}" font-weight="650">Projection</text><text class="m" x="${xPosition(2026) - 30}" y="${yPosition(610) + 24}">Target path</text><line x1="${xPosition(2027) + 12}" x2="${xPosition(2027) + 12}" y1="${yPosition(560)}" y2="${yPosition(380)}" stroke="var(--s3)" stroke-width="5"/><text x="${xPosition(2027) + 22}" y="${yPosition(470) - 2}" font-weight="650" style="fill:var(--s3)">Gap</text><text x="${xPosition(2027) + 22}" y="${yPosition(470) + 14}" style="fill:var(--s3)">180</text>${[
      2023, 2024, 2025, 2026, 2027
    ]
      .map((year) => {
        const hitWidth = (width - left - right) / 4;
        return `<rect class="hv" x="${xPosition(year) - hitWidth / 2}" y="${top}" width="${hitWidth}" height="${baseline - top}" ${tooltipAttributes(pathwayTooltip(year))}/>`;
      })
      .join("")}</svg>`;
  }
  let chartObserver;
  let monthlyPlotObserver;
  function watchMonthlyPlot() {
    monthlyPlotObserver?.disconnect();
    const plot = document.getElementById("monthly-plot");
    if (!plot) return;
    sizeMonthlyPlot();
    if (window.ResizeObserver) {
      monthlyPlotObserver ??= new ResizeObserver(sizeMonthlyPlot);
      monthlyPlotObserver.observe(plot);
    }
  }
  function drawPathwayChart() {
    const container = document.getElementById("cw");
    if (!container || container.clientWidth < 10) return;
    container.innerHTML = renderPathwayChart(container.clientWidth, container.clientHeight);
  }
  function renderPendingTasks() {
    return '<section class="card"><div class="ch"><h2>Also on your list</h2><a href="#inbox" class="muted">Inbox</a></div><div><div class="li"><div><h3>Review draft LCA report</h3><span class="muted">Due 20 Nov</span></div><a class="btn g s" href="#mod-lca">Open</a></div><div class="li"><div><h3>Confirm net-zero year</h3><span class="muted">Due 1 Dec</span></div><a class="btn g s" href="#inbox">Open</a></div></div></section>';
  }
  function renderProgress() {
    const reduction = actualEmissions[2023] - actualEmissions[2025];
    const goal = actualEmissions[2023] - targetEmissions[2027];
    const progressPercent = ((reduction / goal) * 100).toFixed(1);
    const projectedGap = projectedEmissions[2027] - targetEmissions[2027];
    const largestSource = categories[0];
    const sourceShare = Math.round((largestSource[3] / actualEmissions[2025]) * 100);
    return `<section class="card c6">
      <div><h2>Progress toward the 2027 target</h2>
        <p class="muted">Illustrative target of ${targetEmissions[2027]} tCO2e</p></div>
      <p class="insight-value">${progressPercent}% <span class="unit">of the required reduction achieved</span></p>
      <div class="bt" role="img" aria-label="${reduction} of ${goal} tCO2e reduced">
        <b style="width:${progressPercent}%"></b><u></u></div>
      <div class="axis"><span>${reduction} tCO2e reduced</span><span>${goal} tCO2e goal</span></div>
      <p class="muted">The 2027 projection is ${projectedEmissions[2027]} tCO2e, leaving a gap of ${projectedGap} tCO2e.</p>
    </section>
    <section class="card c6">
      <div><h2>Emissions hotspots</h2><p class="muted">2025 inventory</p></div>
      <div class="insight"><h3>Purchased electricity</h3>
        <p>${largestSource[3]} tCO2e · ${sourceShare}% of the inventory. This is the largest individual source.</p></div>
      <div class="insight"><h3>Purchased goods and business travel</h3>
        <p>Together they add up to 330 tCO2e, which is about 83% of your Scope 3 footprint.</p></div>
      <a class="btn g s" href="#mod-footprint">Explore the carbon footprint</a>
    </section>`;
  }
  function modulePreview(route) {
    let content;
    if (route === "mod-footprint") {
      content = `<div class="module-preview-bars">${[
        ["Scope 1", 190, "s1"],
        ["Scope 2", 255, "s2"],
        ["Scope 3", 400, "s3"]
      ]
        .map(
          ([label, value, color]) =>
            `<div><span>${label}</span><div class="module-preview-track"><i style="width:${(value / 400) * 100}%;background:var(--${color})"></i></div><strong>${value}</strong></div>`
        )
        .join("")}</div><span class="module-preview-caption">2025 emissions · tCO₂e</span>`;
    } else if (route === "mod-lca") {
      content = `<div class="module-preview-stages">${[
        ["Materials", 6.6],
        ["Production", 2.6],
        ["Transport", 1.4],
        ["Use", 1.1],
        ["End of life", 0.9]
      ]
        .map(
          ([label, value]) =>
            `<div><strong>${value}</strong><i style="height:${(value / 6.6) * 64}px"></i><span>${label}</span></div>`
        )
        .join("")}</div><span class="module-preview-caption">Hydraulic valve H7 · kgCO₂e per valve</span>`;
    } else if (route === "mod-roadmap") {
      content =
        '<svg class="module-preview-roadmap" viewBox="0 0 400 100" role="img" aria-label="Emissions from 1300 in 2023 to 845 in 2025, with an illustrative target of 380 in 2027"><line x1="28" x2="372" y1="78" y2="78" stroke="var(--line)"/><polyline points="28,13 114,29 200,42" fill="none" stroke="var(--s1)" stroke-width="3"/><polyline points="200,42 286,52 372,61" fill="none" stroke="var(--s2)" stroke-width="3" stroke-dasharray="5 4"/><circle cx="200" cy="42" r="4" fill="var(--s1)"/><circle cx="372" cy="73" r="4" fill="var(--s3)"/><text x="28" y="96">2023</text><text x="200" y="96" text-anchor="middle">2025</text><text x="372" y="96" text-anchor="end">2027</text></svg><span class="module-preview-caption">Actual, projection and target · illustrative pathway</span>';
    } else if (route === "mod-simulation") {
      content =
        '<div class="module-preview-projects"><div><strong>4 adjustable measures</strong><span>0–100% delivery</span></div><div><strong>Live waterfall</strong><span>Target comparison</span></div></div><span class="module-preview-caption">Explore reduction scenarios</span>';
    } else if (route === "mod-cockpit") {
      content =
        '<div class="module-preview-projects"><div><strong>3 projects</strong><span>Carbon · LCA · Roadmap</span></div><div><strong>3 open actions</strong><span>Owners and deadlines</span></div></div><span class="module-preview-caption">Contacts, projects and next steps</span>';
    } else {
      content = `<div class="module-preview-people">${[
        ["RP", "Raees", "Admin"],
        ["J", "Jamie", "Reports"],
        ["M", "Maria", "Uploads"]
      ]
        .map(
          ([initials, name, role]) =>
            `<div><span class="module-preview-avatar">${initials}</span><span><strong>${name}</strong><small>${role}</small></span></div>`
        )
        .join("")}</div><span class="module-preview-caption">People and their access</span>`;
    }
    return `<a class="module-preview" href="#${route}" aria-label="Preview and open ${
      {
        "mod-footprint": "carbon footprint",
        "mod-lca": "life cycle assessment",
        "mod-roadmap": "reduction roadmap",
        "mod-users": "users and access",
        "mod-cockpit": "account and project cockpit",
        "mod-simulation": "live reduction simulation"
      }[route]
    }">${content}</a>`;
  }
  const views = {
    overview: () =>
      pageHeading(
        "Dashboard",
        "Here’s how Demo Manufacturing is doing on emissions, and what we still need from you.",
        '<p class="muted">Last updated 3 Nov 2026 · Sample data</p>'
      ) +
      '<div class="grid">' +
      '<section class="card kpi c4"><h3>Emissions in 2025</h3><div class="big">845 <span class="unit">tCO2e</span></div><p class="muted">&minus;20% vs 2024 (1,050)<br>&minus;35% vs 2023 base year</p></section>' +
      '<section class="card kpi c4"><h3>Data collected</h3><div class="big">80%</div><div class="trk" role="img" aria-label="80% of data collected"><b style="width:80%;background:var(--s2)"></b></div><p class="muted">Scope 3 is partial and estimated</p></section>' +
      '<section class="card kpi c4"><h3>Are we on track?</h3><div>' +
      pill("warn", "&#9650;", "A little behind") +
      '</div><p class="muted">If nothing changes, we’d end 180 tCO2e short of the 2027 target.</p></section>' +
      '</div><div class="grid">' +
      '<section class="card hero c8"><div class="ch"><div><h2>Emissions pathway</h2><p class="muted">Actual results, projection and target path, 2023 to 2027</p></div></div><div class="cw" id="cw"></div>' +
      renderPathwayLegend() +
      '<p class="muted">*Target year, target value and method are placeholders until confirmed with Dispersed.</p></section>' +
      '<div class="col"><section class="card act"><span class="muted">Next up</span><h2>Send us your Q3 electricity readings</h2><p class="muted">This completes your electricity picture and takes about 5 minutes. Please send them by 14 Nov.</p><a class="btn" href="#data">Send your readings</a></section>' +
      renderPendingTasks() +
      "</div>" +
      '</div><div class="grid">' +
      renderProgress() +
      '</div><div class="grid">' +
      '<section class="card c6"><div><h2>By scope</h2><p class="muted">tCO2e, 2025</p></div><div class="stack">' +
      bar(
        "Value-chain emissions (Scope 3)",
        100,
        "var(--s3)",
        "400 est.",
        0,
        '<b>Value-chain emissions · Scope 3</b><br>400 tCO2e (47% of total)<br>Data: Estimated<br><span style="opacity:.8">Everything else in your value chain, across 15 categories. Depends on supplier data.</span>'
      ) +
      bar(
        "Purchased energy (Scope 2)",
        64,
        "var(--s2)",
        "255",
        0,
        '<b>Purchased energy · Scope 2</b><br>255 tCO2e (30% of total)<br>Data: Measured<br><span style="opacity:.8">Emissions from the energy you buy.</span>'
      ) +
      bar(
        "Direct emissions (Scope 1)",
        48,
        "var(--s1)",
        "190",
        0,
        '<b>Direct emissions · Scope 1</b><br>190 tCO2e (22% of total)<br>Data: Measured<br><span style="opacity:.8">Emissions from sources you own or control.</span>'
      ) +
      '</div><p class="muted sp">Scope 3 relies on supplier data and estimates.</p></section>' +
      '<section class="card c6"><div><h2>Biggest sources</h2><p class="muted">tCO2e, 2025</p></div><div class="stack">' +
      sourceBars() +
      "</div></section>" +
      '</div><section class="card c12" style="margin-bottom:20px"><h2>New to these terms?</h2><div>' +
      "<details><summary>What does tCO2e mean?</summary><p>It stands for tonnes of carbon dioxide equivalent. It lets different greenhouse gases be added up in one unit.</p></details>" +
      "<details><summary>What are Scope 1, 2 and 3?</summary><p>Scope 1 is direct emissions from sources you own or control. Scope 2 is emissions from the energy you buy. Scope 3 is everything else in your value chain, across 15 categories.</p></details>" +
      "<details><summary>Why are there three progress numbers?</summary><p>Data collected shows how much information we have. Reduced since 2023 shows how emissions changed. Progress to target compares that change with your goal. They are different measurements, so they are labelled separately.</p></details></div></section>" +
      '<p class="foot">This is sample data for now. Names, dates and numbers will be replaced with yours once we’ve confirmed them together.</p>',
    modules: () => {
      const m = [
        [
          "Scope 1-2-3 carbon footprint",
          "ok",
          "&#10003;",
          "Complete",
          "845 tCO2e",
          "Scope 3 estimated",
          100,
          "Open",
          "mod-footprint"
        ],
        [
          "Life Cycle Assessment",
          "warn",
          "&#9650;",
          "Draft ready",
          "1 report",
          "Awaiting your review",
          70,
          "Review",
          "mod-lca"
        ],
        [
          "Reduction roadmap",
          "",
          "&#9679;",
          "Draft",
          "4 initiatives",
          "Net-zero year not confirmed",
          40,
          "Open",
          "mod-roadmap"
        ],
        [
          "Account & Project Cockpit",
          "",
          "&#9679;",
          "Sample workspace",
          "3 projects",
          "Contacts, actions and planning",
          100,
          "Open",
          "mod-cockpit"
        ],
        [
          "Live reduction simulation",
          "",
          "&#9679;",
          "Interactive",
          "4 measures",
          "Adjust delivery and see the target gap change",
          100,
          "Explore",
          "mod-simulation"
        ],
        [
          "Users and access",
          "ok",
          "&#10003;",
          "3 active",
          "Raees, Jamie, Maria",
          "No pending invites",
          100,
          "Manage",
          "mod-users"
        ]
      ];
      return (
        modulesHeading() +
        '<div class="grid">' +
        m
          .map(
            (x) =>
              `<section class="card c6">${modulePreview(x[8])}<div class="ch"><h2>${x[0]}</h2>${pill(x[1], x[2], x[3])}</div><div><div class="kpi"><div class="big" style="font-size:28px">${x[4]}</div></div><p class="muted">${x[5]}</p></div>${bar("Setup complete", x[6], "var(--s2)", x[6] + "%")}<a class="btn g sp" href="#${x[8]}">${x[7]}</a></section>`
          )
          .join("") +
        '</div><section class="card c12"><div class="ch"><div><h2>Add a module</h2><p class="muted">See what else Dispersed can set up for you.</p></div><a class="btn" href="#modules">Browse services</a></div></section>'
      );
    },
    data: () => {
      const r = [
        ["Electricity", "Scope 2", 75, "warn", "&#9650;", "Q3 missing", "Q3 meter readings", "14 Nov"],
        ["Heating", "Scope 1", 100, "ok", "&#10003;", "Complete", "None", "Done"],
        ["Company cars", "Scope 1", 100, "ok", "&#10003;", "Complete", "None", "Done"],
        ["Business travel", "Scope 3", 75, "warn", "&#9650;", "Estimated", "Travel booking export", "28 Nov"],
        ["Purchased goods", "Scope 3", 65, "warn", "&#9650;", "Partial", "Supplier emissions data", "5 Dec"],
        ["Waste", "Scope 3", 65, "warn", "&#9650;", "Partial", "Q3 waste invoices", "28 Nov"]
      ];
      return (
        pageHeading(
          "Import",
          "Send the data your consultant needs, one source at a time.",
          '<p class="muted">Last updated 3 Nov 2026 · Sample data</p>'
        ) +
        '<div class="grid"><section class="card kpi c4"><h3>Data collected</h3><div class="big">80%</div><div class="trk" role="img" aria-label="80% collected"><b style="width:80%;background:var(--s2)"></b></div><p class="muted">Average across 6 categories</p></section>' +
        '<section class="card kpi c4"><h3>Still needed</h3><div class="big">4 <span class="unit">items</span></div><p class="muted">Meter readings, travel export, supplier data and waste invoices</p></section>' +
        '<section class="card kpi c4"><h3>Next deadline</h3><div class="big">14 Nov</div><p class="muted">Q3 electricity readings</p></section></div>' +
        '<div class="grid collection-pair"><section class="card c6"><div><h2>Completeness by category</h2><p class="muted">How much of the year is covered, and what is still needed</p></div><div class="tw" role="region" aria-label="Completeness by category table" tabindex="0"><table><tr><th>Category</th><th>Scope</th><th>Coverage</th><th>Status</th><th>Still needed</th><th>Due</th></tr>' +
        r
          .map(
            (x) =>
              `<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td><div class="coverage-meter"><div class="trk" role="img" aria-label="${x[0]} ${x[2]}% covered"><b style="width:${x[2]}%;background:var(--${x[3] == "ok" ? "ok" : "warn"})"></b></div><span class="val">${x[2]}%</span></div></td><td>${pill(x[3], x[4], x[5])}</td><td>${x[6]}</td><td>${x[7]}</td></tr>`
          )
          .join("") +
        "</table></div></section>" +
        '<section class="card c6 upload-card"><div><h2>Send us your data</h2><p class="muted">Pick your files and check them here before you send them.</p></div><select aria-label="Category" style="width:100%;margin:0"><option>Electricity</option><option>Business travel</option><option>Purchased goods</option><option>Waste</option><option>Other</option></select><label for="import-files">Choose files</label><input type="file" id="import-files" multiple accept=".pdf,.csv,.xls,.xlsx"><p id="import-selection" class="muted" role="status">No files selected.</p><a class="btn g s" href="emissions-data-template.csv" download>Download data template</a><p class="muted">Please include the reporting period, quantity and unit in your files.</p></section></div>' +
        '<div class="grid"><section class="card c6"><div><h2>Coverage by scope</h2><p class="muted">Average of the categories in each scope</p></div><div class="stack">' +
        bar("Direct emissions (Scope 1)", 100, "var(--s1)", "100%") +
        bar("Purchased energy (Scope 2)", 75, "var(--s2)", "75%") +
        bar("Value-chain emissions (Scope 3)", 68, "var(--s3)", "68% est.") +
        '</div><p class="muted sp">Scope 3 stays partial until suppliers send their data.</p></section>' +
        '<section class="card c6"><h2>Recently received</h2><div>' +
        [
          ["Heating invoices Q1 to Q3", "Maria · Yesterday", "ok", "&#10003;", "Accepted"],
          ["Company cars mileage 2025", "Maria · 1 week ago", "ok", "&#10003;", "Accepted"],
          ["Electricity readings Q2", "Raees · 3 weeks ago", "ok", "&#10003;", "Accepted"]
        ]
          .map(
            (x) =>
              `<div class="li"><div><h3>${x[0]}</h3><span class="muted">${x[1]}</span></div>${pill(x[2], x[3], x[4])}</div>`
          )
          .join("") +
        "</div></section></div>" +
        sampleDataNote()
      );
    },
    inbox: () => {
      const t = [
        ["Upload Q3 electricity readings", "Data collection", "Raees", "14 Nov", "bad", "&#9650;", "Due soon", "data"],
        ["Review the draft LCA report", "Modules", "Jamie", "20 Nov", "warn", "&#9650;", "Needs review", "mod-lca"],
        ["Confirm your net-zero year", "Roadmap", "Raees", "1 Dec", "", "&#9679;", "Open", "overview"]
      ];
      return (
        pageHeading("What needs you", "Everything waiting on you, soonest deadline first.") +
        '<div class="grid"><section class="card c8"><h2>Open requests</h2><p class="muted">Who is on it, when it is due, and where to start.</p><div>' +
        t
          .map(
            (x) =>
              `<div class="li"><div><h3>${x[0]}</h3><span class="muted">${x[1]} · Owner: ${x[2]} · Due ${x[3]}</span></div><div style="display:flex;gap:10px;align-items:center">${pill(x[4], x[5], x[6])}<a class="btn s" href="#${x[7]}">Open</a></div></div>`
          )
          .join("") +
        "</div></section>" +
        '<section class="card c4"><h2>Coming up</h2><div>' +
        [
          ["14 Nov", "Q3 electricity readings due"],
          ["20 Nov", "LCA draft review due"],
          ["1 Dec", "Net-zero year decision"],
          ["31 Dec", "Q4 report due"]
        ]
          .map((e) => `<div class="li"><b>${e[0]}</b><span class="muted" style="text-align:right">${e[1]}</span></div>`)
          .join("") +
        "</div></section></div>"
      );
    },
    reports: () =>
      pageHeading("Reports", "Check what still needs to be prepared for reporting.") +
      '<section class="card"><h2>Reporting readiness</h2><p>Four areas still need data or a quick look before your report is ready.</p>' +
      '<ol><li>Confirm the organization and reporting period.</li><li>Send us the data we are still waiting for.</li><li>Look over the measured and estimated emissions in Inventory.</li></ol><a class="btn" href="#status">View status overview</a></section>'
  };
  function chips() {
    return `<div class="chips">${moduleLinks.map((link) => `<a class="chip" href="#${link[0]}"${link[0] === currentRoute ? ' aria-current="page"' : ""}>${link[1]}</a>`).join("")}</div>`;
  }
  function modulesHeading() {
    return `<div class="top" style="margin-bottom:16px"><div><h1>Modules</h1><p class="sub">Every Dispersed service in one place.</p></div></div>${chips()}`;
  }
  function moduleHeading(title, subtitle, status, actions) {
    return (
      modulesHeading() +
      '<div class="top" style="margin-bottom:20px"><div><h2 style="font-size:22px">' +
      title +
      '</h2><p class="muted">' +
      subtitle +
      '</p></div><div style="display:flex;gap:12px;align-items:center">' +
      status +
      (actions || "") +
      "</div></div>"
    );
  }
  function renderTable(headers, rows, numericColumns) {
    numericColumns = numericColumns || [];
    const cellClass = (index) => (numericColumns.indexOf(index) > -1 ? ' class="n"' : "");
    return `<div class="tw"><table><tr>${headers.map((row, index) => `<th${cellClass(index)}>${row}</th>`).join("")}</tr>${rows.map((row) => `<tr>${row.map((cell, index) => `<td${cellClass(index)}>${cell}</td>`).join("")}</tr>`).join("")}</table></div>`;
  }
  function metricCard(title, value, subtitle, columnClass) {
    return `<section class="card kpi ${columnClass || "c4"}"><h3>${title}</h3><div class="big">${value}</div><p class="muted">${subtitle}</p></section>`;
  }
  function sampleDataNote() {
    return '<p class="foot">This is sample data for now. Names, dates and numbers will be replaced with yours once we’ve confirmed them together.</p>';
  }
  const emissionsUnit = ' <span class="unit">tCO2e</span>';
  function renderScopeDonut() {
    const categories = inventoryCategories(inventoryEntity, inventoryYear, "All scopes");
    const scopes = ["Direct emissions", "Purchased energy", "Value-chain emissions"].map((name, index) => {
      const scope = `Scope ${index + 1}`;
      const emissions = categories
        .filter((category) => category[1] === scope)
        .reduce((sum, category) => sum + category[3], 0);
      return {
        scope,
        name,
        emissions,
        color: `var(--s${index + 1})`
      };
    });
    const total = scopes.reduce((sum, item) => sum + item.emissions, 0);
    const point = (share) => {
      const angle = share * 2 * Math.PI - Math.PI / 2;
      return `${80 + 62 * Math.cos(angle)} ${80 + 62 * Math.sin(angle)}`;
    };
    let offset = 0;
    const segments = scopes
      .map((item) => {
        const share = item.emissions / total;
        const start = point(offset);
        offset += share;
        return `<path class="scope-segment" role="button" data-scope-filter="${item.scope}"
        aria-pressed="${activeScope === item.scope}" aria-label="Filter to ${item.scope}, ${item.emissions} tCO2e"
        tabindex="0" d="M ${start} A 62 62 0 ${share > 0.5 ? 1 : 0} 1 ${point(offset)}"
        fill="none" stroke="${item.color}" stroke-width="16"/>`;
      })
      .join("");
    const active = scopes.find((item) => item.scope === activeScope);
    return `<svg class="quality-donut${active ? " has-selection" : ""}" viewBox="0 0 160 160" role="group" aria-label="Filter dashboard by scope">
      ${segments}
      <text class="donut-total" x="80" y="79" text-anchor="middle">${active?.emissions ?? total}</text>
      <text class="m" x="80" y="98" text-anchor="middle">tCO2e</text>
    </svg>
    <div class="quality-legend">
      ${scopes
        .map(
          (
            item
          ) => `<button type="button" data-scope-filter="${item.scope}" aria-pressed="${activeScope === item.scope}">
        <span><i class="quality-swatch" style="background:${item.color}"></i>${item.scope} · ${item.name}</span>
        <span>${item.emissions} <small>(${((item.emissions / total) * 100).toFixed(1)}%)</small></span>
      </button>`
        )
        .join("")}
    </div>
    <p class="muted" role="status">${active ? `Dashboard filtered to ${active.scope}. Select again to reset.` : "Select a scope to filter all carbon tiles."}</p>`;
  }
  const inventoryEntities = {
    Headquarters: {
      amounts: [90, 20, 40, 75, 15, 10],
      revenue: 8
    },
    Production: {
      amounts: [150, 150, 20, 40, 30, 50],
      revenue: 12
    },
    Distribution: {
      amounts: [15, 20, 80, 5, 25, 10],
      revenue: 5
    }
  };
  let inventoryEntity = "All entities";
  let inventoryYear = 2025;
  let inventoryScope = "All scopes";
  let inventoryTrendView = "annual";
  function inventoryCategories(entity = inventoryEntity, year = inventoryYear, scope = inventoryScope) {
    return categories.map((category, index) =>
      category.map((value, column) => {
        if (column !== 3) return value;
        const amount = entity === "All entities" ? value : inventoryEntities[entity].amounts[index];
        return scope === "All scopes" || category[1] === scope ? (amount * actualEmissions[year]) / 845 : 0;
      })
    );
  }
  function renderInventoryFilters(cockpit = false) {
    return `<div class="dashboard-toolbar shared-inventory-filters" aria-label="Shared carbon inventory filters">${cockpit ? "<strong>Carbon tile filters</strong>" : ""}<label for="inventory-year">Period</label><select id="inventory-year">${Object.keys(
      actualEmissions
    )
      .map((year) => `<option value="${year}"${Number(year) === inventoryYear ? " selected" : ""}>${year}</option>`)
      .join(
        ""
      )}</select><label for="inventory-entity">Entity / site</label><select id="inventory-entity">${["All entities", ...Object.keys(inventoryEntities)].map((name) => `<option${inventoryEntity === name ? " selected" : ""}>${name}</option>`).join("")}</select><label for="inventory-scope">Scope</label><select id="inventory-scope">${["All scopes", "Scope 1", "Scope 2", "Scope 3"].map((scope) => `<option${inventoryScope === scope ? " selected" : ""}>${scope}</option>`).join("")}</select><button class="btn g s" type="button" data-inventory-reset>Reset filters</button></div><p class="dashboard-context" role="status">${inventoryYear} · ${inventoryEntity} · ${inventoryScope}${cockpit ? " · These filters apply to carbon tiles; project records keep their own dates." : " · Sample allocations and constant illustrative revenue."}</p>`;
  }
  function number(value, digits = 0) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }
  function dashboardTile(id, title, body, source, action, span = "c6") {
    const markup = `<section class="card dashboard-tile ${span}"><div class="dashboard-tile-heading"><span class="dashboard-tile-code">${id}</span><h2>${title}</h2></div><div class="dashboard-tile-content">${body}</div><footer class="dashboard-tile-footer"><span title="${source.replace(/"/g, "&quot;")}">Source: ${source.split(" · ")[0]}<br>Sample snapshot · 3 Nov 2026</span>${action || ""}</footer></section>`;
    return window.dashboardLayouts.tile(id, title, markup, span);
  }
  function renderAnnualTrend() {
    const records = inventoryCategories(inventoryEntity, 2025, inventoryScope);
    const visible = (index) => selectedCategories === null || selectedCategories.includes(index);
    const scopes = ["Scope 1", "Scope 2", "Scope 3"];
    const years = Object.entries(actualEmissions).filter(([year]) => Number(year) <= inventoryYear);
    const rows = years.map(([year, value]) => ({
      year,
      values: scopes.map((scope) =>
        records.reduce(
          (sum, item, index) => sum + (item[1] === scope && visible(index) ? (item[3] * value) / 845 : 0),
          0
        )
      )
    }));
    const max = Math.max(...rows.map((row) => row.values.reduce((sum, value) => sum + value, 0)), 1);
    const step = max > 600 ? 250 : max > 200 ? 100 : 50;
    const top = Math.ceil(max / step) * step;
    const baseline = 226;
    const y = (value) => baseline - (value / top) * 180;
    let marks = "";
    for (let value = 0; value <= top; value += step) {
      marks += `<line x1="60" x2="614" y1="${y(value)}" y2="${y(value)}" stroke="var(--line)"/><text x="50" y="${y(value) + 4}" text-anchor="end">${number(value)}</text>`;
    }
    rows.forEach((row, index) => {
      const x = 60 + ((index + 0.5) * 554) / rows.length - 34;
      let cumulative = 0;
      row.values.forEach((value, scopeIndex) => {
        if (!value) return;
        cumulative += value;
        marks += `<rect class="annual-segment" role="button" tabindex="0" data-scope-filter="${scopes[scopeIndex]}" aria-label="Filter to ${scopes[scopeIndex]}, ${row.year}, ${number(value, 1)} tCO₂e" x="${x}" y="${y(cumulative)}" width="68" height="${(value / top) * 180}" fill="var(--s${scopeIndex + 1})" ${tooltipAttributes(`<b>${scopes[scopeIndex]} · ${row.year}</b><br>${number(value, 1)} tCO₂e · illustrative scope allocation`)}/>`;
      });
      marks += `<text x="${x + 34}" y="${y(cumulative) - 9}" text-anchor="middle" font-weight="600">${number(cumulative, 1)}</text><text x="${x + 34}" y="248" text-anchor="middle">${row.year}</text>`;
      if (index === 0) marks += `<text class="m" x="${x + 34}" y="268" text-anchor="middle">Base year</text>`;
    });
    return `<svg class="annual-trend-chart" viewBox="0 0 640 280" role="group" aria-label="Annual emissions stacked by scope, starting with the 2023 baseline">${marks}</svg><div class="annual-scope-legend">${scopes.map((scope, index) => `<button type="button" data-scope-filter="${scope}" aria-pressed="${activeScope === scope}"><i style="background:var(--s${index + 1})"></i>${scope}</button>`).join("")}<button type="button" data-all="1">Show all</button></div><p class="muted">tCO₂e · 2023–${inventoryYear}. Historical scope and entity splits are illustrative allocations from company totals.</p>`;
  }
  function renderTrendViews() {
    return `<div class="trend-view-tabs" role="tablist" aria-label="Emissions chart view">${["annual", "monthly"].map((view) => `<button type="button" id="trend-tab-${view}" role="tab" tabindex="${inventoryTrendView === view ? "0" : "-1"}" aria-controls="trend-panel-${view}" aria-selected="${inventoryTrendView === view}" data-trend-view="${view}">${view === "annual" ? "Annual emissions" : "Monthly categories"}</button>`).join("")}</div><div class="trend-view-panels"><div id="trend-panel-annual" class="trend-chart-panel${inventoryTrendView === "annual" ? "" : " trend-inactive"}" role="tabpanel" aria-labelledby="trend-tab-annual" aria-hidden="${inventoryTrendView !== "annual"}"${inventoryTrendView === "annual" ? "" : " inert"}><div id="annual-trend">${renderAnnualTrend()}</div></div><div id="trend-panel-monthly" class="trend-chart-panel${inventoryTrendView === "monthly" ? "" : " trend-inactive"}" role="tabpanel" aria-labelledby="trend-tab-monthly" aria-hidden="${inventoryTrendView !== "monthly"}"${inventoryTrendView === "monthly" ? "" : " inert"}><p class="muted">Monthly category breakdown · ${inventoryYear}</p><div id="sc">${renderMonthlyChart()}</div></div></div>`;
  }
  function companyPathwayTile() {
    return dashboardTile(
      "E8",
      "Emissions pathway",
      `<p class="muted">Company-wide scenario · 2023–2027 · actual emissions, projection and illustrative target</p><div id="cw" class="cw"></div>${renderPathwayLegend()}<p class="muted">This planning chart always shows the full company scenario. Inventory period, entity and scope filters apply to E1–E7.</p>`,
      "Company inventory + illustrative projection and target",
      '<a href="#mod-roadmap">View reduction roadmap</a>',
      "c12"
    );
  }
  function renderScopeQuality() {
    return `<div class="scope-quality-list">${[
      ["Scope 1", 95, 5],
      ["Scope 2", 100, 2],
      ["Scope 3", 42, 30]
    ]
      .filter(([scope]) => inventoryScope === "All scopes" || scope === inventoryScope)
      .map(
        ([scope, primary, uncertainty]) =>
          `<div><div class="scope-quality-label"><strong>${scope}</strong><span>±${uncertainty}%</span></div><div class="scope-quality-track" role="img" aria-label="${scope}: ${primary}% primary data; plus or minus ${uncertainty}% illustrative uncertainty"><i style="width:${primary}%"></i></div><p class="muted">${primary}% primary data</p></div>`
      )
      .join(
        ""
      )}</div><details class="quality-assumptions"><summary>About these figures</summary><p>Primary-data coverage and uncertainty are illustrative assessments from the briefing, reused for the selected period and entity.</p></details>`;
  }
  function renderMilestoneTimeline() {
    const phases = [
      ["Data collection", 0, 1, "var(--s1)"],
      ["Calculation", 1, 1, "var(--s2)"],
      ["Reporting", 2, 1, "var(--s3)"],
      ["Verification", 3, 1, "var(--fleet)"]
    ];
    return `<p class="muted">2026 annual plan · illustrative quarter assignments</p><div class="timeline-scroll" role="region" tabindex="0" aria-label="2026 project milestones"><div class="milestone-timeline"><div class="timeline-quarter-row"><span>Phase</span>${["Q1", "Q2", "Q3", "Q4"].map((quarter) => `<span>${quarter}</span>`).join("")}</div>${phases.map(([phase, start, duration, color]) => `<div class="timeline-phase-row"><strong>${phase}</strong><div class="timeline-phase-track"><span style="left:${start * 25}%;width:${duration * 25}%;background:${color}" aria-label="${phase} scheduled in quarter ${start + 1}"></span></div></div>`).join("")}</div></div><details><summary>Upcoming checkpoints</summary>${renderTable(
      ["Date", "Milestone", "Owner"],
      [
        ["14 Nov 2026", "Electricity evidence", "Raees"],
        ["20 Nov 2026", "LCA draft review", "Jamie"],
        ["1 Dec 2026", "Target decision", "Raees"],
        ["12 Dec 2026", "Q4 client review", "Dispersed + client"]
      ]
    )}</details>`;
  }
  function renderKpiHistory(total, divisor, unit) {
    const values = Object.entries(actualEmissions)
      .filter(([year]) => Number(year) <= inventoryYear)
      .map(([year, value]) => ({
        year,
        value: ((value / actualEmissions[inventoryYear]) * total) / divisor
      }));
    const max = Math.max(...values.map((item) => item.value), 1);
    return `<div class="kpi-history" aria-label="Annual ${unit} comparison">${values.map((item) => `<div><span>${number(item.value, 1)}</span><i style="height:${(item.value / max) * 60}px"></i><small>${item.year}</small></div>`).join("")}</div>`;
  }
  function renderCarbonDashboard() {
    const records = inventoryCategories();
    const total = records.reduce((sum, item) => sum + item[3], 0);
    const revenue = inventoryEntity === "All entities" ? 25 : inventoryEntities[inventoryEntity].revenue;
    const ranked = records
      .filter((item) => item[3] > 0)
      .sort((a, b) => b[3] - a[3])
      .slice(0, 5);
    const entities = Object.keys(inventoryEntities).map((name) => ({
      name,
      amount: inventoryCategories(name).reduce((sum, item) => sum + item[3], 0)
    }));
    const maxEntity = Math.max(...entities.map((item) => item.amount), 1);
    const entityButtons = entities
      .map(
        ({ name, amount }) =>
          `<button type="button" class="entity-choice" data-inventory-entity="${name}" aria-pressed="${inventoryEntity === name}"><span>${name}</span><strong>${number(amount, 1)} tCO₂e</strong><span class="entity-track"><i style="width:${(amount / maxEntity) * 100}%"></i></span></button>`
      )
      .join("");
    const previous = actualEmissions[inventoryYear - 1];
    const change = previous
      ? number((1 - actualEmissions[inventoryYear] / previous) * 100, 1) + "% below " + (inventoryYear - 1)
      : "2023 baseline period";
    return (
      pageHeading("Carbon Footprint", "Understand emissions, hotspots and data quality for the selected entity.") +
      renderInventoryFilters() +
      '<div class="grid dashboard-layout-grid">' +
      dashboardTile(
        "E1",
        "Total emissions",
        `<p class="dashboard-kpi">${number(total)} <span class="unit">tCO₂e</span></p><p class="muted">${change}</p>${renderKpiHistory(total, 1, "emissions in tCO₂e")}`,
        `Annual inventory · ${inventoryYear}`,
        '<a href="#mod-footprint" data-inventory-detail="inventory-categories">View category records</a>',
        "c4"
      ) +
      dashboardTile(
        "E5",
        "Emission intensity",
        `<p class="dashboard-kpi">${number(total / revenue, 1)}</p><p>tCO₂e per €M revenue</p><p class="muted">Illustrative revenue · €${number(revenue)}M</p>${renderKpiHistory(total, revenue, "intensity in tCO₂e per million euros")}`,
        "Annual inventory + sample revenue",
        '<a href="#mod-footprint" data-inventory-detail="inventory-basis">View calculation basis</a>',
        "c4"
      ) +
      dashboardTile(
        "E6",
        "Data quality",
        renderScopeQuality(),
        "Briefing · illustrative primary-data and uncertainty assessment",
        '<a href="#data">Review data coverage</a>',
        "c4"
      ) +
      companyPathwayTile() +
      dashboardTile(
        "E3",
        "Emissions trend",
        renderTrendViews(),
        "Annual company inventory · illustrative historical scope allocations",
        '<a href="#mod-footprint" data-inventory-detail="inventory-categories">View underlying categories</a>',
        "c8"
      ) +
      dashboardTile(
        "E2",
        "Scope 1 · 2 · 3 split",
        `<div id="scope-donut">${renderScopeDonut()}</div>`,
        `Annual inventory · ${inventoryYear}`,
        '<a href="#mod-footprint" data-inventory-detail="inventory-categories">View scope records</a>',
        "c4"
      ) +
      dashboardTile(
        "E4",
        "Top 5 hotspots",
        `<div class="stack">${ranked.map((item) => bar(item[0], (item[3] / ranked[0][3]) * 100, item[2], number(item[3]) + " tCO₂e")).join("")}</div>`,
        "Annual inventory · ranked by emissions",
        '<a href="#mod-footprint" data-inventory-detail="inventory-categories">All categories</a>',
        "c6"
      ) +
      dashboardTile(
        "E7",
        "Emissions per entity",
        `<p class="muted">Selected period and scope · select an entity to filter the dashboard.</p><div class="entity-choices">${entityButtons}</div><button type="button" class="btn g s" data-inventory-entity="All entities">Show all entities</button>`,
        "Illustrative allocation across three entities",
        "",
        "c6"
      ) +
      '</div><!--dashboard-tiles-end--><section class="card" id="inventory-categories"><h2>Emissions by category</h2>' +
      renderTable(
        ["Category", "Scope", "tCO₂e", "Data quality"],
        records
          .filter((item) => item[3] > 0)
          .map((item) => [
            item[0],
            item[1],
            number(item[3], 1),
            pill(item[4] === "Measured" ? "ok" : "warn", item[4] === "Measured" ? "✓" : "△", item[4])
          ])
      ) +
      '</section><details id="inventory-basis" class="inventory-basis"><summary>Calculation basis and assumptions</summary><p>Intensity divides the selected entity’s emissions by its annual revenue in millions of euros. Revenue is illustrative and held constant across periods: Headquarters €8M, Production €12M and Distribution €5M. Entity categories sum to the same 845 tCO₂e company inventory.</p><p>Monthly figures are estimates allocated from annual category totals using seasonal weights. Measured or estimated describes the annual evidence, rather than the monthly allocation. Historical scope allocations, entity and revenue figures require client confirmation. Primary-data coverage is distinct from the measured-versus-estimated labels on annual category records.</p></details>' +
      sampleDataNote()
    );
  }
  function renderClientCockpit() {
    const tasks = [
      ["Q3 electricity readings", "Raees", "14 Nov 2026", "Open", "#data"],
      ["Review draft LCA", "Jamie", "20 Nov 2026", "Needs review", "#mod-lca"],
      ["Confirm net-zero year", "Raees", "1 Dec 2026", "Open", "#mod-roadmap"]
    ];
    const projects = [
      ["Carbon inventory 2025", "Data review", "Maria", "In progress", "#mod-footprint"],
      ["Hydraulic valve H7 LCA", "Draft review", "Jamie", "Needs review", "#mod-lca"],
      ["Reduction roadmap", "Planning", "Raees", "Target unconfirmed", "#mod-roadmap"]
    ];
    return (
      pageHeading("Account & Project Cockpit", "Client information, ongoing projects and what needs to happen next.") +
      '<p class="dashboard-context">Demo Manufacturing B.V. · Sample client workspace</p>' +
      renderInventoryFilters(true) +
      '<div class="grid dashboard-layout-grid">' +
      dashboardTile(
        "D6",
        "Client & contract",
        renderTable(
          ["Field", "Details"],
          [
            ["Primary contact", "Raees Pritchard · Sustainability"],
            ["Other contacts", "Jamie · Finance; Maria · Operations"],
            ["Services", "Carbon accounting, product footprint, reduction roadmap"],
            ["Contract through", "31 Dec 2026 · illustrative"],
            ["Next touchpoint", "Q4 review · 12 Dec 2026 · illustrative"]
          ]
        ),
        "Client records · illustrative contacts and contract",
        '<a href="#mod-users">Manage users and access</a>',
        "c6"
      ) +
      dashboardTile(
        "D1",
        "Projects",
        renderTable(
          ["Project", "Phase", "Owner", "Status", ""],
          projects.map((row) => [...row.slice(0, 4), `<a href="${row[4]}">Open</a>`])
        ),
        "Sample project register",
        "",
        "c6"
      ) +
      dashboardTile(
        "D3",
        "Open actions",
        renderTable(
          ["Action", "Owner", "Due", "Status", ""],
          tasks.map((row) => [...row.slice(0, 4), `<a href="${row[4]}">Open</a>`])
        ),
        "Sample action register",
        '<a href="#inbox">View Inbox</a>',
        "c8"
      ) +
      dashboardTile(
        "D4",
        "Supplier data requests",
        `<div class="stack">${[
          ["Supplier A", 100],
          ["Supplier B", 60],
          ["Supplier C", 25],
          ["Supplier D", 0]
        ]
          .map(([name, value]) => bar(name, value, "var(--s2)", value + "%"))
          .join("")}</div><p class="muted">Illustrative evidence completion by supplier.</p>`,
        "Sample supplier request register",
        '<a href="#data">Review outstanding data</a>',
        "c4"
      ) +
      dashboardTile(
        "D2",
        "Milestone planning",
        renderMilestoneTimeline(),
        "Sample annual delivery plan and milestone register",
        '<a href="#inbox">View upcoming tasks</a>',
        "c6"
      ) +
      dashboardTile(
        "D5",
        "Budget vs actual hours",
        renderTable(
          ["Engagement", "Budget", "Actual", "Remaining"],
          [
            ["Carbon accounting", "120 h", "86 h", "34 h"],
            ["Product footprint", "180 h", "142 h", "38 h"],
            ["Roadmap", "60 h", "24 h", "36 h"]
          ]
        ) + '<p class="muted">Illustrative time records · 252 of 360 hours used.</p>',
        "Sample project time records",
        "",
        "c6"
      ) +
      "</div><!--dashboard-tiles-end-->" +
      sampleDataNote()
    );
  }
  function redrawInventoryFilters(focusId) {
    selectedCategories = null;
    activeScope = inventoryScope === "All scopes" ? null : inventoryScope;
    renderRoute({
      keepView: true
    });
    document.getElementById(focusId)?.focus({
      preventScroll: true
    });
  }
  document.addEventListener("change", (event) => {
    const id = event.target.id;
    const value = event.target.value;
    if (id === "inventory-entity") {
      if (value !== "All entities" && !Object.hasOwn(inventoryEntities, value)) return;
      inventoryEntity = value;
    } else if (id === "inventory-year") {
      if (!Object.hasOwn(actualEmissions, value)) return;
      inventoryYear = Number(value);
    } else if (id === "inventory-scope") {
      if (!["All scopes", "Scope 1", "Scope 2", "Scope 3"].includes(value)) return;
      inventoryScope = value;
    } else return;
    redrawInventoryFilters(id);
  });
  document.addEventListener("click", (event) => {
    const trend = event.target.closest("[data-trend-view]");
    if (trend) {
      inventoryTrendView = trend.dataset.trendView;
      document.querySelectorAll("[data-trend-view]").forEach((button) => {
        const selected = button.dataset.trendView === inventoryTrendView;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      document.querySelectorAll(".trend-chart-panel").forEach((panel) => {
        const active = panel.id === `trend-panel-${inventoryTrendView}`;
        panel.classList.toggle("trend-inactive", !active);
        panel.setAttribute("aria-hidden", String(!active));
        panel.inert = !active;
      });
      watchMonthlyPlot();
      return;
    }
    if (event.target.closest("[data-inventory-reset]")) {
      inventoryYear = 2025;
      inventoryEntity = "All entities";
      inventoryScope = "All scopes";
      redrawInventoryFilters("inventory-year");
      return;
    }
    const detail = event.target.closest("[data-inventory-detail]");
    if (detail) {
      event.preventDefault();
      let target = document.getElementById(detail.dataset.inventoryDetail);
      if (!target) {
        location.hash = "#mod-footprint";
        renderRoute();
        target = document.getElementById(detail.dataset.inventoryDetail);
      }
      if (target?.tagName === "DETAILS") target.open = true;
      target?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
      return;
    }
    const button = event.target.closest("[data-inventory-entity]");
    if (!button) return;
    const entity = button.dataset.inventoryEntity;
    if (entity !== "All entities" && !Object.hasOwn(inventoryEntities, entity)) return;
    inventoryEntity = entity;
    redrawInventoryFilters("inventory-entity");
  });
  views["mod-footprint"] = renderCarbonDashboard;
  views["mod-cockpit"] = renderClientCockpit;
  views["mod-lca"] = () => {
    const st = [
      ["Raw materials", 100, "6.6 (52%)"],
      ["Manufacturing", 40, "2.6 (21%)"],
      ["Transport", 21, "1.4 (11%)"],
      ["Use", 17, "1.1 (9%)"],
      ["End of life", 13, "0.9 (7%)"]
    ];
    return (
      pageHeading(
        "Product Footprint",
        "The environmental impact of your products from raw materials to end of life.",
        pill("warn", "&#9650;", "Draft ready")
      ) +
      '<div class="grid"><section class="card c8"><div><h2>Impact by life-cycle stage</h2><p class="muted">Hydraulic valve H7, 12.6 kgCO2e per valve</p></div><div class="stack">' +
      st.map((x) => bar(x[0], x[1], "var(--s2)", x[2])).join("") +
      '</div><p class="muted sp">Raw materials drive over half of the impact. Supplier data for this stage is still estimated.</p></section>' +
      '<section class="card c4"><h2>Review checklist</h2><div>' +
      [
        ["Scope and functional unit", "ok", "&#10003;", "Confirmed"],
        ["Supplier data for raw materials", "warn", "&#9650;", "Estimated"],
        ["Sign off the draft report", "", "&#9679;", "Open"]
      ]
        .map((x) => `<div class="li"><span>${x[0]}</span>${pill(x[1], x[2], x[3])}</div>`)
        .join("") +
      "</div></section></div>" +
      '<section class="card c12"><h2>Products assessed</h2>' +
      renderTable(
        ["Product", "Functional unit", "kgCO2e", "Biggest stage", "Status"],
        [
          ["<b>Steel bracket A12</b>", "1 bracket", "4.8", "Raw materials", pill("ok", "&#10003;", "Final")],
          ["<b>Hydraulic valve H7</b>", "1 valve", "12.6", "Raw materials", pill("warn", "&#9650;", "Draft")],
          ["<b>Housing cover C3</b>", "1 cover", "7.9", "Manufacturing", pill("", "&#9679;", "In progress")]
        ],
        [2]
      ) +
      "</section>" +
      sampleDataNote()
    );
  };
  const roadmapMeasures = [
    {
      name: "Renewable electricity contract",
      short: ["Renewable", "electricity"],
      impact: 210,
      owner: "Raees",
      status: "Planned",
      estimated: false
    },
    {
      name: "Supplier engagement on purchased goods",
      short: ["Supplier", "engagement"],
      impact: 80,
      owner: "Jamie",
      status: "Planned",
      estimated: true
    },
    {
      name: "Heat pump replacing gas heating",
      short: ["Heat", "pump"],
      impact: 70,
      owner: "Maria",
      status: "Idea",
      estimated: false
    },
    {
      name: "Fleet electrification",
      short: ["Fleet", "electrification"],
      impact: 60,
      owner: "Raees",
      status: "Idea",
      estimated: false
    }
  ];
  function renderReductionBridge(impacts = roadmapMeasures.map((item) => item.impact)) {
    const base = actualEmissions[2023];
    const current = actualEmissions[2025];
    const target = targetEmissions[2027];
    let remaining = current;
    const steps = [
      {
        label: ["2023", "baseline"],
        name: "2023 baseline",
        lower: 0,
        upper: base,
        value: base,
        type: "total"
      },
      {
        label: ["Achieved", "by 2025"],
        name: "Achieved reduction by 2025",
        lower: current,
        upper: base,
        value: base - current,
        type: "achieved"
      },
      ...roadmapMeasures.map((item, index) => {
        const impact = impacts[index];
        const prior = remaining;
        remaining -= impact;
        return {
          label: item.short,
          name: item.name,
          lower: remaining,
          upper: prior,
          value: impact,
          type: "planned",
          estimated: item.estimated
        };
      }),
      {
        label: ["After all", "measures"],
        name: "Remaining emissions after all measures",
        lower: 0,
        upper: remaining,
        value: remaining,
        type: "total"
      }
    ];
    const top = Math.ceil(base / 200) * 200;
    const y = (value) => 248 - (value / top) * 220;
    const stride = 98;
    const width = 50;
    const color = (type) => (type === "total" ? "var(--s1)" : type === "achieved" ? "var(--s2)" : "var(--s3)");
    let marks = "";
    for (let value = 0; value <= top; value += 200) {
      marks += `<line x1="64" x2="760" y1="${y(value)}" y2="${y(value)}" stroke="var(--line)"/><text class="m" x="54" y="${y(value) + 4}" text-anchor="end">${number(value)}</text>`;
    }
    steps.forEach((step, index) => {
      const x = 84 + index * stride;
      const tipText = `<b>${step.name}</b><br>${step.type === "total" ? "" : "Reduction: −"}${number(step.value, 1)} tCO₂e${step.estimated ? " · estimated" : ""}${step.type === "planned" ? "<br>Planned potential · delivery unconfirmed" : ""}`;
      marks += `<rect class="waterfall-step" x="${x}" y="${y(step.upper)}" width="${width}" height="${y(step.lower) - y(step.upper)}" fill="${color(step.type)}" ${tooltipAttributes(tipText)}/><text x="${x + width / 2}" y="${y(step.upper) - 9}" text-anchor="middle" font-weight="600">${step.type === "total" ? "" : "−"}${number(step.value, 1)}</text><text x="${x + width / 2}" y="272" text-anchor="middle">${step.label.map((line, i) => `<tspan x="${x + width / 2}" dy="${i ? 17 : 0}">${line}</tspan>`).join("")}</text>`;
      if (index < steps.length - 1) {
        const level = index === 0 ? base : step.lower;
        marks += `<line x1="${x + width}" x2="${x + stride}" y1="${y(level)}" y2="${y(level)}" stroke="var(--muted)" stroke-dasharray="3 3"/>`;
      }
    });
    marks += `<line x1="64" x2="780" y1="${y(target)}" y2="${y(target)}" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4"/><text x="790" y="${y(target) - 4}" style="fill:var(--warn)">2027 target</text><text x="790" y="${y(target) + 14}" style="fill:var(--warn)">${number(target)}</text><text class="m" x="64" y="16">tCO₂e</text>`;
    const potential = impacts.reduce((sum, value) => sum + value, 0);
    const gap = remaining - target;
    return `<p class="muted">2023 baseline → achieved reduction → planned measures → remaining emissions</p><div class="waterfall-scroll" role="region" aria-label="Reduction waterfall chart" tabindex="0"><svg class="waterfall-chart" viewBox="0 0 900 310" role="img" aria-label="From ${base} tCO₂e in 2023, achieved reduction ${base - current}, planned reductions ${potential}, remaining ${remaining}, target ${target}.">${marks}</svg></div><div class="waterfall-legend"><span><i style="background:var(--s1)"></i>Total emissions</span><span><i style="background:var(--s2)"></i>Achieved</span><span><i style="background:var(--s3)"></i>Planned potential</span><span class="muted">Dashed line · target</span></div><div class="waterfall-outcome"><strong>${number(remaining, 1)} tCO₂e remaining</strong><span>${number(potential, 1)} tCO₂e planned reduction</span><span>${gap > 0 ? number(gap, 1) + " tCO₂e above target" : number(-gap, 1) + " tCO₂e below target"}</span></div><p class="muted">Illustrative scenario based on the 2025 inventory. Planned reductions are additive assumptions; overlaps, timing and delivery require confirmation. The existing 2027 projection is a separate scenario.</p>`;
  }
  function roadmapBridgeTile() {
    return dashboardTile(
      "R4",
      "Reduction bridge",
      renderReductionBridge(),
      "2023–2025 sample inventory + illustrative reduction measures",
      "",
      "c12"
    );
  }
  views["mod-roadmap"] = () => {
    const planned = roadmapMeasures.reduce((sum, item) => sum + item.impact, 0);
    const projectedGap = projectedEmissions[2027] - targetEmissions[2027];
    return (
      pageHeading(
        "Reduction roadmap",
        "Planned actions to close the gap between your projection and your target.",
        '<a class="btn s" href="#mod-simulation">Live simulation</a>'
      ) +
      '<div class="grid">' +
      metricCard("Projected gap", projectedGap + emissionsUnit, "Projected 2027 vs placeholder target") +
      metricCard("Planned impact", planned + emissionsUnit, "If all four initiatives are delivered") +
      metricCard("Cost data", "To be confirmed", "Not yet available from Dispersed") +
      "</div>" +
      '<div class="roadmap-waterfall">' +
      roadmapBridgeTile() +
      "</div>" +
      '<section class="card c12"><div><h2>Initiatives ranked by impact</h2><p class="muted">Reduction per year, in tCO2e</p></div>' +
      renderTable(
        ["Initiative", "Impact", "Owner", "Status"],
        roadmapMeasures.map((item) => {
          const value = item.impact + (item.estimated ? " est." : "");
          return [
            `<b>${item.name}</b>`,
            `<div style="display:grid;grid-template-columns:1fr 70px;gap:10px;align-items:center;min-width:200px"><div class="trk"><b style="width:${(item.impact / 210) * 100}%;background:var(--s2)"></b></div><span class="val">${value}</span></div>`,
            item.owner,
            pill("", "&#9679;", item.status)
          ];
        })
      ) +
      "</section>" +
      sampleDataNote()
    );
  };
  views["mod-users"] = () =>
    moduleHeading(
      "Users and access",
      "Who can see and act on your portal.",
      pill("ok", "&#10003;", "3 active"),
      '<a class="btn s" href="#mod-users">Invite user</a>'
    ) +
    '<div class="grid"><section class="card c8"><h2>People</h2>' +
    renderTable(
      ["Name", "Role", "Access", "Last active"],
      [
        ["<b>Raees Pritchard</b>", "Sustainability", "Admin", "Today"],
        ["<b>Jamie</b>", "Finance", "Reports and export", "Yesterday"],
        ["<b>Maria</b>", "Operations", "Uploads data", "3 days ago"]
      ]
    ) +
    "</section>" +
    '<section class="card c4"><div><h2>Proposed roles</h2><p class="muted">To be confirmed with Dispersed</p></div><div class="stack"><p><b>Sustainability</b><br><span class="muted">Overview, roadmap and all modules</span></p><p><b>Finance</b><br><span class="muted">Reports, exports and cost data</span></p><p><b>Operations</b><br><span class="muted">Data collection and tasks</span></p></div></section></div>' +
    sampleDataNote();
  views.status = () =>
    pageHeading("Status Overview", "Track the sample inventory and see what still needs attention.") +
    '<div class="grid">' +
    metricCard("Complete categories", "2 of 6", "Heating and company cars") +
    metricCard("Outstanding requests", "4", "Electricity, travel, purchased goods and waste") +
    metricCard("Next deadline", "14 Nov", "Q3 electricity readings") +
    "</div>" +
    '<section class="card"><h2>Open evidence items</h2><ul><li>Electricity meter readings</li><li>Business travel booking export</li><li>Supplier emissions data</li><li>Waste invoices</li></ul><a class="btn" href="#inbox">View requests</a></section>';
  views.boundaries = () =>
    pageHeading("Boundaries", "Review the organization, reporting period and activities covered by this inventory.") +
    '<section class="card"><h2>Inventory coverage</h2>' +
    renderTable(
      ["Boundary", "Included in this sample"],
      [
        ["Organization", "Demo Manufacturing B.V."],
        ["Reporting period", "January to December 2025"],
        ["Scope 1", "Heating and company cars"],
        ["Scope 2", "Purchased electricity"],
        ["Scope 3", "Purchased goods, business travel and waste"]
      ]
    ) +
    '<p class="muted">Site coverage and exclusions are pending confirmation.</p><a class="btn g s" href="#mod-footprint">Review included sources</a></section>';
  views.benchmarking = () =>
    pageHeading("Benchmarking", "Compare the company’s annual emissions against its own 2023 baseline.") +
    '<section class="card"><h2>Historical emissions</h2><div class="stack">' +
    Object.entries(actualEmissions)
      .map(([year, value]) =>
        bar(year, (value / actualEmissions[2023]) * 100, "var(--s1)", value.toLocaleString() + " tCO₂e")
      )
      .join("") +
    '</div><p class="muted">2025 emissions were 455 tCO₂e below the 2023 baseline, a 35% reduction. Internal comparison using sample data.</p><a class="btn g s" href="#mod-roadmap">Compare with the target</a></section>';
  const simulationDelivery = [100, 100, 100, 100];
  function simulationImpacts() {
    return roadmapMeasures.map((item, index) => (item.impact * simulationDelivery[index]) / 100);
  }
  function simulationSummary() {
    const reduction = simulationImpacts().reduce((sum, value) => sum + value, 0);
    const remaining = actualEmissions[2025] - reduction;
    const gap = remaining - targetEmissions[2027];
    return `<div class="scenario-summary" role="status"><div><span>Remaining emissions</span><strong>${number(remaining, 1)} tCO₂e</strong></div><div><span>Planned reduction</span><strong>${number(reduction, 1)} tCO₂e</strong></div><div><span>Against the 2027 target</span><strong>${number(Math.abs(gap), 1)} tCO₂e ${gap > 0 ? "above" : gap < 0 ? "below" : "at"} target</strong></div></div>`;
  }
  function renderLiveSimulation() {
    return (
      pageHeading(
        "Live reduction simulation",
        "Adjust delivery of each measure and watch the reduction bridge update.",
        '<a class="btn g s" href="#mod-roadmap">Reduction roadmap</a>'
      ) +
      '<div class="grid"><section class="card c4 scenario-control-card"><h2>Measure delivery</h2><p class="muted">0% excludes a measure; 100% applies its full illustrative reduction.</p>' +
      roadmapMeasures
        .map(
          (item, index) =>
            `<label class="scenario-control" for="scenario-delivery-${index}"><strong>${item.name}</strong><span><output id="scenario-label-${index}">${simulationDelivery[index]}% · ${number((item.impact * simulationDelivery[index]) / 100, 1)} tCO₂e</output></span><input type="range" id="scenario-delivery-${index}" data-scenario-index="${index}" min="0" max="100" step="1" value="${simulationDelivery[index]}"></label>`
        )
        .join("") +
      '<button class="btn g s" type="button" data-scenario-reset>Reset to full delivery</button><p class="muted">2025 starting inventory · 845 tCO₂e. 2027 target · 380 tCO₂e. All measures and effects are illustrative.</p></section>' +
      '<section class="card c8 scenario-result-card"><h2>Live reduction bridge</h2><div id="scenario-summary">' +
      simulationSummary() +
      '</div><div id="scenario-chart">' +
      renderReductionBridge(simulationImpacts()) +
      "</div></section></div>" +
      sampleDataNote()
    );
  }
  function updateSimulation() {
    const summary = document.getElementById("scenario-summary");
    const chart = document.getElementById("scenario-chart");
    if (summary) summary.innerHTML = simulationSummary();
    if (chart) chart.innerHTML = renderReductionBridge(simulationImpacts());
    simulationDelivery.forEach((value, index) => {
      const label = document.getElementById(`scenario-label-${index}`);
      if (label)
        label.textContent = value + "% · " + number((roadmapMeasures[index].impact * value) / 100, 1) + " tCO₂e";
    });
    tooltip.style.display = "none";
  }
  document.addEventListener("input", (event) => {
    const index = Number(event.target.dataset?.scenarioIndex);
    if (
      event.target.dataset?.scenarioIndex === undefined ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= roadmapMeasures.length
    )
      return;
    simulationDelivery[index] = Math.max(0, Math.min(100, Number(event.target.value) || 0));
    updateSimulation();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-scenario-reset]")) return;
    simulationDelivery.fill(100);
    simulationDelivery.forEach((value, index) => {
      const input = document.getElementById(`scenario-delivery-${index}`);
      if (input) input.value = String(value);
    });
    updateSimulation();
  });
  views.simulation = renderLiveSimulation;
  views["mod-simulation"] = renderLiveSimulation;
  views.risk = () =>
    pageHeading("Risk", "Review the data gaps and assumptions that could affect the inventory and reduction plan.") +
    '<section class="card"><h2>Items to review</h2>' +
    renderTable(
      ["Risk", "What to verify"],
      [
        ["Incomplete electricity records", "Collect Q3 meter readings."],
        ["Estimated value-chain emissions", "Check supplier data, travel records and waste invoices."],
        ["Illustrative target", "Confirm the 2027 target and underlying assumptions."]
      ]
    ) +
    '<a class="btn g s" href="#data">Review evidence coverage</a></section>';
  document.addEventListener("change", (event) => {
    if (event.target.id !== "import-files") return;
    const names = Array.from(event.target.files, (file) => file.name);
    document.getElementById("import-selection").textContent = names.length
      ? `Selected locally: ${names.join(", ")}`
      : "No files selected.";
  });
  views.settings = window.companyBranding.page;

  // Resolve only routes declared in the view table.
  function renderRoute(options) {
    const scrollPosition = {
      x: window.scrollX || 0,
      y: window.scrollY || 0
    };
    let route = (location.hash || "#overview").slice(1);
    if (!Object.hasOwn(views, route)) route = "overview";
    const keepView = options?.keepView || currentRoute === route;
    currentRoute = route;
    if (!keepView) {
      selectedCategories = null;
      activeScope = inventoryScope === "All scopes" ? null : inventoryScope;
    }
    document.getElementById("nav").innerHTML = window.companyBranding
      .navigation(navigationLinks)
      .map((link) => {
        const isActive = link[0] === route || (link[0] === "modules" && route.indexOf("mod") === 0);
        return `<a href="#${link[0]}"${isActive ? ' aria-current="page"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${navIcons[link[0]]}</svg>${link[1]}${link[0] === "inbox" ? '<span class="bd">3</span>' : ""}</a>`;
      })
      .join("");
    const backToModules = route.startsWith("mod-")
      ? `<div class="module-switcher"><a class="btn g s" href="#modules">Back to Modules</a><label for="module-switch">Change module</label><select id="module-switch">${moduleLinks
          .filter((item) => item[0] !== "modules")
          .map(
            ([moduleRoute, label]) =>
              `<option value="${moduleRoute}"${moduleRoute === route ? " selected" : ""}>${label}</option>`
          )
          .join("")}</select></div>`
      : "";
    if (route === "mod-footprint" || route === "mod-cockpit") {
      renderCarbonDashboard();
      renderClientCockpit();
      roadmapBridgeTile();
    }
    const content = window.dashboardLayouts.render(route, views[route]());
    const app = document.getElementById("app");
    if (keepView) app.style.minHeight = app.offsetHeight + "px";
    app.classList.toggle("page-updating", Boolean(keepView));
    app.innerHTML = window.companyBranding.content(backToModules + content);
    window.companyBranding.ready();
    watchMonthlyPlot();
    if (!keepView) window.scrollTo(0, 0);
    drawPathwayChart();
    const chartContainer = document.getElementById("cw");
    if (chartObserver) chartObserver.disconnect();
    if (chartContainer && window.ResizeObserver) {
      chartObserver = new ResizeObserver(drawPathwayChart);
      chartObserver.observe(chartContainer);
    }
    if (keepView) {
      app.style.minHeight = "";
      window.scrollTo({
        left: scrollPosition.x,
        top: scrollPosition.y,
        behavior: "instant"
      });
    }
  }
  document.addEventListener("keydown", (event) => {
    if (!event.target.matches("[data-trend-view]") || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
      return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "annual"
        : event.key === "End"
          ? "monthly"
          : inventoryTrendView === "annual"
            ? "monthly"
            : "annual";
    const button = document.querySelector(`[data-trend-view="${next}"]`);
    button?.click();
    button?.focus({
      preventScroll: true
    });
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "module-switch" && Object.hasOwn(views, event.target.value))
      location.hash = `#${event.target.value}`;
  });
  const header = document.querySelector("header");
  if (window.ResizeObserver && header) {
    const headerObserver = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--portal-header-height",
        header.getBoundingClientRect().height + "px"
      );
    });
    headerObserver.observe(header);
  }
  document.getElementById("pal").onchange = (event) => {
    window.companyBranding.paletteChange(event.target.value);
  };
  document.addEventListener("company-brand-updated", renderRoute);
  window.dashboardLayouts.init(renderRoute);
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
