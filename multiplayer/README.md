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
公開 PUBLIC 房使用隨機地圖。/health 的 maps 列出目前支援地圖。

## 回合與 Sage 復活

POST /rooms 可傳 `{ "map":"ascent", "mode":"rounds", "duration":300 }`。
新版前端預設建立 rounds；省略 mode 的舊客戶端仍為 practice，PUBLIC 固定使用 rounds。
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

## 暴風刃同時散射

部署時包含 `blade-volley.mjs`；健康檢查／welcome 的 features 新增 `blade-volley`。帶 volley 的 shot 限目前武器為 bladestorm、合法 UUID、1–5 個依序 index；第一把沿用 112 ms 最低間隔，同一批其餘飛刀只在 500 ms 內接受，拒絕重送、跳號、過期與一般槍械濫用。每把仍各自驗證起點／落點，並至多配對一個傷害請求。shotWeapon 保留射出時的武器，kill 事件以該武器歸屬，讓前端即使已切槍仍正確補回 3 把飛刀。這是有界散射協定，並非完整伺服器彈量或地圖命中驗證。更新後需重新加入房間，讓前端取得新功能清單。

## 整隊換地圖

新版 `/health` 和 `welcome.features` 包含 `map-change`。好友房第一位加入者成為房主，房主可在選單「房間地圖」切換 Ascent／Haven／Summit／Abyss，所有線上隊員自動重新載入並加入同一房號，保留 UID、名稱、特務及陣營。新地圖重置雙方比分、擊殺／死亡、生命、技能、出生點和場上物件；回合序號重設為 1，等待雙方開始。公開房由系統隨機選圖。

伺服器驗證房主、地圖白名單、10 秒換圖間隔，並要求所有線上成員支援新版功能，否則拒絕並通知房主。換圖前持久化每位玩家的重連資料；前端將短效票券暫存於同分頁 sessionStorage，載入地圖後自動使用並清除。換圖保留 3 分鐘載入時間，舊地圖連線無法再移動或攻擊；離線玩家稍後重連時以地圖世代判斷並重置到新出生點。票券到期後須手動重新加入。

房主主動離房立即交接給下一位在線成員；一般斷線保留約 60 秒，換圖期間保留最多 3 分鐘，方便原房主回來。伺服器與前端都需更新；舊後端前端會顯示尚未支援並停用房內換圖。

驗證：`node --test multiplayer/tests/map-change.test.mjs`；`node tests/test_multiplayer_map_browser.cjs`（先啟動 8000 靜態伺服器與 8790 Worker）。雙瀏覽器實際測試全員導頁、Haven 出生點、UID／陣營保留、換圖後聊天及房主交接；不代表已驗證公開 Worker 的部署。

## 整場勝負與公開房輪替

`match-rules.mjs` 判定先到 13 且至少領先 2 局；12:12 起為延長賽，不設延長上限。`round` 包含 `winTarget:13`、`winBy:2`、`overtime`。勝出時 phase 變為 `finished`，帶 `matchWinner`，伺服器停止移動、攻擊、技能與復活，不再走 3.3 秒下一回合流程。聊天、離房仍可使用。

PUBLIC 初次建立只抽一次地圖，同場後續加入／重連都使用房間已儲存的地圖。PUBLIC 統一 rounds，join 必須帶 `publicRules:1`，防止舊版客戶端繼續使用自由練習規則。舊 PUBLIC practice 房在下次連線時升級並通知在線玩家換圖；更新前的玩家需重新整理網站。完成整場後保留結果 12 秒，由伺服器從其餘三張地圖隨機抽下一張，以既有 map_changed／重連票券流程整房轉移，重置比分及回合為 1。

好友房完成整場後持續顯示結果；僅房主能傳 `match_restart` 在同張地圖重開，或傳 `map_change` 換新地圖。一般隊員與比賽進行中不得使用重新開局訊息。`/health.features` 包含 `match-rules` 與 `public-random-map`，部署時請一起包含新模組。

測試：`tests/match-rules.test.mjs` 覆蓋 13:0、13:11、12:12、13:12、14:12、15:13、長延長賽、整場結束後封鎖戰鬥／復活、房主重開、全員一致的隨機地圖與結算倒數。`node ../tests/test_public_match_browser.cjs`（從 multiplayer 目錄）使用兩個不同地圖的真實瀏覽器加入實際 Worker 公開房，驗證跟隨同圖與 HUD 結算／延長賽顯示。正式公開 Worker 的部署仍需另行確認。

## 多人 Spike

