import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_PROMPTS = {
  ja: "簡単なTODOアプリを作成してください。",
  en: "Build a simple TODO app.",
};
const DEFAULT_PROMPT = DEFAULT_PROMPTS.ja;
const GENERIC_NAV_LABELS = new Set(["概要", "一覧", "作成", "設定"]);
const DEFAULT_MODEL = "gpt-5.4-mini";
const ALLOWED_MODELS = new Set(["gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.5"]);
const LANGUAGES = new Set(["ja", "en"]);
const TOKYO_TIME_ZONE = "Asia/Tokyo";
const WEEKDAYS = {
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MEETING_TIMES = ["10:00", "15:00", "11:00"];

const estimateNotes = {
  ja: [
    "※ 要件定義は別途",
    "※ デザイン制作は別途",
    "※ データ永続化は別途協議",
    "※ 本番運用は含みません",
    "※ 仕様変更時は再見積もり",
    "※ 本見積もりは現時点の情報に基づく参考値です",
    "※ ブラウザ差異調査は別途",
    "※ 会議体設計および議事録作成は別途",
    "※ 関係各所レビュー期間は含みません",
    "※ 画面文言の最終確定は貴社支給前提です",
  ],
  en: [
    "* Discovery and requirements definition are excluded.",
    "* Product design and brand assets are excluded.",
    "* Data persistence and integrations require separate scoping.",
    "* Production operations are not included.",
    "* Scope changes require a revised estimate.",
    "* This estimate is directional and based on currently available information.",
    "* Cross-browser QA is excluded unless separately contracted.",
    "* Meeting facilitation and minutes are billed separately.",
    "* Stakeholder review time is not included.",
    "* Final copy and legal text are client-provided.",
  ],
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requestLabel(prompt, language = "ja") {
  const cleaned = String(prompt || DEFAULT_PROMPTS[language] || DEFAULT_PROMPT)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[。.!！]+$/g, "")
    .replace(/(を)?(作ってください|作成してください|作って|作成して|お願いします|してください)$/g, "")
    .replace(/^(please\s+)?(build|create|make)\s+/i, "")
    .replace(/\s+(please|for me)$/i, "")
    .trim();
  return (cleaned || DEFAULT_PROMPTS[language] || DEFAULT_PROMPT).slice(0, 42);
}

function normalizePromptKey(prompt) {
  return String(prompt || "")
    .replace(/\s+/g, "")
    .replace(/[。.!！]+$/g, "");
}

function shouldUseLegacyTodoUi(prompt, language = "ja") {
  return normalizePromptKey(prompt) === normalizePromptKey(DEFAULT_PROMPTS[language] || DEFAULT_PROMPT);
}

function tokyoDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value || now.getUTCFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value || now.getUTCMonth() + 1),
    day: Number(parts.find((part) => part.type === "day")?.value || now.getUTCDate()),
  };
}

function tokyoDateForOffset(offset, now = new Date()) {
  const { year, month, day } = tokyoDateParts(now);
  return new Date(Date.UTC(year, month - 1, day + offset));
}

function formatMeetingDate(date, options = {}) {
  if (options.language === "en") {
    const year = options.withYear ? `, ${date.getUTCFullYear()}` : "";
    return `${MONTHS_EN[date.getUTCMonth()]} ${date.getUTCDate()} (${WEEKDAYS.en[date.getUTCDay()]})${year}`;
  }
  const year = options.withYear ? `${date.getUTCFullYear()}年` : "";
  return `${year}${date.getUTCMonth() + 1}月${date.getUTCDate()}日(${WEEKDAYS.ja[date.getUTCDay()]})`;
}

function meetingCandidateDates(language = "ja", now = new Date()) {
  return MEETING_TIMES.map((time, index) => {
    const date = formatMeetingDate(tokyoDateForOffset(index + 1, now), { language });
    return language === "en" ? `${date} ${time}` : `${date}${time}`;
  });
}

function todayTokyoLabel(language = "ja", now = new Date()) {
  return formatMeetingDate(tokyoDateForOffset(0, now), { language, withYear: true });
}

function cleanText(value, fallback, maxLength = 80) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return (text || fallback || "").slice(0, maxLength);
}

function scrubFixedTodoWords(value, prompt) {
  const label = requestLabel(prompt);
  if (typeof value === "string") {
    return value.replace(/TODOアプリ|ＴＯＤＯアプリ/gi, label).replace(/TODO|ＴＯＤＯ/gi, label).replace(/未完了/g, "未対応");
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubFixedTodoWords(item, prompt));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubFixedTodoWords(item, prompt)]));
  }
  return value;
}

function fallbackUiMock(prompt) {
  const label = requestLabel(prompt);
  return {
    appName: label,
    tagline: `${label}のUIモックです。`,
    primaryAction: "",
    secondaryAction: "",
    navigation: [],
    components: [
      {
        type: "metrics",
        title: "サマリー",
        caption: "状態を即確認",
        fields: [],
        items: [
          { title: "本日の件数", body: "24", meta: "前日比 +8%", status: "active" },
          { title: "確認待ち", body: "7", meta: "優先度 高", status: "warning" },
          { title: "完了率", body: "82%", meta: "順調", status: "done" },
        ],
        columns: [],
        rows: [],
        actions: [],
      },
      {
        type: "form",
        title: "入力",
        caption: "必要項目だけを入力",
        fields: [
          { label: "名称", value: `${label}名` },
          { label: "担当", value: "担当者を選択" },
          { label: "期限", value: "日付を選択" },
        ],
        items: [],
        columns: [],
        rows: [],
        actions: ["下書き保存", "登録"],
      },
      {
        type: "list",
        title: "進行中",
        caption: "直近の動き",
        fields: [],
        items: [
          { title: `${label} A`, body: "内容を確認中です。", meta: "佐藤", status: "active" },
          { title: `${label} B`, body: "レビュー待ちです。", meta: "鈴木", status: "warning" },
          { title: `${label} C`, body: "対応済みです。", meta: "田中", status: "done" },
        ],
        columns: [],
        rows: [],
        actions: [],
      },
      {
        type: "table",
        title: "詳細",
        caption: "状態と担当を確認",
        fields: [],
        items: [],
        columns: ["項目", "状態", "担当"],
        rows: [
          [`${label} A`, "進行中", "佐藤"],
          [`${label} B`, "確認待ち", "鈴木"],
          [`${label} C`, "完了", "田中"],
        ],
        actions: [],
      },
    ],
  };
}

