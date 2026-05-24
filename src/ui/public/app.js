const statusColors = {
  queued: "#1F3A5F",
  running: "#E06C2F",
  succeeded: "#2E7D32",
  failed: "#C62828",
  skipped_overlap: "#6D4C41",
  canceled: "#546E7A"
};

const tabs = ["provider", "schedule", "manual", "history", "universe"];
const flash = document.getElementById("flash");
let providerCache = [];
const terminalRunStatuses = new Set(["succeeded", "failed", "skipped_overlap", "canceled"]);

function setFlash(message, error = false) {
  flash.textContent = message;
  flash.style.color = error ? "#C62828" : "#1F3A5F";
}

function parseErrorBody(err) {
  if (!err || typeof err.body !== "string") return {};
  try {
    return JSON.parse(err.body);
  } catch {
    return {};
  }
}

function actionableMessage(action, err, fallback) {
  const code = String(parseErrorBody(err).code || "");
  if (code.includes("manual_override_disabled")) return "Enable manual override first, then retry.";
  if (code.includes("invalid_symbol")) return "Invalid symbol format. Use 2-6 uppercase letters (example: BBCA).";
  if (code.includes("symbol_exists")) return "Symbol already exists. Try editing the existing entry instead.";
  if (code.includes("symbol_not_found")) return "Symbol not found. Refresh the list and retry.";
  if (code.includes("validation_error")) return "Validation failed. Check your input values and retry.";
  if (code.includes("run_in_progress")) return "A run is already in progress. Wait for completion, then retry.";
  if (String(err.message).includes("409")) return "Conflict detected. Refresh data and retry.";
  return `${fallback} (${action})`;
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`api_error_${res.status}`);
    err.body = text;
    throw err;
  }
  return res.json();
}

function setupTabs() {
  for (const button of document.querySelectorAll(".tab")) {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      for (const key of tabs) {
        document.getElementById(`tab-${key}`).classList.toggle("hidden", key !== tab);
      }
      document.querySelectorAll(".tab").forEach((el) => el.classList.remove("active"));
      button.classList.add("active");
    });
  }
}

async function loadProviders() {
  const list = document.getElementById("provider-list");
  const providers = await api("/api/config/provider-profiles");
  providerCache = providers;
  list.innerHTML = "";

  for (const profile of providers) {
    const li = document.createElement("li");
    const info = document.createElement("span");
    info.textContent = `${profile.name} (${profile.provider}/${profile.model}) ${profile.is_active ? "[ACTIVE]" : ""}`;
    li.appendChild(info);

    if (!profile.is_active) {
      const btn = document.createElement("button");
      btn.className = "btn-secondary";
      btn.textContent = "Set Active";
      btn.addEventListener("click", async () => {
        try {
          await api(`/api/config/provider-profiles/${profile.id}/activate`, { method: "POST" });
          await loadProviders();
          setFlash("Provider active updated");
        } catch {
          setFlash("Provider activation failed (ping must pass)", true);
        }
      });
      li.appendChild(document.createTextNode(" "));
      li.appendChild(btn);
    }

    const editBtn = document.createElement("button");
    editBtn.className = "btn-secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      startEditProvider(profile.id);
    });
    li.appendChild(document.createTextNode(" "));
    li.appendChild(editBtn);

    if (!profile.is_active) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-destructive";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (!window.confirm(`Delete profile '${profile.name}'?`)) return;
        try {
          await api(`/api/config/provider-profiles/${profile.id}`, { method: "DELETE" });
          await loadProviders();
          setFlash("Profile deleted");
        } catch (err) {
          if (String(err.message).includes("409")) {
            setFlash("Cannot delete active profile", true);
          } else {
            setFlash("Failed to delete profile", true);
          }
        }
      });
      li.appendChild(document.createTextNode(" "));
      li.appendChild(deleteBtn);
    }

    list.appendChild(li);
  }
}

