"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ATLAS_COLUMNS = 8;
const ATLAS_ROWS = 9;
const DEFAULT_PROMPTS = {
  ja: "簡単なTODOアプリを作成してください。",
  en: "Build a simple TODO app.",
};
const DEFAULT_LANGUAGE = "en";
const DEFAULT_PROMPT = DEFAULT_PROMPTS[DEFAULT_LANGUAGE];
const TOKYO_TIME_ZONE = "Asia/Tokyo";
const WEEKDAYS = {
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MEETING_TIMES = ["10:00", "15:00", "11:00"];
const MODEL_OPTIONS = [
  { value: "gpt-5.4-mini", label: "GPT-5.4 mini", note: { ja: "標準", en: "Standard" }, price: { ja: "入力 $0.75 / 出力 $4.50", en: "Input $0.75 / Output $4.50" } },
  { value: "gpt-5.5", label: "GPT-5.5", note: { ja: "高精度", en: "Higher quality" }, price: { ja: "入力 $5.00 / 出力 $30.00", en: "Input $5.00 / Output $30.00" } },
];

const COPY = {
  ja: {
    languageLegend: "表示言語",
    apiTitle: "APIキーを入力してください",
    demoNote: "未入力でもデモは試せます。",
    modelLegend: "使用モデル",
    keyPlaceholder: "OpenAI APIキーを入力",
    submitKey: "APIキーで続ける",
    keyHeading: "OpenAI APIキーを入力",
    keyBody: "キーは保存しません。このアプリのAPI Route経由でOpenAIに送信されます。",
    priceHeading: "料金目安",
    priceBody: "標準料金・1M tokensあたり。実際の料金は入力/出力の長さで変わります。",
    skip: "スキップして初期デモを見る",
    promptHeading: "何に取り組みますか？",
    promptPlaceholder: "Codex に何でも聞いてください。",
    promptExamplesLabel: "例",
    promptExamples: ["シンプルなタイマーアプリを作成してください", "シンプルな電卓アプリを作成してください"],
    search: "検索",
    sidebarAria: "会話サイドバー",
    sidebarToggle: "サイドバー",
    openSidebar: "サイドバーを開く",
    closeSidebar: "サイドバーを閉じる",
    newChat: "新規チャット",
    historyAria: "会話履歴",
    history: ["TODOアプリ作成"],
    accountName: "Ship vs. Quote",
    accountDemo: "Demo mode",
    accountApi: "API connected",
    choiceTitle: "どちらの対応がより好みですか？",
    choiceBody: "片方は作り、片方は見積もります。",
    add: "追加",
    send: "送信",
    codexAria: "AI / Codexくん",
    jtcAria: "JTC見積もり軍団",
    generatedTitle: "生成されたUIモック",
    generatingApp: "UIモック作成中...",
    pdfAria: "概算見積書PDFをプレビュー",
    pdfFile: "概算見積書.pdf",
    estimateStatus: "概算見積書.pdf 作成中...",
    keyRequired: "デフォルトのTODOアプリ以外はAPIキーを入力してください。",
    freePromptKeyRequired: "プロンプトを自由にいれて試すにはAPIキーを入力してください",
    apiFallback: "APIでUIを生成できていません。APIキーまたはモデル設定を確認してください。",
    routeError: "API Routeに接続できなかったため、右側の演出のみ表示中",
    initialAck: "承知しました。社内確認します。",
    initialHeader: "承知しました。社内確認いたします。",
    estimatePreviewAria: "PDFプレビュー",
    estimatePreviewTitle: "概算見積書.pdf",
    onePage: "1ページ",
    closePreview: "PDFプレビューを閉じる",
    estimatePageAria: "御見積書プレビュー",
    estimateNumber: "見積番号",
    issuedOn: "発行日",
    estimateTitle: "御見積書",
    clientName: "貴社 御中",
    estimateIntro: "下記の通り、概算にて御見積申し上げます。",
    vendorName: "株式会社JTCシステムソリューションズ",
    vendorDept: "営業本部 第三見積推進部",
    vendorAddress: "東京都千代田区丸の内1-1-1",
    stamp: "社印",
    subject: "件名",
    totalLabel: "御見積金額",
    taxLabel: "税込",
    item: "項目",
    quantity: "数量",
    amount: "金額",
    periodLabel: "概算期間",
    paymentLabel: "支払条件",
    paymentValue: "月末締め翌月末払い",
    validUntilLabel: "有効期限",
    validUntilValue: "発行日より14日間",
    assumptionsLabel: "前提条件・除外範囲",
    estimateFooter: "本見積は現時点で開示された情報に基づく概算であり、詳細要件確定後に再見積となる場合があります。",
  },
  en: {
    languageLegend: "Language",
    apiTitle: "Enter your API key",
    demoNote: "You can try the demo without a key.",
    modelLegend: "Model",
    keyPlaceholder: "Enter OpenAI API key",
    submitKey: "Continue with API key",
    keyHeading: "Enter OpenAI API key",
    keyBody: "The key is not saved. It is sent to OpenAI through this app's API Route.",
    priceHeading: "Pricing Guide",
    priceBody: "Standard price per 1M tokens. Actual cost depends on input and output length.",
    skip: "Skip and view demo",
    promptHeading: "What should we work\u00a0on?",
    promptPlaceholder: "Ask Codex anything.",
    promptExamplesLabel: "Examples",
    promptExamples: ["Build a simple timer app", "Build a simple calculator app"],
    search: "Search",
    sidebarAria: "Conversation sidebar",
    sidebarToggle: "Sidebar",
    openSidebar: "Open sidebar",
    closeSidebar: "Close sidebar",
    newChat: "New chat",
    historyAria: "Conversation history",
    history: ["Build TODO App"],
    accountName: "Ship vs. Quote",
    accountDemo: "Demo mode",
    accountApi: "API connected",
    choiceTitle: "Which response do you prefer?",
    choiceBody: "One ships. One estimates.",
    add: "Add",
    send: "Send",
    codexAria: "AI / Codex",
    jtcAria: "Corporate estimate team",
    generatedTitle: "Generated UI mock",
    generatingApp: "Creating UI mock...",
    pdfAria: "Preview estimate PDF",
    pdfFile: "Preliminary_Estimate.pdf",
    estimateStatus: "Preliminary_Estimate.pdf generating...",
    keyRequired: "Please enter an API key for anything other than the default TODO demo.",
    freePromptKeyRequired: "Enter an API key to try your own prompts.",
    apiFallback: "The UI could not be generated with the API. Check the API key or model settings.",
    routeError: "Could not reach the API Route, so only the right-side animation is shown.",
    initialAck: "Understood. We'll review internally.",
    initialHeader: "Understood. We'll check internally.",
    estimatePreviewAria: "PDF preview",
    estimatePreviewTitle: "Preliminary_Estimate.pdf",
    onePage: "1 page",
    closePreview: "Close PDF preview",
    estimatePageAria: "Estimate preview",
    estimateNumber: "Estimate No.",
    issuedOn: "Issue Date",
    estimateTitle: "Estimate",
    clientName: "Client",
    estimateIntro: "We are pleased to provide the following preliminary estimate.",
    vendorName: "JTC Systems Solutions, Inc.",
    vendorDept: "Enterprise Sales, Estimate Desk",
    vendorAddress: "1-1-1 Marunouchi, Chiyoda-ku, Tokyo",
    stamp: "Seal",
    subject: "Subject",
    totalLabel: "Estimated Total",
    taxLabel: "Excl. tax",
    item: "Item",
    quantity: "Qty",
    amount: "Amount",
    periodLabel: "Timeline",
    paymentLabel: "Payment Terms",
    paymentValue: "Net 30",
    validUntilLabel: "Valid Until",
    validUntilValue: "14 days from issue date",
    assumptionsLabel: "Assumptions / Exclusions",
    estimateFooter: "This estimate is directional and based on currently available information. Final pricing may change after detailed discovery.",
  },
};

const STATE_FRAMES = {
  idle: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
  ],
  run: [
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 5],
    [1, 6],
    [1, 7],
  ],
  jump: [
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
  wait: [
    [6, 0],
    [6, 1],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 5],
  ],
  review: [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
  ],
};

