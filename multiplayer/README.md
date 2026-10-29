# VALO 好友房間伺服器

WebSocket + Cloudflare Durable Objects (SQLite)。不需要 Firebase。
每個房間獨立隔離，最多 10 人，20 Hz 玩家快照；伺服器負責血量、傷害數值、擊殺、重生與成員身分。

## 部署到你的 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/LangCheng945/VALO/tree/main/multiplayer)

按上面的按鈕，以你的 Cloudflare 帳號登入／連接此 GitHub 專案，部署 `multiplayer/`。
部署使用本資料夾的 wrangler.jsonc，包含 GameRoom Durable Object 綁定與 SQLite migration。
完成後複製 `https://valo.<你的帳號>.workers.dev` 公開網址。

已安裝 Node.js 的使用者也可在本機登入自己的 Cloudflare 帳號後執行：

```sh
cd multiplayer
npm ci
npx wrangler login
npm run deploy
```

目前的 Codex 工作環境沒有 Cloudflare 部署權限；交付程式與本機測試不代表已建立公開後端。
不要把 API Token 貼到對話、提交 Git 或填入遊戲前端。

## 遊戲設定

遊戲「好友連線」頁面貼上 Worker 根網址並套用。朋友要用同一個伺服器、同一個六碼房號。
也可將公開 URL 設在根目錄 multiplayer-config.js 的 window.__multiplayer_server，所有人就會使用同一個後端。

`wrangler.jsonc` 的 ALLOWED_ORIGINS 已包含目前網站 valonow.langcheng.uk、GitHub Pages 網址與本機 8000。
更換為新的 Sites 網址時，需加入該網站的 Origin（只含協定和網域，沒有路徑／結尾斜線）並重新部署。
不要任意開放所有網域。/health 是不修改狀態的健康檢查。

## 行為

- 新加入玩家由伺服器分配 UID 與陣營，伺服器不接受客戶端指定擊殺者或直接修改 HP。
- 同一房間收到移動、蹲下、靜走、射擊、傷害、擊殺、聊天及支援的技能事件；其他房間收不到。
- 血量與傷害數值由伺服器計算，擊中必須配對近期射擊、有效目標、敵對陣營與合理落點／距離。
- 雙方都進入房間指定地圖後才可互打；開啟選單時暫停參戰，死亡五秒後重生。
- 60 秒內自動重連可使用伺服器發的私密 token 保留 UID、陣營、血量及戰績。主動離房會開始新身分。
- WebSocket 斷線會清除遠端人物；30 秒無心跳時清除失聯玩家。空房兩分鐘後刪除。
- 無法連上或後端未設定時明確顯示狀態，不把產生房號當成連線成功。
- 這是好友自由練習，尚無完整競技回合、伺服器地圖碰撞、射線遮擋判定、彈藥／經濟與完整防作弊。

## 本機測試

```sh
npm ci
npm run dev
# 另一個終端
npm test
# 在 repo 根目錄另啟動 python3 -m http.server 8000，再執行：
node tests/test_multiplayer_browser.cjs
```

Worker 測試實際連到本機 workerd 的 WebSocket，檢查兩人同步、房間隔離、偽造數值拒絕、
射擊傷害、重生、斷線、resume token 與 10 人容量。
兩個獨立瀏覽器 context 的測試保留真實地圖／碰撞／射線與遊戲程式，僅省略 CI 的 GPU 繪圖。
公開網路仍需在你的 Worker 部署後，以兩台實際裝置驗證。


## 目前網站的部署入口

目前公開 Worker URL 設為 `https://valo.09786593a.workers.dev`，Worker 名稱為 `valo`。
儲存庫根目錄與 multiplayer/ 都提供 wrangler.jsonc：

- Cloudflare 建置根目錄為 repo 根目錄：執行 `npx wrangler deploy`，會載入根目錄設定與 multiplayer/worker.mjs。
- 建置根目錄為 multiplayer/：執行 `npm run deploy`。
- 請確認連接的儲存庫是 LangCheng945/VALO、分支 main；不要以「僅靜態資產」模式部署連線後端。

部署完成後，`/health` 應回傳包含 `ok: true`、`protocol: 1`、`service: valo-multiplayer` 的 JSON。
若仍回傳 404，應檢查 Cloudflare 的儲存庫、根目錄與部署指令，而不是將房號當作連線成功。


## 房間地圖

POST /rooms 接受 JSON `{ "map": "ascent" }` 、`{ "map": "haven" }` 或 `{ "map": "summit" }`，未指定時使用 Ascent。
welcome 回傳房間 map；地圖是房間固定屬性，重連與重生沿用該地圖出生點。
Haven 與 Summit 要求 join 具有 mapVersion:1，避免舊客戶端載入 Ascent 造成位置錯位。
公開 PUBLIC 房維持 Ascent。/health 的 maps 列出目前支援地圖。
