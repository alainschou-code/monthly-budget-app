# 每月收支

個人每月收支管理工具，用 React + Vite 打造，Apple 官網風格。手機、平板、桌面皆有對應版面。

## 功能

- 進入畫面直接是所有固定項目的金額輸入欄（收入 / 股息 / 存款轉帳 / 信用卡 / 保險投資 / 生活稅務）
- 上方即時顯示「收入」「股息」「支出」三個總額；股息獨立於收入之外計算
- 房貸由股息全額覆蓋時會有提示
- 項目可自由新增、刪除
- 統計頁：本月支出分佈（圓餅圖）＋近半年收支趨勢（折線圖）
- 不動產資產管理（獨立於每月收支之外）
- 歷史紀錄：可回顧、編輯、刪除任何月份
- AI 問答：可以詢問理財相關問題或搜尋即時資訊（見下方「AI 問答功能」說明）
- **跨裝置同步**：登入 Google 帳號後，資料會自動同步到你自己 Google 雲端硬碟裡的一個檔案，換裝置登入同一個帳號就能看到最新資料（見下方「跨裝置同步」說明）
- 未登入時，資料儲存在瀏覽器 `localStorage`，重新整理或關閉分頁後資料仍會保留在同一台裝置/瀏覽器裡

## 跨裝置同步（Google 雲端硬碟）

點標題下方「用 Google 帳號登入，跨裝置同步到雲端硬碟」即可啟用。登入後：

- App 會在你的 Google Drive 建立（或找到）一個 `monthly-budget-data.json` 檔案
- 填寫資料時會自動同步回這個檔案（延遲約 1.5 秒，避免太頻繁）
- 在另一台裝置登入同一個 Google 帳號，就會自動讀到最新資料
- 使用的權限範圍是 `drive.file`，這個範圍**只能存取這個 App 自己建立的檔案**，不會讀取你 Drive 裡其他任何檔案

若要在其他網域（例如你自己的網址）使用這個功能，需要自行到 [Google Cloud Console](https://console.cloud.google.com/) 申請 OAuth 用戶端 ID，並把 `src/App.jsx` 裡的 `GOOGLE_CLIENT_ID` 換成你自己的，同時在該用戶端的「已授權的 JavaScript 來源」加入你的網址。

## AI 問答功能

「AI 問答」頁面支援 Claude（Anthropic）和 Gemini（Google）兩種模型，可以在頁面上方切換要用哪一個回答。點右上角的設定圖示，貼上你自己的 API 金鑰即可啟用：

- **Anthropic API Key**：到 [Anthropic Console](https://console.anthropic.com/settings/keys) 申請
- **Gemini API Key**：到 [Google AI Studio](https://aistudio.google.com/apikey) 申請

金鑰會存在瀏覽器的 `localStorage`，只存在你自己的裝置裡，不會上傳到任何地方。兩個模型都會自動帶入你本月的收支摘要作為背景資訊，遇到需要查詢即時資訊的問題（例如股價、新聞）時也會自動上網搜尋再回答。

**重要提醒**：這個功能是直接從瀏覽器呼叫 Anthropic／Google 的 API，金鑰會存在前端程式碼可以讀到的地方——任何打開瀏覽器開發工具（F12）的人都看得到你的金鑰。這對你自己一個人在自己裝置上使用沒有問題，但**請不要把這個網站的連結分享給別人**，否則你的金鑰可能被盜用。

如果之後想要更安全的做法（金鑰完全不出現在前端），可以自己架一個小型後端來代為呼叫這些 API，做法是：

1. 自己架一個小型後端（例如 [Vercel Functions](https://vercel.com/docs/functions)、[Cloudflare Workers](https://workers.cloudflare.com/)、或任何你熟悉的伺服器框架）
2. 把 API 金鑰設定成後端的環境變數，金鑰不會出現在前端程式碼裡
3. 後端提供一個 API 端點（例如 `/api/ask`），接收問題文字，呼叫 Anthropic／Gemini API 後把回答回傳
4. 把 `src/App.jsx` 裡 `askClaude()` / `askGemini()` 改成呼叫你自己的後端網址，而不是直接呼叫 Anthropic／Google

## 本機開發

需要先安裝 [Node.js](https://nodejs.org/)（建議 18 以上版本）。

```bash
npm install
npm run dev
```

啟動後依終端機顯示的網址（通常是 `http://localhost:5173`）在瀏覽器打開即可。

## 建置正式版

```bash
npm run build
```

建置完成的靜態檔案會輸出到 `dist/` 資料夾。

## 部署到 GitHub Pages

1. 在 `vite.config.js` 加上 `base: "/你的repo名稱/"`
2. 執行 `npm run build`
3. 把 `dist/` 資料夾的內容推到 `gh-pages` 分支（或使用 [`gh-pages`](https://www.npmjs.com/package/gh-pages) 套件、或設定 GitHub Actions 自動部署）
4. 到 repo 的 Settings → Pages 設定發布來源

也可以直接匯入 [Vercel](https://vercel.com) 或 [Netlify](https://www.netlify.com)，它們會自動偵測 Vite 專案並完成部署，不需要額外設定。

## 注意事項

- 資料只存在使用者當下的瀏覽器 `localStorage` 裡，換瀏覽器、換裝置、或清除瀏覽器資料都會遺失，目前沒有雲端同步功能
- 若需要多裝置同步或永久備份，可以自行擴充後端（例如接 Supabase、Firebase，或串接自己的 Google Drive/Sheets API）