const characters = [
  "prime_boss",
  "primary_manager_a",
  "primary_manager_b",
  "secondary_lead_a",
  "secondary_lead_b",
  "secondary_lead_c",
  "secondary_lead_d",
  "programmer_api",
  "programmer_frontend",
  "programmer_css",
  "programmer_qa",
  "programmer_logs",
  "programmer_excel",
  "programmer_night",
  "programmer_waiting",
];

const tierRows = [
  { label: "元請", nodes: [0] },
  { label: "1次請け", nodes: [1, 2] },
  { label: "2次請け", nodes: [3, 4, 5, 6] },
  { label: "3次請け", nodes: [7, 8, 9, 10, 11, 12, 13, 14] },
];

const JTC_RALLY_STEP_MS = 1600;

const defaultLines = [
  "まずは認識合わせをお願いします。",
  "影響範囲を確認します。",
  "一度持ち帰ります。",
  "責任分界点を整理します。",
  "前提条件を洗い出します。",
  "関係各所に確認します。",
  "実装可否より先に見積もり粒度です。",
  "要件定義は別途の想定です。",
  "非機能要件が未確認です。",
  "デザイン支給前提でよろしいでしょうか。",
  "検証環境の扱いを確認します。",
  "本番運用は含まない前提です。",
  "念のため再見積もり条件を入れます。",
  "参考値として提示します。",
  "見積書を提出します。",
];

const jtcRingiSteps = [
  { node: 0, direction: "down", text: "承知しました。一旦こちらで受けます。", header: "承知しました。社内確認いたします。", fixedText: true },
  { node: 0, direction: "down", text: "情報システム部に依頼しよう。", revealTo: 3, header: "まず、社内の情報システム部に確認します。", fixedText: true },
  { node: 1, direction: "down", text: "まず社内要件を確認します。", fixedText: true },
  { node: 1, direction: "down", text: "システム案件なら、いつもの一次請けに声をかけます。", revealTo: 7, fixedText: true },
  { node: 3, direction: "down", text: "体制確認のうえ、持ち帰ります。", fixedText: true },
  { node: 4, direction: "down", text: "業務委託のプログラマ会社に確認します。", revealTo: 15, fixedText: true },
  { node: 7, direction: "down", text: "仕様が見えないので確認事項ください。", fixedText: true },
  { node: 8, direction: "down", text: "画面、権限、データ連携の前提が必要です。", fixedText: true },
  { node: 9, direction: "down", text: "工数は幅を持たせます。", fixedText: true },
  { node: 3, direction: "up", text: "プログラマ会社から確認事項が出ています。", fixedText: true },
  { node: 1, direction: "up", text: "情シス側で回答できる範囲を確認します。", fixedText: true },
  { node: 0, direction: "up", text: "メンバーアサインが完了しました。次に影響範囲を確認します。", header: "メンバーアサインが完了したので、次に影響範囲を確認します。", fixedText: true },
  { node: 0, direction: "down", text: "情報システム部、影響範囲を洗ってください。", fixedText: true },
  { node: 2, direction: "down", text: "現行運用と関係部署を確認します。", fixedText: true },
  { node: 5, direction: "down", text: "一次請け側で責任分界点を整理します。", fixedText: true },
  { node: 10, direction: "down", text: "実装範囲と別途範囲を分けます。", fixedText: true },
  { node: 11, direction: "up", text: "下請け概算を出します。", fixedText: true },
  { node: 12, direction: "up", text: "データ連携は別途条件で見ています。", fixedText: true },
  { node: 13, direction: "up", text: "検証と運用は含めない前提です。", fixedText: true },
  { node: 6, direction: "up", text: "下請け見積が揃いました。", fixedText: true },
  { node: 4, direction: "up", text: "PJ管理費と調整費を上乗せします。", fixedText: true },
  { node: 2, direction: "up", text: "情シスで見積書にまとめます。", header: "下請け見積が揃ったので、社内システム部署で見積書を作成します。", fixedText: true, startsEstimate: true },
  { node: 1, direction: "up", text: "概算、期間、別途条件を整理しました。", fixedText: true },
  { node: 0, direction: "down", text: "高く見えないよう説明を厚めに。", header: "営業部長と承認前の壁打ちをしています。", fixedText: true },
  { node: 2, direction: "up", text: "要件定義、デザイン、連携は別途協議にします。", fixedText: true },
  { node: 0, direction: "down", text: "打ち合わせ候補日も3つ入れてください。", fixedText: true },
  { node: 1, direction: "up", text: "候補日3つと前提条件を追記しました。", fixedText: true },
  { node: 0, direction: "down", text: "稟議に回します。押印前に最終確認を。", fixedText: true },
  { node: 2, direction: "up", text: "体裁と金額、別途条件を確認済みです。", fixedText: true },
  { node: 0, direction: "down", text: "ではハンコを押します。", fixedText: true },
  { node: 1, direction: "up", text: "押印済みです。PDF化します。", fixedText: true },
  { node: 0, direction: "up", text: "承認・押印が完了しました。提出してください。", header: "営業部長承認と押印が完了しました。概算見積を提示します。", fixedText: true },
];