function setupProviderForm() {
  const form = document.getElementById("provider-form");
  const providerSelect = form.querySelector("select[name='provider']");
  const apiBaseInput = form.querySelector("input[name='api_base']");
  const idInput = form.querySelector("input[name='id']");
  const modeText = document.getElementById("provider-mode");
  const cancelEditButton = document.getElementById("provider-cancel-edit");

  function applyProviderDefaults() {
    if (providerSelect.value === "openrouter" && !apiBaseInput.value) {
      apiBaseInput.value = "https://openrouter.ai/api/v1";
    }
    if (providerSelect.value === "groq" && !apiBaseInput.value) {
      apiBaseInput.value = "https://api.groq.com/openai/v1";
    }
  }

  providerSelect.addEventListener("change", () => {
    apiBaseInput.value = "";
    applyProviderDefaults();
  });
  applyProviderDefaults();

  cancelEditButton.addEventListener("click", () => {
    resetProviderForm();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    const id = idInput.value.trim();
    delete payload.id;

    try {
      if (id) {
        await api(`/api/config/provider-profiles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        setFlash("Provider configuration updated");
      } else {
        if (!payload.api_key || String(payload.api_key).trim().length === 0) {
          setFlash("API key is required for new profile", true);
          return;
        }
        await api("/api/config/provider-profiles", { method: "POST", body: JSON.stringify(payload) });
        setFlash("Provider configuration saved");
      }
      resetProviderForm();
      await loadProviders();
    } catch {
      setFlash(actionableMessage("save provider", new Error("api_error"), "Failed to save provider"), true);
    }
  });

  function resetProviderForm() {
    form.reset();
    idInput.value = "";
    modeText.textContent = "Mode: Create";
    cancelEditButton.classList.add("hidden");
    applyProviderDefaults();
  }

  window.__providerForm = {
    resetProviderForm,
    setModeEdit(profile) {
      idInput.value = String(profile.id);
      form.name.value = profile.name;
      form.provider.value = profile.provider;
      form.model.value = profile.model;
      form.api_base.value = profile.api_base;
      form.api_key.value = "";
      modeText.textContent = `Mode: Edit #${profile.id}`;
      cancelEditButton.classList.remove("hidden");
    }
  };
}

function startEditProvider(id) {
  const profile = providerCache.find((item) => item.id === id);
  if (!profile) {
    setFlash("Profile not found", true);
    return;
  }
  window.__providerForm.setModeEdit(profile);
}

function setupScheduleWeekdays() {
  const holder = document.getElementById("weekday-group");
  ["MON", "TUE", "WED", "THU", "FRI"].forEach((day) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "weekday";
    input.value = day;
    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${day}`));
    holder.appendChild(label);
  });
}

async function loadSchedule() {
  const cfg = await api("/api/config/schedule");
  const form = document.getElementById("schedule-form");
  form.daily_enabled.checked = cfg.daily_enabled;
  form.daily_time.value = cfg.daily_time;
  form.weekly_enabled.checked = cfg.weekly_enabled;
  form.querySelectorAll("input[name='weekday']").forEach((input) => {
    input.checked = cfg.weekdays.includes(input.value);
  });
}

function setupScheduleForm() {
  const form = document.getElementById("schedule-form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const weekdays = Array.from(form.querySelectorAll("input[name='weekday']:checked")).map((el) => el.value);
    const payload = {
      timezone: "Asia/Jakarta",
      daily_enabled: form.daily_enabled.checked,
      daily_time: form.daily_time.value,
      weekdays,
      weekly_enabled: form.weekly_enabled.checked,
      weekly_day: "SUN"
    };
    try {
      await api("/api/config/schedule", { method: "PUT", body: JSON.stringify(payload) });
      setFlash("Schedule saved");
    } catch {
      setFlash("Failed to save schedule", true);
    }
  });
}

async function refreshManualState() {
  const runs = await api("/api/runs");
  const inProgress = runs.some((run) => run.status === "queued" || run.status === "running");
  document.getElementById("manual-warning").classList.toggle("hidden", !inProgress);
  document.getElementById("trigger-daily").disabled = inProgress;
  document.getElementById("trigger-weekly").disabled = inProgress;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatNumber(value, decimals = 4) {
  const num = toFiniteNumber(value);
  return num === null ? "-" : num.toFixed(decimals);
}

function formatInteger(value) {
  const num = toFiniteNumber(value);
  return num === null ? "-" : Math.round(num).toLocaleString("en-US");
}

function formatPercent(value, decimals = 2) {
  const num = toFiniteNumber(value);
  if (num === null) return "-";
  return `${(num * 100).toFixed(decimals)}%`;
}

const allowedWatchlistFields = [
  "close",
  "open",
  "high",
  "low",
  "volume",
  "SMA_20",
  "SMA_50",
  "RSI_14",
  "RVOL_10",
  "MOMENTUM_5",
  "MOMENTUM_20",
  "RELATIVE_STRENGTH_20",
  "MACRO_TREND",
  "DAILY_TURNOVER_IDR"
];

async function waitForRunCompletion(runId, timeoutMs = 120000, intervalMs = 1500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const run = await api(`/api/runs/${runId}`);
    if (terminalRunStatuses.has(run.status)) {
      return run;
    }
    await sleep(intervalMs);
  }
  throw new Error("run_timeout");
}

function setupManualButtons() {
  document.getElementById("trigger-daily").addEventListener("click", () => triggerRun("daily"));
  document.getElementById("trigger-weekly").addEventListener("click", () => triggerRun("weekly"));
}

async function loadUniverse() {
  const list = document.getElementById("universe-list");
  const meta = document.getElementById("universe-meta");
  list.innerHTML = "<li>Loading...</li>";
  const payload = await api("/api/universe");
  meta.textContent = `Source: ${payload.source || "n/a"} | Count: ${payload.count || 0} | Synced: ${payload.createdAt || "n/a"}`;
  list.innerHTML = "";
  for (const symbol of payload.symbols) {
    const li = document.createElement("li");
    li.textContent = symbol;

    const renameBtn = document.createElement("button");
    renameBtn.className = "btn-secondary";
    renameBtn.textContent = "Edit";
    renameBtn.addEventListener("click", async () => {
      const next = window.prompt(`Rename ${symbol} to`, symbol);
      if (!next) return;
      try {
        await api(`/api/universe/${symbol}`, { method: "PUT", body: JSON.stringify({ newSymbol: next }) });
        await loadUniverse();
        setFlash("Universe symbol updated");
      } catch (err) {
        setFlash(actionableMessage("update universe symbol", err, "Failed to update universe symbol"), true);
      }
    });
    li.appendChild(document.createTextNode(" "));
    li.appendChild(renameBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "btn-destructive";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      if (!window.confirm(`Delete ${symbol}?`)) return;
      try {
        await api(`/api/universe/${symbol}`, { method: "DELETE" });
        await loadUniverse();
        setFlash("Universe symbol deleted");
      } catch (err) {
        setFlash(actionableMessage("delete universe symbol", err, "Failed to delete universe symbol"), true);
      }
    });
    li.appendChild(document.createTextNode(" "));
    li.appendChild(delBtn);
    list.appendChild(li);
  }
}

async function loadWatchlistPanel() {
  const payload = await api("/api/watchlist/current");
  const accordion = document.getElementById("watchlist-accordion");
  const meta = document.getElementById("watchlist-meta");
  const strategyPanel = document.getElementById("meta-agent-summary");
  accordion.innerHTML = "";
  meta.textContent = `Target: ${payload.targetSize} | Current: ${payload.symbols.length} | Base metrics: Last OHLCV + SMA20/SMA50 + Momentum/Range`;
  strategyPanel.innerHTML = "";
  strategyPanel.classList.add("hidden");

  if (payload.symbols.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No watchlist data yet. Run weekly selection first.";
    accordion.appendChild(empty);
  }

  function addMetric(grid, label, value) {
    const labelEl = document.createElement("div");
    labelEl.className = "watch-cell-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("div");
    valueEl.className = "watch-cell-value";
    valueEl.textContent = value;
    grid.appendChild(labelEl);
    grid.appendChild(valueEl);
  }

  for (const row of payload.symbols) {
    const symbol = row.symbol;
    const detail = row.score_detail && typeof row.score_detail === "object" ? row.score_detail : {};
    const manual = Boolean(detail.manual);
    const universeRow = detail.universe_row && typeof detail.universe_row === "object" ? detail.universe_row : null;

    if (!manual && detail.source === "meta_agent_rule_engine" && strategyPanel.classList.contains("hidden")) {
      const title = document.createElement("h4");
      title.textContent = "Meta-Agent Strategy Output";
      const regime = document.createElement("p");
      regime.textContent = `Market Regime: ${String(detail.market_regime || "-")}`;
      const rationale = document.createElement("p");
      rationale.textContent = `Rationale: ${String(detail.rationale || "-")}`;
      const filters = document.createElement("pre");
      filters.textContent = `dynamic_filters\n${JSON.stringify(detail.dynamic_filters ?? [], null, 2)}`;
      const ranking = document.createElement("pre");
      ranking.textContent = `ranking_rules\n${JSON.stringify(detail.ranking_rules ?? [], null, 2)}`;
      strategyPanel.appendChild(title);
      strategyPanel.appendChild(regime);
      strategyPanel.appendChild(rationale);
      strategyPanel.appendChild(filters);
      strategyPanel.appendChild(ranking);
      strategyPanel.classList.remove("hidden");
    }

    const item = document.createElement("details");
    item.className = "watch-item";
    const summary = document.createElement("summary");

    const rankEl = document.createElement("span");
    rankEl.textContent = `#${row.rank}`;
    summary.appendChild(rankEl);

    const symbolEl = document.createElement("span");
    symbolEl.textContent = symbol;
    summary.appendChild(symbolEl);

    const closeEl = document.createElement("span");
    closeEl.className = "watch-item-meta";
    closeEl.textContent = manual ? "manual" : `Close: ${formatNumber(detail.last_close, 2)}`;
    summary.appendChild(closeEl);

    const asOfEl = document.createElement("span");
    asOfEl.className = "watch-item-meta";
    asOfEl.textContent = manual ? "-" : `As Of: ${String(detail.as_of_date ?? "-")}`;
    summary.appendChild(asOfEl);

    item.appendChild(summary);

    const body = document.createElement("div");
    body.className = "watch-item-body";

    const grid = document.createElement("div");
    grid.className = "watch-grid";
    const extraGrid = document.createElement("div");
    extraGrid.className = "watch-grid";
    if (universeRow) {
      const compactFields = new Set(["close", "volume", "SMA_20", "SMA_50", "MOMENTUM_20", "RELATIVE_STRENGTH_20"]);
      for (const field of allowedWatchlistFields) {
        const raw = universeRow[field];
        const label = field;
        const value = field === "volume" || field === "DAILY_TURNOVER_IDR" ? formatInteger(raw) : formatNumber(raw, 4);
        if (compactFields.has(field)) addMetric(grid, label, value);
        else addMetric(extraGrid, label, value);
      }
    } else {
      addMetric(grid, "Last Open", manual ? "manual" : formatNumber(detail.last_open, 2));
      addMetric(grid, "Last High", manual ? "manual" : formatNumber(detail.last_high, 2));
      addMetric(grid, "Last Low", manual ? "manual" : formatNumber(detail.last_low, 2));
      addMetric(grid, "Last Close", manual ? "manual" : formatNumber(detail.last_close, 2));
      addMetric(grid, "Last Volume", manual ? "manual" : formatInteger(detail.last_volume));
      addMetric(grid, "SMA20", manual ? "manual" : formatNumber(detail.sma20, 2));
      addMetric(grid, "SMA50", manual ? "manual" : formatNumber(detail.sma50, 2));
      addMetric(grid, "Momentum 20D", manual ? "manual" : formatPercent(detail.momentum20, 2));
      addMetric(grid, "Avg Range 20D", manual ? "manual" : formatPercent(detail.avg_range20, 2));
      addMetric(grid, "Up Consistency 20D", manual ? "manual" : formatPercent(detail.up_consistency20, 2));
      addMetric(grid, "History Points", manual ? "-" : String(detail.history_points ?? "-"));
    }
    addMetric(grid, "Final Score", formatNumber(row.score, 4));
    body.appendChild(grid);
    if (extraGrid.children.length > 0) {
      const extraDetails = document.createElement("details");
      extraDetails.className = "watch-item-extra";
      const extraSummary = document.createElement("summary");
      extraSummary.textContent = "Show advanced metrics";
      extraDetails.appendChild(extraSummary);
      extraDetails.appendChild(extraGrid);
      body.appendChild(extraDetails);
    }

    const renameBtn = document.createElement("button");
    renameBtn.className = "btn-secondary";
    renameBtn.textContent = "Edit";
    renameBtn.addEventListener("click", async () => {
      const next = window.prompt(`Rename ${symbol} to`, symbol);
      if (!next) return;
      try {
        await api(`/api/watchlist/current/symbols/${symbol}`, { method: "PUT", body: JSON.stringify({ newSymbol: next }) });
        await loadWatchlistPanel();
        setFlash("Watchlist symbol updated");
      } catch (err) {
        if (String(err.message).includes("409")) {
          setFlash("Enable manual override first, then retry.", true);
          return;
        }
        setFlash(actionableMessage("update watchlist symbol", err, "Failed to update watchlist symbol"), true);
      }
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-destructive";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      if (!window.confirm(`Delete ${symbol} from watchlist?`)) return;
      try {
        await api(`/api/watchlist/current/symbols/${symbol}`, { method: "DELETE" });
        await loadWatchlistPanel();
        setFlash("Watchlist symbol deleted");
      } catch (err) {
        if (String(err.message).includes("409")) {
          setFlash("Enable manual override first, then retry.", true);
          return;
        }
        setFlash(actionableMessage("delete watchlist symbol", err, "Failed to delete watchlist symbol"), true);
      }
    });

    const actions = document.createElement("div");
    actions.className = "watch-actions";
    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);
    body.appendChild(actions);

    item.appendChild(body);
    accordion.appendChild(item);
  }
  document.getElementById("watchlist-override-toggle").checked = Boolean(payload.manualOverrideEnabled);
}

function setupUniverseWatchlist() {
  document.getElementById("sync-universe").addEventListener("click", async () => {
    const syncBtn = document.getElementById("sync-universe");
    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing...";
    try {
      const result = await api("/api/universe/sync", { method: "POST" });
      await loadUniverse();
      setFlash(`LQ45 synced (${result.count} symbols)`);
    } catch (err) {
      setFlash(actionableMessage("sync LQ45 universe", err, "Failed to sync universe"), true);
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = "Sync LQ45 Universe";
    }
  });

  document.getElementById("run-weekly-selection").addEventListener("click", async () => {
    const weeklyButton = document.getElementById("run-weekly-selection");
    weeklyButton.disabled = true;
    weeklyButton.textContent = "Running...";
    try {
      const queued = await api("/api/actions/run-weekly-selection", { method: "POST" });
      await refreshManualState();
      await loadHistory();
      setFlash("Weekly selection run queued");
      const done = await waitForRunCompletion(queued.runId);
      await refreshManualState();
      await loadHistory();
      if (done.status === "succeeded") {
        await loadWatchlistPanel();
        setFlash("Weekly selection completed and watchlist updated");
      } else {
        setFlash(`Weekly selection finished with status: ${done.status}`, true);
      }
    } catch (err) {
      if (String(err.message).includes("409")) {
        setFlash("A run is already in progress. Wait until it finishes, then retry.", true);
      } else if (String(err.message).includes("run_timeout")) {
        setFlash("Weekly selection still running. Check run history.", true);
      } else {
        setFlash(actionableMessage("queue weekly selection", err, "Failed to queue weekly selection"), true);
      }
    } finally {
      weeklyButton.disabled = false;
      weeklyButton.textContent = "Run Weekly Selection";
    }
  });

  document.getElementById("watchlist-override-toggle").addEventListener("change", async (event) => {
    const enabled = event.target.checked;
    try {
      await api("/api/watchlist/override-mode", { method: "PUT", body: JSON.stringify({ enabled }) });
      setFlash(`Manual override ${enabled ? "enabled" : "disabled"}`);
    } catch {
      setFlash(actionableMessage("update override mode", new Error("api_error"), "Failed to update override mode"), true);
    }
  });

  document.getElementById("universe-add-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const symbol = event.target.symbol.value;
    try {
      await api("/api/universe", { method: "POST", body: JSON.stringify({ symbol }) });
      event.target.reset();
      await loadUniverse();
      setFlash("Universe symbol added");
    } catch (err) {
      setFlash(actionableMessage("add universe symbol", err, "Failed to add universe symbol"), true);
    }
  });

  document.getElementById("watchlist-add-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const symbol = event.target.symbol.value;
    try {
      await api("/api/watchlist/current/symbols", { method: "POST", body: JSON.stringify({ symbol }) });
      event.target.reset();
      await loadWatchlistPanel();
      setFlash("Watchlist symbol added");
    } catch (err) {
      if (String(err.message).includes("409")) {
        setFlash("Enable manual override first, then retry.", true);
      } else {
        setFlash(actionableMessage("add watchlist symbol", err, "Failed to add watchlist symbol"), true);
      }
    }
  });
}

