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
- 雙方都進入房間指定地圖後才可互打；開啟選單時暫停參戰。新版回合房死亡後等待隊友復活或下一回合；公開／舊練習房死亡五秒後重生。
- 60 秒內自動重連可使用伺服器發的私密 token 保留 UID、陣營、血量及戰績。主動離房會開始新身分。
- WebSocket 斷線會清除遠端人物；30 秒無心跳時清除失聯玩家。空房兩分鐘後刪除。
- 無法連上或後端未設定時明確顯示狀態，不把產生房號當成連線成功。
- 支援好友殲滅回合與 Sage 復活，尚無完整競技規則、Spike 目標同步、伺服器地圖碰撞、射線遮擋判定、彈藥／經濟與完整防作弊。

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

POST /rooms 接受 JSON `{ "map": "ascent" }` 、`{ "map": "haven" }` 、`{ "map": "summit" }` 或 `{ "map": "abyss" }`，未指定時使用 Ascent。
welcome 回傳房間 map；地圖是房間固定屬性，重連與重生沿用該地圖出生點。
Haven、Summit 與 Abyss 要求 join 具有 mapVersion:1，避免舊客戶端載入 Ascent 造成位置錯位。
公開 PUBLIC 房維持 Ascent。/health 的 maps 列出目前支援地圖。

## 回合與 Sage 復活

POST /rooms 可傳 `{ "map":"ascent", "mode":"rounds", "duration":300 }`。
新版前端預設建立 rounds；省略 mode 的舊客戶端仍為 practice，PUBLIC 亦維持 practice。
回合房要求 join.roundRules=1，welcome 回傳 mode／round；players 快照附 round、ultUsed、reviveAt。
雙方開始參戰後計時，duration 可為 0、60、90、120、180、300、600；0 表示不限時。
全隊倒地或計時結束會公布 round.phase=ending，3.3 秒後所有在線成員於各自出生點重生。
途中斷線重連仍保留死亡狀態；若已跨回合則使用新回合的出生點與大招次數。

Sage（沿用內部 agent=phoenix）可傳 `{ "type":"revive", "targetUid":"..." }`。
後端驗證存活、參戰、同隊、目標已倒地、距離 <=8、目標未在復活中以及本回合未使用大招。
2.5 秒後目標在倒地位置恢復 100 HP、0 護盾；重複、敵方、超距離等請求不會消耗大招。
前端另外檢查準星與實牆遮擋；後端尚無完整地圖射線驗證，不宣稱完整防作弊。
`rounds.mjs` 必須與 worker.mjs／protocol.mjs 一起部署；/health.features 應包含 rounds、resurrection。

`npm test` 涵蓋實際 Worker 的倒地保留、拒絕非法復活、復活一次限制、團滅與下回合重生。

## 治療、導引煙霧與噴漆

部署包含 `skill-events.mjs`；/health 及 welcome.features 新增 ally-heal、guided-smoke、sprays。
新版前端會檢查支援能力，缺少時提示更新後端。

heal.targetUid 可指定受傷且仍存活的同隊玩家（省略為自補）。驗證 Sage、存活、參戰、
40 世界單位內、45 秒冷卻；ability_result 確認後前端才消耗冷卻。血量回復在後端 alarm 執行。
隊友 20 HP/秒、上限 100，自補 3 HP/秒、上限 30，受傷後暫停 2 秒。

smoke_launch 消耗一次煙霧，回報唯一 id、起點和單位方向；smoke_guide 以最多 10 Hz 驗證／廣播
飛行位置及單位方向，smoke_land 依同一 id 完成煙霧。超距離、無效／重複 id 不會重複生成。
投擲或導引不代表伺服器持有完整地圖物理，仍依有限範圍驗證客戶端碰撞回報。

spray 驗證存活、參戰、距離、單位法線、圖案及 3 秒冷卻，由伺服器指派 ownerUid／id。
最多保存 20 張最近且未過期的紀錄，welcome 回播，30 秒到期，新回合清除。
噴漆表面射線檢查由前端執行；不能將此描述為完整伺服器防作弊。

## 共用網站網域

wrangler.jsonc 宣告 langcheng.uk zone 的 `valonow.langcheng.uk/health*` 與
`valonow.langcheng.uk/rooms*` 路由。部署後，前端與 WebSocket 可共用 `https://valonow.langcheng.uk`。
首頁與靜態資源不經此 Worker，仍使用 GitHub Pages。workers.dev 網址繼續保留作備援。

Cloudflare → langcheng.uk → DNS → valonow：保持原 DNS 目標，將代理狀態設為橘雲。
若自動部署顯示 route／zone 權限錯誤，可在 Workers & Pages → valo → 設定 → 網域與路由
手動新增上述兩個 Route，zone 選 langcheng.uk；請勿將首頁根網域設為整站 Worker Custom Domain。
`/health` 回傳遊戲服務 JSON 後，網頁會自動切換；404 或 HTML 不會被誤當成已完成連線設定。

## 分段冰牆

`segmented-barrier` 功能使用 `barriers.mjs` 和前後端共用的 `barrier-rules.mjs`。
`wall` 請求以地面座標 x/y/z、yaw 放置，Worker 驗證 Sage／存活／參戰、10 單位距離、玩家重疊及一次使用限制，分配唯一 ID 並廣播四段血量。
`wall_hit` 只傳 id／segment；遠程武器須有 400 ms 內尚未使用、落點命中對應旋轉牆段的 shot，傷害依伺服器武器資料；近戰檢查距離與攻擊間隔。
牆段初始 400 HP，3.3 秒後存活段強化至 800 HP，40 秒到期；`wall_state` 同步損傷／破壞，`wall_remove` 同步移除。
Durable Object storage 保存牆體、welcome 回播剩餘段，新回合清除；玩家快照中的 barrierUsed 保留重連／復活後的已用次數。
前端預覽另檢查地圖支撐及障礙三角形；Worker 尚不持有完整地圖網格。更新部署時請包含兩個新增 mjs 模組。

## 投擲緩速球

`slow-events.mjs` 與共用 `slow-rules.mjs` 實作 `thrown-slow` 功能。`slow_launch` 包含起點與速度 vx/vy/vz，伺服器驗證 Sage／存活參戰／兩次額度及 20 單位速度，分配唯一 id 後廣播。
`slow_step` 最多 12.5 Hz 驗證擁有者、位置／速度和時間相關位移上限，客戶端通常約 8 Hz 更新；`slow_land` 需同一個有效 id、合理距離及向上的單位法線。接受後只產生一次同 id 的 `slow` 冰面，expiresAt 固定為落地後 7 秒。
房間 storage 保存未到期 flight／field，welcome 回播；快照 slowCharges 保留重連與復活後的次數。超時球以 slow_remove 移除，不推測地圖上的落地點。新回合刪除資料；舊版直接 slow 落點請求會提示更新網頁。落地碰撞回報依前端地圖，驗證並非完整伺服器地圖物理。
