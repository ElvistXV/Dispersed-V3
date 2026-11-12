"use strict";

window.dashboardLayouts = (() => {
  const storageKey = "dispersed-client-layouts-v1";
  const routes = ["mod-footprint", "mod-cockpit"];
  const widths = [[4, "One third"], [6, "Half"], [8, "Two thirds"], [12, "Full"]];
  const defaultLayouts = {
    "mod-footprint": [
      ["E1", 4], ["E5", 4], ["E6", 4], ["E8", 12],
      ["E3", 8], ["E2", 4], ["E4", 6], ["E7", 6]
    ],
    "mod-cockpit": [
      ["D6", 6], ["D1", 6], ["D3", 8], ["D4", 4], ["D2", 6], ["D5", 6]
    ]
  };
  const knownTileIds = new Set([
    "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8",
    "D1", "D2", "D3", "D4", "D5", "D6", "R4"
  ]);
  const catalogue = new Map();
  const htmlEntities = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  };

  let store = loadStore();
  let editing = false;
  let currentRoute = "";
  let redraw;
  let draggedTileId = null;
  let message = "";

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => htmlEntities[character]);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isValidWidth(size) {
    return widths.some(([width]) => width === size);
  }

  function validateLayout(value, fallback) {
    if (!Array.isArray(value)) return clone(fallback);

    const seen = new Set();
    const layout = [];

    for (const item of value) {
      if (!Array.isArray(item)) continue;
      const [id, size] = item;
      if (!knownTileIds.has(id) || seen.has(id)) continue;

      seen.add(id);
      layout.push([id, isValidWidth(size) ? size : 6]);
    }

    return layout;
  }

  function loadStore() {
    const fallback = {
      version: 2,
      active: "demo",
      clients: [{ id: "demo", name: "Demo Manufacturing", layouts: clone(defaultLayouts) }]
    };

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (![1, 2].includes(saved?.version) || !Array.isArray(saved.clients)) {
        return fallback;
      }

      const seenIds = new Set();
      const clients = saved.clients.filter(client => {
        if (!client || typeof client.id !== "string") return false;
        if (!/^[a-z0-9-]{1,64}$/i.test(client.id) || seenIds.has(client.id)) return false;
        seenIds.add(client.id);
        return true;
      }).slice(0, 30).map(client => ({
        id: client.id,
        name: typeof client.name === "string" ? client.name.trim().slice(0, 60) || "Client" : "Client",
        layouts: Object.fromEntries(routes.map(route => {
          const layout = validateLayout(client.layouts?.[route], defaultLayouts[route]);

          // Older footprint layouts predate the E8 tile.
          if (saved.version === 1 && route === "mod-footprint" && !layout.some(([id]) => id === "E8")) {
            layout.splice(Math.min(3, layout.length), 0, ["E8", 12]);
          }
          return [route, layout];
        }))
      }));

      if (!clients.length) return fallback;
      return {
        version: 2,
        active: clients.some(client => client.id === saved.active) ? saved.active : clients[0].id,
        clients
      };
    } catch {
      // Invalid or inaccessible storage should not prevent the dashboard from loading.
      return fallback;
    }
  }

  function activeClient() {
    return store.clients.find(client => client.id === store.active);
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
      message = `Layout saved for ${activeClient().name} on this device.`;
    } catch {
      message = "Layout updated for this session. Browser storage is full or unavailable.";
    }
  }

  function tile(id, title, markup, span) {
    catalogue.set(id, { title, markup, size: Number(span.slice(1)) });
    return markup;
  }

  function renderToolbar(missingTiles) {
    const clientOptions = store.clients.map(client =>
      `<option value="${client.id}"${client.id === store.active ? " selected" : ""}>${escapeHtml(client.name)}</option>`
    ).join("");
    const disabled = missingTiles.length ? "" : " disabled";
    const tileOptions = missingTiles.map(([id, item]) =>
      `<option value="${id}">${id} · ${escapeHtml(item.title)}</option>`
    ).join("");

    const editor = editing ? `
      <div class="layout-editor">
        <form id="layout-add-form">
          <label>Add tile<select name="tile"${disabled}>${tileOptions}</select></label>
          <button class="btn g s"${disabled}>Add tile</button>
        </form>
        <button class="btn g s" type="button" data-layout-command="reset">Restore default layout</button>
        <p class="muted">Drag a tile by its handle, or use Earlier and Later. Width changes apply on desktop.</p>
      </div>` : "";

    return `
      <div class="layout-toolbar">
        <label>Client layout<select id="layout-client">${clientOptions}</select></label>
        <button class="btn g s" type="button" data-layout-command="edit">${editing ? "Finish editing" : "Edit dashboard"}</button>
        <details class="layout-client-create">
          <summary>New client layout</summary>
          <form id="layout-client-form">
            <label>Client name<input name="name" maxlength="60" required></label>
            <button class="btn g s">Create</button>
          </form>
        </details>
      </div>
      <p class="layout-help">Layouts are saved separately for each client on this device. All workspaces currently use the same sample records.</p>
      ${editor}
      <p id="layout-save-status" class="layout-save-status" role="status">${escapeHtml(message)}</p>`;
  }

  function renderTileTools(id, title, size, index, count) {
    const safeTitle = escapeHtml(title);
    const widthOptions = widths.map(([value, label]) =>
      `<option value="${value}"${value === size ? " selected" : ""}>${label}</option>`
    ).join("");

    return `
      <div class="layout-tile-tools">
        <span class="layout-drag-handle" draggable="true" data-layout-drag="${id}" title="Drag to reorder">Move tile</span>
        <button type="button" data-layout-tile="${id}" data-layout-action="earlier"${index === 0 ? " disabled" : ""} aria-label="Move ${safeTitle} earlier">Earlier</button>
        <button type="button" data-layout-tile="${id}" data-layout-action="later"${index === count - 1 ? " disabled" : ""} aria-label="Move ${safeTitle} later">Later</button>
        <label>Width<select data-layout-width="${id}" aria-label="${safeTitle} width">${widthOptions}</select></label>
        <button type="button" data-layout-tile="${id}" data-layout-action="remove" aria-label="Remove ${safeTitle}">Remove</button>
      </div>`;
  }

  function render(route, markup) {
    if (!routes.includes(route)) return markup;
    currentRoute = route;

    const layout = activeClient().layouts[route];
    const missingTiles = [...catalogue].filter(([id]) => !layout.some(([tileId]) => tileId === id));
    const tiles = layout.map(([id, size], index) => {
      const item = catalogue.get(id);
      if (!item) return "";

      const tools = editing ? renderTileTools(id, item.title, size, index, layout.length) : "";
      return item.markup
        .replace(/class="card dashboard-tile c\d+"/, `class="card dashboard-tile c${size}" data-layout-id="${id}"`)
        .replace('<div class="dashboard-tile-content">', tools + '<div class="dashboard-tile-content">');
    }).join("");

    const gridMarker = '<div class="grid dashboard-layout-grid">';
    const endMarker = "<!--dashboard-tiles-end-->";
    const start = markup.indexOf(gridMarker);
    const end = markup.indexOf(endMarker, start);
    if (start < 0 || end < 0) return markup;

    const empty = '<div class="layout-empty"><h2>Your dashboard is empty</h2><p>Use Edit dashboard to add tiles or restore the default layout.</p></div>';
    return markup.slice(0, start) + renderToolbar(missingTiles) + gridMarker +
      (tiles || empty) + "</div>" + markup.slice(end + endMarker.length);
  }

  function update(focusSelector) {
    redraw({ keepView: true });
    if (focusSelector) document.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  function moveTile(id, targetIndex) {
    const layout = activeClient().layouts[currentRoute];
    const currentIndex = layout.findIndex(([tileId]) => tileId === id);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= layout.length || targetIndex === currentIndex) return;

    const [item] = layout.splice(currentIndex, 1);
    layout.splice(targetIndex, 0, item);
    save();
    update(`[data-layout-tile="${id}"]`);
  }

  function handleClick(event) {
    const command = event.target.closest("[data-layout-command]");
    if (command && routes.includes(currentRoute)) {
      if (command.dataset.layoutCommand === "edit") {
        editing = !editing;
        message = "";
        update('[data-layout-command="edit"]');
      }
      if (command.dataset.layoutCommand === "reset") {
        activeClient().layouts[currentRoute] = clone(defaultLayouts[currentRoute]);
        save();
        update('[data-layout-command="reset"]');
      }
    }

    const action = event.target.closest("[data-layout-action]");
    if (!action || !editing || !routes.includes(currentRoute)) return;

    const layout = activeClient().layouts[currentRoute];
    const id = action.dataset.layoutTile;
    const index = layout.findIndex(([tileId]) => tileId === id);
    if (index < 0) return;

    switch (action.dataset.layoutAction) {
      case "remove":
        layout.splice(index, 1);
        save();
        update('[data-layout-command="edit"]');
        break;
      case "earlier":
        moveTile(id, index - 1);
        break;
      case "later":
        moveTile(id, index + 1);
        break;
    }
  }

  function handleChange(event) {
    if (event.target.id === "layout-client") {
      if (store.clients.some(client => client.id === event.target.value)) {
        store.active = event.target.value;
        save();
        update("#layout-client");
      }
    }

    const id = event.target.dataset?.layoutWidth;
    if (id && editing) {
      const item = activeClient().layouts[currentRoute]?.find(([tileId]) => tileId === id);
      const size = Number(event.target.value);
      if (item && isValidWidth(size)) {
        item[1] = size;
        save();
        update(`[data-layout-width="${id}"]`);
      }
    }
  }

  function handleSubmit(event) {
    if (event.target.id === "layout-add-form") {
      event.preventDefault();
      const id = new FormData(event.target).get("tile");
      const layout = activeClient().layouts[currentRoute];
      if (editing && catalogue.has(id) && !layout.some(([tileId]) => tileId === id)) {
        layout.push([id, catalogue.get(id).size]);
        save();
        update('[data-layout-command="edit"]');
      }
    }

    if (event.target.id === "layout-client-form") {
      event.preventDefault();
      const name = String(new FormData(event.target).get("name") || "").trim().slice(0, 60);
      if (!name || store.clients.length >= 30) {
        message = "Enter a client name. Up to 30 local client layouts are supported.";
        update();
        return;
      }

      const id = crypto.randomUUID();
      store.clients.push({ id, name, layouts: clone(defaultLayouts) });
      store.active = id;
      editing = false;
      save();
      update("#layout-client");
    }
  }

  function handleDragStart(event) {
    const handle = event.target.closest("[data-layout-drag]");
    if (!editing || !handle) return;

    draggedTileId = handle.dataset.layoutDrag;
    event.dataTransfer.setData("text/plain", draggedTileId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event) {
    if (draggedTileId && editing && event.target.closest("[data-layout-id]")) {
      event.preventDefault();
    }
  }

  function handleDrop(event) {
    const target = event.target.closest("[data-layout-id]");
    if (!draggedTileId || !target || !editing) return;
    event.preventDefault();

    const layout = activeClient().layouts[currentRoute];
    const index = layout.findIndex(([id]) => id === target.dataset.layoutId);
    const id = draggedTileId;
    draggedTileId = null;
    moveTile(id, index);
  }

  function init(callback) {
    redraw = callback;
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    document.addEventListener("dragend", () => { draggedTileId = null; });
  }

  return { tile, render, init };
})();
