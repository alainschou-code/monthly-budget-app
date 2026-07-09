import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Plus, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Home, PieChart as PieIcon, List, Wallet, Sparkles, Send, Settings } from "lucide-react";

/* ---------------------------------------------------------
   Apple 官網風格色板
   背景 #FBFBFD／卡片 #FFFFFF／主文字 #1D1D1F／次文字 #6E6E73
   邊框 #E5E5E7／強調藍 #0071E3／收入綠 #34C759／股息藍 #32ADE6／支出紅 #FF3B30
   響應式：<900px 手機版（底部導覽＋單欄）／≥900px 桌面版（側邊導覽＋雙欄）
   資料儲存：瀏覽器 localStorage（獨立版，離開此瀏覽器/清除資料會遺失，請自行備份）
--------------------------------------------------------- */

const STORAGE_KEYS = {
  template: "abm_template",
  assets: "abm_assets",
  monthsData: "abm_monthsData",
  anthropicKey: "abm_anthropic_key",
  geminiKey: "abm_gemini_key",
  aiProvider: "abm_ai_provider",
};

const RESPONSIVE_CSS = `
.abm-shell { max-width: 480px; margin: 0 auto; padding-bottom: 96px; box-sizing: border-box; }
.abm-sidenav { display: none; }
.abm-bottomnav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-top: 1px solid #E5E5E7; display: flex; justify-content: space-around; padding: 10px 0 16px; z-index: 20; }
.abm-home-grid { display: block; }
.abm-home-col-right { margin-top: 28px; }
.abm-stats-grid { display: block; }

@media (min-width: 900px) {
  .abm-shell { max-width: 760px; margin: 0 auto 0 240px; padding-bottom: 48px; }
  .abm-sidenav { display: flex; }
  .abm-bottomnav { display: none; }
  .abm-home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .abm-home-col-right { margin-top: 0; }
  .abm-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
}

@media (min-width: 1180px) {
  .abm-shell { max-width: 920px; }
}
`;

const GROUP_COLORS = {
  transfer: "#0071E3",
  card: "#FF9F0A",
  insurance: "#5E5CE6",
  living: "#FF375F",
};
const DIVIDEND_COLOR = "#32ADE6";
const DIVIDEND_STOCK_OPTIONS = ["", "00830", "0050", "0056", "00919", "00878"];

const DEFAULT_TEMPLATE = {
  income: [{ id: "salary", label: "薪資" }],
  expenseGroups: [
    {
      id: "transfer",
      label: "存款轉帳",
      color: GROUP_COLORS.transfer,
      items: [
        { id: "pocket", label: "合庫轉大戶領零用" },
        { id: "mortgage", label: "新光台新(股票帳戶) 轉第一銀房貸" },
        { id: "yfTax", label: "合庫轉 永豐大戶存+稅務" },
        { id: "esunSave", label: "合庫轉 玉山數位銀行存款" },
        { id: "futureSave", label: "合庫轉 將來數位銀行存款" },
      ],
    },
    {
      id: "card",
      label: "信用卡",
      color: GROUP_COLORS.card,
      items: [
        { id: "ctbc", label: "中信銀扣 中信全部 D121351417" },
        { id: "esunHanshen", label: "玉山銀扣 星宇漢神銀行信用卡" },
      ],
    },
    {
      id: "insurance",
      label: "保險投資",
      color: GROUP_COLORS.insurance,
      items: [
        { id: "sanshangSave", label: "三商人壽儲蓄險" },
        { id: "sanshangMed", label: "三商人壽醫療意外" },
        { id: "smallLotStock", label: "新光台新小資零股" },
      ],
    },
    {
      id: "living",
      label: "生活稅務",
      color: GROUP_COLORS.living,
      items: [
        { id: "chtMobile", label: "中華電信行動電話" },
        { id: "chtBroadband", label: "中華電信寬頻" },
        { id: "power", label: "台電電費" },
        { id: "incomeTax", label: "綜合所得稅" },
      ],
    },
  ],
};

const DEFAULT_ASSETS = [{ id: "property1", label: "小陶砌", value: 13500000 }];

const DEFAULT_DIVIDEND_ITEMS = [
  { id: "div1", code: "00830", amount: 35718 },
  { id: "div2", code: "0050", amount: 0 },
  { id: "div3", code: "0056", amount: 0 },
  { id: "div4", code: "00919", amount: 0 },
];

const SEED_MONTH_KEY = "2026-07";
const SEED_MONTH_DATA = {
  income: { salary: 73597 },
  dividendItems: DEFAULT_DIVIDEND_ITEMS,
  expense: {
    pocket: 0,
    mortgage: 35718,
    yfTax: 0,
    esunSave: 0,
    futureSave: 0,
    ctbc: 3195,
    esunHanshen: 53187,
    sanshangSave: 0,
    sanshangMed: 0,
    smallLotStock: 0,
    chtMobile: 1300,
    chtBroadband: 1518,
    power: 3000,
    incomeTax: 0,
  },
};