`spike.mjs` 管理儲存在 `meta.spike` 的唯一 Spike，狀態包含 carried／dropped／planted／defused／detonated 與可中斷的操作通道。`round.spike` 隨 welcome／round／players 快照同步，`id` 由地圖世代與回合號組成，舊回合封包無效。`map-sites.mjs` 是前後端共用的四張地圖據點範圍與比例。部署須同時包含這兩個新模組。

事件：`spike_drop`、`spike_pickup`、`spike_action`（action 為 plant／defuse）、`spike_cancel`，均須附當前 id。伺服器驗證陣營、唯一持有者、生命、回合、操作位置／距離與移動；連續操作每 200 ms 發送心跳，超過 900 ms 不再完成操作。4 秒安裝、7 秒拆除、3.5 秒拆除檢查點、45 秒引爆均以伺服器絕對時間計算並持久化。裝備 Spike 或正在安裝／拆除的操作者不能同時射擊，持有者掉落或鬆鍵會取消操作。

安裝後取代一般回合倒數；攻擊方全滅仍需拆除或等待引爆。引爆優先於同時到期的拆除；拆除早於引爆完成則有效，即使 alarm 稍晚才執行。伺服器在 60 遊戲單位球形範圍直接將雙方存活角色 HP／護盾歸零並計一次死亡，不給任何玩家槍殺／飛刀補充；接著只結算一次攻擊方勝利。客戶端只呈現既有爆炸音效、衝擊波與屍體，不得自報爆炸傷害。防守方消滅全部攻擊者但 Spike 已裝設時不會提早獲勝。

掉落與重連均保留同一顆 Spike；死亡／一般斷線掉落在角色腳下。隊友近距離走過可自動撿取，或在 3.3 單位內按 F；丟下者須稍等 1.2 秒後手動撿回，避免站著立即重拾。下一回合或換圖清除舊通道、進度與裝置，重新發給存活攻擊方。原有 practice 房不啟用 Spike。

限制：目前仍使用客戶端回報的位置，伺服器驗證共用據點的 XZ 邊界、操作期間位移及操作距離，沒有載入完整地圖的地板／牆壁網格，不能視為完整防作弊。安裝時的接地與碰撞由前端檢查；爆炸本身按設計穿牆。這次不包含攻守交換或購買階段。

驗證：`npm test` 包含規則測試與真實 Worker 的持有者被擊殺、敵方拒絕撿取、隊友接手與斷線掉落。`node ../tests/test_multiplayer_spike_browser.cjs` 使用兩個真實瀏覽器與本機 Worker，實際操作 G／F／4、安裝、半程拆除後接續，並等滿 45 秒觀察近處死亡、遠處存活與 1:1 比分。公開 Worker 是否部署成功仍需另行確認。

## Armory：18 把槍與再生護盾

`firearms.mjs` 是前後端共用的 18 把槍與距離傷害參考，`shotgun.mjs` 驗證多彈丸批次，`armor.mjs` 管理護盾與回充。部署需包含三個新模組，health.features 包含 `armory`。新客戶端 join 帶 armoryVersion:1，state 不能直接補盾；必須以 armor_buy 指定種類，在非戰鬥操作時購買，結果以 armor_result 同步。refunding 只恢復伺服器保存的購買前快照；進入戰鬥後清除可退快照。

本次再生盾是使用者設定 25+25，受傷後等 3 秒，每秒 10 點消耗儲備回補，且不回生命。其吸收比例為 1；一般盾沿用 .66。儲備／回充時間持久化於玩家 attachment，斷線重連保留，Sage 復活不補盾或儲備，新回合補滿選定護盾。用戶端自報 shieldReserve 或 shield 不會讓新版客戶端回滿。購買信用點仍由既有前端處理，沒有宣稱完整防作弊經濟。

霰彈槍每次扣一顆彈藥，shot 帶 pellet {id,count,index}，伺服器驗證槍種、固定顆數、首發射速、序號、300 ms 批次期限，每個 hit 仍綁定最近已接受的 shot。重複、跳號、過期或換槍的彈丸遭拒。合法霰彈封包以 .4 訊息權重計量，同時每秒最多 180 個原始封包；其他訊息沿用 90 權重，避免正常 Judge 射擊觸發斷線。

驗證：armory.test.mjs、armory-live.test.mjs、test_armory_browser.cjs、test_multiplayer_armory_browser.cjs；涵蓋 18 個實際模型、主副武器換購、護盾退款、受傷與回充、多人實際 Ghost 射擊、遠端模型、新版拒絕客戶端造假補盾，以及合法霰彈封包速率。