const jtcRingiStepsEn = [
  { node: 0, direction: "down", text: "Understood. We'll take this internally.", header: "Understood. We'll review internally.", fixedText: true },
  { node: 0, direction: "down", text: "Let's route this to internal IT first.", revealTo: 3, header: "First, we'll check with internal IT.", fixedText: true },
  { node: 1, direction: "down", text: "We'll clarify the internal ask first.", fixedText: true },
  { node: 1, direction: "down", text: "For systems work, let's ask our usual integrator.", revealTo: 7, fixedText: true },
  { node: 3, direction: "down", text: "We'll confirm staffing and revert.", fixedText: true },
  { node: 4, direction: "down", text: "We'll ask the contract dev shop for a rough cut.", revealTo: 15, fixedText: true },
  { node: 7, direction: "down", text: "We need assumptions before scope.", fixedText: true },
  { node: 8, direction: "down", text: "Screens, roles, and data flows need clarification.", fixedText: true },
  { node: 9, direction: "down", text: "We'll keep the effort range intentionally wide.", fixedText: true },
  { node: 3, direction: "up", text: "The dev shop has sent clarification items.", fixedText: true },
  { node: 1, direction: "up", text: "Internal IT will answer what we can.", fixedText: true },
  { node: 0, direction: "up", text: "Team assignment is complete. Next, assess impact.", header: "Team assignment is complete. Next, we'll assess the impact area.", fixedText: true },
  { node: 0, direction: "down", text: "IT, please map the impact area.", fixedText: true },
  { node: 2, direction: "down", text: "We'll check current operations and stakeholders.", fixedText: true },
  { node: 5, direction: "down", text: "The integrator will define ownership boundaries.", fixedText: true },
  { node: 10, direction: "down", text: "We'll split included and excluded work.", fixedText: true },
  { node: 11, direction: "up", text: "Initial vendor estimate is ready.", fixedText: true },
  { node: 12, direction: "up", text: "Integrations are treated as separate scope.", fixedText: true },
  { node: 13, direction: "up", text: "QA and operations are excluded for now.", fixedText: true },
  { node: 6, direction: "up", text: "Subcontractor estimates are in.", fixedText: true },
  { node: 4, direction: "up", text: "We'll add PM and coordination overhead.", fixedText: true },
  { node: 2, direction: "up", text: "Internal IT will compile the estimate.", header: "Subcontractor estimates are in, so internal IT is drafting the estimate.", fixedText: true, startsEstimate: true },
  { node: 1, direction: "up", text: "Cost range, timeline, and exclusions are drafted.", fixedText: true },
  { node: 0, direction: "down", text: "Make the caveats very clear.", header: "The account director is reviewing the estimate before approval.", fixedText: true },
  { node: 2, direction: "up", text: "Discovery, design, and integrations are separate.", fixedText: true },
  { node: 0, direction: "down", text: "Add three review-call options as well.", fixedText: true },
  { node: 1, direction: "up", text: "Meeting options and assumptions have been added.", fixedText: true },
  { node: 0, direction: "down", text: "Send it through approval before release.", fixedText: true },
  { node: 2, direction: "up", text: "Format, pricing, and exclusions are checked.", fixedText: true },
  { node: 0, direction: "down", text: "Approved. Apply the virtual stamp.", fixedText: true },
  { node: 1, direction: "up", text: "Approved and packaged as a PDF.", fixedText: true },
  { node: 0, direction: "up", text: "Approval complete. Please submit the estimate.", header: "Approval is complete. Presenting the preliminary estimate.", fixedText: true },
];

const defaultEstimate = {
  title: "TODOアプリ新規作成に関する影響調査および実装支援",
  period: "3〜5週間",
  cost: "1,200,000円〜3,600,000円",
  total: "2,640,000円",
  lineItems: [
    { name: "影響範囲調査", quantity: "1式", amount: "320,000円" },
    { name: "要件整理支援", quantity: "1式", amount: "480,000円" },
    { name: "UIモック作成支援", quantity: "1式", amount: "960,000円" },
    { name: "会議体運営・議事録作成", quantity: "1式", amount: "420,000円" },
    { name: "プロジェクト管理費", quantity: "1式", amount: "220,000円" },
    { name: "諸経費", quantity: "1式", amount: "240,000円" },
  ],
  assumptions: [
    "※ 要件定義は別途",
    "※ デザイン制作は別途",
    "※ データ永続化は別途協議",
    "※ 本番運用は含みません",
    "※ 仕様変更時は再見積もり",
    "※ 本見積もりは現時点の情報に基づく参考値です",
    "※ ブラウザ差異調査は別途",
    "※ 関係各所レビュー期間は含みません",
  ],
};