async function triggerRun(kind) {
  try {
    const queued = await api(`/api/runs/${kind}/trigger`, { method: "POST" });
    setFlash(`${kind} run queued`);
    if (kind === "weekly") {
      const done = await waitForRunCompletion(queued.id);
      if (done.status === "succeeded") {
        await loadWatchlistPanel();
        setFlash("Weekly run completed and watchlist updated");
      } else {
        setFlash(`Weekly run finished with status: ${done.status}`, true);
      }
    }
  } catch (err) {
      if (String(err.message).includes("409")) {
        setFlash("A run is already in progress. Wait until it finishes, then retry.", true);
      } else if (String(err.message).includes("run_timeout")) {
        setFlash("Weekly run still running. Check run history.", true);
      } else {
        setFlash(actionableMessage(`trigger ${kind} run`, err, `Failed to trigger ${kind} run`), true);
      }
  }
  await refreshManualState();
  await loadHistory();
}

function renderEmptyHistory(body) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 5;
  td.textContent = "No Runs Yet - Trigger a daily or weekly run to populate this table.";
  tr.appendChild(td);
  body.appendChild(tr);
}

function createCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function prettyContext(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function loadHistory() {
  const body = document.getElementById("history-body");
  const rows = await api("/api/runs");
  body.innerHTML = "";

  if (rows.length === 0) {
    renderEmptyHistory(body);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.appendChild(createCell(String(row.id)));
    tr.appendChild(createCell(String(row.run_type)));

    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.style.background = statusColors[row.status] || "#1F3A5F";
    badge.textContent = String(row.status);
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    tr.appendChild(createCell(String(row.created_at)));

    const actionTd = document.createElement("td");
    const button = document.createElement("button");
    button.className = "btn-secondary";
    button.textContent = "Details";
    button.dataset.id = String(row.id);
    button.addEventListener("click", async () => {
      const details = await api(`/api/runs/${row.id}`);
      const drawer = document.getElementById("run-details");
      drawer.classList.remove("hidden");
      drawer.innerHTML = "";
      const title = document.createElement("strong");
      title.textContent = `Run status: ${details.status}`;
      drawer.appendChild(title);

      const errors = Array.isArray(details.errors) ? details.errors : [];
      if (errors.length === 0) {
        const noError = document.createElement("p");
        noError.textContent = "No error";
        drawer.appendChild(noError);
        return;
      }

      const list = document.createElement("div");
      for (const e of errors) {
        const block = document.createElement("div");
        block.style.marginTop = "10px";
        block.style.padding = "8px";
        block.style.border = "1px solid #ddd";
        block.style.borderRadius = "8px";

        const code = document.createElement("p");
        code.textContent = `Code: ${e.code || "-"}`;
        const message = document.createElement("p");
        message.textContent = `Message: ${e.message || "-"}`;
        const contextLabel = document.createElement("p");
        contextLabel.textContent = "Context:";
        const context = document.createElement("pre");
        context.style.whiteSpace = "pre-wrap";
        context.style.margin = "0";
        context.textContent = prettyContext(e.context);

        block.appendChild(code);
        block.appendChild(message);
        block.appendChild(contextLabel);
        block.appendChild(context);
        list.appendChild(block);
      }
      drawer.appendChild(list);
    });
    actionTd.appendChild(button);
    tr.appendChild(actionTd);

    body.appendChild(tr);
  }
}

async function main() {
  setupTabs();
  setupProviderForm();
  setupScheduleWeekdays();
  setupScheduleForm();
  setupManualButtons();
  setupUniverseWatchlist();
  await loadProviders();
  await loadSchedule();
  await refreshManualState();
  await loadHistory();
  await loadUniverse();
  await loadWatchlistPanel();
}

main().catch(() => setFlash("Failed to load control-plane UI", true));
