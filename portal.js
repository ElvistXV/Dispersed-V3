"use strict";

(() => {
  const categories = [
    ["Electricity", "Scope 2", "var(--s2)", 255, "Measured", "Electricity bought from the grid. Your biggest single source."],
    ["Purchased goods", "Scope 3", "var(--s3)", 190, "Estimated", "Emissions from suppliers who make what you buy."],
    ["Business travel", "Scope 3", "var(--travel)", 140, "Estimated", "Flights, trains and hotel stays for work."],
    ["Heating", "Scope 1", "var(--s1)", 120, "Measured", "Fuel burned to heat your buildings. Peaks in winter."],
    ["Company cars", "Scope 1", "var(--fleet)", 70, "Measured", "Fuel used by vehicles the company owns."],
    ["Waste", "Scope 3", "var(--waste)", 70, "Estimated", "Waste collected and processed."]
  ];
  const monthlyTotals = [78, 72, 74, 70, 66, 64, 60, 62, 68, 72, 76, 83], monthLabels = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  const seasonalWeights = { "Electricity": [1.1, 1, 1, .95, .95, .95, .9, .9, .95, 1, 1.05, 1.1], "Purchased goods": [1, 1, 1, 1, 1, 1, .9, .9, 1.1, 1.1, 1.1, 1.1], "Business travel": [.6, .9, 1.2, 1.1, 1, .8, .5, .4, 1.3, 1.4, 1.1, .7], "Heating": [1.8, 1.7, 1.3, .8, .4, .2, .1, .1, .3, .8, 1.4, 1.7], "Company cars": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], "Waste": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] };
  function tooltipAttributes(h) {
    return 'data-tip="' + h.replace(/"/g, "&quot;") + '" tabindex="0"';
  }
  function categoryTooltip(c) {
    return '<b>' + c[0] + ' · ' + c[1] + '</b><br>' + c[3] + ' tCO2e in 2025 (' + Math.round(c[3] / 845 * 100) + '% of total)<br>Data: ' + c[4] + '<br><span style="opacity:.8">' + c[5] + '</span>';
  }
  function sourceBars() {
    return categories.map(function (c) {
      return bar(c[0] + " (" + c[1] + ")", c[3] / 255 * 100, c[2], c[3] + (c[4] === "Estimated" ? " est.": ""), 0, categoryTooltip(c));
    }).join("");
  }
  function estimateMonthlyBreakdown() {
    var M = monthlyTotals.map(function (t, i) {
      return categories.map(function (c) {
        return seasonalWeights[c[0]][i];
      });
    });
    for (var k = 0; k < 40; k++) {
      M.forEach(function (r, i) {
        var t = r.reduce(function (a, b) {
          return a + b;
        }, 0);
        r.forEach(function (v, j) {
          r[j] = v * monthlyTotals[i] / t;
        });
      });
      categories.forEach(function (c, j) {
        var t = 0;
        M.forEach(function (r) {
          t += r[j];
        });
        M.forEach(function (r) {
          r[j] = r[j] * c[3] / t;
        });
      });
    }
    return M;
  }
  function renderMonthlyPlot(height) {
    const base = height - 29;
    var M = estimateMonthlyBreakdown(), b = '',  vis = function (j) {
      return selectedCategories === null || selectedCategories.indexOf(j) > - 1;
    };
    var tot = M.map(function (r) {
      return r.reduce(function (a, v, j) {
        return a + (vis(j) ? v: 0);
      }, 0);
    }), mx = Math.max.apply(null, tot), st = mx <= 12 ? 2: mx <= 30 ? 5: mx <= 60 ? 10: 25, top = Math.ceil(mx / st) * st, k = (base - 30) / top;
    for (var v = 0; v <= top; v += st) {
      b += '<line x1="40" x2="620" y1="' + (base - v * k) + '" y2="' + (base - v * k) + '" stroke="var(--line)"/><text class="m" x="32" y="' + (base - v * k + 4) + '" text-anchor="end" style="font-size:12px">' + v + '</text>';
    }
    M.forEach(function (r, i) {
      var x = 40 + i * 48, y = base;
      r.forEach(function (v, j) {
        if (!vis(j)) return;
        var c = categories[j], h = v * k;
        y -= h;
        b += '<rect class="sg" role="button" aria-label="Filter to ' + c[0] + '" data-c="' + j + '" x="' + x + '" y="' + y + '" width="32" height="' + h + '" fill="' + c[2] + '" stroke="var(--card)" stroke-width="1.5" ' + tooltipAttributes('<b>' + c[0] + ' · ' + c[1] + '</b><br>' + monthLabels[i] + ': ' + v.toFixed(1) + ' tCO2e<br>' + Math.round(v / monthlyTotals[i] * 100) + '% of the month (' + monthlyTotals[i] + ' in total)<br>Year: ' + c[3] + ' tCO2e · ' + c[4]) + '/>';
      });
      b += '<text x="' + (x + 16) + '" y="' + (y - 6) + '" text-anchor="middle" style="font-size:12px;font-weight:600">' + (selectedCategories === null ? monthlyTotals[i]: Math.round(tot[i])) + '</text><text class="m" x="' + (x + 16) + '" y="' + (base + 19) + '" text-anchor="middle" style="font-size:12px">' + monthLabels[i] + '</text>';
    });
    return `<svg viewBox="0 0 640 ${height}" role="group" aria-label="Monthly emissions by source in 2025">${b}</svg>`;
  }
  function sizeMonthlyPlot() {
    const plot = document.getElementById("monthly-plot");
    if (!plot || !plot.clientWidth || !plot.clientHeight) return;
    const height = Math.round(plot.clientHeight * 640 / plot.clientWidth);
    if (plot.firstElementChild?.getAttribute("viewBox") !== `0 0 640 ${height}`) {
      plot.innerHTML = renderMonthlyPlot(height);
    }
  }
  function renderMonthlyChart() {
    const vis = j => selectedCategories === null || selectedCategories.includes(j);
    return '<div id="monthly-plot">' + renderMonthlyPlot(244) + '</div><div class="lg">' + categories.map(function (c, j) {
      return '<button type="button" class="lgi' + (vis(j) ? '': ' off') + '" data-c="' + j + '" aria-pressed="' + vis(j) + '" ' + tooltipAttributes(categoryTooltip(c)) + '><i style="background:' + c[2] + '"></i>' + c[0] + ' <span class="muted">' + c[3] + '</span></button>';
    }).join("") + (selectedCategories !== null ? '<button type="button" class="lgi" data-all="1"><b>Show all</b></button>': '') + '</div><p class="muted monthly-chart-note">' + (selectedCategories === null ? 'Click a bar segment to isolate a source, or use the legend to combine sources.': 'Showing ' + selectedCategories.length + ' of ' + categories.length + ' sources.') + '</p>';
  }
  function renderPathwayLegend() {
    var L = [
      ["Actual", "border-top:3px solid var(--s1)", "Measured emissions from your data."],
      ["Projection", "border-top:3px dashed var(--s2)", "Expected emissions if current trends continue. An estimate, not a result."],
      ["Target path", "border-top:2px solid var(--muted)", "Straight path from the base year to the target. A placeholder until confirmed."],
      ["Gap", "width:5px;height:14px;background:var(--s3);border-radius:2px", "How far the projection sits above the target at the target year."]
    ];
    return '<div class="lg">' + L.map(function (x) {
      return '<button type="button" class="lgi" ' + tooltipAttributes('<b>' + x[0] + '</b><br>' + x[2]) + '><i class="' + (x[1].indexOf("border") > - 1 ? "sw": "") + '" style="' + x[1] + '"></i>' + x[0] + '</button>';
    }).join("") + '</div>';
  }
  function highlightCategory(c) {
    document.querySelectorAll("rect.sg").forEach(function (r) {
      r.style.opacity = (c === null || r.dataset.c === c) ? 1: .22;
    });
  }
  const tip = document.createElement("div");
  tip.className = "tip";
  document.body.appendChild(tip);
  function place(x, y) {
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - w - 8)) + "px";
    tip.style.top = (y + 16 + h > innerHeight ? Math.max(8, y - h - 12): y + 16) + "px";
  }
  function show(t, x, y) {
    tip.innerHTML = t.getAttribute("data-tip");
    tip.style.display = "block";
    place(x, y);
  }
  document.addEventListener("mouseover", function (e) {
    var t = e.target.closest("[data-tip]"), c = e.target.closest("[data-c]");
    highlightCategory(c ? c.dataset.c: null);
    if (t) show(t, e.clientX, e.clientY);
    else tip.style.display = "none";
  });
  document.addEventListener("mousemove", function (e) {
    if (tip.style.display === "block") place(e.clientX, e.clientY);
  });
  document.addEventListener("focusin", function (e) {
    var t = e.target.closest("[data-tip]"), c = e.target.closest("[data-c]");
    highlightCategory(c ? c.dataset.c: null);
    if (t) {
      var r = t.getBoundingClientRect();
      show(t, r.left + r.width / 2, r.top);
    }
  });
  document.addEventListener("focusout", function () {
    tip.style.display = "none";
    highlightCategory(null);
  });
  function filterFootprint(event) {
    const scope = event.target.closest("[data-scope-filter]");
    const legend = event.target.closest(".lgi[data-c]");
    const segment = event.target.closest(".sg[data-c]");
    const reset = event.target.closest("[data-all]");
    if (!scope && !legend && !segment && !reset) return;
    const category = legend || segment;
    const index = category ? Number(category.dataset.c) : null;

    activeScope = scope && activeScope !== scope.dataset.scopeFilter ? scope.dataset.scopeFilter : null;
    if (activeScope) {
      selectedCategories = categories.flatMap((item, i) => item[1] === activeScope ? [i] : []);
    } else if (reset || scope) {
      selectedCategories = null;
    } else if (segment) {
      selectedCategories = selectedCategories?.length === 1 && selectedCategories[0] === index ? null : [index];
    } else {
      const previous = selectedCategories || [];
      const next = previous.includes(index) ? previous.filter(i => i !== index) : [...previous, index];
      selectedCategories = next.length && next.length < categories.length ? next : null;
    }

    tip.style.display = "none";
    document.getElementById("sc").innerHTML = renderMonthlyChart();
    watchMonthlyPlot();
    document.getElementById("scope-donut").innerHTML = renderScopeDonut();
    const focus = scope
      ? `button[data-scope-filter="${scope.dataset.scopeFilter}"]`
      : reset ? ".lgi[data-c]" : `.lgi[data-c="${index}"]`;
    document.querySelector(focus)?.focus();
  }

  document.addEventListener("click", filterFootprint);
  document.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".scope-segment, .sg")) {
      event.preventDefault();
      filterFootprint(event);
    }
  });
  window.addEventListener("hashchange", function () {
    tip.style.display = "none";
  });
  let currentRoute = "", selectedCategories = null, activeScope = null;
  const moduleLinks = [
    ["modules", "All modules"],
    ["mod-footprint", "Scope 1-2-3"],
    ["mod-lca", "LCA"],
    ["mod-roadmap", "Roadmap"],
    ["mod-users", "Users"]
  ];
  const navIcons = { overview: '<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>', modules: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', data: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', inbox: '<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>', reports: '<path d="M6 3h8l5 5v13H6zM14 3v5h5"/>' };
  const navigationLinks = [
    ["overview", "Overview"],
    ["modules", "Modules"],
    ["data", "Data collection"],
    ["inbox", "Inbox"],
    ["reports", "Reports"]
  ];
  function bar(l, p, c, v, m, t) {
    return '<div class="row"' + (t ? ' ' + tooltipAttributes(t): '') + '><span class="l">' + l + '</span><div class="trk" role="img" aria-label="' + l + ': ' + v + '"><b style="width:' + p + '%;background:' + c + '"></b>' + (m ? '<u style="left:' + m + '%"></u>': '') + '</div><span class="val">' + v + '</span></div>';
  }
  function pageHeading(t, s, r) {
    return '<div class="top"><div><h1>' + t + '</h1><p class="sub">' + s + '</p></div>' + (r || '') + '</div>';
  }
  function pill(c, i, t) {
    return '<span class="pill ' + c + '">' + i + ' ' + t + '</span>';
  }
  const actualEmissions = { 2023: 1300, 2024: 1050, 2025: 845 }, projectedEmissions = { 2026: 700, 2027: 560 }, targetEmissions = { 2023: 1300, 2024: 1070, 2025: 840, 2026: 610, 2027: 380 };
  function pathwayTooltip(y) {
    var a = actualEmissions[y], q = projectedEmissions[y], t = targetEmissions[y], h = '<b>' + y + (y === 2023 ? ' · Base year': y === 2025 ? ' · Today': y === 2027 ? ' · Target year*': '') + '</b><br>';
    if (a !== undefined) h += 'Actual: ' + a.toLocaleString() + ' tCO2e<br>';
    if (q !== undefined) h += 'Projection: ' + q + ' tCO2e<br>';
    h += 'Target path: ' + t.toLocaleString() + ' tCO2e';
    var v = (a !== undefined ? a: q) - t;
    if (y > 2023) h += '<br><b>' + (v > 0 ? v + ' above the path': (-v) + ' below the path') + '</b>';
    return h;
  }
  function renderPathwayChart(W, H) {
    var L = 64, R = 80, T = 24, B = 54, bt = H - B, X = function (y) {
      return L + (y - 2023) * (W - L - R) / 4;
    }, Y = function (v) {
      return T + (bt - T) * (1 - v / 1400);
    }, g = "";
    [0, 400, 800, 1200].forEach(function (v) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/><text class="m" x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v.toLocaleString() + '</text>';
    });
    [
      [2023, "Base year"],
      [2024, ""],
      [2025, "Today"],
      [2026, ""],
      [2027, "Target year*"]
    ]
    .forEach(function (a) {
      g += '<text x="' + X(a[0]) + '" y="' + (bt + 22) + '" text-anchor="middle">' + a[0] + '</text>' + (a[1] ? '<text class="m" x="' + X(a[0]) + '" y="' + (bt + 40) + '" text-anchor="middle">' + a[1] + '</text>': '');
    });
    var P = function (a, o) {
      return a.map(function (v, i) {
        return X(2023 + o + i) + "," + Y(v);
      }).join(" ");
    }, act = [1300, 1050, 845];
    var d = act.map(function (v, i) {
      return '<circle cx="' + X(2023 + i) + '" cy="' + Y(v) + '" r="5" fill="var(--s1)"/><text x="' + X(2023 + i) + '" y="' + (Y(v) - 12) + '" text-anchor="middle" font-weight="600">' + v.toLocaleString() + '</text>';
    }).join("");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Emissions pathway in tCO2e. Actual: 1,300 in 2023, 1,050 in 2024, 845 in 2025. Projected 560 in 2027. Illustrative target path ends at 380 in 2027, leaving a gap of 180.">' + g
      + '<text class="m" x="14" y="' + ((T + bt) / 2) + '" transform="rotate(-90 14 ' + ((T + bt) / 2) + ')" text-anchor="middle">tCO2e</text>'
      + '<line x1="' + X(2025) + '" x2="' + X(2025) + '" y1="' + T + '" y2="' + bt + '" stroke="var(--muted)" stroke-dasharray="3 4"/>'
      + '<polyline fill="none" stroke="var(--muted)" stroke-width="2" points="' + P([1300, 1070, 840, 610, 380], 0) + '"/>'
      + '<polyline fill="none" stroke="var(--s1)" stroke-width="3.5" points="' + P(act, 0) + '"/>'
      + '<polyline fill="none" stroke="var(--s2)" stroke-width="3" stroke-dasharray="7 5" points="' + P([845, 700, 560], 2) + '"/>' + d
      + '<text x="' + (X(2023.5) + 10) + '" y="' + (Y(1175) - 12) + '" font-weight="650">Actual</text>'
      + '<text x="' + (X(2026) - 26) + '" y="' + (Y(700) - 12) + '" font-weight="650">Projection</text>'
      + '<text class="m" x="' + (X(2026) - 30) + '" y="' + (Y(610) + 24) + '">Target path</text>'
      + '<line x1="' + (X(2027) + 12) + '" x2="' + (X(2027) + 12) + '" y1="' + Y(560) + '" y2="' + Y(380) + '" stroke="var(--s3)" stroke-width="5"/>'
      + '<text x="' + (X(2027) + 22) + '" y="' + (Y(470) - 2) + '" font-weight="650" style="fill:var(--s3)">Gap</text><text x="' + (X(2027) + 22) + '" y="' + (Y(470) + 14) + '" style="fill:var(--s3)">180</text>' + [2023, 2024, 2025, 2026, 2027].map(function (y) {
      var w = (W - L - R) / 4;
      return '<rect class="hv" x="' + (X(y) - w / 2) + '" y="' + T + '" width="' + w + '" height="' + (bt - T) + '" ' + tooltipAttributes(pathwayTooltip(y)) + '/>';
    }).join("") + '</svg>';
  }
  let chartObserver, monthlyPlotObserver;
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
    var c = document.getElementById("cw");
    if (!c || c.clientWidth < 10) return;
    c.innerHTML = renderPathwayChart(c.clientWidth, c.clientHeight);
  }
  function waiting() {
    return ('<section class="card">' +
      '<div class="ch">' +
      '<h2>Also waiting</h2>' +
      '<a href="#inbox" class="muted">Inbox</a>' +
      '</div>' +
      '<div>' +
      '<div class="li">' +
      '<div>' +
      '<h3>Review draft LCA report</h3>' +
      '<span class="muted">Due 20 Nov</span>' +
      '</div>' +
      '<a class="btn g s" href="#mod-lca">Open</a>' +
      '</div>' +
      '<div class="li">' +
      '<div>' +
      '<h3>Confirm net-zero year</h3>' +
      '<span class="muted">Due 1 Dec</span>' +
      '</div>' +
      '<a class="btn g s" href="#inbox">Open</a>' +
      '</div>' +
      '</div>' +
      '</section>');
  }
  function progress() {
    const reduction = actualEmissions[2023] - actualEmissions[2025];
    const goal = actualEmissions[2023] - targetEmissions[2027];
    const progressPercent = (reduction / goal * 100).toFixed(1);
    const projectedGap = projectedEmissions[2027] - targetEmissions[2027];
    const largestSource = categories[0];
    const sourceShare = Math.round(largestSource[3] / actualEmissions[2025] * 100);

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
        <p>330 tCO2e combined. Together they account for about 83% of reported Scope 3 emissions.</p></div>
      <a class="btn g s" href="#mod-footprint">Explore the carbon footprint</a>
    </section>`;
  }
  const views = {
    overview: function () {
      return pageHeading("Dashboard", "Track Demo Manufacturing’s emissions, data coverage and progress toward its 2027 target.", '<p class="muted">Last updated 3 Nov 2026 · Sample data</p>')
        + '<div class="grid">'
        + '<section class="card kpi c4"><h3>Emissions in 2025</h3><div class="big">845 <span class="unit">tCO2e</span></div><p class="muted">&minus;20% vs 2024 (1,050)<br>&minus;35% vs 2023 base year</p></section>'
        +
      ('<section class="card kpi c4">' +
        '<h3>Data collected</h3>' +
        '<div class="big">80%</div>' +
        '<div class="trk" role="img" aria-label="80% of data collected"><b style="width:80%;background:var(--s2)"></b>' +
        '</div>' +
        '<p class="muted">Scope 3 is partial and estimated</p>' +
        '</section>')
        + '<section class="card kpi c4"><h3>Are we on track?</h3><div>' + pill("warn", "&#9650;", "Slightly behind") + '</div><p class="muted">Projected gap of 180 tCO2e at the target year if nothing changes</p></section>' +
      '</div><div class="grid">'
        +
      ('<section class="card hero c8">' +
        '<div class="ch">' +
        '<div>' +
        '<h2>Emissions pathway</h2>' +
        '<p class="muted">Actual results, projection and target path, 2023 to 2027</p>' +
        '</div>' +
        '' +
        '</div>' +
        '<div class="cw" id="cw">' +
        '</div>') + renderPathwayLegend()
        + '<p class="muted">*Target year, target value and method are placeholders until confirmed with Dispersed.</p></section>'
        +
      ('<div class="col">' +
        '<section class="card act">' +
        '<span class="muted">Next action</span>' +
        '<h2>Upload electricity readings for Q3</h2>' +
        '<p class="muted">Needed to complete purchased energy (Scope 2). About 5 minutes. Due 14 Nov.</p>' +
        '<a class="btn" href="#data">Upload readings</a>' +
        '</section>') +
      '' + waiting() + '</div>' +
      '</div><div class="grid">' +
      '' + progress() + '</div><div class="grid">'
        + '<section class="card c6"><div><h2>By scope</h2><p class="muted">tCO2e, 2025</p></div><div class="stack">' + bar("Value-chain emissions (Scope 3)", 100, "var(--s3)", "400 est.", 0, "<b>Value-chain emissions · Scope 3</b><br>400 tCO2e (47% of total)<br>Data: Estimated<br><span style=\"opacity:.8\">Everything else in your value chain, across 15 categories. Depends on supplier data.</span>") + bar("Purchased energy (Scope 2)", 64, "var(--s2)", "255", 0, "<b>Purchased energy · Scope 2</b><br>255 tCO2e (30% of total)<br>Data: Measured<br><span style=\"opacity:.8\">Emissions from the energy you buy.</span>") + bar("Direct emissions (Scope 1)", 48, "var(--s1)", "190", 0, "<b>Direct emissions · Scope 1</b><br>190 tCO2e (22% of total)<br>Data: Measured<br><span style=\"opacity:.8\">Emissions from sources you own or control.</span>") + '</div><p class="muted sp">Scope 3 relies on supplier data and estimates.</p></section>'
        + '<section class="card c6"><div><h2>Biggest sources</h2><p class="muted">tCO2e, 2025</p></div><div class="stack">' + sourceBars() + '</div></section>' +
      '</div><section class="card c12" style="margin-bottom:20px"><h2>How to read this page</h2><div>'
        + '<details><summary>What is tCO2e?</summary><p>Tonnes of carbon dioxide equivalent. It puts different greenhouse gases on one scale so they can be added together.</p></details>'
        +
      ('<details>' +
        '<summary>What are Scope 1, 2 and 3?</summary>' +
        '<p>Scope 1 is direct emissions from sources you own or control. Scope 2 is emissions from the energy you buy. Scope 3 is everything else in your value chain, across 15 categories.</p>' +
        '</details>')
        +
      ('<details>' +
        '<summary>Why are there three progress numbers?</summary>' +
        '<p>Data collected shows how much information we have. Reduced since 2023 shows how emissions changed. Progress to target compares that change with your goal. They are different measurements, so they are labelled separately.</p>' +
        '</details>' +
        '</div>' +
        '</section>')
        + '<p class="foot">V3 combines BENTO’s spacing and hierarchy with V2’s restrained palette. Status colors always come with a text label. Figures are invented for testing and have not been validated with users. Assumed, not confirmed: client roles, export formats, task owners, target year and value, and Scope 3 coverage.</p>';
    },
    modules: function () {
      var m = [
        ["Scope 1-2-3 carbon footprint", "ok", "&#10003;", "Complete", "845 tCO2e", "Scope 3 estimated", 100, "Open", "mod-footprint"],
        ["Life Cycle Assessment", "warn", "&#9650;", "Draft ready", "1 report", "Awaiting your review", 70, "Review", "mod-lca"],
        ["Reduction roadmap", "", "&#9679;", "Draft", "4 initiatives", "Net-zero year not confirmed", 40, "Open", "mod-roadmap"],
        ["Users and access", "ok", "&#10003;", "3 active", "Raees, Jamie, Maria", "No pending invites", 100, "Manage", "mod-users"]
      ];
      return modulesHeading()
        + '<div class="grid">' + m.map(function (x) {
        return '<section class="card c6"><div class="ch"><h2>' + x[0] + '</h2>' + pill(x[1], x[2], x[3]) + '</div><div><div class="kpi"><div class="big" style="font-size:28px">' + x[4] + '</div></div><p class="muted">' + x[5] + '</p></div>' + bar("Setup complete", x[6], "var(--s2)", x[6] + "%") + '<a class="btn g sp" href="#' + x[8] + '">' + x[7] + '</a></section>';
      }).join("") + '</div><section class="card c12"><div class="ch"><div><h2>Add a module</h2><p class="muted">See what else Dispersed can set up for you.</p></div><a class="btn" href="#modules">Browse services</a></div></section>';
    },
    data: function () {
      var r = [
        ["Electricity", "Scope 2", 75, "warn", "&#9650;", "Q3 missing", "Q3 meter readings", "14 Nov"],
        ["Heating", "Scope 1", 100, "ok", "&#10003;", "Complete", "None", "Done"],
        ["Company cars", "Scope 1", 100, "ok", "&#10003;", "Complete", "None", "Done"],
        ["Business travel", "Scope 3", 75, "warn", "&#9650;", "Estimated", "Travel booking export", "28 Nov"],
        ["Purchased goods", "Scope 3", 65, "warn", "&#9650;", "Partial", "Supplier emissions data", "5 Dec"],
        ["Waste", "Scope 3", 65, "warn", "&#9650;", "Partial", "Q3 waste invoices", "28 Nov"]
      ];
      return pageHeading("Import", "Send the data your consultant needs, one source at a time.", '<p class="muted">Last updated 3 Nov 2026 · Sample data</p>')
        +
      ('<div class="grid">' +
        '<section class="card kpi c4">' +
        '<h3>Data collected</h3>' +
        '<div class="big">80%</div>' +
        '<div class="trk" role="img" aria-label="80% collected"><b style="width:80%;background:var(--s2)"></b>' +
        '</div>' +
        '<p class="muted">Average across 6 categories</p>' +
        '</section>')
        + '<section class="card kpi c4"><h3>Still needed</h3><div class="big">4 <span class="unit">items</span></div><p class="muted">Meter readings, travel export, supplier data and waste invoices</p></section>'
        + '<section class="card kpi c4"><h3>Next deadline</h3><div class="big">14 Nov</div><p class="muted">Q3 electricity readings</p></section></div>'
        +
      ('<div class="grid collection-pair">' +
        '<section class="card c6">' +
        '<div>' +
        '<h2>Completeness by category</h2>' +
        '<p class="muted">How much of the year is covered, and what is still needed</p>' +
        '</div>' +
        '<div class="tw" role="region" aria-label="Completeness by category table" tabindex="0">' +
        '<table><tr><th>Category</th><th>Scope</th><th>Coverage</th><th>Status</th><th>Still needed</th><th>Due</th></tr>') +
      r.map(function (x) {
        return '<tr><td><b>' + x[0] + '</b></td><td>' + x[1] + '</td><td><div class="coverage-meter"><div class="trk" role="img" aria-label="' + x[0] + ' ' + x[2] + '% covered"><b style="width:' + x[2] + '%;background:var(--' + (x[3] == "ok" ? "ok": "warn") + ')"></b></div><span class="val">' + x[2] + '%</span></div></td><td>' + pill(x[3], x[4], x[5]) + '</td><td>' + x[6] + '</td><td>' + x[7] + '</td></tr>';
      }).join("") + '</table></div></section>'
        +
      ('<section class="card c6 upload-card">' +
        '<div>' +
        '<h2>Prepare an import</h2>' +
        '<p class="muted">Choose evidence to review locally before submitting it through your reporting process.</p>' +
        '</div>' +
        '<select aria-label="Category" style="width:100%;margin:0">' +
        '<option>Electricity</option>' +
        '<option>Business travel</option>' +
        '<option>Purchased goods</option>' +
        '<option>Waste</option>' +
        '<option>Other</option>' +
        '</select>' +
        '<label for="import-files">Choose evidence files</label>' +
        '<input type="file" id="import-files" multiple accept=".pdf,.csv,.xls,.xlsx">' +
        '<p id="import-selection" class="muted" role="status">No files selected.</p>' +
        '<a class="btn g s" href="emissions-data-template.csv" download>Download data template</a>' +
        '<p class="muted">Include the reporting period, quantity and unit in your supporting records.</p>' +
        '</section>' +
        '</div>')
        + '<div class="grid"><section class="card c6"><div><h2>Coverage by scope</h2><p class="muted">Average of the categories in each scope</p></div><div class="stack">' + bar("Direct emissions (Scope 1)", 100, "var(--s1)", "100%") + bar("Purchased energy (Scope 2)", 75, "var(--s2)", "75%") + bar("Value-chain emissions (Scope 3)", 68, "var(--s3)", "68% est.") + '</div><p class="muted sp">Scope 3 stays partial until suppliers send their data.</p></section>'
        + '<section class="card c6"><h2>Recently received</h2><div>' + [
        ["Heating invoices Q1 to Q3", "Maria · Yesterday", "ok", "&#10003;", "Accepted"],
        ["Company cars mileage 2025", "Maria · 1 week ago", "ok", "&#10003;", "Accepted"],
        ["Electricity readings Q2", "Raees · 3 weeks ago", "ok", "&#10003;", "Accepted"]
      ]
      .map(function (x) {
        return '<div class="li"><div><h3>' + x[0] + '</h3><span class="muted">' + x[1] + '</span></div>' + pill(x[2], x[3], x[4]) + '</div>';
      }).join("") + '</div></section></div>' + sampleDataNote();
    },
    inbox: function () {
      var t = [
        ["Upload Q3 electricity readings", "Data collection", "Raees", "14 Nov", "bad", "&#9650;", "Due soon", "data"],
        ["Review the draft LCA report", "Modules", "Jamie", "20 Nov", "warn", "&#9650;", "Needs review", "mod-lca"],
        ["Confirm your net-zero year", "Roadmap", "Raees", "1 Dec", "", "&#9679;", "Open", "overview"]
      ];
      return pageHeading("Request", "What needs your attention, in order of deadline.")
        + '<div class="grid"><section class="card c8"><h2>Open requests</h2><p class="muted">Each request includes an owner, deadline and link to the relevant workspace.</p><div>' + t.map(function (x) {
        return '<div class="li"><div><h3>' + x[0] + '</h3><span class="muted">' + x[1] + ' · Owner: ' + x[2] + ' · Due ' + x[3] + '</span></div><div style="display:flex;gap:10px;align-items:center">' + pill(x[4], x[5], x[6]) + '<a class="btn s" href="#' + x[7] + '">Open</a></div></div>';
      }).join("") + '</div></section>'
        + '<section class="card c4"><h2>Coming up</h2><div>' + [
        ["14 Nov", "Q3 electricity readings due"],
        ["20 Nov", "LCA draft review due"],
        ["1 Dec", "Net-zero year decision"],
        ["31 Dec", "Q4 report due"]
      ]
      .map(function (e) {
        return '<div class="li"><b>' + e[0] + '</b><span class="muted" style="text-align:right">' + e[1] + '</span></div>';
      }).join("") + '</div></section></div>';
    },
    reports: function () {
      return pageHeading("Reports", "Check what still needs to be prepared for reporting.")
        + '<section class="card"><h2>Reporting readiness</h2><p>Four categories still need data or review before the inventory can be finalized.</p>'
        + '<ol><li>Confirm the organization and reporting period.</li><li>Resolve outstanding evidence requests.</li><li>Review measured and estimated emissions in Inventory.</li></ol><a class="btn" href="#status">View status overview</a></section>';
    }
  };
  function chips() {
    return '<div class="chips">' + moduleLinks.map(function (c) {
      return '<a class="chip" href="#' + c[0] + '"' + (c[0] === currentRoute ? ' aria-current="page"': '') + '>' + c[1] + '</a>';
    }).join("") + '</div>';
  }
  function modulesHeading() {
    return '<div class="top" style="margin-bottom:16px"><div><h1>Modules</h1><p class="sub">Every Dispersed service in one place.</p></div></div>' + chips();
  }
  function moduleHeading(t, sb, p, a) {
    return modulesHeading()
      + '<div class="top" style="margin-bottom:20px"><div><h2 style="font-size:22px">' + t + '</h2><p class="muted">' + sb + '</p></div><div style="display:flex;gap:12px;align-items:center">' + p + (a || '') + '</div></div>';
  }
  function renderTable(h, r, n) {
    n = n || [];
    var c = function (i) {
      return n.indexOf(i) > - 1 ? ' class="n"': '';
    };
    return '<div class="tw"><table><tr>' + h.map(function (x, i) {
      return '<th' + c(i) + '>' + x + '</th>';
    }).join('') + '</tr>' + r.map(function (x) {
      return '<tr>' + x.map(function (d, i) {
        return '<td' + c(i) + '>' + d + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</table></div>';
  }
  function metricCard(t, b, sb, c) {
    return '<section class="card kpi ' + (c || 'c4') + '"><h3>' + t + '</h3><div class="big">' + b + '</div><p class="muted">' + sb + '</p></section>';
  }
  function sampleDataNote() {
    return '<p class="foot">Sample data for testing. Names, owners, values and statuses are assumptions until confirmed with Dispersed.</p>';
  }
  const emissionsUnit = ' <span class="unit">tCO2e</span>';
  function renderScopeDonut() {
    const scopes = ["Direct emissions", "Purchased energy", "Value-chain emissions"].map((name, index) => {
      const scope = "Scope " + (index + 1);
      const emissions = categories.filter(category => category[1] === scope)
        .reduce((sum, category) => sum + category[3], 0);
      return { scope, name, emissions, color: `var(--s${index + 1})` };
    });
    const total = scopes.reduce((sum, item) => sum + item.emissions, 0);
    const point = share => {
      const angle = share * 2 * Math.PI - Math.PI / 2;
      return `${80 + 62 * Math.cos(angle)} ${80 + 62 * Math.sin(angle)}`;
    };
    let offset = 0;
    const segments = scopes.map(item => {
      const share = item.emissions / total;
      const start = point(offset);
      offset += share;
      return `<path class="scope-segment" role="button" data-scope-filter="${item.scope}"
        aria-pressed="${activeScope === item.scope}" aria-label="Filter to ${item.scope}, ${item.emissions} tCO2e"
        tabindex="0" d="M ${start} A 62 62 0 ${share > .5 ? 1 : 0} 1 ${point(offset)}"
        fill="none" stroke="${item.color}" stroke-width="16"/>`;
    }).join("");
    const active = scopes.find(item => item.scope === activeScope);

    return `<svg class="quality-donut${active ? ' has-selection' : ''}" viewBox="0 0 160 160" role="group" aria-label="Filter monthly emissions by scope">
      ${segments}
      <text class="donut-total" x="80" y="79" text-anchor="middle">${active?.emissions ?? total}</text>
      <text class="m" x="80" y="98" text-anchor="middle">tCO2e</text>
    </svg>
    <div class="quality-legend">
      ${scopes.map(item => `<button type="button" data-scope-filter="${item.scope}" aria-pressed="${activeScope === item.scope}">
        <span><i class="quality-swatch" style="background:${item.color}"></i>${item.scope} · ${item.name}</span>
        <span>${item.emissions} <small>(${(item.emissions / total * 100).toFixed(1)}%)</small></span>
      </button>`).join("")}
    </div>
    <p class="muted" role="status">${active ? `Monthly chart filtered to ${active.scope}. Select again to reset.` : 'Select a scope to filter the monthly chart.'}</p>`;
  }

  views["mod-footprint"] = function () {
    var b = renderMonthlyChart(), q = function (c, i, t) {
      return pill(c, i, t);
    };
    return pageHeading("Inventory", "Scope 1, 2 and 3 emissions for 2025, calculated by Dispersed.", pill("ok", "&#10003;", "Complete"), '')
      + '<div class="grid">' + metricCard("Direct emissions (Scope 1)", "190" + emissionsUnit, "About 22% of the total") + metricCard("Purchased energy (Scope 2)", "255" + emissionsUnit, "About 30% of the total") + metricCard("Value-chain emissions (Scope 3)", "400" + emissionsUnit, "About 47%. Partial and estimated") + '</div>'
      + '<div class="grid"><section class="card c8"><div><h2>Monthly emissions, 2025</h2><p class="muted">Stacked by category, tCO2e per month. Hover for details.</p></div><div id="sc">' + b + '</div></section>'
      + `<section class="card c4 quality-card">
          <div><h2>Carbon emissions by scope</h2><p class="muted">2025 inventory · tCO2e</p></div>
          <div id="scope-donut">${renderScopeDonut()}</div>
          <div class="insight"><h3>Where estimates are used</h3>
            <p>Purchased goods, business travel and waste account for all 400 tCO2e of estimated emissions.</p></div>
          <a class="btn g s" href="#data">View data coverage</a>
        </section></div>`
      + '<section class="card c12"><h2>Emissions by category</h2>' + renderTable(["Category", "Scope", "tCO2e", "Data quality"], [
      ["<b>Electricity</b>", "Scope 2", "255", q("ok", "&#10003;", "Measured")],
      ["<b>Purchased goods</b>", "Scope 3", "190", q("warn", "&#9650;", "Estimated")],
      ["<b>Business travel</b>", "Scope 3", "140", q("warn", "&#9650;", "Estimated")],
      ["<b>Heating</b>", "Scope 1", "120", q("ok", "&#10003;", "Measured")],
      ["<b>Company cars</b>", "Scope 1", "70", q("ok", "&#10003;", "Measured")],
      ["<b>Waste</b>", "Scope 3", "70", q("warn", "&#9650;", "Estimated")]
    ], [2]) + '</section>' + sampleDataNote();
  };
  views["mod-lca"] = function () {
    var st = [
      ["Raw materials", 100, "6.6 (52%)"],
      ["Manufacturing", 40, "2.6 (21%)"],
      ["Transport", 21, "1.4 (11%)"],
      ["Use", 17, "1.1 (9%)"],
      ["End of life", 13, "0.9 (7%)"]
    ];
    return pageHeading("Product Footprint", "The environmental impact of your products from raw materials to end of life.", pill("warn", "&#9650;", "Draft ready"), '<a class="btn s" href="#reports">Review draft</a>')
      + '<div class="grid"><section class="card c8"><div><h2>Impact by life-cycle stage</h2><p class="muted">Hydraulic valve H7, 12.6 kgCO2e per valve</p></div><div class="stack">' + st.map(function (x) {
      return bar(x[0], x[1], "var(--s2)", x[2]);
    }).join("") + '</div><p class="muted sp">Raw materials drive over half of the impact. Supplier data for this stage is still estimated.</p></section>'
      + '<section class="card c4"><h2>Review checklist</h2><div>' + [
      ["Scope and functional unit", "ok", "&#10003;", "Confirmed"],
      ["Supplier data for raw materials", "warn", "&#9650;", "Estimated"],
      ["Sign off the draft report", "", "&#9679;", "Open"]
    ]
    .map(function (x) {
      return '<div class="li"><span>' + x[0] + '</span>' + pill(x[2], x[3], x[4]) + '</div>';
    }).join("") + '</div></section></div>'
      + '<section class="card c12"><h2>Products assessed</h2>' + renderTable(["Product", "Functional unit", "kgCO2e", "Biggest stage", "Status"], [
      ["<b>Steel bracket A12</b>", "1 bracket", "4.8", "Raw materials", pill("ok", "&#10003;", "Final")],
      ["<b>Hydraulic valve H7</b>", "1 valve", "12.6", "Raw materials", pill("warn", "&#9650;", "Draft")],
      ["<b>Housing cover C3</b>", "1 cover", "7.9", "Manufacturing", pill("", "&#9679;", "In progress")]
    ], [2]) + '</section>' + sampleDataNote();
  };
  views["mod-roadmap"] = function () {
    var r = [
      ["Renewable electricity contract", 100, "210", "Raees", "Planned"],
      ["Supplier engagement on purchased goods", 38, "80 est.", "Jamie", "Planned"],
      ["Heat pump replacing gas heating", 33, "70", "Maria", "Idea"],
      ["Fleet electrification", 29, "60", "Raees", "Idea"]
    ];
    return pageHeading("Target", "Planned actions to close the gap between your projection and your target.", '<a class="btn s" href="#simulation">Explore a scenario</a>')
      + '<div class="grid">' + metricCard("Gap to close", "180" + emissionsUnit, "Projected 2027 vs placeholder target") + metricCard("Planned impact", "420" + emissionsUnit, "If all four initiatives are delivered") + metricCard("Cost data", "To be confirmed", "Not yet available from Dispersed") + '</div>'
      + '<section class="card c12"><div><h2>Initiatives ranked by impact</h2><p class="muted">Reduction per year, in tCO2e</p></div>' + renderTable(["Initiative", "Impact", "Owner", "Status"], r.map(function (x) {
      return ["<b>" + x[0] + "</b>", '<div style="display:grid;grid-template-columns:1fr 70px;gap:10px;align-items:center;min-width:200px"><div class="trk"><b style="width:' + x[1] + '%;background:var(--s2)"></b></div><span class="val">' + x[2] + '</span></div>', x[3], pill("", "&#9679;", x[4])];
    })) + '</section>' + sampleDataNote();
  };
  views["mod-users"] = function () {
    return moduleHeading("Users and access", "Who can see and act on your portal.", pill("ok", "&#10003;", "3 active"), '<a class="btn s" href="#mod-users">Invite user</a>')
      + '<div class="grid"><section class="card c8"><h2>People</h2>' + renderTable(["Name", "Role", "Access", "Last active"], [
      ["<b>Raees Pritchard</b>", "Sustainability", "Admin", "Today"],
      ["<b>Jamie</b>", "Finance", "Reports and export", "Yesterday"],
      ["<b>Maria</b>", "Operations", "Uploads data", "3 days ago"]
    ]) + '</section>'
      +
    ('<section class="card c4">' +
      '<div>' +
      '<h2>Proposed roles</h2>' +
      '<p class="muted">To be confirmed with Dispersed</p>' +
      '</div>' +
      '<div class="stack">' +
      '<p><b>Sustainability</b><br>' +
      '<span class="muted">Overview, roadmap and all modules</span>' +
      '</p>' +
      '<p><b>Finance</b><br>' +
      '<span class="muted">Reports, exports and cost data</span>' +
      '</p>' +
      '<p><b>Operations</b><br>' +
      '<span class="muted">Data collection and tasks</span>' +
      '</p>' +
      '</div>' +
      '</section>' +
      '</div>') + sampleDataNote();
  };
  views.status = () => pageHeading("Status Overview", "Track the sample inventory and see what still needs attention.")
    + '<div class="grid">' + metricCard("Complete categories", "2 of 6", "Heating and company cars")
    + metricCard("Outstanding requests", "4", "Electricity, travel, purchased goods and waste")
    + metricCard("Next deadline", "14 Nov", "Q3 electricity readings") + '</div>'
    + '<section class="card"><h2>Open evidence items</h2><ul><li>Electricity meter readings</li><li>Business travel booking export</li><li>Supplier emissions data</li><li>Waste invoices</li></ul><a class="btn" href="#inbox">View requests</a></section>';
  views.boundaries = () => pageHeading("Boundaries", "Review the organization, reporting period and activities covered by this inventory.")
    + '<section class="card"><h2>Inventory coverage</h2>'
    + renderTable(["Boundary", "Included in this sample"], [
      ["Organization", "Demo Manufacturing B.V."],
      ["Reporting period", "January to December 2025"],
      ["Scope 1", "Heating and company cars"],
      ["Scope 2", "Purchased electricity"],
      ["Scope 3", "Purchased goods, business travel and waste"]
    ]) + '<p class="muted">Site coverage and exclusions are pending confirmation.</p><a class="btn g s" href="#mod-footprint">Review included sources</a></section>';
  views.benchmarking = () => pageHeading("Benchmarking", "Compare the company’s annual emissions against its own 2023 baseline.")
    + '<section class="card"><h2>Historical emissions</h2><div class="stack">'
    + Object.entries(actualEmissions).map(([year, value]) => bar(year, value / actualEmissions[2023] * 100, "var(--s1)", value.toLocaleString() + " tCO₂e")).join("")
    + '</div><p class="muted">2025 emissions were 455 tCO₂e below the 2023 baseline, a 35% reduction. Internal comparison using sample data.</p><a class="btn g s" href="#mod-roadmap">Compare with the target</a></section>';
  views.simulation = () => pageHeading("Simulation", "Explore how a change in electricity emissions affects the 2025 inventory.")
    + '<section class="card"><h2>Electricity reduction scenario</h2><label for="electricity-reduction">Reduce electricity emissions</label>'
    + '<input id="electricity-reduction" type="range" min="0" max="100" value="0">'
    + '<output id="simulation-result" for="electricity-reduction" aria-live="polite">0% reduction · 845 tCO₂e total</output>'
    + '<p class="muted">This scenario holds all other sources constant and uses the sample inventory.</p></section>';
  views.risk = () => pageHeading("Risk", "Review the data gaps and assumptions that could affect the inventory and reduction plan.")
    + '<section class="card"><h2>Items to review</h2>'
    + renderTable(["Risk", "What to verify"], [
      ["Incomplete electricity records", "Collect Q3 meter readings."],
      ["Estimated value-chain emissions", "Check supplier data, travel records and waste invoices."],
      ["Illustrative target", "Confirm the 2027 target and underlying assumptions."]
    ]) + '<a class="btn g s" href="#data">Review evidence coverage</a></section>';

  document.addEventListener("change", event => {
    if (event.target.id !== "import-files") return;
    const names = Array.from(event.target.files, file => file.name);
    document.getElementById("import-selection").textContent =
      names.length ? "Selected locally: " + names.join(", ") : "No files selected.";
  });

  document.addEventListener("input", event => {
    if (event.target.id !== "electricity-reduction") return;
    const reduction = Number(event.target.value);
    const electricity = categories.find(category => category[0] === "Electricity")[3];
    const total = actualEmissions[2025] - electricity * reduction / 100;
    document.getElementById("simulation-result").textContent =
      reduction + "% reduction · " + total.toFixed(1).replace(/\.0$/, "") + " tCO₂e total";
  });

  // Resolve only routes declared in the view table.
  function renderRoute() {
    var h = (location.hash || "#overview").slice(1);
    if (!Object.hasOwn(views, h)) h = "overview";
    currentRoute = h;
    selectedCategories = null;
    activeScope = null;
    document.getElementById("nav").innerHTML = navigationLinks.map(function (t) {
      var on = t[0] === h || t[0] === "modules" && h.indexOf("mod") === 0;
      return '<a href="#' + t[0] + '"' + (on ? ' aria-current="page"': '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + navIcons[t[0]] + '</svg>' + t[1] + (t[0] === "inbox" ? '<span class="bd">3</span>': '') + '</a>';
    }).join("");
    document.getElementById("app").innerHTML = views[h] ();
    watchMonthlyPlot();
    window.scrollTo(0, 0);
    drawPathwayChart();
    var c = document.getElementById("cw");
    if (chartObserver) chartObserver.disconnect();
    if (c && window.ResizeObserver) {
      chartObserver = new ResizeObserver(drawPathwayChart);
      chartObserver.observe(c);
    }
  }
  document.getElementById("pal").onchange = function (e) {
    if (e.target.value) document.documentElement.dataset.p = e.target.value;
    else delete document.documentElement.dataset.p;
  };
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