function normalizeField(field, fallback, index) {
  return {
    label: cleanText(field?.label, fallback?.label || `項目${index + 1}`, 18),
    value: cleanText(field?.value, fallback?.value || "入力値", 32),
  };
}

function normalizeItem(item, fallback, index) {
  return {
    title: cleanText(item?.title, fallback?.title || `項目${index + 1}`, 24),
    body: cleanText(item?.body, fallback?.body || "内容を確認できます。", 54),
    meta: cleanText(item?.meta, fallback?.meta || "", 20),
    status: cleanText(item?.status, fallback?.status || "active", 16),
  };
}

function normalizeComponent(component, fallback, index, useFallbackContent = true) {
  const allowedTypes = new Set(["metrics", "form", "list", "table", "kanban", "calendar", "chart", "map", "editor", "media", "profile", "timeline", "preview", "timer"]);
  const fallbackComponent = useFallbackContent ? fallback : null;
  const type = allowedTypes.has(component?.type) ? component.type : fallbackComponent?.type || (index === 0 ? "metrics" : "list");
  const fallbackFields = Array.isArray(fallbackComponent?.fields) ? fallbackComponent.fields : [];
  const fallbackItems = Array.isArray(fallbackComponent?.items) ? fallbackComponent.items : [];
  const fields = Array.isArray(component?.fields)
    ? component.fields.map((field, fieldIndex) => normalizeField(field, fallbackFields[fieldIndex], fieldIndex)).slice(0, 5)
    : [];
  const items = Array.isArray(component?.items)
    ? component.items.map((item, itemIndex) => normalizeItem(item, fallbackItems[itemIndex], itemIndex)).slice(0, 6)
    : [];
  const columns = Array.isArray(component?.columns)
    ? component.columns.map((column, columnIndex) => cleanText(column, fallbackComponent?.columns?.[columnIndex] || `列${columnIndex + 1}`, 16)).slice(0, 4)
    : [];
  const rows = Array.isArray(component?.rows)
    ? component.rows
        .filter((row) => Array.isArray(row))
        .map((row) => row.map((cell, cellIndex) => cleanText(cell, fallbackComponent?.rows?.[0]?.[cellIndex] || "", 22)).slice(0, Math.max(3, columns.length || 3)))
        .slice(0, 4)
    : [];
  const actions = Array.isArray(component?.actions)
    ? component.actions.map((action, actionIndex) => cleanText(action, fallbackComponent?.actions?.[actionIndex] || "実行", 16)).slice(0, 3)
    : [];

  return {
    type,
    title: cleanText(component?.title, fallbackComponent?.title || `セクション${index + 1}`, 24),
    caption: cleanText(component?.caption, fallbackComponent?.caption || "", 46),
    fields: fields.length ? fields : fallbackFields.slice(0, 5),
    items: items.length ? items : fallbackItems.slice(0, 6),
    columns: columns.length ? columns : (fallbackComponent?.columns || []).slice(0, 4),
    rows: rows.length ? rows : (fallbackComponent?.rows || []).slice(0, 4),
    actions: actions.length ? actions : (fallbackComponent?.actions || []).slice(0, 3),
  };
}

function normalizeUiMock(uiMock, prompt, options = {}) {
  const useFallbackContent = options.useFallbackContent ?? true;
  const fallback = fallbackUiMock(prompt);
  const source = uiMock && typeof uiMock === "object" ? scrubFixedTodoWords(uiMock, prompt) : {};
  const components = Array.isArray(source.components)
    ? source.components.map((component, index) => normalizeComponent(component, fallback.components[index % fallback.components.length], index, useFallbackContent)).slice(0, 4)
    : [];

  return {
    appName: cleanText(source.appName, fallback.appName, 42),
    tagline: cleanText(source.tagline || source.description, fallback.tagline, 96),
    primaryAction: cleanText(source.primaryAction, useFallbackContent ? fallback.primaryAction : "", 28),
    secondaryAction: cleanText(source.secondaryAction, useFallbackContent ? fallback.secondaryAction : "", 28),
    navigation: Array.isArray(source.navigation)
      ? source.navigation
          .map((item, index) => cleanText(item, useFallbackContent ? fallback.navigation[index % Math.max(1, fallback.navigation.length)] : "", 16))
          .filter((item) => item && (useFallbackContent || !GENERIC_NAV_LABELS.has(item)))
          .slice(0, 5)
      : useFallbackContent
        ? fallback.navigation
        : [],
    components: components.length >= (useFallbackContent ? 2 : 1) ? components : fallback.components,
  };
}

function renderFields(fields) {
  return fields.map((field) => `<div class="field"><span>${escapeHtml(field.label)}</span><b>${escapeHtml(field.value)}</b></div>`).join("");
}

function renderItems(items) {
  return items
    .map(
      (item) => `<article class="item is-${escapeHtml(item.status)}">
        <div><b>${escapeHtml(item.title)}</b>${item.meta ? `<em>${escapeHtml(item.meta)}</em>` : ""}</div>
        <p>${escapeHtml(item.body)}</p>
      </article>`
    )
    .join("");
}

