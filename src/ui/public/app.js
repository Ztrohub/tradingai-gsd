const statusColors = {
  queued: "#1F3A5F",
  running: "#E06C2F",
  succeeded: "#2E7D32",
  failed: "#C62828",
  skipped_overlap: "#6D4C41",
  canceled: "#546E7A"
};

const tabs = ["provider", "schedule", "manual", "history"];
const flash = document.getElementById("flash");
let providerCache = [];

function setFlash(message, error = false) {
  flash.textContent = message;
  flash.style.color = error ? "#C62828" : "#1F3A5F";
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
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      startEditProvider(profile.id);
    });
    li.appendChild(document.createTextNode(" "));
    li.appendChild(editBtn);

    if (!profile.is_active) {
      const deleteBtn = document.createElement("button");
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
      setFlash("Failed to save provider", true);
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

function setupManualButtons() {
  document.getElementById("trigger-daily").addEventListener("click", () => triggerRun("daily"));
  document.getElementById("trigger-weekly").addEventListener("click", () => triggerRun("weekly"));
}

async function triggerRun(kind) {
  try {
    await api(`/api/runs/${kind}/trigger`, { method: "POST" });
    setFlash(`${kind} run queued`);
  } catch (err) {
    if (String(err.message).includes("409")) {
      setFlash("Run in progress", true);
    } else {
      setFlash(`Failed to trigger ${kind} run`, true);
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
    button.textContent = "Details";
    button.dataset.id = String(row.id);
    button.addEventListener("click", async () => {
      const details = await api(`/api/runs/${row.id}`);
      const drawer = document.getElementById("run-details");
      drawer.classList.remove("hidden");
      drawer.innerHTML = "";
      const title = document.createElement("strong");
      title.textContent = `Run status: ${details.status}`;
      const error = document.createElement("p");
      error.textContent = `Error: ${details.error_message || "No error"}`;
      drawer.appendChild(title);
      drawer.appendChild(error);
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
  await loadProviders();
  await loadSchedule();
  await refreshManualState();
  await loadHistory();
}

main().catch(() => setFlash("Failed to load control-plane UI", true));