function formatMoney(n) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(n || 0);
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${y} 年 ${parseInt(m, 10)} 月`;
}

function shiftMonthKey(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function findPreviousData(monthsData, monthKey) {
  const keys = Object.keys(monthsData).filter((k) => k < monthKey).sort();
  if (keys.length === 0) return null;
  return monthsData[keys[keys.length - 1]];
}

function moveArrayItem(arr, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function buildAIPrompt(question, contextSummary) {
  return `你是使用者的個人理財小幫手，請用繁體中文簡潔回答（大約 3-6 句話）。\n\n以下是使用者本月的財務摘要，回答理財或計算相關問題時請直接根據這份摘要：\n${contextSummary}\n\n如果問題需要查詢即時資訊（例如股價、匯率、新聞），可以搜尋網路；否則不要搜尋。\n\n使用者的問題：${question}`;
}

// 直接從瀏覽器呼叫 Anthropic API。
// 注意：anthropic-dangerous-direct-browser-access 是 Anthropic 官方提供給「直接從瀏覽器呼叫」情境使用的標頭，
// 官方文件也提醒這種用法會讓金鑰暴露給任何打開瀏覽器開發工具的人，不建議用在會公開分享的正式產品上。
async function askClaude(question, apiKey, contextSummary) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: buildAIPrompt(question, contextSummary) }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Claude API 回應錯誤（${response.status}）。請確認金鑰是否正確。${errText ? " " + errText.slice(0, 200) : ""}`);
  }
  const data = await response.json();
  const text = (data.content || [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  return text.trim() || "（沒有取得回應，請再試一次）";
}

// 直接從瀏覽器呼叫 Google Gemini API（Generative Language API）。
// 若使用的模型版本已變更，可自行調整下面網址中的模型名稱。
async function askGemini(question, apiKey, contextSummary) {
  const model = "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildAIPrompt(question, contextSummary) }] }],
        tools: [{ google_search: {} }],
      }),
    }
  );
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Gemini API 回應錯誤（${response.status}）。請確認金鑰是否正確。${errText ? " " + errText.slice(0, 200) : ""}`);
  }
  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n");
  return text.trim() || "（沒有取得回應，請再試一次）";
}

// ---- Google Drive 同步 ----
// 使用 drive.file 範圍：這個範圍只能存取「這個 App 自己建立的檔案」，
// 不會讓 App 看到使用者 Drive 裡的其他檔案。
const GOOGLE_CLIENT_ID = "439065297376-ljt9eueqqijqphmo6v15knm10g7d7qkf.apps.googleusercontent.com";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FILE_NAME = "monthly-budget-data.json";

async function driveFetch(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Drive API 錯誤（${res.status}）。${text ? text.slice(0, 200) : ""}`);
  }
  return res;
}