const defaultEstimateEn = {
  title: "Discovery and implementation support for a new TODO app",
  period: "3-5 weeks",
  cost: "USD $12,000-$36,000",
  total: "USD $24,000",
  lineItems: [
    { name: "Impact assessment", quantity: "Fixed fee", amount: "USD $3,000" },
    { name: "Requirements discovery support", quantity: "Fixed fee", amount: "USD $4,500" },
    { name: "UI mock support", quantity: "Fixed fee", amount: "USD $8,500" },
    { name: "Meeting facilitation and notes", quantity: "Fixed fee", amount: "USD $3,500" },
    { name: "Project management fee", quantity: "Fixed fee", amount: "USD $2,000" },
    { name: "Administrative overhead", quantity: "Fixed fee", amount: "USD $2,500" },
  ],
  assumptions: [
    "* Discovery and requirements definition are excluded.",
    "* Product design and brand assets are excluded.",
    "* Data persistence and integrations require separate scoping.",
    "* Production operations are not included.",
    "* Scope changes require a revised estimate.",
    "* This estimate is directional and based on currently available information.",
    "* Cross-browser QA is excluded unless separately contracted.",
    "* Stakeholder review time is not included.",
  ],
};

const initialHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fff}</style></head><body></body></html>`;

function normalizePromptKey(prompt) {
  return String(prompt || "")
    .replace(/\s+/g, "")
    .replace(/[。.!！]+$/g, "");
}

function isDefaultTodoPrompt(prompt, language = "ja") {
  return normalizePromptKey(prompt) === normalizePromptKey(DEFAULT_PROMPTS[language] || DEFAULT_PROMPT);
}

function titleCaseAppName(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function truncateTitle(text, maxLength = 42) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function answerTitleFromPrompt(prompt, language, fallbackTitle) {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    return fallbackTitle;
  }
  if (isDefaultTodoPrompt(cleanPrompt, language)) {
    return fallbackTitle;
  }

  if (language === "en") {
    let title = cleanPrompt
      .replace(/[.!?]+$/g, "")
      .replace(/\bplease\b/gi, "")
      .replace(/\bfor me\b/gi, "")
      .replace(/^(build|create|make|design|generate)\s+/i, "")
      .replace(/^(a|an|the)\s+/i, "")
      .replace(/\bsimple\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    title = titleCaseAppName(title || cleanPrompt);
    return truncateTitle(title.startsWith("Build ") ? title : `Build ${title}`);
  }

  let title = cleanPrompt
    .replace(/[。.!?！？]+$/g, "")
    .replace(/^(簡単な|シンプルな|かんたんな)/, "")
    .replace(/(を)?(作成|制作|生成|実装|作って|つくって|作る|つくる)(ください|してください|お願いします)?$/g, "")
    .replace(/(ください|してください|お願いします)$/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!title) {
    title = cleanPrompt.replace(/[。.!?！？]+$/g, "");
  }
  return truncateTitle(title.endsWith("作成") ? title : `${title}作成`, 28);
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

function issueDateLabel(language = "ja", now = new Date()) {
  return `${formatMeetingDate(tokyoDateForOffset(0, now), { language, withYear: true })}`;
}

function spritePosition(row, column) {
  return `${(column / (ATLAS_COLUMNS - 1)) * 100}% ${(row / (ATLAS_ROWS - 1)) * 100}%`;
}

function useFrame(state) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    const interval = window.setInterval(() => {
      setIndex((value) => (value + 1) % STATE_FRAMES[state].length);
    }, state === "jump" ? 150 : 125);
    return () => window.clearInterval(interval);
  }, [state]);
  return STATE_FRAMES[state][index];
}

function TypewriterText({ text, muted }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
      }
    }, text.length > 22 ? 24 : 34);
    return () => window.clearInterval(interval);
  }, [text]);

  return (
    <span className={`typewriter-text ${muted ? "is-muted" : ""}`} aria-live="polite">
      {visibleText}
      {visibleText.length < text.length ? <span className="type-caret" /> : null}
    </span>
  );
}

function formatJtcFinalText(text, language = "ja") {
  if (language === "en") {
    let formatted = String(text || "").replace(/\s+/g, " ").trim();
    formatted = formatted
      .replace(/(3-5 weeks\.)\s*/i, "$1\n")
      .replace(/(separate scoping\.)\s*/i, "$1\n")
      .replace(/(subject to the next meeting\.)\s*/i, "$1");
    formatted = formatted.replace(/would\s+(.+?)\s+work for a review call\?/i, (_, datesText) => {
      const dates = datesText
        .replace(/\s*,\s*(?=[A-Z][a-z]{2}\s+\d{1,2})/g, "|")
        .split("|")
        .map((date) => date.trim())
        .filter(Boolean);
      return `would\n${dates.map((date) => `• ${date}`).join("\n")}\nwork for a review call?`;
    });
    return formatted;
  }
  let formatted = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(となりました。)\s*/g, "$1\n")
    .replace(/(前提です。)\s*/g, "$1\n")
    .replace(/(いかがでしょうか。)\s*/g, "$1\n")
    .replace(/(次回打ち合わせ[^。]*。)\s*/g, "$1");
  formatted = formatted.replace(/候補日は([^。]+?)(?:です。|でいかがでしょうか。)/, (_, datesText) => {
    const dates = datesText
      .replace(/\d{4}年/g, "")
      .split("、")
      .map((date) => date.trim())
      .filter(Boolean);
    return `候補日は\n${dates.map((date) => `・${date}`).join("\n")}\nでいかがでしょうか。`;
  });
  return formatted;
}

function codexNarration(running, stepIndex, codexLine, language = "ja") {
  if (!running) {
    return codexLine || (language === "en" ? "I created the UI mock. You can review the layout and key elements now. What should we adjust next?" : "UIモックを作成しました。画面の雰囲気と必要な要素を確認できます。次は何を調整しましょう？");
  }
  if (stepIndex === 0) {
    return language === "en" ? "First, I'll compose a UI mock that matches the request." : "まず、依頼内容に合わせてUIモックを組み立てます。";
  }
  if (stepIndex === 1) {
    return "Thinking...";
  }
  return language === "en" ? "The visual direction is set. Creating the UI mock now." : "見た目の方針がまとまりました。UIモック作成中です。";
}

function jtcNarration(codexRunning, stepIndex, jtcRingiIndex, showEstimate, estimate, jtcFinalLine, language = "ja") {
  if (showEstimate) {
    const candidates = meetingCandidateDates(language);
    return formatJtcFinalText(
      jtcFinalLine ||
        (language === "en"
          ? `Following internal review, the preliminary estimate is ${estimate.total || "USD $24,000"}, with an expected timeline of ${estimate.period || "3-5 weeks"}. Discovery, design, integrations, and operations are subject to separate scoping. To walk through the estimate, would ${candidates.join(", ")} work for a review call? Final feasibility depends on the next requirements meeting.`
          : `社内検討の結果、概算見積は税込${estimate.total || "2,640,000円"}、構築期間は${estimate.period || "3〜5週間"}程度となりました。要件定義・デザイン・連携・運用範囲は別途協議前提です。お見積り説明の候補日は${candidates.join("、")}です。全て対応可能かは次回打ち合わせ次第となります。`),
      language
    );
  }
  if (!codexRunning && jtcRingiIndex >= 0) {
    return language === "en" ? "Internal review is in progress. Please hold." : "社内検討中のため、少々お待ちください。";
  }
  if (stepIndex === 0) {
    return language === "en" ? "First, we'll assign the team needed to prepare an estimate." : "まず、見積もり体制を組むために、メンバーをアサインします。";
  }
  if (stepIndex === 1) {
    return "Thinking...";
  }
  return language === "en" ? "Checking the impact area and ownership boundaries." : "影響範囲と責任分界点を確認中です。";
}

function SalarymanPet({ slug, visible, tierIndex, bubbleText, bubbleDirection, bubblePlacement }) {
  const state = visible ? (tierIndex === 3 ? "review" : tierIndex === 0 ? "jump" : "wait") : "idle";
  const [row, column] = useFrame(state);
  const bubbleClassName = ["ringi-bubble", `is-${bubbleDirection}`, bubblePlacement ? `is-${bubblePlacement}` : ""].filter(Boolean).join(" ");

  return (
    <div className={`salaryman-pet tier-${tierIndex} ${visible ? "is-visible" : ""}`}>
      {bubbleText ? <div className={bubbleClassName}>{bubbleText}</div> : null}
      <div
        className="salaryman-sprite"
        style={{
          backgroundImage: `url(/characters/${slug}.webp)`,
          backgroundPosition: spritePosition(row, column),
        }}
      />
    </div>
  );
}

function CodexPet({ busy, done, label = "Codexくん" }) {
  const [row, column] = useFrame(busy ? "jump" : done ? "review" : "idle");

  return (
    <div className={`codex-pet ${busy ? "is-busy" : ""} ${done ? "is-done" : ""}`} aria-label={label}>
      <div
        className="codex-sprite"
        style={{
          backgroundImage: "url(/codex-spritesheet.webp)",
          backgroundPosition: spritePosition(row, column),
        }}
      />
    </div>
  );
}

function SidebarToggleIcon({ sidebarOpen }) {
  return <span className={`sidebar-toggle-glyph ${sidebarOpen ? "is-open" : "is-closed"}`} aria-hidden="true" />;
}

function Sidebar({ copy, apiConfigured, onToggle, sidebarOpen, historyItems }) {
  return (
    <aside className="chat-sidebar" aria-label={copy.sidebarAria}>
      <div className="sidebar-top">
        <button
          className="sidebar-icon-button"
          type="button"
          aria-label={sidebarOpen ? copy.closeSidebar : copy.openSidebar}
          aria-pressed={sidebarOpen}
          onClick={onToggle}
        >
          <SidebarToggleIcon sidebarOpen={sidebarOpen} />
        </button>
        <button className="sidebar-icon-button" type="button" aria-label={copy.newChat}>
          +
        </button>
      </div>
      <label className="sidebar-search">
        <span>⌕</span>
        <input placeholder={copy.search} />
      </label>
      <nav className="sidebar-history" aria-label={copy.historyAria}>
        {historyItems.map((item, index) => (
          <button type="button" className={index === 0 ? "is-active" : ""} key={item}>
            {item}
          </button>
        ))}
      </nav>
      <div className="sidebar-account">
        <span>SQ</span>
        <div>
          <b>{copy.accountName}</b>
          <em>{apiConfigured ? copy.accountApi : copy.accountDemo}</em>
        </div>
      </div>
    </aside>
  );
}

function PdfChip({ onOpen, copy }) {
  return (
    <button className="pdf-chip is-standalone" type="button" onClick={onOpen} aria-label={copy.pdfAria}>
      <span>PDF</span>
      <b>{copy.pdfFile}</b>
    </button>
  );
}

function EstimatePreview({ estimate, onClose, language, copy }) {
  const fallbackEstimate = language === "en" ? defaultEstimateEn : defaultEstimate;
  const lineItems = Array.isArray(estimate.lineItems) && estimate.lineItems.length ? estimate.lineItems : fallbackEstimate.lineItems;
  const today = tokyoDateForOffset(0);
  const estimateNumber = `JTC-${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, "0")}${String(today.getUTCDate()).padStart(2, "0")}-001`;

  return (
    <aside className="pdf-preview-panel" aria-label={copy.estimatePreviewAria}>
      <header className="pdf-preview-header">
        <div>
          <b>{copy.estimatePreviewTitle}</b>
          <span>{copy.onePage}</span>
        </div>
        <button type="button" onClick={onClose} aria-label={copy.closePreview}>
          ×
        </button>
      </header>
      <div className="pdf-preview-body">
        <section className="estimate-page" aria-label={copy.estimatePageAria}>
          <div className="estimate-page-topline">
            <span>{copy.estimateNumber} {estimateNumber}</span>
            <span>{copy.issuedOn} {issueDateLabel(language)}</span>
          </div>
          <h2>{copy.estimateTitle}</h2>
          <div className="estimate-page-head">
            <div>
              <p className="client-name">{copy.clientName}</p>
              <p>{copy.estimateIntro}</p>
            </div>
            <div className="vendor-box">
              <b>{copy.vendorName}</b>
              <span>{copy.vendorDept}</span>
              <span>{copy.vendorAddress}</span>
              <span>TEL 03-0000-0000</span>
              <i>{copy.stamp}</i>
            </div>
          </div>
          <div className="estimate-subject">
            <span>{copy.subject}</span>
            <b>{estimate.title}</b>
          </div>
          <div className="estimate-total">
            <span>{copy.totalLabel}</span>
            <strong>{estimate.total || fallbackEstimate.total}</strong>
            <em>{copy.taxLabel}</em>
          </div>
          <table className="estimate-table">
            <thead>
              <tr>
                <th>{copy.item}</th>
                <th>{copy.quantity}</th>
                <th>{copy.amount}</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map(({ name, quantity, amount }) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{quantity}</td>
                  <td>{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="estimate-meta-grid">
            <span>{copy.periodLabel}</span>
            <b>{estimate.period}</b>
            <span>{copy.paymentLabel}</span>
            <b>{copy.paymentValue}</b>
            <span>{copy.validUntilLabel}</span>
            <b>{copy.validUntilValue}</b>
          </div>
          <div className="estimate-notes">
            <b>{copy.assumptionsLabel}</b>
            {estimate.assumptions.slice(0, 8).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <p className="estimate-footer">{copy.estimateFooter}</p>
        </section>
      </div>
    </aside>
  );
}

function EstimateCard({ estimate, copy }) {
  return (
    <section className="estimate-card is-generating" aria-label={copy.estimatePreviewTitle}>
      <div className="estimate-status">{copy.estimateStatus}</div>
      <div className="paper-mark" />
      <div className="paper-line line-wide" />
      <div className="paper-line line-mid" />
      <div className="paper-grid">
        <span />
        <span />
      </div>
      <div className="paper-list">
        {estimate.assumptions.slice(0, 8).map((item) => (
          <span key={item} />
        ))}
      </div>
    </section>
  );
}

export default function Page() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [codexRunning, setCodexRunning] = useState(false);
  const [jtcRunning, setJtcRunning] = useState(false);
  const [revealed, setRevealed] = useState(1);
  const [showEstimate, setShowEstimate] = useState(false);
  const [showEstimateDraft, setShowEstimateDraft] = useState(false);
  const [todoHtml, setTodoHtml] = useState(initialHtml);
  const [result, setResult] = useState(null);
  const [codexStepIndex, setCodexStepIndex] = useState(0);
  const [jtcRingiIndex, setJtcRingiIndex] = useState(-1);
  const [errorNote, setErrorNote] = useState("");
  const [showKeyGate, setShowKeyGate] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [sessionApiKey, setSessionApiKey] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value);
  const [sessionModel, setSessionModel] = useState(MODEL_OPTIONS[0].value);
  const [composerModelMenuOpen, setComposerModelMenuOpen] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [showAnswerColumns, setShowAnswerColumns] = useState(false);
  const [showCodexPreview, setShowCodexPreview] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const timersRef = useRef([]);
  const runIdRef = useRef(0);

  const copy = COPY[language];
  const fallbackEstimate = language === "en" ? defaultEstimateEn : defaultEstimate;
  const estimate = result?.estimate || fallbackEstimate;
  const selectedModelOption = MODEL_OPTIONS.find((option) => option.value === selectedModel) || MODEL_OPTIONS[0];
  const busy = codexRunning || jtcRunning;
  const demoPromptLocked = !showKeyGate && !submittedPrompt && !sessionApiKey.trim();
  const answerTitle = answerTitleFromPrompt(submittedPrompt, language, copy.history[0]);
  const sidebarHistoryItems = submittedPrompt ? [answerTitle] : copy.history;
  const currentRingiSteps = language === "en" ? jtcRingiStepsEn : jtcRingiSteps;
  const ringiSteps = useMemo(
    () =>
      currentRingiSteps.map((step, index) => ({
        ...step,
        text: step.fixedText ? step.text : result?.jtcLines?.[index] || step.text,
      })),
    [currentRingiSteps, result?.jtcLines]
  );
  const activeRingiStep = jtcRingiIndex >= 0 ? ringiSteps[jtcRingiIndex] : null;
  const initialJtcAcknowledgement = codexRunning && revealed === 1 && jtcRingiIndex < 0;
  const codexHeaderText = codexNarration(codexRunning, codexStepIndex, result?.codexLine, language);
  const jtcHeaderText = initialJtcAcknowledgement
    ? copy.initialHeader
    : activeRingiStep?.header || jtcNarration(codexRunning, codexStepIndex, jtcRingiIndex, showEstimate, estimate, result?.jtcFinalLine, language);
  const visibleRows = useMemo(
    () =>
      tierRows.map((tier) => ({
        ...tier,
        visibleCount: tier.nodes.filter((node) => node < revealed).length,
      })),
    [revealed]
  );

  useEffect(() => {
    return () => timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1120px)");
    const syncSidebar = () => setSidebarOpen(!mediaQuery.matches);

    syncSidebar();
    mediaQuery.addEventListener("change", syncSidebar);
    return () => mediaQuery.removeEventListener("change", syncSidebar);
  }, []);

  function addTimer(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function startJtcRingi(runId) {
    currentRingiSteps.forEach((step, index) => {
      const delay = index * JTC_RALLY_STEP_MS;
      addTimer(() => {
        if (runIdRef.current !== runId) {
          return;
        }
        setJtcRingiIndex(index);
        if (step.revealTo) {
          setRevealed(step.revealTo);
        }
      }, delay);
      if (step.startsEstimate) {
        addTimer(() => runIdRef.current === runId && setShowEstimateDraft(true), delay + 980);
      }
    });
    addTimer(() => {
      if (runIdRef.current !== runId) {
        return;
      }
      setJtcRingiIndex(-1);
      setShowEstimateDraft(false);
      setShowEstimate(true);
      setJtcRunning(false);
    }, currentRingiSteps.length * JTC_RALLY_STEP_MS + 720);
  }

  function changeLanguage(nextLanguage) {
    if (busy || submittedPrompt) {
      setLanguage(nextLanguage);
      return;
    }
    const currentDefault = DEFAULT_PROMPTS[language];
    const nextDefault = DEFAULT_PROMPTS[nextLanguage];
    setLanguage(nextLanguage);
    if (!prompt.trim() || normalizePromptKey(prompt) === normalizePromptKey(currentDefault)) {
      setPrompt(nextDefault);
    }
  }

  function chooseModel(nextModel) {
    setSelectedModel(nextModel);
    setSessionModel(nextModel);
    setComposerModelMenuOpen(false);
  }

  function returnToKeyGate(message) {
    runIdRef.current += 1;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setCodexRunning(false);
    setJtcRunning(false);
    setSubmittedPrompt("");
    setShowAnswerColumns(false);
    setShowCodexPreview(false);
    setPrompt(DEFAULT_PROMPTS[language]);
    setRevealed(1);
    setShowEstimate(false);
    setShowEstimateDraft(false);
    setResult(null);
    setTodoHtml(initialHtml);
    setCodexStepIndex(0);
    setJtcRingiIndex(-1);
    setShowPdfPreview(false);
    setComposerModelMenuOpen(false);
    setErrorNote(message);
    setShowKeyGate(true);
  }

  async function runComparison(event) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      return;
    }
    if (busy) {
      return;
    }
    if (!sessionApiKey.trim() && submittedPrompt) {
      returnToKeyGate(copy.freePromptKeyRequired);
      return;
    }
    if (!sessionApiKey.trim() && !isDefaultTodoPrompt(cleanPrompt, language)) {
      returnToKeyGate(copy.keyRequired);
      return;
    }
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const startedAt = Date.now();
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];

    setSubmittedPrompt(cleanPrompt);
    setShowAnswerColumns(false);
    setShowCodexPreview(false);
    setPrompt("");
    setCodexRunning(true);
    setJtcRunning(true);
    setRevealed(1);
    setShowEstimate(false);
    setShowEstimateDraft(false);
    setResult(null);
    setErrorNote("");
    setTodoHtml(initialHtml);
    setCodexStepIndex(0);
    setJtcRingiIndex(-1);
    setShowPdfPreview(false);

    addTimer(() => runIdRef.current === runId && setShowAnswerColumns(true), 1000);
    addTimer(() => runIdRef.current === runId && setCodexStepIndex(1), 1900);
    addTimer(() => runIdRef.current === runId && setCodexStepIndex(2), 3400);
    addTimer(() => runIdRef.current === runId && setShowCodexPreview(true), 4200);

    try {
      const response = await fetch("/api/duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt, apiKey: sessionApiKey || undefined, model: sessionModel, language }),
      });
      const data = await response.json();
      if (runIdRef.current !== runId) {
        return;
      }
      setResult(data);
      setTodoHtml(data.todoHtml || initialHtml);
      if (data.source && data.source !== "openai") {
        setErrorNote(
          data.source === "missing-api-key" && isDefaultTodoPrompt(cleanPrompt, language)
            ? ""
            : data.errorNote || copy.apiFallback
        );
      }
    } catch {
      if (runIdRef.current === runId) {
        setErrorNote(copy.routeError);
      }
    } finally {
      const remainingMs = Math.max(0, 6900 - (Date.now() - startedAt));
      if (remainingMs) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
      }
      if (runIdRef.current !== runId) {
        return;
      }
      setCodexStepIndex(3);
      setCodexRunning(false);
      startJtcRingi(runId);
    }
  }

  function useApiKey(event) {
    event.preventDefault();
    setSessionApiKey(apiKeyInput.trim());
    setSessionModel(selectedModel);
    setComposerModelMenuOpen(false);
    setErrorNote("");
    setShowKeyGate(false);
  }

  return (
    <div className={`app-frame ${sidebarOpen ? "" : "is-sidebar-closed"}`}>
      <Sidebar
        apiConfigured={Boolean(sessionApiKey.trim())}
        copy={copy}
        historyItems={sidebarHistoryItems}
        onToggle={() => setSidebarOpen((value) => !value)}
        sidebarOpen={sidebarOpen}
      />
      <main className={`app-shell ${submittedPrompt ? "has-answers" : "is-start"}`}>
        {showKeyGate ? (
          <div className="key-gate" role="dialog" aria-modal="true" aria-label={copy.apiTitle}>
            <form className="key-card" onSubmit={useApiKey}>
              <div className="key-copy brand-lockup">
                <div className="brand-mark" aria-hidden="true">
                  <span>S</span>
                  <i />
                  <span>Q</span>
                </div>
                <h1 className="brand-wordmark">Ship vs. Quote</h1>
              </div>
              <fieldset className="language-picker" aria-label={copy.languageLegend}>
                <div>
                  <button className={language === "en" ? "is-selected" : ""} type="button" onClick={() => changeLanguage("en")}>
                    English
                  </button>
                  <button className={language === "ja" ? "is-selected" : ""} type="button" onClick={() => changeLanguage("ja")}>
                    日本語
                  </button>
                </div>
              </fieldset>
              <div className="key-actions">
                <button
                  className="key-skip"
                  type="button"
                  onClick={() => {
                    setShowKeyGate(false);
                    setErrorNote("");
                  }}
                >
                  {copy.skip}
                </button>
              </div>
              {errorNote ? <p className="key-note">{errorNote}</p> : null}
              <div className="key-input-shell">
                <input
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder={copy.keyPlaceholder}
                  type="password"
                  autoFocus
                />
                <div className="key-input-actions">
                  <button className="key-submit" type="submit" disabled={!apiKeyInput.trim()} aria-label={copy.submitKey}>
                    ↑
                  </button>
                </div>
              </div>
              <section className="key-disclaimer" aria-label={`${copy.keyHeading} / ${copy.priceHeading}`}>
                <div>
                  <b>{copy.keyHeading}</b>
                  <p>{copy.keyBody}</p>
                </div>
                <div>
                  <b>{copy.priceHeading}</b>
                  <p>{copy.priceBody}</p>
                  <ul>
                    {MODEL_OPTIONS.map((option) => (
                      <li key={option.value}>
                        <span>{option.label}</span>
                        <em>{option.price[language]}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </form>
          </div>
        ) : null}

        {submittedPrompt ? (
          <header className="answer-topbar">
            {!sidebarOpen ? (
              <button
                className="answer-sidebar-toggle"
                type="button"
                aria-label={copy.openSidebar}
                aria-pressed={sidebarOpen}
                onClick={() => setSidebarOpen(true)}
              >
                <SidebarToggleIcon sidebarOpen={sidebarOpen} />
              </button>
            ) : null}
            <h1>{answerTitle}</h1>
          </header>
        ) : null}

        {!submittedPrompt && !showKeyGate && !sidebarOpen ? (
          <button
            className="start-sidebar-toggle"
            type="button"
            aria-label={copy.openSidebar}
            aria-pressed={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <SidebarToggleIcon sidebarOpen={sidebarOpen} />
          </button>
        ) : null}

        <div className="prompt-area">
          {!submittedPrompt && !showKeyGate ? <h2 className="prompt-heading">{copy.promptHeading}</h2> : null}
          <form className={`request-bar ${demoPromptLocked ? "is-demo-locked" : ""}`} onSubmit={runComparison}>
            <textarea
              aria-readonly={demoPromptLocked}
              readOnly={demoPromptLocked}
              value={prompt}
              onChange={(event) => {
                if (!demoPromptLocked) {
                  setPrompt(event.target.value);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={copy.promptPlaceholder}
              rows={1}
            />
            <div className="composer-actions">
              <div className="key-model-select composer-model-select">
                <button
                  aria-expanded={composerModelMenuOpen}
                  aria-disabled={demoPromptLocked || busy}
                  className="key-model-button composer-model-button"
                  disabled={busy}
                  onClick={() => {
                    if (demoPromptLocked) {
                      return;
                    }
                    setComposerModelMenuOpen((value) => !value);
                  }}
                  type="button"
                >
                  <span>{selectedModelOption.label}</span>
                  <em>{selectedModelOption.note[language]}</em>
                  <i>⌄</i>
                </button>
                {composerModelMenuOpen ? (
                  <div className="key-model-popover composer-model-popover" role="listbox" aria-label={copy.modelLegend}>
                    {MODEL_OPTIONS.map((option) => (
                      <button
                        aria-selected={selectedModel === option.value}
                        className={selectedModel === option.value ? "is-selected" : ""}
                        key={option.value}
                        onClick={() => chooseModel(option.value)}
                        role="option"
                        type="button"
                      >
                        <span>{option.label}</span>
                        <em>{option.note[language]}</em>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button className="send-button" type="submit" disabled={busy} aria-label={copy.send}>
                ↑
              </button>
            </div>
          </form>
          {!submittedPrompt && !showKeyGate && sessionApiKey.trim() ? (
            <div className="prompt-examples" aria-label={copy.promptExamplesLabel}>
              <span>{copy.promptExamplesLabel}</span>
              {copy.promptExamples.map((example) => (
                <button key={example} type="button" onClick={() => setPrompt(example)}>
                  {example}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!submittedPrompt ? (
          <div className="start-characters" aria-hidden="true">
            <CodexPet busy={false} done={false} label={language === "en" ? "Codex" : "Codexくん"} />
            <SalarymanPet slug={characters[0]} visible tierIndex={0} />
          </div>
        ) : (
          <section className="answer-area">
            <div className="user-prompt">
              <p>{submittedPrompt}</p>
            </div>

            <div className="choice-copy">
              <h1>{copy.choiceTitle}</h1>
              <p>{copy.choiceBody}</p>
            </div>

            {showAnswerColumns ? (
              <div className="duel-grid">
                <section className="lane ai-lane" aria-label={copy.codexAria}>
                  <header className="lane-header">
                    <CodexPet busy={codexRunning} done={!codexRunning && todoHtml !== initialHtml} label={language === "en" ? "Codex" : "Codexくん"} />
                    <div className={`lane-status ${codexRunning && codexStepIndex === 1 ? "is-thinking" : ""}`}>
                      <TypewriterText text={codexHeaderText} muted={codexRunning && codexStepIndex === 1} />
                    </div>
                  </header>

                  {showCodexPreview ? (
                    <div className={`preview-frame ${codexRunning ? "is-generating" : ""}`}>
                      <div className="preview-toolbar">
                        <span />
                        <span />
                        <span />
                      </div>
                      {codexRunning ? (
                        <div className="app-generating" aria-live="polite">
                          <div className="app-generating-label">{copy.generatingApp}</div>
                          <div className="mock-app-line wide" />
                          <div className="mock-app-input" />
                          <div className="mock-app-items">
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      ) : null}
                      <iframe title={copy.generatedTitle} sandbox="allow-scripts" scrolling="yes" srcDoc={todoHtml} />
                    </div>
                  ) : null}
                </section>

                <section className="lane jtc-lane" aria-label={copy.jtcAria}>
                  <header className="lane-header">
                    <SalarymanPet slug={characters[0]} visible tierIndex={0} />
                    <div className={`lane-status ${codexRunning && codexStepIndex === 1 ? "is-thinking" : ""}`}>
                      <TypewriterText text={jtcHeaderText} muted={(codexRunning && codexStepIndex === 1) || jtcRingiIndex >= 0} />
                    </div>
                  </header>

                  <div className="jtc-board">
                    <div className="pyramid">
                      {visibleRows.map((tier, tierIndex) => (
                        <div className="pyramid-row" key={tier.label} data-tier={tierIndex}>
                          <div className="pet-line">
                            {tier.nodes.map((node) => (
                              <SalarymanPet
                                key={characters[node]}
                                slug={characters[node]}
                                visible={node < revealed}
                                tierIndex={tierIndex}
                                bubbleText={initialJtcAcknowledgement && node === 0 ? copy.initialAck : activeRingiStep?.node === node ? activeRingiStep.text : ""}
                                bubbleDirection={initialJtcAcknowledgement && node === 0 ? "down" : activeRingiStep?.node === node ? activeRingiStep.direction : "down"}
                                bubblePlacement={tierIndex === 3 && node === tier.nodes[0] ? "edge-left" : ""}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`estimate-slot ${showEstimateDraft || showEstimate ? "is-visible" : ""}`}>
                    {showEstimate ? <PdfChip copy={copy} onOpen={() => setShowPdfPreview(true)} /> : showEstimateDraft ? <EstimateCard copy={copy} estimate={estimate} /> : null}
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        )}
      </main>
      {showPdfPreview ? <EstimatePreview copy={copy} estimate={estimate} language={language} onClose={() => setShowPdfPreview(false)} /> : null}
    </div>
  );
}