function renderTable(columns, rows) {
  const safeColumns = columns.length ? columns.slice(0, 4) : ["項目", "状態", "担当"];
  const head = safeColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .slice(0, 4)
    .map((row) => `<tr>${safeColumns.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderChart(items) {
  return `<div class="chart">${items
    .slice(0, 5)
    .map((item, index) => {
      const width = [72, 54, 86, 43, 64][index % 5];
      return `<div class="bar" style="--w:${width}%"><span>${escapeHtml(item.title)}</span><b>${escapeHtml(item.body)}</b></div>`;
    })
    .join("")}</div>`;
}

function renderCalendar(items) {
  const cells = Array.from({ length: 10 }, (_, index) => {
    const item = items[index % Math.max(1, items.length)];
    const hasItem = index < items.length;
    return `<div class="cal-cell ${hasItem ? "has-item" : ""}"><span>${index + 1}</span>${hasItem ? `<b>${escapeHtml(item.title)}</b>` : ""}</div>`;
  }).join("");
  return `<div class="calendar">${cells}</div>`;
}

function renderKanban(columns, items) {
  const safeColumns = (columns.length ? columns : ["受付", "進行", "完了"]).slice(0, 3);
  return `<div class="kanban">${safeColumns
    .map((column, columnIndex) => {
      const item = items[columnIndex] || items[0] || { title: column, body: "内容を確認", meta: "", status: "active" };
      return `<div class="kanban-col"><strong>${escapeHtml(column)}</strong><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.body)}</small></div>`;
    })
    .join("")}</div>`;
}

function renderMap(items) {
  return `<div class="map-panel">
    ${items
      .slice(0, 4)
      .map((item, index) => `<span class="pin pin-${index + 1}"><b>${escapeHtml(item.title.slice(0, 2))}</b></span>`)
      .join("")}
    <div class="route-line"></div>
  </div>`;
}

function renderMedia(items) {
  return `<div class="media-grid">${items
    .slice(0, 4)
    .map((item, index) => `<article><i>${index + 1}</i><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.meta || item.body)}</span></article>`)
    .join("")}</div>`;
}

function renderEditor(component) {
  const lines = [...component.fields.map((field) => `${field.label}: ${field.value}`), ...component.items.map((item) => item.body)].slice(0, 5);
  return `<div class="editor">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`;
}

function renderTimer(component) {
  const primary = component.items[0] || { title: "集中タイマー", body: "25:00", meta: "作業", status: "active" };
  const secondary = component.items[1] || { title: "休憩", body: "05:00", meta: "短い休憩", status: "done" };
  const actions = component.actions.length ? component.actions : ["開始", "一時停止", "リセット"];
  return `<div class="timer-app">
    <div class="timer-ring">
      <span>${escapeHtml(primary.title)}</span>
      <strong>${escapeHtml(primary.body)}</strong>
      <em>${escapeHtml(primary.meta)}</em>
    </div>
    <div class="timer-side">
      <div><span>${escapeHtml(secondary.title)}</span><b>${escapeHtml(secondary.body)}</b></div>
      <div class="timer-buttons">${actions.map((action, index) => `<button class="${index === 0 ? "primary" : ""}" type="button">${escapeHtml(action)}</button>`).join("")}</div>
    </div>
  </div>`;
}

function renderComponent(component, index) {
  const actions = component.actions.map((action, actionIndex) => `<button class="${actionIndex === component.actions.length - 1 ? "primary" : ""}" type="button">${escapeHtml(action)}</button>`).join("");
  let body = "";
  if (component.type === "metrics") {
    body = `<div class="metrics">${component.items
      .slice(0, 4)
      .map((item) => `<div><span>${escapeHtml(item.title)}</span><strong>${escapeHtml(item.body)}</strong><em>${escapeHtml(item.meta)}</em></div>`)
      .join("")}</div>`;
  } else if (component.type === "form" || component.type === "profile" || component.type === "controls") {
    body = `<div class="fields">${renderFields(component.fields)}</div>`;
  } else if (component.type === "table") {
    body = renderTable(component.columns, component.rows);
  } else if (component.type === "kanban") {
    body = renderKanban(component.columns, component.items);
  } else if (component.type === "calendar") {
    body = renderCalendar(component.items);
  } else if (component.type === "chart") {
    body = renderChart(component.items);
  } else if (component.type === "map") {
    body = renderMap(component.items);
  } else if (component.type === "media" || component.type === "preview") {
    body = renderMedia(component.items);
  } else if (component.type === "editor") {
    body = renderEditor(component);
  } else if (component.type === "timer") {
    body = renderTimer(component);
  } else {
    body = `<div class="items">${renderItems(component.items)}</div>`;
  }

  return `<section class="panel type-${escapeHtml(component.type)} span-${index === 0 ? "lead" : "normal"}">
    <header><div><h2>${escapeHtml(component.title)}</h2>${component.caption ? `<p>${escapeHtml(component.caption)}</p>` : ""}</div>${actions ? `<div class="panel-actions">${actions}</div>` : ""}</header>
    <div class="panel-body">${body}</div>
  </section>`;
}

function createUiMockHtml(uiMock, prompt) {
  const ui = normalizeUiMock(uiMock, prompt);
  const navItems = ui.navigation.map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button">${escapeHtml(item)}</button>`).join("");
  const actions = [
    ui.secondaryAction ? `<button class="secondary" type="button">${escapeHtml(ui.secondaryAction)}</button>` : "",
    ui.primaryAction ? `<button class="primary" type="button">${escapeHtml(ui.primaryAction)}</button>` : "",
  ].join("");
  const components = ui.components.map((component, index) => renderComponent(component, index)).join("");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<title>${escapeHtml(ui.appName)} UI Mock</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#202124}
  button,input{font:inherit}
  .app{height:100vh;max-height:520px;padding:14px;display:grid;grid-template-rows:auto minmax(0,1fr);gap:10px;background:#fff;overflow:hidden}
  .app.has-nav{grid-template-rows:auto auto minmax(0,1fr)}
  .top{display:flex;justify-content:space-between;gap:14px;align-items:start;min-height:0}
  h1{margin:0 0 4px;font-size:22px;font-weight:740;letter-spacing:0;line-height:1.08}
  .sub{max-width:560px;margin:0;color:#73737a;font-size:11px;line-height:1.35}
  .actions{display:flex;gap:8px;flex:0 0 auto}
  .primary,.secondary{height:30px;padding:0 11px;border-radius:9px;border:1px solid #202124;font-size:11px;font-weight:720;white-space:nowrap}
  .primary{background:#202124;color:#fff}
  .secondary{background:#fff;color:#202124}
  nav{display:flex;gap:5px;padding:3px;border:1px solid #e5e5e8;border-radius:11px;background:#f7f7f8;overflow:hidden}
  nav button{height:24px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#686870;font-size:11px;font-weight:650}
  nav .is-active{background:#fff;color:#202124;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .canvas{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(2,minmax(0,1fr));gap:9px;min-height:0;overflow:hidden}
  .panel{min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);border:1px solid #e4e4e7;border-radius:12px;background:#fff;overflow:hidden}
  .panel>header{display:flex;align-items:start;justify-content:space-between;gap:8px;padding:9px 10px 7px;border-bottom:1px solid #eeeeef}
  .panel h2{margin:0;font-size:12px;font-weight:760;line-height:1.15}
  .panel p{margin:3px 0 0;color:#85858c;font-size:10px;line-height:1.25}
  .panel-actions{display:flex;gap:5px;flex:0 0 auto}
  .panel-actions button{height:24px;padding:0 8px;border:1px solid #dfdfe4;border-radius:8px;background:#fff;color:#33343a;font-size:10px;font-weight:700}
  .panel-actions .primary{border-color:#202124;background:#202124;color:#fff}
  .panel-body{min-height:0;padding:9px 10px;overflow:hidden}
  .metrics{height:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  .metrics div{min-width:0;padding:9px;border:1px solid #ededf0;border-radius:10px;background:#fbfbfc}
  .metrics span,.field span{display:block;color:#85858c;font-size:10px;font-weight:700}
  .metrics strong{display:block;margin-top:4px;font-size:20px;line-height:1}
  .metrics em{display:block;margin-top:5px;color:#7c3aed;font-size:9px;font-style:normal;font-weight:760;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fields{display:grid;gap:7px}
  .field{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:8px;min-height:28px;padding:0 8px;border:1px solid #ededf0;border-radius:9px;background:#fafafa}
  .field b{min-width:0;color:#303036;font-size:11px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .items{display:grid;gap:7px}
  .item{padding:8px;border:1px solid #ededf0;border-radius:10px;background:#fbfbfc}
  .item div{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .item b{min-width:0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .item em{color:#7c3aed;font-size:9px;font-style:normal;font-weight:760;white-space:nowrap}
  .item p{margin:4px 0 0;color:#6f6f76;font-size:10px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th,td{padding:6px 7px;border-top:1px solid #ededf0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
  th{color:#77777f;font-weight:720;background:#fafafa}
  .chart{display:grid;gap:8px}
  .bar{display:grid;grid-template-columns:82px minmax(0,1fr) 40px;align-items:center;gap:7px;font-size:10px}
  .bar span,.bar b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar:before{content:"";grid-column:2;height:9px;border-radius:999px;background:linear-gradient(90deg,#202124 var(--w),#eeeeef var(--w))}
  .bar span{grid-column:1;grid-row:1;color:#58585f;font-weight:700}.bar b{grid-column:3;grid-row:1;text-align:right}
  .calendar{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;height:100%}
  .cal-cell{min-width:0;border:1px solid #ededf0;border-radius:8px;background:#fafafa;padding:5px}
  .cal-cell span{display:block;color:#9a9aa2;font-size:9px}.cal-cell b{display:block;margin-top:4px;font-size:9px;line-height:1.15}
  .cal-cell.has-item{border-color:#d9ccff;background:#fbf9ff}
  .kanban{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;height:100%}
  .kanban-col{min-width:0;padding:8px;border:1px solid #ededf0;border-radius:10px;background:#fafafa}
  .kanban-col strong,.kanban-col span,.kanban-col small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kanban-col strong{font-size:10px}.kanban-col span{margin-top:8px;font-size:11px;font-weight:760}.kanban-col small{margin-top:4px;color:#77777f;font-size:9px}
  .map-panel{position:relative;height:100%;border-radius:10px;background:linear-gradient(#f0f0f3 1px,transparent 1px),linear-gradient(90deg,#f0f0f3 1px,transparent 1px),#fafafa;background-size:22px 22px;overflow:hidden}
  .pin{position:absolute;width:26px;height:26px;display:grid;place-items:center;border-radius:50% 50% 50% 4px;background:#202124;color:#fff;transform:rotate(-45deg)}
  .pin b{font-size:9px;transform:rotate(45deg)}.pin-1{left:14%;top:18%}.pin-2{left:58%;top:28%;background:#7c3aed}.pin-3{left:35%;top:62%}.pin-4{left:76%;top:62%;background:#7c3aed}
  .route-line{position:absolute;left:21%;right:18%;top:48%;height:2px;background:#d8d8de;transform:rotate(11deg)}
  .media-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;height:100%}
  .media-grid article{min-width:0;display:grid;align-content:end;gap:4px;padding:8px;border-radius:10px;background:linear-gradient(135deg,#f1f1f4,#fff);border:1px solid #ededf0}
  .media-grid i{width:22px;height:22px;display:grid;place-items:center;border-radius:8px;background:#202124;color:#fff;font-style:normal;font-size:10px;font-weight:800}
  .media-grid b,.media-grid span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.media-grid b{font-size:11px}.media-grid span{color:#77777f;font-size:9px}
  .editor{height:100%;display:grid;gap:6px;align-content:start;padding:8px;border-radius:10px;background:#202124;color:#f7f7f8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .editor p{margin:0;color:#f7f7f8;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .timer-app{height:100%;display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center}
  .timer-ring{aspect-ratio:1;min-height:116px;display:grid;place-items:center;align-content:center;border-radius:50%;border:9px solid #202124;background:radial-gradient(circle,#fff 58%,#f3f3f5 59%);box-shadow:inset 0 0 0 1px #ededf0}
  .timer-ring span,.timer-ring em{max-width:86%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .timer-ring span{color:#77777f;font-size:10px;font-weight:760}.timer-ring strong{font-size:32px;line-height:1.05;letter-spacing:0}.timer-ring em{color:#7c3aed;font-size:10px;font-style:normal;font-weight:760}
  .timer-side{display:grid;gap:9px}
  .timer-side>div:first-child{padding:10px;border:1px solid #ededf0;border-radius:11px;background:#fafafa}
  .timer-side span{display:block;color:#77777f;font-size:10px;font-weight:760}.timer-side b{display:block;margin-top:4px;font-size:22px}
  .timer-buttons{display:grid;gap:6px}.timer-buttons button{height:28px;border:1px solid #dfdfe4;border-radius:9px;background:#fff;color:#202124;font-size:11px;font-weight:760}.timer-buttons .primary{border-color:#202124;background:#202124;color:#fff}
  @media (max-width:620px){.actions{display:none}.canvas{grid-template-columns:1fr}.panel:nth-child(n+4){display:none}h1{font-size:20px}}
</style>
</head>
<body>
<main class="app ${navItems ? "has-nav" : "no-nav"}">
  <header class="top">
    <div>
      <h1>${escapeHtml(ui.appName)}</h1>
      <p class="sub">${escapeHtml(ui.tagline)}</p>
    </div>
    ${actions ? `<div class="actions">${actions}</div>` : ""}
  </header>
  ${navItems ? `<nav aria-label="画面タブ">${navItems}</nav>` : ""}
  <section class="canvas" aria-label="生成UI">${components}</section>
</main>
</body>
</html>`;
}

function createLegacyTodoHtml(prompt = DEFAULT_PROMPT, language = "ja") {
  const isEnglish = language === "en";
  const title = escapeHtml(prompt || DEFAULT_PROMPTS[language] || DEFAULT_PROMPT);
  const htmlLang = isEnglish ? "en" : "ja";
  const appTitle = isEnglish ? "TODO App" : "TODOアプリ";
  const taskPlaceholder = isEnglish ? "Add a task" : "タスクを追加";
  const addLabel = isEnglish ? "Add" : "追加";
  const deleteLabel = isEnglish ? "Delete" : "削除";
  const leftSuffix = isEnglish ? " open" : "件 未完了";
  const sampleItems = isEnglish
    ? ["Clarify requirements", "Add a new TODO item", "Check completion and deletion"]
    : ["要件を整理する", "TODOを追加できるようにする", "完了チェックと削除を確認する"];
  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
<title>Generated TODO</title>
<style>
  *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#202124}
  .app{min-height:100vh;padding:22px;background:#fff}
  h1{margin:0 0 4px;font-size:24px;letter-spacing:0}.sub{margin:0 0 18px;color:#5d6a63;font-size:12px}
  .controls{display:flex;gap:8px;margin-bottom:14px}input{flex:1;border:1px solid #b9c8bd;border-radius:8px;padding:12px;font-size:15px;background:white}
  button{border:0;border-radius:8px;background:#7c3aed;color:white;font-weight:800;padding:0 14px;cursor:pointer}
  ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}.item{display:flex;align-items:center;gap:10px;padding:10px 11px;border:1px solid #e4e4e7;border-radius:8px;background:white}
  .item.done span{text-decoration:line-through;color:#85928a}.item input{width:18px;height:18px;flex:0 0 auto}.item span{flex:1;overflow-wrap:anywhere}
  .delete{background:#f5f5f6;color:#202124;border:1px solid #d9d9df;height:30px}.footer{margin-top:14px;display:flex;color:#6f6f76;font-size:13px}
</style>
</head>
<body>
<main class="app">
  <h1>${appTitle}</h1>
  <p class="sub">${title}</p>
  <div class="controls"><input id="task" autocomplete="off" placeholder="${taskPlaceholder}"><button id="add" type="button">${addLabel}</button></div>
  <ul id="list"></ul>
  <div class="footer"><strong id="left">0${leftSuffix}</strong></div>
</main>
<script>
const list=document.querySelector("#list"), task=document.querySelector("#task"), add=document.querySelector("#add"), left=document.querySelector("#left");
let items=[
  {id:1,text:${JSON.stringify(sampleItems[0])},done:true},
  {id:2,text:${JSON.stringify(sampleItems[1])},done:false},
  {id:3,text:${JSON.stringify(sampleItems[2])},done:false}
];
function render(){
  list.innerHTML="";
  for(const item of items){
    const li=document.createElement("li");
    li.className="item"+(item.done?" done":"");
    li.innerHTML='<input type="checkbox" '+(item.done?'checked':'')+'><span></span><button class="delete" type="button">${deleteLabel}</button>';
    li.querySelector("span").textContent=item.text;
    li.querySelector("input").addEventListener("change",()=>{item.done=!item.done;render();});
    li.querySelector(".delete").addEventListener("click",()=>{items=items.filter(x=>x.id!==item.id);render();});
    list.append(li);
  }
  left.textContent=items.filter(x=>!x.done).length+${JSON.stringify(leftSuffix)};
}
function addTask(){
  const text=task.value.trim();
  if(!text)return;
  items.unshift({id:Date.now(),text,done:false});
  task.value="";
  render();
}
add.addEventListener("click",addTask);
task.addEventListener("keydown",(event)=>{if(event.key==="Enter"){event.preventDefault();addTask();}});
render();
</script>
</body>
</html>`;
}

function createStatusHtml(title, body, language = "ja") {
  return `<!doctype html>
<html lang="${language === "en" ? "en" : "ja"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;width:100%;height:100%;overflow:hidden}
  body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff;color:#202124}
  main{width:100%;height:100vh;max-height:520px;display:grid;place-items:center;padding:28px;overflow:hidden}
  .notice{width:min(420px,100%);border:1px solid #e3e3e7;border-radius:14px;padding:22px;background:#fff}
  h1{margin:0 0 8px;font-size:18px;line-height:1.25;letter-spacing:0}
  p{margin:0;color:#6f6f76;font-size:13px;line-height:1.6}
</style>
</head>
<body>
<main>
  <section class="notice">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(body)}</p>
  </section>
</main>
</body>
</html>`;
}

function createFallbackAppHtml(prompt, reason, language = "ja") {
  if (shouldUseLegacyTodoUi(prompt, language)) {
    return createLegacyTodoHtml(prompt, language);
  }
  if (reason === "missing-api-key" || reason === "local-fallback") {
    return language === "en"
      ? createStatusHtml("Enter an API key", "This request will generate fresh HTML/CSS through the OpenAI API and fit it inside the preview frame.", language)
      : createStatusHtml(
          "APIキーを入力してください",
          "この依頼はOpenAI APIで、表示枠に収まるHTML/CSSを一から生成して表示します。",
          language
        );
  }
  if (reason === "api-error") {
    return language === "en"
      ? createStatusHtml("Could not generate the UI", "Check the API key, model access, and available credits. The old generic fallback UI is intentionally disabled.", language)
      : createStatusHtml(
          "APIでUIを生成できませんでした",
          "APIキー、モデル名、利用可能なクレジットを確認してください。古い汎用UIは表示しない設定にしています。",
          language
        );
  }
  return language === "en"
    ? createStatusHtml("The generated HTML was empty", "OpenAI did not return displayable HTML, so this message is shown instead of the app screen.", language)
    : createStatusHtml(
        "生成HTMLが空でした",
        "OpenAIから表示用HTMLが返らなかったため、アプリ画面の代わりにこのメッセージを表示しています。",
        language
      );
}

function friendlyApiErrorMessage(message, language = "ja") {
  const text = String(message || "");
  if (/429|quota|billing/i.test(text)) {
    if (language === "en") {
      return "The OpenAI API quota was exceeded, or billing/usage limits for this project prevent generation. The key was accepted, but the project may need credits, billing setup, or a higher limit.";
    }
    return "OpenAI APIのクォータ超過、またはプロジェクトの課金/利用上限設定により生成できませんでした。キーの認証は通っていますが、このプロジェクトでAPIを実行できる残量または支払い設定を確認してください。";
  }
  if (/model|does not exist|access/i.test(text)) {
    if (language === "en") {
      return "The selected model may not be available for this project. Check OPENAI_MODEL or choose a model your project can access.";
    }
    return "指定モデルにアクセスできない可能性があります。OPENAI_MODEL、または利用可能なモデル設定を確認してください。";
  }
  if (/invalid api key|incorrect api key|401/i.test(text)) {
    if (language === "en") {
      return "The API key appears to be invalid or unavailable for this project. Create a new key and try again.";
    }
    return "APIキーが無効、またはプロジェクトで利用できないキーの可能性があります。新しいキーを発行して再入力してください。";
  }
  if (language === "en") {
    return "OpenAI API returned an error. Check the API key, model name, billing settings, and usage limits.";
  }
  return "OpenAI APIからエラーが返りました。APIキー、モデル名、課金設定、利用上限を確認してください。";
}

function fallbackPayload(prompt, reason = "local-fallback", language = "ja") {
  const label = requestLabel(prompt, language);
  const appHtml = createFallbackAppHtml(prompt, reason, language);
  const candidates = meetingCandidateDates(language);
  const isEnglish = language === "en";
  const englishEstimateNotes = estimateNotes.en;
  return {
    source: reason,
    codexLine: isEnglish
      ? `I created a one-screen UI mock for ${label}. You can review the layout and key controls now. What should we tune next?`
      : `${label}のUIモックを作成しました。画面の雰囲気と必要な要素を確認できます。次は何を調整しましょう？`,
    jtcFinalLine: isEnglish
      ? `Following internal review, the preliminary estimate for ${label} is USD $24,000, with an expected timeline of 3-5 weeks. Requirements discovery, visual design, integrations, and production operations are subject to separate scoping. To walk through the estimate, would ${candidates.join(", ")} work for a review call? Final feasibility depends on the next requirements meeting.`
      : `社内検討の結果、${label}に関する概算見積は税込2,640,000円、構築期間は3〜5週間程度となりました。` +
        `ただし要件定義、デザイン、データ連携、運用範囲はいずれも別途協議前提です。お見積りの説明をさせていただきたく、候補日は${candidates.join("、")}でいかがでしょうか。最終的に全て対応可能かは、次回打ち合わせでの確認事項次第となります。`,
    codexSteps: isEnglish ? ["Parse request", "Compose UI", "Render preview", "Done"] : ["依頼内容を整理", "UIモックを構成", "プレビュー表示", "対応完了"],
    appHtml,
    todoHtml: appHtml,
    jtcLines: isEnglish
      ? [
          "Let's align on the problem statement first.",
          "We'll take the scope definition offline.",
          "Each vendor needs to assess the impact area.",
          "Ownership boundaries come before delivery.",
          "We should clarify assumptions before feasibility.",
          "Please confirm whether wireframes exist.",
          "Data persistence is a separate discussion.",
          "Non-functional requirements are out of this first estimate.",
          "We'll re-price after the review model is agreed.",
          "Let's reconcile three vendor opinions just in case.",
          "We'll prepare an estimate for the estimate.",
          "This should probably be split into phases.",
          "We'll submit a directional number first.",
          "A detailed quote follows discovery.",
          "We'll send the estimate before implementation.",
        ]
      : [
          "まずは認識合わせの場を設定します。",
          "スコープの粒度を一度持ち帰ります。",
          "影響範囲を各社で確認します。",
          "責任分界点の整理が先決です。",
          "実装可否ではなく前提条件を洗います。",
          "画面遷移図の有無を確認します。",
          "データ永続化の扱いは別途協議です。",
          "非機能要件は初回見積もり対象外です。",
          "レビュー体制を前提に再算定します。",
          "念のため三社見解を揃えます。",
          "概算の概算を作成します。",
          "本件はフェーズを分けるのが望ましいです。",
          "一次回答として参考値を提示します。",
          "詳細見積もりは要件定義後となります。",
          "見積書だけ先に提出いたします。",
        ],
    meetingLog: isEnglish
      ? [
          "10:00 Prime vendor: agreed to identify stakeholders first",
          `10:45 Systems integrator: opened clarification items for ${label}`,
          "11:30 Delivery partner: split concerns into UI, data, and operations",
          "13:15 Dev shop: implementation is possible but assumptions are unresolved",
          "15:40 Steering group: added assumptions to reduce estimate risk",
        ]
      : [
          "10:00 元請: まず関係者を洗い出す方針で合意",
          `10:45 一次請: ${label}の定義について確認事項を起票`,
          "11:30 二次請: 画面・データ・運用の三論点に分割",
          "13:15 三次請: 実装は可能だが前提条件が未確定と回答",
          "15:40 全体: 見積もり前提を増やしてリスクを低減",
        ],
    estimate: {
      title: isEnglish ? `Discovery and implementation support for ${label}` : `${label}に関する影響調査および実装支援`,
      period: isEnglish ? "3-5 weeks" : "3〜5週間",
      cost: isEnglish ? "USD $12,000-$36,000" : "1,200,000円〜3,600,000円",
      total: isEnglish ? "USD $24,000" : "2,640,000円",
      lineItems: isEnglish
        ? [
            { name: "Impact assessment", quantity: "Fixed fee", amount: "USD $3,000" },
            { name: "Requirements discovery support", quantity: "Fixed fee", amount: "USD $4,500" },
            { name: "UI mock support", quantity: "Fixed fee", amount: "USD $8,500" },
            { name: "Meeting facilitation and notes", quantity: "Fixed fee", amount: "USD $3,500" },
            { name: "Project management fee", quantity: "Fixed fee", amount: "USD $2,000" },
            { name: "Administrative overhead", quantity: "Fixed fee", amount: "USD $2,500" },
          ]
        : [
            { name: "影響範囲調査", quantity: "1式", amount: "320,000円" },
            { name: "要件整理支援", quantity: "1式", amount: "480,000円" },
            { name: "UIモック作成支援", quantity: "1式", amount: "960,000円" },
            { name: "会議体運営・議事録作成", quantity: "1式", amount: "420,000円" },
            { name: "プロジェクト管理費", quantity: "1式", amount: "220,000円" },
            { name: "諸経費", quantity: "1式", amount: "240,000円" },
          ],
      assumptions: isEnglish ? englishEstimateNotes : estimateNotes.ja,
    },
  };
}

function sanitizeGeneratedHtml(html, prompt, language = "ja") {
  let safe = typeof html === "string" && html.trim() ? html : createFallbackAppHtml(prompt, "empty-openai-html", language);
  safe = safe
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, "");

  const csp =
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:;\">";
  if (/<head[^>]*>/i.test(safe)) {
    safe = safe.replace(/<head[^>]*>/i, (match) => `${match}${csp}`);
  } else {
    safe = `<!doctype html><html lang="${language === "en" ? "en" : "ja"}"><head>${csp}<meta charset="utf-8"></head><body>${safe}</body></html>`;
  }
  return safe;
}

function normalizePayload(payload, prompt, source, language = "ja") {
  const fallback = fallbackPayload(prompt, source, language);
  const result = {
    ...fallback,
    ...payload,
    source,
    estimate: {
      ...fallback.estimate,
      ...(payload?.estimate || {}),
    },
  };
  result.appHtml =
    source === "openai" && typeof payload?.appHtml === "string" && payload.appHtml.trim()
      ? sanitizeGeneratedHtml(payload.appHtml, prompt, language)
      : fallback.appHtml;
  result.todoHtml = result.appHtml;
  delete result.uiMock;
  result.codexLine = typeof result.codexLine === "string" && result.codexLine.trim() ? result.codexLine.trim().slice(0, 240) : fallback.codexLine;
  result.jtcFinalLine = typeof result.jtcFinalLine === "string" && result.jtcFinalLine.trim() ? result.jtcFinalLine.trim().slice(0, 520) : fallback.jtcFinalLine;
  result.codexSteps = Array.isArray(result.codexSteps) && result.codexSteps.length ? result.codexSteps.slice(0, 6) : fallback.codexSteps;
  result.jtcLines = Array.isArray(result.jtcLines) && result.jtcLines.length ? result.jtcLines.slice(0, 15) : fallback.jtcLines;
  result.meetingLog = Array.isArray(result.meetingLog) && result.meetingLog.length ? result.meetingLog.slice(0, 8) : fallback.meetingLog;
  result.estimate.lineItems =
    Array.isArray(result.estimate.lineItems) && result.estimate.lineItems.length ? result.estimate.lineItems.slice(0, 8) : fallback.estimate.lineItems;
  result.estimate.assumptions = Array.isArray(result.estimate.assumptions) && result.estimate.assumptions.length ? result.estimate.assumptions.slice(0, 14) : fallback.estimate.assumptions;
  return result;
}

function schema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["codexLine", "appHtml", "jtcFinalLine", "codexSteps", "jtcLines", "meetingLog", "estimate"],
    properties: {
      codexLine: { type: "string" },
      appHtml: { type: "string" },
      jtcFinalLine: { type: "string" },
      codexSteps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
      jtcLines: { type: "array", items: { type: "string" }, minItems: 10, maxItems: 15 },
      meetingLog: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
      estimate: {
        type: "object",
        additionalProperties: false,
        required: ["title", "period", "cost", "total", "lineItems", "assumptions"],
        properties: {
          title: { type: "string" },
          period: { type: "string" },
          cost: { type: "string" },
          total: { type: "string" },
          lineItems: {
            type: "array",
            minItems: 4,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "quantity", "amount"],
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                amount: { type: "string" },
              },
            },
          },
          assumptions: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 14 },
        },
      },
    },
  };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const language = LANGUAGES.has(body.language) ? body.language : "ja";
  const prompt = String(body.prompt || DEFAULT_PROMPTS[language] || DEFAULT_PROMPT).slice(0, 600);
  const requestApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiKey = process.env.OPENAI_API_KEY || requestApiKey;
  const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
  const envModel = process.env.OPENAI_MODEL || "";
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : ALLOWED_MODELS.has(envModel) ? envModel : DEFAULT_MODEL;
  const todayLabel = todayTokyoLabel(language);
  const candidates = meetingCandidateDates(language);

  if (!apiKey) {
    return NextResponse.json(normalizePayload(fallbackPayload(prompt, "missing-api-key", language), prompt, "missing-api-key", language));
  }

  try {
    const client = new OpenAI({ apiKey });
    const systemPrompt =
      language === "en"
        ? "You are an engine that creates the actual application screen as fresh HTML/CSS for the user's request. The Codex side returns a short natural reply and a single-file HTML string in appHtml that can be rendered directly in an iframe. appHtml must be the requested app's UI itself, not a project-status screen, task tracker, owner list, recent activity feed, generic dashboard, default tabs, or boilerplate frame. The JTC side should parody English-speaking enterprise procurement/vendor-estimate culture: alignment calls, discovery, scope boundaries, exclusions, assumptions, SOW language, and slow approval chains. Keep it witty rather than hostile. Return JSON only."
        : "あなたはユーザーの依頼内容に合わせて、アプリの画面そのものをHTML/CSSとして一から作成するエンジンです。Codex側は短い回答と、iframeにそのまま表示する1ファイルHTMLをappHtmlとして返します。appHtmlは依頼されたアプリそのもののUIであり、進捗管理、作業状況、担当者一覧、直近の動き、確認中タスク、汎用ダッシュボード、既定タブ、既定文言を混ぜないでください。JTC側は日本企業/SIer風の認識合わせ、社内稟議、責任分界点、別途協議、概算見積もり文化を皮肉っぽく、ただし悪意よりユーモア優先で生成します。返答は必ずJSONだけにしてください。";
    const userPrompt =
      language === "en"
        ? `User request: ${prompt}\n\n` +
          `Today's date in Asia/Tokyo is ${todayLabel}. For jtcFinalLine, use these three estimate-review meeting options, all after today, in this exact order: "${candidates.join(", ")}". Do not include a year in the visible meeting options.\n` +
          "codexLine must be a natural Codex-style response in English, never using the phrase \"Thinking result\". Example: \"I built the UI mock for the timer app. The main controls and state are visible in one screen. What should we adjust next?\" Keep it under 140 characters when possible.\n" +
          "appHtml must be a complete HTML string that creates the requested app screen from scratch. Put all CSS inside <style>. Do not use JavaScript, external CSS, external fonts, external images, iframe, object, embed, or link tags. Do not include Markdown fences or explanations; return HTML starting with <!doctype html>. It will be rendered inside a chat iframe, so html/body must use margin:0; width:100%; height:100%; overflow:hidden; and the main container must use width:100%; height:100vh; max-height:520px; box-sizing:border-box; overflow:hidden;. The whole UI must fit the frame without scrolling or overlap. Keep copy concise. Build only the natural UI for the requested app. Do not include generic admin tabs such as Overview/List/Create/Settings, project-status screens, recent activity, task owners, or placeholder people names.\n" +
          "jtcFinalLine must be a traditional, slow English-speaking enterprise/vendor response. Include internal review, preliminary cost, timeline, a request to discuss the estimate using the provided three meeting options, and many caveats: discovery, design, integrations, operations, and final feasibility are subject to the next meeting. Never use \"Thinking result\". Keep it under 380 characters when possible.\n" +
          "jtcLines should be short speech-bubble lines for a top-down then bottom-up approval chain. estimate must be an English business estimate/proposal: title, timeline, cost range, total in USD, line items, and assumptions/exclusions adapted to the request. It should estimate discovery and implementation support, not actual delivery of production software."
        : `依頼プロンプト: ${prompt}\n\n` +
          `今日の日付（Asia/Tokyo）は${todayLabel}です。jtcFinalLineのお見積り説明候補日は、今日の翌日以降として、必ず「${candidates.join("、")}」の3候補をこの順番で使ってください。年は書かず、月日・曜日・時刻だけを書いてください。\n` +
          "codexLineは「Thinkingの結果」を絶対に使わず、Codexが即対応したような自然な日本語回答にしてください。例:「◯◯アプリのUIモックを作成しました。画面の雰囲気と必要な要素を確認できます。次は何を調整しましょう？」。120字以内。説明臭い長い補足は避けてください。\n" +
          "appHtmlには、依頼されたアプリの画面そのものを一から作る完全なHTML文字列を返してください。CSSは<style>内にすべて書き、JavaScript、外部CSS、外部フォント、外部画像、iframe、object、embed、linkタグは使わないでください。Markdownの```や説明文は入れず、<!doctype html>から始まるHTMLだけにしてください。表示先はチャット欄内のiframeです。html/bodyは margin:0; width:100%; height:100%; overflow:hidden; にし、主要コンテナは width:100%; height:100vh; max-height:520px; box-sizing:border-box; overflow:hidden; にしてください。UI全体が横幅いっぱい、縦は表示枠内に収まり、スクロールしなくても一目で見えるようにしてください。文字は短く、ボタンやカードや入力欄が重ならないようにしてください。依頼内容に自然なUIだけを作り、管理用のメタ画面、概要/一覧/作成/設定のような汎用タブ、進行中/直近の動き/内容を確認中/佐藤/鈴木/田中のような作業管理サンプル文言や人名を入れないでください。\n" +
          "jtcFinalLineは日本企業/SIer風の伝統的で少し遅い回答にしてください。社内検討の結果、概算金額、構築期間、お見積り説明の打ち合わせ候補日3つ、要件定義・デザイン・連携・運用などは別途協議、全て対応可能かは次回打ち合わせ次第、というエクスキューズを含めてください。「Thinkingの結果」は絶対に使わないでください。220字以内。\n" +
          "jtcLinesは上から下へ指示し、最後は下から上へ承認が戻る稟議吹き出しとして使える短文を14個程度ください。estimateは日本企業っぽい御見積書として、件名・概算期間・概算費用・税込合計・明細・前提条件を依頼内容に合わせてください。実装そのものではなく、影響調査および実装支援の見積もりにしてください。";
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_output_tokens: 5200,
      text: {
        format: {
          type: "json_schema",
          name: "ai_vs_jtc_duel",
          strict: true,
          schema: schema(),
        },
      },
    });

    const raw = response.output_text || "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json(normalizePayload(parsed, prompt, "openai", language));
  } catch (error) {
    const payload = normalizePayload(fallbackPayload(prompt, "api-error", language), prompt, "api-error", language);
    const message = error instanceof Error ? error.message : "Unknown API error";
    payload.error = message;
    payload.errorNote = friendlyApiErrorMessage(message, language);
    payload.appHtml = createStatusHtml(language === "en" ? "Could not generate the UI" : "APIでUIを生成できませんでした", payload.errorNote, language);
    payload.todoHtml = payload.appHtml;
    return NextResponse.json(payload, { status: 200 });
  }
}