async function findDriveFile(token) {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

async function createDriveFile(token, payload) {
  const metadata = { name: DRIVE_FILE_NAME, mimeType: "application/json" };
  const boundary = "-------monthlybudgetboundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;
  const res = await driveFetch(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const data = await res.json();
  return data.id;
}

async function readDriveFile(token, fileId) {
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function updateDriveFile(token, fileId, payload) {
  await driveFetch(token, `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export default function App() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [assets, setAssets] = useState(DEFAULT_ASSETS);
  const [monthsData, setMonthsData] = useState({ [SEED_MONTH_KEY]: SEED_MONTH_DATA });
  const [currentMonth, setCurrentMonth] = useState(SEED_MONTH_KEY);
  const [view, setView] = useState("home");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("claude");
  const [accessToken, setAccessToken] = useState(null);
  const [driveFileId, setDriveFileId] = useState(null);
  const [driveSyncStatus, setDriveSyncStatus] = useState("idle"); // idle | syncing | synced | error
  const tokenClientRef = useRef(null);
  const driveHasLoadedRef = useRef(false);
  const driveSaveTimerRef = useRef(null);

  // 讀取本機儲存的資料（localStorage，僅存在於這個瀏覽器）
  useEffect(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEYS.template);
      if (t) setTemplate(JSON.parse(t));
    } catch (e) {}
    try {
      const a = localStorage.getItem(STORAGE_KEYS.assets);
      if (a) setAssets(JSON.parse(a));
    } catch (e) {}
    try {
      const m = localStorage.getItem(STORAGE_KEYS.monthsData);
      if (m) setMonthsData(JSON.parse(m));
    } catch (e) {}
    try {
      const ak = localStorage.getItem(STORAGE_KEYS.anthropicKey);
      if (ak) setAnthropicKey(ak);
    } catch (e) {}
    try {
      const gk = localStorage.getItem(STORAGE_KEYS.geminiKey);
      if (gk) setGeminiKey(gk);
    } catch (e) {}
    try {
      const p = localStorage.getItem(STORAGE_KEYS.aiProvider);
      if (p) setAiProvider(p);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.template, JSON.stringify(template));
    } catch (e) {}
  }, [template]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(assets));
    } catch (e) {}
  }, [assets]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.monthsData, JSON.stringify(monthsData));
    } catch (e) {}
  }, [monthsData]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.anthropicKey, anthropicKey);
    } catch (e) {}
  }, [anthropicKey]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.geminiKey, geminiKey);
    } catch (e) {}
  }, [geminiKey]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.aiProvider, aiProvider);
    } catch (e) {}
  }, [aiProvider]);

  const previousData = findPreviousData(monthsData, currentMonth);
  const seedForCurrent = monthsData[currentMonth] || previousData || { income: {}, dividendItems: DEFAULT_DIVIDEND_ITEMS, expense: {} };

  const displayIncome = useMemo(() => {
    const base = {};
    template.income.forEach((item) => (base[item.id] = seedForCurrent.income?.[item.id] ?? 0));
    return base;
  }, [template, seedForCurrent]);

  const displayExpense = useMemo(() => {
    const base = {};
    template.expenseGroups.forEach((g) => g.items.forEach((item) => (base[item.id] = seedForCurrent.expense?.[item.id] ?? 0)));
    return base;
  }, [template, seedForCurrent]);

  const displayDividendItems = seedForCurrent.dividendItems || DEFAULT_DIVIDEND_ITEMS;
  const displayDividend = useMemo(() => displayDividendItems.reduce((s, it) => s + (it.amount || 0), 0), [displayDividendItems]);

  const EXCLUDED_EXPENSE_IDS = ["esunSave"];

  const incomeTotal = useMemo(
    () => Object.values(displayIncome).reduce((s, v) => s + (v || 0), 0) + displayDividend,
    [displayIncome, displayDividend]
  );
  const expenseTotal = useMemo(
    () => Object.entries(displayExpense).reduce((s, [id, v]) => (EXCLUDED_EXPENSE_IDS.includes(id) ? s : s + (v || 0)), 0),
    [displayExpense]
  );

  const groupTotals = useMemo(
    () =>
      template.expenseGroups.map((g) => ({
        id: g.id,
        label: g.label,
        color: g.color,
        value: g.items.reduce((s, item) => (EXCLUDED_EXPENSE_IDS.includes(item.id) ? s : s + (displayExpense[item.id] || 0)), 0),
      })),
    [template, displayExpense]
  );

  const mortgageCoverage = useMemo(() => {
    const mortgage = displayExpense.mortgage || 0;
    if (mortgage === 0) return null;
    return { mortgage, dividend: displayDividend, covered: displayDividend >= mortgage, gap: mortgage - displayDividend };
  }, [displayExpense, displayDividend]);

  const assetsTotal = useMemo(() => assets.reduce((s, a) => s + (a.value || 0), 0), [assets]);

  const trend = useMemo(() => {
    const keys = Object.keys(monthsData).sort().slice(-6);
    return keys.map((k) => {
      const d = monthsData[k];
      const income = Object.values(d.income || {}).reduce((s, v) => s + (v || 0), 0);
      const expense = Object.entries(d.expense || {}).reduce((s, [id, v]) => (EXCLUDED_EXPENSE_IDS.includes(id) ? s : s + (v || 0)), 0);
      return { label: monthLabel(k).replace(/^\d+ 年 /, ""), 收入: income, 支出: expense };
    });
  }, [monthsData]);

  function ensureMonthAndUpdate(monthKey, mutateFn) {
    setMonthsData((prev) => {
      const base = prev[monthKey] || findPreviousData(prev, monthKey) || { income: {}, dividendItems: DEFAULT_DIVIDEND_ITEMS, expense: {} };
      const next = {
        income: { ...base.income },
        dividendItems: (base.dividendItems || DEFAULT_DIVIDEND_ITEMS).map((it) => ({ ...it })),
        expense: { ...base.expense },
      };
      mutateFn(next);
      return { ...prev, [monthKey]: next };
    });
  }

  function updateIncomeField(itemId, value) {
    ensureMonthAndUpdate(currentMonth, (d) => {
      d.income[itemId] = parseFloat(value) || 0;
    });
  }

  function updateExpenseField(itemId, value) {
    ensureMonthAndUpdate(currentMonth, (d) => {
      d.expense[itemId] = parseFloat(value) || 0;
    });
  }

  function updateDividendItem(index, field, value) {
    ensureMonthAndUpdate(currentMonth, (d) => {
      d.dividendItems[index] = { ...d.dividendItems[index], [field]: field === "amount" ? parseFloat(value) || 0 : value };
    });
  }

  function addIncomeItem(label, initialAmount) {
    const newId = `income_custom_${Date.now()}`;
    setTemplate((prev) => ({ ...prev, income: [...prev.income, { id: newId, label }] }));
    if (initialAmount) {
      ensureMonthAndUpdate(currentMonth, (d) => {
        d.income[newId] = initialAmount;
      });
    }
  }

  function removeIncomeItem(itemId) {
    setTemplate((prev) => ({ ...prev, income: prev.income.filter((it) => it.id !== itemId) }));
  }

  function addExpenseItem(groupId, label, initialAmount) {
    const newId = `custom_${Date.now()}`;
    setTemplate((prev) => ({
      ...prev,
      expenseGroups: prev.expenseGroups.map((g) => (g.id === groupId ? { ...g, items: [...g.items, { id: newId, label }] } : g)),
    }));
    if (initialAmount) {
      ensureMonthAndUpdate(currentMonth, (d) => {
        d.expense[newId] = initialAmount;
      });
    }
  }

  function removeExpenseItem(groupId, itemId) {
    setTemplate((prev) => ({
      ...prev,
      expenseGroups: prev.expenseGroups.map((g) => (g.id === groupId ? { ...g, items: g.items.filter((it) => it.id !== itemId) } : g)),
    }));
  }

  const EXPENSE_GROUP_PALETTE = ["#0071E3", "#FF9F0A", "#5E5CE6", "#FF375F", "#34C759", "#8E8E93", "#00C7BE", "#AF52DE"];

  function addExpenseGroup(label, initialAmount) {
    const groupId = `group_custom_${Date.now()}`;
    const itemId = `custom_${Date.now()}`;
    const color = EXPENSE_GROUP_PALETTE[template.expenseGroups.length % EXPENSE_GROUP_PALETTE.length];
    setTemplate((prev) => ({
      ...prev,
      expenseGroups: [...prev.expenseGroups, { id: groupId, label, color, items: [{ id: itemId, label }] }],
    }));
    if (initialAmount) {
      ensureMonthAndUpdate(currentMonth, (d) => {
        d.expense[itemId] = initialAmount;
      });
    }
  }

  function removeExpenseGroup(groupId) {
    setTemplate((prev) => ({
      ...prev,
      expenseGroups: prev.expenseGroups.filter((g) => g.id !== groupId),
    }));
  }

  function renameIncomeItem(itemId, newLabel) {
    setTemplate((prev) => ({
      ...prev,
      income: prev.income.map((it) => (it.id === itemId ? { ...it, label: newLabel } : it)),
    }));
  }

  function renameExpenseItem(groupId, itemId, newLabel) {
    setTemplate((prev) => ({
      ...prev,
      expenseGroups: prev.expenseGroups.map((g) =>
        g.id === groupId ? { ...g, items: g.items.map((it) => (it.id === itemId ? { ...it, label: newLabel } : it)) } : g
      ),
    }));
  }

  function renameExpenseGroup(groupId, newLabel) {
    setTemplate((prev) => ({
      ...prev,
      expenseGroups: prev.expenseGroups.map((g) => (g.id === groupId ? { ...g, label: newLabel } : g)),
    }));
  }

  function moveIncomeItem(index, direction) {
    setTemplate((prev) => ({ ...prev, income: moveArrayItem(prev.income, index, direction) }));
  }

  function moveExpenseItem(groupId, index, direction) {
    setTemplate((prev) => ({
      ...prev,
      expenseGroups: prev.expenseGroups.map((g) => (g.id === groupId ? { ...g, items: moveArrayItem(g.items, index, direction) } : g)),
    }));
  }

  function moveExpenseGroup(index, direction) {
    setTemplate((prev) => ({ ...prev, expenseGroups: moveArrayItem(prev.expenseGroups, index, direction) }));
  }

  function deleteMonth(monthKey) {
    setMonthsData((prev) => {
      const next = { ...prev };
      delete next[monthKey];
      return next;
    });
  }

  function updateAssets(next) {
    setAssets(next);
  }

  function ensureTokenClient() {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error("Google 登入元件尚未載入完成，請重新整理頁面後再試一次。");
    }
    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPE,
        callback: (response) => {
          if (response.error) {
            setDriveSyncStatus("error");
            return;
          }
          driveHasLoadedRef.current = false;
          setAccessToken(response.access_token);
        },
      });
    }
    return tokenClientRef.current;
  }

  function signInWithGoogle() {
    try {
      ensureTokenClient().requestAccessToken();
    } catch (e) {
      setDriveSyncStatus("error");
      alert(e.message);
    }
  }

  function signOutGoogle() {
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    setAccessToken(null);
    setDriveFileId(null);
    setDriveSyncStatus("idle");
    driveHasLoadedRef.current = false;
  }

  // 登入後：找到（或建立）Drive 上的資料檔，並讀取最新資料
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      setDriveSyncStatus("syncing");
      try {
        let fileId = await findDriveFile(accessToken);
        if (!fileId) {
          fileId = await createDriveFile(accessToken, { template, assets, monthsData });
        } else {
          const driveData = await readDriveFile(accessToken, fileId);
          if (driveData) {
            if (driveData.template) setTemplate(driveData.template);
            if (driveData.assets) setAssets(driveData.assets);
            if (driveData.monthsData) setMonthsData(driveData.monthsData);
          }
        }
        setDriveFileId(fileId);
        setDriveSyncStatus("synced");
        driveHasLoadedRef.current = true;
      } catch (e) {
        setDriveSyncStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // 資料變動後，若已登入且已完成第一次讀取，自動同步回 Drive（延遲避免頻繁呼叫）
  useEffect(() => {
    if (!accessToken || !driveFileId || !driveHasLoadedRef.current) return;
    if (driveSaveTimerRef.current) clearTimeout(driveSaveTimerRef.current);
    driveSaveTimerRef.current = setTimeout(async () => {
      setDriveSyncStatus("syncing");
      try {
        await updateDriveFile(accessToken, driveFileId, { template, assets, monthsData });
        setDriveSyncStatus("synced");
      } catch (e) {
        setDriveSyncStatus("error");
      }
    }, 1500);
    return () => clearTimeout(driveSaveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, assets, monthsData]);

  const aiContext = useMemo(() => {
    const lines = [
      `月份：${monthLabel(currentMonth)}`,
      `收入：NT$${formatMoney(incomeTotal)}（含股息 NT$${formatMoney(displayDividend)}）`,
      `支出：NT$${formatMoney(expenseTotal)}`,
      mortgageCoverage
        ? `房貸：NT$${formatMoney(mortgageCoverage.mortgage)}，${mortgageCoverage.covered ? "已由股息全額覆蓋" : `還缺 NT$${formatMoney(mortgageCoverage.gap)}`}`
        : "房貸：本月無資料",
      `不動產資產總值：NT$${formatMoney(assetsTotal)}`,
    ];
    return lines.join("\n");
  }, [currentMonth, incomeTotal, displayDividend, expenseTotal, mortgageCoverage, assetsTotal]);

  async function askAI(question, provider) {
    if (provider === "gemini") {
      if (!geminiKey.trim()) {
        throw new Error("尚未設定 Gemini API Key，請點右上角設定貼上你的金鑰。");
      }
      return askGemini(question, geminiKey.trim(), aiContext);
    }
    if (!anthropicKey.trim()) {
      throw new Error("尚未設定 Anthropic API Key，請點右上角設定貼上你的金鑰。");
    }
    return askClaude(question, anthropicKey.trim(), aiContext);
  }

  const navItems = [
    { id: "home", label: "填寫", icon: Home },
    { id: "stats", label: "統計", icon: PieIcon },
    { id: "assets", label: "資產", icon: Wallet },
    { id: "records", label: "紀錄", icon: List },
    { id: "ai", label: "AI問答", icon: Sparkles },
  ];

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
        background: "#FBFBFD",
        minHeight: "100vh",
        color: "#1D1D1F",
        position: "relative",
      }}
    >
      <style>{RESPONSIVE_CSS}</style>

      <div
        className="abm-sidenav"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 220,
          flexDirection: "column",
          padding: "32px 16px",
          borderRight: "1px solid #E5E5E7",
          background: "#FFFFFF",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", padding: "0 8px 20px", borderBottom: "1px solid #F0F0F2", marginBottom: 16 }}>
          每月收支
        </div>
        {navItems.map((n) => (
          <SideNavButton key={n.id} icon={<n.icon size={18} />} label={n.label} active={view === n.id} onClick={() => setView(n.id)} />
        ))}
      </div>

      <div className="abm-shell">
        <header
          style={{
            padding: "28px 24px 16px",
            position: "sticky",
            top: 0,
            background: "rgba(251,251,253,0.86)",
            backdropFilter: "blur(20px)",
            zIndex: 10,
            borderBottom: "1px solid #E5E5E7",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <button onClick={() => setCurrentMonth((k) => shiftMonthKey(k, -1))} aria-label="上一月" style={navBtnStyle}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#8E8E93", letterSpacing: "0.02em", marginBottom: 2 }}>月度總覽</div>
              <h1 style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>{monthLabel(currentMonth)}</h1>
            </div>
            <button onClick={() => setCurrentMonth((k) => shiftMonthKey(k, 1))} aria-label="下一月" style={navBtnStyle}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            {accessToken ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: driveSyncStatus === "error" ? "#FF3B30" : driveSyncStatus === "syncing" ? "#FF9F0A" : "#34C759",
                  }}
                >
                  {driveSyncStatus === "syncing" ? "同步中…" : driveSyncStatus === "error" ? "同步失敗，稍後再試" : "已同步 Google 雲端硬碟"}
                </span>
                <span style={{ color: "#D2D2D7" }}>·</span>
                <button onClick={signOutGoogle} style={{ fontSize: 11, color: "#0071E3", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  登出
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: "#B0B0B5", marginBottom: 4 }}>資料已自動儲存在此瀏覽器</div>
                <button onClick={signInWithGoogle} style={{ fontSize: 11, color: "#0071E3", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  用 Google 帳號登入，跨裝置同步到雲端硬碟
                </button>
              </div>
            )}
          </div>
        </header>

        <main style={{ padding: "24px 20px 0" }}>
          {view === "home" && (
            <HomeView
              incomeTotal={incomeTotal}
              dividendTotal={displayDividend}
              expenseTotal={expenseTotal}
              mortgageCoverage={mortgageCoverage}
              template={template}
              displayIncome={displayIncome}
              displayExpense={displayExpense}
              dividendItems={displayDividendItems}
              groupTotals={groupTotals}
              onIncomeChange={updateIncomeField}
              onExpenseChange={updateExpenseField}
              onDividendItemChange={updateDividendItem}
              onAddIncomeItem={addIncomeItem}
              onRemoveIncomeItem={removeIncomeItem}
              onAddExpenseItem={addExpenseItem}
              onRemoveExpenseItem={removeExpenseItem}
              onAddExpenseGroup={addExpenseGroup}
              onRemoveExpenseGroup={removeExpenseGroup}
              onRenameIncomeItem={renameIncomeItem}
              onRenameExpenseItem={renameExpenseItem}
              onRenameExpenseGroup={renameExpenseGroup}
              onMoveIncomeItem={moveIncomeItem}
              onMoveExpenseItem={moveExpenseItem}
              onMoveExpenseGroup={moveExpenseGroup}
            />
          )}
          {view === "stats" && <StatsView groupTotals={groupTotals} trend={trend} />}
          {view === "assets" && <AssetsView assets={assets} onChange={updateAssets} />}
          {view === "records" && (
            <RecordsView
              monthsData={monthsData}
              onEdit={(k) => {
                setCurrentMonth(k);
                setView("home");
              }}
              onDelete={deleteMonth}
            />
          )}
          {view === "ai" && (
            <AIView
              onAsk={askAI}
              provider={aiProvider}
              onProviderChange={setAiProvider}
              anthropicKey={anthropicKey}
              geminiKey={geminiKey}
              onSaveAnthropicKey={setAnthropicKey}
              onSaveGeminiKey={setGeminiKey}
            />
          )}
        </main>
      </div>

      <nav className="abm-bottomnav">
        {navItems.map((n) => (
          <NavButton key={n.id} icon={<n.icon size={18} />} label={n.label} active={view === n.id} onClick={() => setView(n.id)} />
        ))}
      </nav>
    </div>
  );
}

const navBtnStyle = { background: "none", border: "none", color: "#0071E3", cursor: "pointer", padding: 6, display: "flex" };

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        fontSize: 11.5,
        fontWeight: active ? 600 : 400,
        color: active ? "#0071E3" : "#6E6E73",
        padding: "4px 16px",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SideNavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#EAF2FD" : "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        color: active ? "#0071E3" : "#3A3A3C",
        padding: "10px 12px",
        borderRadius: 10,
        marginBottom: 4,
        width: "100%",
        textAlign: "left",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const PAGE_TITLE_STYLE = { fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", margin: "4px 0 20px" };
const SUBSECTION_TITLE_STYLE = { fontSize: 14, fontWeight: 600, color: "#6E6E73", margin: "0 0 10px" };

const INSIGHT_TONE = {
  success: { bg: "#E9F9EE", border: "#B7E8C8", text: "#1D6B34", dot: "#34C759" },
  danger: { bg: "#FDEEEE", border: "#F5C6C6", text: "#A31A1A", dot: "#FF3B30" },
};

function InsightRow({ tone, text }) {
  const c = INSIGHT_TONE[tone];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "10px 14px" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      <div style={{ fontSize: 12.5, color: c.text, lineHeight: 1.4 }}>{text}</div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: "#FFFFFF", borderRadius: 16, border: "1px solid #E5E5E7", padding: "16px 14px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 500, color, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", letterSpacing: "-0.01em" }}>NT$ {formatMoney(value)}</div>
    </div>
  );
}

function SectionLabel({ label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function ItemGroupCard({ children }) {
  return <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E5E5E7", padding: "6px 14px" }}>{children}</div>;
}

function EditableLabel({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);

  function commit() {
    setEditing(false);
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setText(value);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setText(value);
            setEditing(false);
          }
        }}
        style={{
          fontSize: 13.5,
          color: "#1D1D1F",
          border: "1px solid #0071E3",
          borderRadius: 6,
          padding: "3px 6px",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="點擊編輯名稱"
      style={{
        fontSize: 13.5,
        color: "#1D1D1F",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: "text",
      }}
    >
      {value}
    </div>
  );
}

function ReorderButtons({ onMoveUp, onMoveDown, disableUp, disableDown }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <button
        onClick={onMoveUp}
        disabled={disableUp}
        aria-label="上移"
        style={{ background: "none", border: "none", padding: 0, height: 12, display: "flex", alignItems: "center", cursor: disableUp ? "default" : "pointer", color: disableUp ? "#E5E5E7" : "#8E8E93" }}
      >
        <ChevronUp size={13} />
      </button>
      <button
        onClick={onMoveDown}
        disabled={disableDown}
        aria-label="下移"
        style={{ background: "none", border: "none", padding: 0, height: 12, display: "flex", alignItems: "center", cursor: disableDown ? "default" : "pointer", color: disableDown ? "#E5E5E7" : "#8E8E93" }}
      >
        <ChevronDown size={13} />
      </button>
    </div>
  );
}

function AmountRow({ label, value, onChange, onRemove, note, onLabelChange, onMoveUp, onMoveDown, disableUp, disableDown }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #F0F0F2", gap: 8 }}>
      {onMoveUp && <ReorderButtons onMoveUp={onMoveUp} onMoveDown={onMoveDown} disableUp={disableUp} disableDown={disableDown} />}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {onLabelChange ? (
          <EditableLabel value={label} onChange={onLabelChange} />
        ) : (
          <div style={{ fontSize: 13.5, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        )}
        {note && <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 1 }}>{note}</div>}
      </div>
      <span style={{ fontSize: 12.5, color: "#6E6E73" }}>NT$</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 100, textAlign: "right", border: "1px solid #E5E5E7", borderRadius: 8, padding: "6px 8px", fontSize: 14, fontWeight: 600 }}
      />
      {onRemove && (
        <button onClick={onRemove} aria-label="刪除項目" style={{ background: "none", border: "none", color: "#C7C7CC", cursor: "pointer", display: "flex" }}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function ReadOnlyAmountRow({ label, value, note, onRemove, onLabelChange, onMoveUp, onMoveDown, disableUp, disableDown }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #F0F0F2", gap: 8 }}>
      {onMoveUp && <ReorderButtons onMoveUp={onMoveUp} onMoveDown={onMoveDown} disableUp={disableUp} disableDown={disableDown} />}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {onLabelChange ? (
          <EditableLabel value={label} onChange={onLabelChange} />
        ) : (
          <div style={{ fontSize: 13.5, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        )}
        {note && <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 1 }}>{note}</div>}
      </div>
      <span style={{ fontSize: 12.5, color: "#6E6E73" }}>NT$</span>
      <div
        style={{
          width: 100,
          textAlign: "right",
          border: "1px solid #F0F0F2",
          borderRadius: 8,
          padding: "6px 8px",
          fontSize: 14,
          fontWeight: 600,
          color: "#6E6E73",
          background: "#F5F5F7",
          boxSizing: "border-box",
        }}
      >
        {formatMoney(value)}
      </div>
      {onRemove && (
        <button onClick={onRemove} aria-label="刪除項目" style={{ background: "none", border: "none", color: "#C7C7CC", cursor: "pointer", display: "flex" }}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function DividendRow({ code, amount, options, onCodeChange, onAmountChange, isLast }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: isLast ? "none" : "1px solid #F0F0F2", gap: 8 }}>
      <select
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        style={{ flex: 1, border: "1px solid #E5E5E7", borderRadius: 8, padding: "6px 8px", fontSize: 13.5, color: "#1D1D1F", background: "#FFFFFF" }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span style={{ fontSize: 12.5, color: "#6E6E73" }}>NT$</span>
      <input
        type="number"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        style={{ width: 100, textAlign: "right", border: "1px solid #E5E5E7", borderRadius: 8, padding: "6px 8px", fontSize: 14, fontWeight: 600 }}
      />
    </div>
  );
}

function AddItemRow({ placeholder, onAdd }) {
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  function submit() {
    if (!text.trim()) return;
    onAdd(text.trim(), parseFloat(amount) || 0);
    setText("");
    setAmount("");
  }
  return (
    <div style={{ display: "flex", gap: 8, padding: "10px 4px 4px" }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: "1px solid #E5E5E7", fontSize: 13, boxSizing: "border-box" }}
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="NT$"
        style={{ width: 84, padding: "9px 10px", borderRadius: 10, border: "1px solid #E5E5E7", fontSize: 13, boxSizing: "border-box", textAlign: "right" }}
      />
      <button onClick={submit} style={{ background: "#F5F5F7", border: "none", borderRadius: 10, padding: "0 12px", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <Plus size={16} color="#6E6E73" />
      </button>
    </div>
  );
}

function HomeView({
  incomeTotal,
  dividendTotal,
  expenseTotal,
  mortgageCoverage,
  template,
  displayIncome,
  displayExpense,
  dividendItems,
  groupTotals,
  onIncomeChange,
  onExpenseChange,
  onDividendItemChange,
  onAddIncomeItem,
  onRemoveIncomeItem,
  onAddExpenseItem,
  onRemoveExpenseItem,
  onAddExpenseGroup,
  onRemoveExpenseGroup,
  onRenameIncomeItem,
  onRenameExpenseItem,
  onRenameExpenseGroup,
  onMoveIncomeItem,
  onMoveExpenseItem,
  onMoveExpenseGroup,
}) {
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <SummaryCard label="收入" value={incomeTotal} color="#34C759" />
        <SummaryCard label="股息" value={dividendTotal} color={DIVIDEND_COLOR} />
        <SummaryCard label="支出" value={expenseTotal} color="#FF3B30" />
      </div>

      {mortgageCoverage && (
        <div style={{ marginBottom: 20 }}>
          <InsightRow
            tone={mortgageCoverage.covered ? "success" : "danger"}
            text={
              `房貸 NT$ ${formatMoney(mortgageCoverage.mortgage)}` +
              (mortgageCoverage.covered ? "・已由股息全額覆蓋" : `・還缺 NT$ ${formatMoney(mortgageCoverage.gap)}`)
            }
          />
        </div>
      )}

      <div className="abm-home-grid">
        <div>
          <SectionLabel label="收入" color="#34C759" />
          <ItemGroupCard>
            {template.income.map((item, i) => (
              <AmountRow
                key={item.id}
                label={item.label}
                value={displayIncome[item.id]}
                onChange={(v) => onIncomeChange(item.id, v)}
                onRemove={template.income.length > 1 ? () => onRemoveIncomeItem(item.id) : undefined}
                onLabelChange={(newLabel) => onRenameIncomeItem(item.id, newLabel)}
                onMoveUp={() => onMoveIncomeItem(i, -1)}
                onMoveDown={() => onMoveIncomeItem(i, 1)}
                disableUp={i === 0}
                disableDown={i === template.income.length - 1}
              />
            ))}
            <ReadOnlyAmountRow label="股票配息" value={dividendTotal} note="自動加總下方「股息」卡片" />
            <AddItemRow placeholder="新增收入項目" onAdd={onAddIncomeItem} />
          </ItemGroupCard>

          <div style={{ marginTop: 20 }}>
            <SectionLabel label="股息" color={DIVIDEND_COLOR} />
            <ItemGroupCard>
              {dividendItems.map((item, i) => (
                <DividendRow
                  key={item.id}
                  code={item.code}
                  amount={item.amount}
                  options={DIVIDEND_STOCK_OPTIONS}
                  onCodeChange={(v) => onDividendItemChange(i, "code", v)}
                  onAmountChange={(v) => onDividendItemChange(i, "amount", v)}
                  isLast={i === dividendItems.length - 1}
                />
              ))}
            </ItemGroupCard>
          </div>
        </div>

        <div className="abm-home-col-right">
          <SectionLabel label="支出" color="#FF3B30" />
          <ItemGroupCard>
            {groupTotals.map((g, gi) => (
              <ReadOnlyAmountRow
                key={g.id}
                label={g.label}
                value={g.value}
                onRemove={() => onRemoveExpenseGroup(g.id)}
                onLabelChange={(newLabel) => onRenameExpenseGroup(g.id, newLabel)}
                onMoveUp={() => onMoveExpenseGroup(gi, -1)}
                onMoveDown={() => onMoveExpenseGroup(gi, 1)}
                disableUp={gi === 0}
                disableDown={gi === groupTotals.length - 1}
              />
            ))}
            <div style={{ display: "flex", alignItems: "center", padding: "10px 4px 6px", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#1D1D1F" }}>支出總計</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#FF3B30" }}>NT$ {formatMoney(expenseTotal)}</span>
            </div>
            <AddItemRow placeholder="新增支出類別" onAdd={onAddExpenseGroup} />
          </ItemGroupCard>

          {template.expenseGroups.map((group, gi) => (
            <div key={group.id} style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <SectionLabel label={group.label} color={group.color} />
                <ReorderButtons
                  onMoveUp={() => onMoveExpenseGroup(gi, -1)}
                  onMoveDown={() => onMoveExpenseGroup(gi, 1)}
                  disableUp={gi === 0}
                  disableDown={gi === template.expenseGroups.length - 1}
                />
              </div>
              <ItemGroupCard>
                {group.items.map((item, ii) => (
                  <AmountRow
                    key={item.id}
                    label={item.label}
                    value={displayExpense[item.id]}
                    onChange={(v) => onExpenseChange(item.id, v)}
                    onRemove={() => onRemoveExpenseItem(group.id, item.id)}
                    note={
                      item.id === "mortgage"
                        ? "每月 21 日扣款・由股息全額覆蓋"
                        : item.id === "esunSave"
                        ? "用於處理信用卡費用・不計入實際支出"
                        : undefined
                    }
                    onLabelChange={(newLabel) => onRenameExpenseItem(group.id, item.id, newLabel)}
                    onMoveUp={() => onMoveExpenseItem(group.id, ii, -1)}
                    onMoveDown={() => onMoveExpenseItem(group.id, ii, 1)}
                    disableUp={ii === 0}
                    disableDown={ii === group.items.length - 1}
                  />
                ))}
                <AddItemRow placeholder={`新增${group.label}項目`} onAdd={(label, amount) => onAddExpenseItem(group.id, label, amount)} />
              </ItemGroupCard>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <AddItemRow placeholder="新增卡片（支出類別）" onAdd={onAddExpenseGroup} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsView({ groupTotals, trend }) {
  const total = groupTotals.reduce((s, g) => s + g.value, 0);
  return (
    <div>
      <h2 style={PAGE_TITLE_STYLE}>統計</h2>
      <div className="abm-stats-grid">
        <div>
          <h3 style={SUBSECTION_TITLE_STYLE}>本月支出分佈</h3>
          <div style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #E5E5E7", padding: "24px 20px" }}>
            {total === 0 ? (
              <EmptyState text="本月尚無支出資料" />
            ) : (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={groupTotals} dataKey="value" nameKey="label" innerRadius={58} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                        {groupTotals.map((g) => (
                          <Cell key={g.id} fill={g.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `NT$ ${formatMoney(v)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ marginTop: 8 }}>
                  {groupTotals.map((g) => (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #F0F0F2" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.color, marginRight: 10 }} />
                      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{g.label}</span>
                      <span style={{ fontSize: 13, color: "#6E6E73", marginRight: 10 }}>{total ? Math.round((g.value / total) * 100) : 0}%</span>
                      <span style={{ fontSize: 14.5, fontWeight: 600 }}>NT$ {formatMoney(g.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <h3 style={SUBSECTION_TITLE_STYLE}>近半年趨勢</h3>
          <div style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #E5E5E7", padding: "20px 12px" }}>
            {trend.length === 0 ? (
              <EmptyState text="尚無歷史資料" />
            ) : (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="#F0F0F2" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6E6E73" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#6E6E73" }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip formatter={(v) => `NT$ ${formatMoney(v)}`} />
                      <Line type="monotone" dataKey="收入" stroke="#34C759" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="支出" stroke="#FF3B30" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
                  <Legend color="#34C759" label="收入" />
                  <Legend color="#FF3B30" label="支出" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6E6E73" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      {label}
    </div>
  );
}

function AssetsView({ assets, onChange }) {
  const total = assets.reduce((s, a) => s + (a.value || 0), 0);

  function updateValue(id, value) {
    onChange(assets.map((a) => (a.id === id ? { ...a, value: parseFloat(value) || 0 } : a)));
  }

  function renameItem(id, newLabel) {
    onChange(assets.map((a) => (a.id === id ? { ...a, label: newLabel } : a)));
  }

  function removeItem(id) {
    onChange(assets.filter((a) => a.id !== id));
  }

  function addItem(label, initialValue) {
    onChange([...assets, { id: `asset_${Date.now()}`, label, value: initialValue || 0 }]);
  }

  function moveItem(index, direction) {
    onChange(moveArrayItem(assets, index, direction));
  }

  return (
    <div>
      <h2 style={PAGE_TITLE_STYLE}>不動產</h2>
      <div style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #E5E5E7", overflow: "hidden", marginBottom: 16 }}>
        {assets.map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #F0F0F2", gap: 8 }}>
            <ReorderButtons onMoveUp={() => moveItem(i, -1)} onMoveDown={() => moveItem(i, 1)} disableUp={i === 0} disableDown={i === assets.length - 1} />
            <div style={{ flex: 1, marginRight: 8 }}>
              <EditableLabel value={a.label} onChange={(newLabel) => renameItem(a.id, newLabel)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6E6E73" }}>NT$</span>
              <input
                type="number"
                value={a.value}
                onChange={(e) => updateValue(a.id, e.target.value)}
                style={{ width: 110, textAlign: "right", border: "1px solid #E5E5E7", borderRadius: 8, padding: "6px 8px", fontSize: 14, fontWeight: 600 }}
              />
              <button onClick={() => removeItem(a.id)} aria-label="刪除" style={{ background: "none", border: "none", color: "#C7C7CC", cursor: "pointer", display: "flex" }}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", background: "#F5F5F7" }}>
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>總計</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>NT$ {formatMoney(total)}</span>
        </div>
      </div>
      <div style={{ maxWidth: 420 }}>
        <AddItemRow placeholder="新增資產名稱" onAdd={addItem} />
      </div>
    </div>
  );
}

function RecordsView({ monthsData, onEdit, onDelete }) {
  const keys = Object.keys(monthsData).sort().reverse();
  return (
    <div>
      <h2 style={PAGE_TITLE_STYLE}>歷史紀錄</h2>
      {keys.length === 0 ? (
        <EmptyState text="尚無任何月份紀錄" />
      ) : (
        <div style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #E5E5E7", overflow: "hidden" }}>
          {keys.map((k, i) => {
            const d = monthsData[k];
            const income = Object.values(d.income || {}).reduce((s, v) => s + (v || 0), 0);
            const expense = Object.values(d.expense || {}).reduce((s, v) => s + (v || 0), 0);
            return (
              <RecordRow
                key={k}
                monthKey={k}
                income={income}
                expense={expense}
                balance={income - expense}
                isLast={i === keys.length - 1}
                onEdit={() => onEdit(k)}
                onDelete={() => onDelete(k)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecordRow({ monthKey, income, expense, balance, isLast, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: isLast ? "none" : "1px solid #F0F0F2" }}>
      <div style={{ flex: 1, cursor: "pointer" }} onClick={onEdit}>
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>{monthLabel(monthKey)}</div>
        <div style={{ fontSize: 12.5, color: "#6E6E73" }}>
          收入 NT$ {formatMoney(income)} · 支出 NT$ {formatMoney(expense)}
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: balance >= 0 ? "#1D1D1F" : "#FF3B30", marginRight: 10 }}>NT$ {formatMoney(balance)}</div>
      {confirmDelete ? (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onDelete} style={{ fontSize: 12, background: "#FF3B30", color: "#fff", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
            刪除
          </button>
          <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, background: "#F5F5F7", color: "#1D1D1F", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
            取消
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} aria-label="刪除" style={{ background: "none", border: "none", color: "#C7C7CC", cursor: "pointer", padding: 6, display: "flex" }}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={{ padding: "40px 20px", textAlign: "center", color: "#6E6E73", fontSize: 14 }}>{text}</div>;
}

function AIView({ onAsk, provider, onProviderChange, anthropicKey, geminiKey, onSaveAnthropicKey, onSaveGeminiKey }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [anthropicInput, setAnthropicInput] = useState(anthropicKey);
  const [geminiInput, setGeminiInput] = useState(geminiKey);

  async function handleAsk() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setHistory((prev) => [...prev, { question: q, answer: null }]);
    setLoading(true);
    try {
      const answer = await onAsk(q, provider);
      setHistory((prev) => prev.map((h, i) => (i === prev.length - 1 ? { ...h, answer } : h)));
    } catch (e) {
      const msg = e?.message || "發生錯誤，請再試一次。";
      setHistory((prev) => prev.map((h, i) => (i === prev.length - 1 ? { ...h, answer: msg } : h)));
    } finally {
      setLoading(false);
    }
  }

  function saveSettings() {
    onSaveAnthropicKey(anthropicInput.trim());
    onSaveGeminiKey(geminiInput.trim());
    setShowSettings(false);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ ...PAGE_TITLE_STYLE, margin: "4px 0 0" }}>AI 問答</h2>
        <button
          onClick={() => setShowSettings((v) => !v)}
          aria-label="設定"
          style={{ background: "none", border: "none", color: "#6E6E73", cursor: "pointer", display: "flex", padding: 6 }}
        >
          <Settings size={18} />
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: "#6E6E73", marginBottom: 16 }}>
        可以問理財相關問題（會參考本月數字），或需要查詢即時資訊（例如股價、新聞）時直接問。
      </div>

      {showSettings && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E5E7", borderRadius: 16, padding: "16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>API 金鑰設定</div>
          <div style={{ fontSize: 11.5, color: "#8E8E93", marginBottom: 12, lineHeight: 1.5 }}>
            金鑰只存在這個瀏覽器的 localStorage，不會上傳到任何伺服器。但因為這是純前端網站，打開瀏覽器開發工具就能看到金鑰，請不要把這個網址分享給別人。
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#6E6E73", marginBottom: 4 }}>Anthropic API Key</div>
            <input
              type="password"
              value={anthropicInput}
              onChange={(e) => setAnthropicInput(e.target.value)}
              placeholder="sk-ant-..."
              style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid #E5E5E7", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#6E6E73", marginBottom: 4 }}>Gemini API Key</div>
            <input
              type="password"
              value={geminiInput}
              onChange={(e) => setGeminiInput(e.target.value)}
              placeholder="AIza..."
              style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid #E5E5E7", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={saveSettings}
            style={{ background: "#0071E3", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            儲存
          </button>
        </div>
      )}

      <div style={{ display: "flex", background: "#F0F0F2", borderRadius: 10, padding: 3, marginBottom: 14, width: "fit-content" }}>
        {["claude", "gemini"].map((p) => (
          <button
            key={p}
            onClick={() => onProviderChange(p)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              background: provider === p ? "#FFFFFF" : "transparent",
              color: provider === p ? "#0071E3" : "#6E6E73",
              boxShadow: provider === p ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {p === "claude" ? "Claude" : "Gemini"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAsk();
          }}
          placeholder="問問看，例如：這個月房貸有被覆蓋嗎？"
          style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid #E5E5E7", fontSize: 14, boxSizing: "border-box" }}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          aria-label="送出問題"
          style={{
            background: loading || !question.trim() ? "#D2D2D7" : "#0071E3",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "0 18px",
            cursor: loading || !question.trim() ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Send size={16} />
        </button>
      </div>

      {history.length === 0 ? (
        <EmptyState text="還沒有提問紀錄" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {history.map((h, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <div style={{ background: "#0071E3", color: "#fff", borderRadius: 14, padding: "10px 14px", fontSize: 13.5, maxWidth: "85%", lineHeight: 1.5 }}>
                  {h.question}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E5E7",
                    borderRadius: 14,
                    padding: "10px 14px",
                    fontSize: 13.5,
                    maxWidth: "85%",
                    color: "#1D1D1F",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {h.answer === null ? <span style={{ color: "#8E8E93" }}>思考中…</span> : h.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
