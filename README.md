# huashan-archive-run

45 分鐘華山 1914 定向越野網頁遊戲 MVP。前台給 8 隊手機使用，後台用 Firebase Realtime Database 即時監控與控場。

## 開發

```bash
npm install
cp .env.example .env.local
npm run dev
```

常用指令：

```bash
npm run build
npm run preview
npm run deploy
```

`npm run deploy` 會 build 並用 `gh-pages` 發布 `dist`。專案也已包含 GitHub Actions workflow，可由 GitHub Pages 自動部署。

## 環境變數

在 `.env.local` 填入：

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ADMIN_PASSWORD=
VITE_BASE_PATH=/1914-Orienteering/
```

Firebase 前端 config 可以公開，但不要放入 service account key、Google 私鑰或任何伺服器憑證。`VITE_ADMIN_PASSWORD` 只是 MVP 的前端密碼門，不是強安全機制；正式活動若有高風險操作，建議改成 Firebase Custom Claims 或獨立後端。

## Firebase 設定

1. 到 Firebase Console 建立 Web App。
2. 啟用 Authentication，Sign-in method 開啟 Anonymous。
3. 建立 Realtime Database，複製 database URL 到 `VITE_FIREBASE_DATABASE_URL`。
4. 將 `firebase-rules.json` 內容貼到 Realtime Database Rules。
5. 第一次進入 `/admin`，輸入 `VITE_ADMIN_PASSWORD`，按「重設」寫入初始資料。

`firebase-rules.json` 是 MVP draft：允許已登入匿名使用者讀寫，並加上基本資料驗證。完全公開寫入規則只適合本機測試，不要用在活動現場。

## 路由

- `/login`
- `/map`
- `/checkpoint/:cpId`
- `/skill`
- `/vote`
- `/admin`

GitHub Pages base path 需對應 repo 名稱；目前 remote 是 `1914-Orienteering`，所以使用 `VITE_BASE_PATH=/1914-Orienteering/`。若 repo 名稱不同，設定 `VITE_BASE_PATH=/your-repo-name/`。

## QR Code

QR code 目標請使用部署後網址加上以下路徑：

```text
/checkpoint/CP1
/checkpoint/CP2
/checkpoint/CP3
/checkpoint/CP4
/checkpoint/CP5
/checkpoint/CP6
```

GitHub Pages 範例：

```text
https://<你的帳號>.github.io/1914-Orienteering/checkpoint/CP1
```

build 後會複製 `index.html` 為 `404.html`，讓 GitHub Pages 直接開啟上述 SPA 路徑時仍能載入 React app。

## 遊戲資料

隊伍代碼：

```text
A1914 B1914 C1914 D1914 E1914 F1914 G1914 H1914
```

任務類型：

- 修復組：A, C, E, G, H
- 覆寫組：B, D, F

計分：

- 答對：+100
- 完成控制點掃描與送出：+50
- 答錯：+20
- 顯示提示：-30

每隊 6 個控制點，依隊伍路線順序作答。掃錯控制點時不會顯示題目。

## GitHub Pages

Repository settings 需開啟 Pages，Source 選擇 GitHub Actions。push 到 `main` 後 workflow 會：

1. 安裝 npm dependencies。
2. 執行 `npm run build`。
3. 上傳 `dist`。
4. 部署到 GitHub Pages。
