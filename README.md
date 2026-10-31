# VALO

Three.js Ascent／Haven／Summit／Abyss 訓練場。前端可使用 GitHub Pages／ChatGPT Sites；多人房間使用獨立 WebSocket 後端。

## 本機啟動

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

單人遊玩不需要帳號或 Firebase。字型與 Tailwind 仍從 CDN 載入。

## 好友連線

目前版本已移除原先未設定的 Firebase 連線，改用 Cloudflare Workers + Durable Objects。
完整後端、部署按鈕與測試方式：[multiplayer/README.md](multiplayer/README.md)。

1. 先部署 `multiplayer/`，取得自己的 `https://...workers.dev` 網址。
2. 遊戲上方「好友連線」→填伺服器網址→「套用網址」。
3. 一人建立房間，其他人使用相同伺服器、輸入六碼房號。
4. 看到成員與各自不同 UID 後進入房主選擇的地圖；預設分配到不同陣營。

公開網站只放靜態檔案不能代替連線伺服器。此工作環境沒有 Cloudflare 部署憑證，
本機通過測試不等於後端已公開上線。部署後把公開 URL 填入 `multiplayer-config.js`，即可讓朋友省去填網址。
這個檔案只可放公開 URL，不可放 Cloudflare API Token。

新建好友房提供最多 10 人回合殲滅、20 Hz 狀態同步、射擊／傷害／擊殺、聊天、煙霧／牆／緩速同步、
Sage 復活與短暫斷線重連；全隊倒地後 3.3 秒開始下一回合，所有人重生。公開練習房保留五秒重生。連線時停用各台電腦獨立的 AI 靶與裝拆包計時，避免各人看到不同狀態。
目前為好友練習模式，尚未完成原版回合賽制與伺服器地圖碰撞／完整防作弊。

## 戰術操作

- 按住 **Ctrl** 蹲下：降低視角、碰撞高度與移動速度；鬆開站立，頭頂有障礙時保持蹲下。
- **Shift** 靜走；**Space** 跳躍。
- Vandal / Phantom **右鍵**切換 **1.25×** 瞄準。
- Operator **右鍵**循環 **2.5× → 5× → 關閉**；手槍與刀沒有開鏡。
- 開鏡時降低移動速度與滑鼠靈敏度；移動和跳躍仍會影響精準度。蹲下可提升射擊穩定度。
- 換武器、換彈、開啟購買頁會退出瞄準。

這些是瀏覽器版的近似玩法，並非原作引擎或完整數值還原。

### 回歸檢查

```sh
python3 -B -m unittest discover -s tests
node tests/test_controls.cjs
```

### 參考資料

- [Riot 官方新手指南](https://playvalorant.com/en-us/news/announcements/beginners-guide/)：停下再射擊、靜走、攻守與經濟系統。
- [Riot 官方武器庫](https://playvalorant.com/en-us/arsenal/)：依武器分類與特性區分步槍、狙擊槍、手槍與近戰。

本版倍率、視角高度、減速與散布為本專案的玩法設定；上述官方頁面並未列出所有底層數值。

## ODIN 與 Smite 外觀

- 商店新增 **ODIN（3200 信用點）**：100 發彈匣、200 發備彈、持續連射加速、1.15× 瞄準、5 秒換彈。
- 目前所有槍械統一使用 **Smite 神罰**風格：深藍／青藍漸層與白色分岔雷電，直接由程式產生紋理，不依賴外部圖片下載。
- **3** 切換紫金爪刀並展開刀刃；左鍵揮擊，**Y** 繞尾環旋轉展示。金黑握柄與銀色鉤刃依提供的參考圖以自製模型呈現。
- 切換武器會取消尚未完成的換彈，避免 ODIN 的較長換彈計時器修改其他武器的彈藥。

武器設定檢查：`node tests/test_weapons.cjs`。

## 完整 Ascent 模型

地圖已改為載入 GLB 場景與貼圖，取代先前程式產生的簡化庭院。模型約 13 MB，含約 233 萬個三角形；瀏覽器需解碼 KTX2 貼圖並建立碰撞索引，因此首次載入會顯示進度。載入完成前，進場按鈕停用；失敗時會提供重試。

來源為 [open-aim](https://github.com/unkwsr/open-aim) 的 Ascent 資產（其上游來源為 ishoutu 訓練器）。固定來源版本、檔案大小與 SHA-256 記於 [assets/ascent/provenance.json](assets/ascent/provenance.json)。地圖與貼圖屬 Riot Games；open-aim 的 MIT 授權不涵蓋地圖資產。本專案不聲稱擁有或獲得 Riot 官方授權。

- 場景保留原模型的建築、路線、貼圖與小地圖；以統一比例轉換配合現有玩家高度。
- 靜態物件依幾何、材質與空間分區合併為 InstancedMesh，使用世界邊界作視錐剔除。
- 牆壁、地面與階梯採三角形 BVH 和膠囊體檢查；不再以大方塊代替整間建築。
- 出生位置與訓練目標會檢查地面及身體空間，避免生在牆內。
- 自由跑圖與現有 ODIN、Smite 槍枝、紫金爪刀、蹲下和開鏡操作保留。
- 靈敏度、訓練時間、完成次數與最佳擊殺保存在本機瀏覽器。

場景使用靜態模型。門、可破壞物、技能、穿牆傷害及裝包邊界並非完整原作模擬；本版也沒有驗證在所有電腦上的幀率。軟體渲染環境只用於功能檢查，不作硬體效能承諾。

```sh
python3 -B -m unittest discover -s tests
node tests/test_controls.cjs
node tests/test_weapons.cjs
node tests/test_trainer.cjs
node tests/test_ascent_assets.cjs
```

最後一項會驗證實際 GLB 標頭、地圖種類、來源雜湊，以及 BVH 地面、牆壁、階梯與蹲下空間檢查。


## 武器、技能與新版購買頁

五把槍改用獨立的詳細槍身網格，套用本專案生成的 Smite 雷電紋理；
射擊使用每把槍自己的本機 Ogg 樣本，載入失敗時保留合成音效。
素材來源與權利說明：`assets/weapons/README.md`。

購買頁改成全寬武器分類格，與訓練設定分頁；槍械剪影由真實網格生成。
護盾購買會檢查信用點，避免不足時仍取得護盾。
技能施放不再使用中央大字提示；下方 HUD 顯示剩餘次數／冷卻。

- Jett：2 次短煙、1 次上升氣流；E 先準備再按 E 衝刺，方向依 WASD，
  使用小步碰撞檢查；2 次擊殺重新取得衝刺；X 為 5 把飛刀。
- Sage：C 裝備冰牆，右鍵旋轉、左鍵確認、再按 C 取消；Q 裝備緩速球、左鍵投擲；E 左鍵補隊友／右鍵自補，45 秒冷卻；X 復活附近倒地隊友。
- 冰牆四段各自承受傷害與阻擋通行，升起時每段 400 HP，3.3 秒後存活段強化為 800 HP，40 秒後消失。破壞一段會留下可通行缺口，強化不會補回已毀段。
- 重置訓練／下一回合補充技能與大絕。動畫與部分技能規則仍為本專案的近似實作。

## ChatGPT Sites

`sites/` 為官方 create-sites 建立的新專案，保留現有網站與 DNS。
可建置完整地圖、槍械及音效，詳見 `sites/README.md`。
目前工作階段沒有 Sites 發佈工具／登入狀態；成功建置不代表已建立或上架 Sites。


### 購買階段退款與音效

同一次購買階段換主武器／護盾時，先退還該欄本次支付的金額，再檢查與扣除新裝備價格。
初始免費配給沒有退款金額；切回原有裝備不收費。Classic 不會取代主武器。
右鍵點擊本次購買的卡片，或按左側退款按鈕，可取消購買；本回合買入的槍即使開槍後仍可退款；進入下一回合結清退款資格。護盾仍於進入戰場後完成購買。
同一張卡片重複點擊不會再次扣款。重置訓練會先取消尚未提交的購買。

購買頁依使用者提供的原版截圖排列：隨身武器、衝鋒槍／霰彈槍、步槍、狙擊槍／機關槍、護盾與下方技能列。
未實作武器僅顯示不可購買的模型預覽，不會扣款。

擊殺改為五段本機聲音素材，第五段只在第五殺播放，訓練第六殺以後不再重播 ACE。
加入七段腳步素材及獨立落地聲；依實際水平移動距離觸發，站著推牆、滯空、靜走／蹲行與暫停不播放跑步聲。
移動 AI 的腳步具有距離衰減與左右聲道定位。音效來源見 `assets/audio/README.md`；
第三方萃取素材尚未逐一核對目前官方遊戲與繁中播報混音，並非完全相同版本的保證。
Jett 按住空白鍵可降低下降速度。

檢查：`node tests/test_shop_economy.mjs`、`node tests/test_movement_audio.mjs`。


連線檢查：先啟動靜態伺服器與 `npm run dev --prefix multiplayer`，再執行
`npm test --prefix multiplayer`、`node tests/test_multiplayer_browser.cjs`。
瀏覽器測試使用獨立儲存空間的兩個 context；保留真實地圖、碰撞、射線與遊戲 callback，省略 CI 中的 GPU 繪圖。


## Haven（遺落境地）

新增地圖選單，可在 Ascent、Haven、Summit 與 Abyss 之間切換；也可直接開啟 `?map=haven`。
Haven 使用完整 `triad` 場景 GLB、內嵌貼圖、原始碰撞與小地圖，約 11.6 MB 模型。
已設定雙方出生點、A／B／C 據點標示與訓練靶位置。
切換地圖會重新載入頁面，釋放上一張地圖資源並重置本次訓練。
安全落點只接受預期樓層附近的地板，遇到箱子會向四周找位置，避免落到地圖下方的底層碰撞面。

好友房間建立時固定地圖，加入者若正在另一張地圖會自動載入房間地圖並重新加入。
舊房間預設 Ascent；公共房間由系統隨機選圖。Haven 房需更新 Cloudflare 後端與遊戲客戶端，
後端未更新時會明確提示，不會把各人放在不同地圖。
素材來源與 SHA256 記錄在 `assets/haven/provenance.json`；Riot 素材不包含於來源程式的 MIT 授權。

檢查：`node tests/test_haven_assets.cjs`、`node tests/test_haven_browser.cjs`、
`node tests/test_haven_multiplayer.cjs`（後兩項需本機遊戲與連線伺服器）。

## Summit（天樞雲闕）

直接開啟 `?map=summit`，或在地圖選單選擇 Summit。來源以 `plummet` 為內部 ID，
`site/local-api/maps` 將它標為 Summit；名稱證據及素材雜湊記錄於 `assets/summit/provenance.json`。
使用約 18.2 MB 的完整場景、內嵌貼圖、碰撞與小地圖，設定 A／B 據點、雙方出生點與訓練靶。

B 區繩索附近按 F 上繩，W／S 上下攀爬，Shift 慢爬，F 或空白鍵離開。
攀爬路徑以小步碰撞檢查避開繩索與平台邊緣；開啟選單、死亡與使用位移技能會解除攀爬。
好友房支援 Summit，同房自動切圖、傷害、重生與斷線重連皆使用房間地圖。
Summit 的 `projectile` 阻擋面另建射擊碰撞，玩家只使用地圖實體與 `pawn` 阻擋面，
避免 A 大廳（約 86, -42）與 B 大廳（約 29, -53）產生無法通行的隱形牆。
瀏覽器測試以 W／S 連續往返這兩個入口，並確認子彈碰撞仍保留。
Cloudflare 後端亦需更新；`/health` 的 maps 應包含 `summit`。

驗證：`node tests/test_summit_assets.cjs`、`node tests/test_summit_browser.cjs`、
`node tests/test_summit_multiplayer.cjs`。瀏覽器測試保留完整場景與碰撞，以單幀渲染檢查畫面。

Sunset 依使用者要求改為 Abyss，未加入 Sunset。

## Abyss（深窟幽境）

以 `?map=abyss` 或地圖選單進入。完整 `infinity` 場景約 12.4 MB，含內嵌貼圖、
三角碰撞、小地圖、A／B 據點、雙方出生點、訓練靶與四條攀爬繩索。
好友房會固定使用 Abyss，自動切圖、同步位置、互打、重生與重連沿用房間地圖。
掉出場景後會回到出生點；目前是好友訓練模式。
素材來源與 SHA256 位於 `assets/abyss/provenance.json`，來源遊戲素材仍屬 Riot Games。

驗證：`node tests/test_abyss_assets.cjs`、`node tests/test_abyss_browser.cjs`、
`node tests/test_abyss_multiplayer.cjs`。

## 技能圖示與視覺

`ability-effects.js` 集中管理 Jett／Sage 的白色 SVG 縮圖與程序化效果：
Jett 流動風帶煙霧、上升／衝刺的周邊氣流，Sage 雙手玉球、四節升起冰牆及碎冰緩速區。
八個技能圖示依使用者提供的 Sage／Jett 圖片重繪輪廓，保留裂紋、鏤空與飛刀圓環。
HUD 使用白色；購買介面以薄荷綠表示 Sage、灰藍色表示 Jett。
圖示與 shader 為本專案重繪／實作，並非官方遊戲素材或完整技能動畫。
C／Q／E／X 的 HUD、商店圖示隨角色切換；蓄能顯示為薄荷綠條，逐風預備期間顯示綠色圖示。
玉球施放時會退出開鏡，射擊可取消短暫持球姿勢；選單與死亡也會取消姿勢。
煙霧遮蔽訓練機器人視線，子彈可穿過；好友端收到煙霧、冰牆與緩速事件也使用同一組效果。
回合重置與效果到期會釋放幾何、材質。Sage 復活現支援單人 AI 隊友與新版好友回合房，瞄準附近倒地隊友按 X。

驗證：`node tests/test_ability_effects.cjs` 檢查角色切圖示、實際 WebGL 編譯／畫面、
玉球雙手、煙霧穿彈、冰牆／碎冰與資源清理；`node tests/test_gameplay.cjs` 檢查原有技能與武器流程。

## 時間、Spike 與回合復活

遊戲時間預設 5 分鐘，可選 10 分鐘或不限時，同時套用單人訓練及單人戰術回合。
舊版一分鐘預設會一次遷移至五分鐘，已選不限時者保留；靈敏度與歷史成績保留。
新版手動時間設定會持續保存。好友房建立時固定使用房主選擇的時間（不影響已建立房間）。

`spike-model.js` 重製灰黑金屬、分面護甲、收合／展開柱體、橘色能量縫與八角頂環。
按 4 可手持收合的 Spike；單人戰術模式在據點內原地按住 4／F 安裝 4 秒，45 秒後引爆。
拆除需靠近裝置且原地持續 7 秒，達到 3.5 秒保存半程進度，釋放按鍵／移動／離開範圍會中斷。
核心隨拆除進度縮入外殼；安裝及拆除的計時不隨回合時間拉長。這是程序化重製模型。
Spike 目前仍屬單人模式功能，好友房採殲滅回合，不同步安拆目標。

單人戰術模式加入四名友軍 AI 與五名敵軍 AI，隨機選方向並檢查實體、台階及落差，
可交戰且死亡後保留倒地模型及靈魂標記到下一回合。定位訓練仍使用固定靶，移動訓練使用隨機靶。
Sage 可瞄準 8 世界單位內且視線未受實牆阻擋的倒地隊友按 X，2.5 秒後以 100 HP、無護盾復活。
每回合一次；不能復活自己或敵人。新好友回合房由伺服器驗證身分、距離、存活狀態與大招次數。
好友房全隊倒地／時間結束後進入 3.3 秒回合間隔，保留屍體並在下回合清除、重生與重置大招。
公開房與新好友房使用回合對戰；舊版 practice 房維持自由練習。

新增檢查：`node tests/test_game_rules.mjs`、`node tests/test_spike_browser.cjs`、
`node tests/test_corpses_browser.cjs`、`node tests/test_resurrection_multiplayer.cjs`。
後三項需本機 8000，最後一項另需 8790 Worker；三個獨立瀏覽器實測 Sage 透過 X 復活隊友。

## 技能操作與噴漆

Jett 的 C 改為實際飛行的雲爆靈球：按住 C 並轉動滑鼠可導引，放開後沿原方向飛行並下墜；
碰到實體或飛行 1.2 秒後展開 2.5 秒煙霧。每回合兩次，投擲、導引與落點可同步至好友端。
投擲者斷線或停止回報時，後端會在最後驗證的位置完成煙霧，避免飛行物永久殘留。

Sage 的 E 先裝備治療球；左鍵治療準星指到、視線未受實牆阻擋的受傷隊友，右鍵自補。
可用於 AI 隊友或連線隊友，自己滿血時也可裝備並治療他人；無有效目標時不消耗冷卻。
隊友最多恢復 100 HP（20 HP/秒），自補最多 30 HP（3 HP/秒），冷卻 45 秒。
受到傷害會暫停恢復 2 秒。切換武器、技能、開啟選單可取消尚未施放的持球姿勢。
連線時由後端持有血量與冷卻，驗證同隊、存活及距離；瞄準和地圖視線檢查在客戶端執行。

按 T 對準 7 世界單位內的靜態牆面或地面噴漆，從實際可見模型求交點與表面法線，
包含鏡像／縮放實例的法線換算；超距離、未指到表面、選單或死亡時不可噴漆。
設定可選隨角色、JETT、SAGE 或 GG 圖案，附噴灑聲；冷卻 3 秒，每人保留一張、30 秒後消失。
好友端可同步位置與朝向，晚加入者也會取得未過期的噴漆；新回合會清除。
圖案為程序化原創貼圖，不是官方噴漆素材。新版連線功能需要更新 Worker。

檢查：`node tests/test_skill_details_browser.cjs`、`node tests/test_skill_multiplayer.cjs`、
`npm test --prefix multiplayer`。瀏覽器測試保留實際遊戲、碰撞和操作，僅略過持續 GPU 繪圖，
以手動單幀檢查畫面，避免軟體渲染拖慢模擬時間。

## 同網域連線：valonow.langcheng.uk

前端優先使用 `https://valonow.langcheng.uk`，但先驗證 `/health` 的 service／protocol／ok，
確認是遊戲 Worker 才切換。若仍是靜態網站 404、HTML 或服務尚未部署，會保留 workers.dev 備援。
已儲存的官方舊網址會自動遷移；使用者指定的其他後端、正在手動套用的設定不會被覆蓋。

根目錄與 multiplayer/ 的 wrangler.jsonc 都為同一個 valo Worker 宣告以下兩條路由：

- `valonow.langcheng.uk/health*`
- `valonow.langcheng.uk/rooms*`

網頁 `/`、地圖與其他靜態資源仍由原 GitHub Pages 提供，不把整個網域改指到 Worker。
房間 HTTP API 與 WebSocket 同樣使用原 GameRoom Durable Object，不需要搬動房間資料。
Cloudflare 的 langcheng.uk zone 必須將 valonow DNS 記錄設為代理（橘雲）；
保留既有 DNS 目標，只改代理狀態。部署身份亦需有該 zone 的 Workers Routes 權限。
設定成功後 `https://valonow.langcheng.uk/health` 應回傳 service=valo-multiplayer；重新整理遊戲會自動切換。

此環境沒有 Cloudflare 帳號管理憑證，不能代為確認或修改 DNS／正式路由。
本機驗證：`node tests/test_server_discovery.mjs`、`node tests/test_server_discovery_browser.cjs`、Worker dry-run。

## Sage 冰牆放置與連線同步

按 C 裝備，綠色表示可放置、紅色表示地面不平／與玩家或障礙物重疊；右鍵旋轉 90°，左鍵確認。取消、換槍、切換技能或開啟選單不扣次數。預覽檢查地面支撐及地圖三角網格；冰牆四段獨立血量、裂紋、升起與破碎效果，機器人也會避開未破壞的段。

好友房需後端宣告 `segmented-barrier`，舊後端會提示更新，避免兩端各自算出不同冰牆。新版 Worker 分配牆 ID、扣次數、驗證射擊與傷害並保存剩餘牆段；重連／後加入玩家會取得同一個牆體狀態；下一回合清除。地圖障礙與地面支撐檢查在前端，Worker 另驗證距離與玩家重疊，尚無完整伺服器地圖碰撞。

驗證：`node tests/test_barrier_browser.cjs`、`cd multiplayer && node --test tests/barriers.test.mjs`；另以三個獨立 Chromium 分頁驗證既有技能與冰牆同步。

## Sage Q 緩速靈球

Q 裝備，再按 Q 或換武器取消，左鍵才投擲並消耗一次（每回合兩次）。右鍵不會開鏡或投擲。投射物以重力、掃掠子步進碰撞，牆面與天花板反彈，落到向上的地面才碎裂並展開 5 單位半徑冰晶，持續 7 秒。進入同一地面高度範圍的玩家及機器人移速降至 50%；重疊冰面不疊加。走出範圍即恢復，冰面不影響另一層樓；靜步／蹲行保留原本安靜的腳步規則。碎裂、反彈及冰面上的腳步使用本專案合成的冰晶聲，並非官方音效樣本。

`thrown-slow` 後端驗證角色、兩次技能額度、投擲起點／速度、飛行更新速度／距離／擁有者及落地法線，指派 ID 並同步軌跡、落點、絕對到期時間。welcome 回播未到期的球／冰面；下一回合清除。暫停操作或開啟購買頁不會暫停冰面的壽命。斷線且無法回報落地的球至多 5 秒後移除，不會在半空憑空生成緩速區。牆面碰撞仍由前端地圖判斷，Worker 不持有完整地圖網格，移動速度也尚非完整伺服器權威。

驗證：`node tests/test_slow_browser.cjs`、`node tests/test_skill_multiplayer.cjs`、`cd multiplayer && npm test`。瀏覽器測試包含實際 Q／滑鼠操作、薄牆低幀率反彈、移速、音訊輸出、購買頁到期清理，以及三人端落點／壽命一致。

## 全螢幕與滑鼠鎖定

點擊「進入戰場」時，`play-session.mjs` 在同一次使用者操作中先請求滑鼠鎖定、再請求整個遊戲文件全螢幕，保留 HUD 與選單。B 釋放滑鼠以購買，保持全螢幕，再點進場或按 B 繼續可重新鎖定。Esc／瀏覽器退出全螢幕、解除滑鼠鎖定或切換視窗時暫停遊戲，不會循環強制鎖回。瀏覽器拒絕全螢幕時，滑鼠鎖定成功仍可繼續遊玩；拒絕滑鼠鎖定則返回選單並顯示簡短提示。

Sites 的 iframe 已允許 fullscreen 且沒有 pointer-lock sandbox 限制。測試：`node --test tests/test_play_session.mjs` 與 `node tests/test_play_session_browser.cjs`，涵蓋原生 Chromium 全螢幕／滑鼠 API、購買後繼續、既有鎖定狀態、退出、iframe 和權限拒絕。

## 第一人稱槍枝與手部

`first-person-view.js` 提供本專案製作的五指握槍手型、手腕、分段前臂與袖口。Jett 使用深色露指手套，Sage 使用裸手與玉色袖口，角色切換立即更新；技能持球也共用同一套手部。手指依材質烘焙為少量網格，避免每根指節都增加繪圖呼叫。

保留來源槍模，`styleWeaponMesh` 在複製幾何上區分神罰烤漆、金屬與握把，降低烤漆自發光，僅為第一人稱材質提供共用反射環境，不更動地圖光照。補上 Vandal 曲面彈匣及 Phantom／Operator／Classic 彈匣；Odin 從原模型分離彈箱，所有原始三角面仍保留。左手隨彈匣拔出、下降、插回與回到護木；手槍彈匣僅於換彈時顯示，避免與來源握把重疊。

換彈分成抓取、抽出、下移換匣、插入、輕壓回位及收手，左手跟隨彈匣旋轉；抽出與裝入使用不同路徑。Classic 使用握把內彈匣，Odin 使用原模型彈箱。拔槍依武器重量以 0.40–0.72 秒抬起並短暫回穩，紫金爪刀使用反向轉腕與展刃。動作父節點獨立於後座力、走路晃動及檢視，快速切槍重新起算；開火會立即結束拔槍動作，維持既有操作反應。這些是本專案製作的近似動作，並非官方動畫。

換彈仍使用既有時間與彈量規則。檢視動作較輕，後座俯仰會回正；Operator 開鏡時持續隱藏手與槍，避免畫面更新又把它們顯示在鏡內。換槍釋放自建網格／材質，來源槍模幾何與共用貼圖繼續快取。這些手部與彈匣為本專案的近似模型與動作，並非官方完整角色骨架／動畫。

驗證：`node tests/test_first_person_view.cjs` 實測五把槍的三角面保留、雙手／材質、換彈與回位、彈量、角色外觀、檢視、狙擊鏡、爪刀與飛刀，並實際編譯 shader 及輸出畫面；另執行 `tests/test_gameplay.cjs`、`tests/test_ability_effects.cjs`、武器與操控檢查。

## 角色噴漆圖片

Sage 預設噴漆換為 All Good（冰牆前比讚），Jett 換為 Love > Hate（手指比心與風之心形），對應使用者提供的兩張參考。Sage 使用固定版本公開圖庫的原始透明 WebP；Jett 為依使用者圖片以影像生成工具去背的 PNG，屬參考圖處理版本，並非官方像素完全一致的擷取。兩張都隨網站放在 `assets/sprays/`，不需外部圖片服務；來源與雜湊見 `assets/sprays/provenance.json`。

噴漆預載後才允許施放，依原圖寬高比顯示並保留透明邊角；尚未載好或載入失敗不會噴出白色方片。好友事件仍傳既有 sage／jett 圖案 ID，不需後端遷移；兩端重新整理後即可看到相同圖案。冷卻 3 秒、30 秒到期與每人一張的規則維持。`node tests/test_spray_art_browser.cjs` 檢查角色自動選圖、透明像素、比例、牆／地板方向、冷卻與清理；`tests/test_skill_multiplayer.cjs` 檢查好友端的相同 Sage 圖片與落點。

## 畫面流暢度與連線介面

操作設定提供自動／流暢／高畫質，選擇儲存在本機。自動將渲染畫面限制在約 180 萬像素，持續低於約 43 FPS 才逐步降低解析度；穩定約 60 FPS 後緩慢回復。流暢限制約 92 萬像素，高畫質維持原本最高 1.5 倍像素比。選單、背景分頁及長時間停頓不參與調節，視窗與全螢幕尺寸改變會重算；準星及介面維持 CSS 清晰度。此設定不更動碰撞、瞄準、物理或網路傳送頻率。

位置快照不再重建沒有變動的房間成員、隊伍名單和戰績表，血量文字只在數值改變時更新；小地圖限制為每秒 20 次。遠端玩家腳步聲的地板高度最多快取 0.12 秒，移動超過 1 單位或高度變化超過 0.4 立即重查；遠處、靜走及未遊玩時跳過聲音專用查詢。玩家及機器人的實際地板碰撞查詢保持原樣。

驗證：`node --test tests/test_runtime_performance.mjs`、`node tests/test_runtime_performance_browser.cjs`。以同一個 1920×1080、DPR 2 的 Chromium 視窗比較 `cd58c79`，初始渲染像素由 4,665,600 降至 1,798,728；100 次僅改位置的快照，觀察名單／戰績／血量 DOM 變動由 1,200 次降至 0；120 幀的遠端聲音地板查詢由 120 次降至 15 次。這是相同情境的工作量比較，並非玩家裝置的 FPS 保證。可用 `PERF_BASELINE=1 node tests/test_runtime_performance_browser.cjs` 重現基準，另可用 `PERF_BASELINE_REF` 指定版本。

## 好友角色外觀與第一人稱觀戰

好友的角色由方塊外觀改為本機 Jett／Sage 蒙皮模型與貼圖，附持槍姿勢、站立／走跑／蹲下動畫及隊伍輪廓。每個角色約 5,200–5,400 三角面、117 根骨骼，兩種角色與共用動畫資料合計約 730 KB，只下載並快取一次；後續加入玩家共用來源貼圖，個別持有骨架、可釋放的幾何與材質。載入失敗仍保留原人形；原本頭部、身體、腿部的命中盒及服務端傷害規則不變。內部 `phoenix` 仍對應 Sage。來源、版本及檔案雜湊見 `assets/agents/provenance.json`，`tools/export-agents.py <本機 open-aim checkout>` 可重製資料，程式只解析指定資料字面值，不執行上游腳本。

死亡且仍在遊玩時自動選取存活、已進場的同隊玩家，以獨立攝影機追蹤位置、瞄準方向、蹲姿、角色手部與持用槍枝；左／右鍵或 ←／→ 切換，沒有隊友時顯示等待，絕不自動切到敵人。選中角色本體在該觀戰客戶端暫時隱藏，避免頭髮或身體擋住鏡頭；切換、復活、回合結束、離線及離房均還原。觀戰不移動自己的角色、不允許射擊或施放技能；隱藏自己的血量、彈量和技能列，顯示被觀戰者姓名、角色與血量。單人戰術模式也可跟隨存活 AI 隊友。

本版使用既有位置、pitch、武器和射擊事件，無需變更連線後端。觀戰是客戶端平滑重建，尚未同步精確彈量、換彈進度、開鏡倍率及完整技能手部動畫，也不是官方完整觀戰系統；不顯示虛構的隊友彈量或技能次數。

驗證：`node tests/test_agent_assets.cjs`、`node --test tests/test_spectator_rules.mjs`、`node tests/test_avatars_spectator_browser.cjs`，涵蓋素材完整性、角色與骨架、動畫、shader、保留命中盒、敵我限制、切換、失效目標及還原。`tests/test_multiplayer_browser.cjs` 驗證兩個真實客戶端射擊、重生與重連；`tests/test_resurrection_multiplayer.cjs` 以三個真實客戶端確認陣亡後觀戰存活 Sage、Sage X 復活後退出觀戰，以及團滅換回合。

## Jett 暴風刃：獨立飛刀池與右鍵散射

X 首次啟動給 5 把飛刀，外型改成本專案製作的銀色稜面苦無、青色刀脊、深色握柄與開孔尾環。1／2／3 可切回主武器、手槍與近戰，再按 X 回到剩餘飛刀，不重複消耗大招或重補刀數；槍枝彈量也在切換時保存，重生／新回合補滿。單發消耗 1 把，右鍵在同一個操作中射出所有剩餘飛刀，以獨立扇形射線判斷掩體與命中，不用計時器連發。飛刀擊殺補 3 把，上限 5 把，包含右鍵擊殺；一般槍械擊殺不補刀。耗盡後短暫延遲切回主武器，確認的延遲擊殺仍可補回飛刀並以 X 切回，且不覆寫正在使用的槍枝彈量。死亡／回合重置清空啟動狀態與飛刀池。

發射與補刀只重建小型飛刀網格，不再重建整套手指／前臂。懸浮以固定位置加上週期偏移計算，避免逐幀累加造成漂移。

連線右鍵散射需後端 `blade-volley` 功能：shot 附同一 volley id、count 與依序 index；Worker 僅對 Blade Storm 接受 1–5 把、500 ms 內依序發出的同一批，重送／跳號／一般槍械套用均拒絕。每把仍需各自配對的有效 shot／hit，傷害與擊殺由伺服器計算；shot 記錄原武器，避免切槍後錯誤歸屬擊殺。此功能沿用現有客戶端命中回報架構，未新增完整伺服器飛刀彈量與地圖物理。舊後端不會消耗右鍵飛刀，而是在底部提示等待更新後重新入房；單發與切槍仍可使用。

驗證：`node --test tests/test_blade_storm_rules.mjs`、`node tests/test_blade_storm_browser.cjs`、`npm test --prefix multiplayer`，另以 `tests/test_multiplayer_browser.cjs` 讓兩個真實瀏覽器右鍵散射、在持槍時收到擊殺確認並補回 3 把，再按 X 切回；包含一般射擊、重生、重連的回歸檢查。

## 紫金爪刀與展刃／轉刀動畫

近戰武器改為依使用者圖片製作的金色多邊尾環、黑色內嵌握柄、銀白折面與金色鉤刃，取代雷槌；槍枝仍維持神罰外觀，Jett 大招仍使用獨立飛刀模型及刀數規則。`karambit.js` 自製幾何不需額外下載模型／貼圖，材質共用第一人稱反射環境。

按 3 的 0.68 秒切刀動作中，刀刃以獨立鉸點從收折角度展開並回穩。Y 展示為 2.2 秒：先伸手，再以尾環為軸轉兩圈、側轉露出刀面，最後回到持刀姿勢；手腕和刀環共用位移，期間不重建幾何。揮擊會中斷展示並立即展刃，切槍銷毀舊模型，切回會重新開始展刃。傷害、射程、速度及攻擊間隔保持原近戰規則。第一人稱觀戰也會顯示此刀的靜態持刀外觀，沒有新增同步隊友展示進度的網路欄位。這是依圖製作的近似模型與動作，並非官方模型或動畫。

驗證：`node --test tests/test_karambit_rules.mjs` 檢查展開曲線、30／60／144 FPS 終點與旋轉回位；`node tests/test_karambit_browser.cjs` 實測按 3／Y、鉤刃與開孔尾環、展刃幾何、展示期間物件保留、攻擊取消、快速換槍與 Sage 手部，編譯 shader 並輸出畫面。另以第一人稱槍枝測試及武器設定檢查保留既有行為。

紫金爪刀的最新對照與未完成項目見 [參考紀錄](docs/prime-karambit-reference.md)。刀型依使用者圖片描點修正；原版影片受環境外連限制，現有展刃與旋轉仍屬未經影片核對的自製動作。

### 好友房整隊換地圖

房主在選單「房間地圖」選擇 Ascent、Haven、Summit 或 Abyss，即可帶領全房自動載入新地圖，保留房號與陣營，重置比分及戰鬥狀態。隊員跟隨切換；房主主動離房會交接權限。公開房由系統隨機選圖。需要 Cloudflare 後端更新至支援 `map-change`，全員重新整理網站並重新加入；詳細規則與驗證見 [多人後端說明](multiplayer/README.md#整隊換地圖)。

### 整場勝負與公開房隨機地圖

公開房在建立及每場結束後，從 Ascent／Haven／Summit／Abyss 隨機選圖；同場所有人自動加入同一張地圖。下一場排除上一張地圖，顯示結果 12 秒後整房換圖，保留玩家身分與陣營。

多人回合房先到 13 勝；12:12 起須領先 2 局，因此 13:12 繼續、14:12 或 15:13 結束。整場結束後停止戰鬥與普通下一回合重生，顯示比分。好友房可由房主按「重新開局」或換圖，重新開局比分歸零，從第 1 回合開始。更新後請全員重新整理並重新加入，公開房要求新版客戶端；舊後端不會自動取得新規則。

### Spike 引爆與爆炸傷害（單人戰術模式）

Spike 安裝後維持 45 秒倒數，歸零產生衝擊波及合成爆炸音，藏起已引爆的裝置。以裝置為中心的 60 遊戲單位球形範圍內，玩家與雙方存活機器人受到致死傷害，護盾與牆壁無法保命；範圍外或足夠遠的高處存活。半徑是本遊戲設定，不宣稱與原版數值完全相同。

爆炸留下屍體，直到下一回合；不計玩家槍殺、不補 Jett 飛刀、不播放 ACE 音效，固定由攻擊方取得一次回合勝利。拆除成功不爆炸；晚於引爆的拆除不能取消爆炸，同一幀中先完成的拆除仍有效。開選單、失去滑鼠鎖定或背景掉幀不會暫停已安裝的 Spike 倒數。

單人戰術模式維持本節規則；好友／公開房現已新增伺服器同步版本，詳見下節「多人 Spike」。測試 `node tests/test_game_rules.mjs`、`node tests/test_spike_browser.cjs` 驗證引爆、護盾、敵我傷害、逃生、高差、屍體、比分、拆除時序、選單倒數及效果清理。

### 多人 Spike

好友回合房與公開房已接入同一套伺服器 Spike 流程：每回合先交給一位攻擊方玩家，按 4 裝備／按住 4 或 F 安裝；G 丟下，攻擊方隊友走過即可撿取，也能按 F 撿取。持有者死亡或斷線會掉落，防守方無法撿取或安裝。丟下者可稍等後按 F 重新撿取，不會站在原地立刻自動撿回。

安裝需在四張地圖的據點內持續 4 秒，防守方按住 4／F 拆除需 7 秒，拆到半程可保存給自己或隊友繼續。移動、死亡、離線、開選單、切武器或鬆開按鍵會中斷操作；伺服器要求持續心跳，不接受客戶端自報進度。已安裝後採伺服器 45 秒倒數，攻擊方全滅不會讓炸彈消失；引爆時範圍內雙方受致死傷害、留下屍體，逃遠者存活，攻擊方只取得一次回合勝利。成功拆除由防守方獲勝。

回合與換圖會重置 Spike，重連取得伺服器現有狀態與期限。需更新 Cloudflare 後端（health.features 包含 `spike`），全員重新整理並重新加入；正式 Worker 部署未由本機測試代替。詳細驗證與限制見 [多人後端說明](multiplayer/README.md#多人-spike)。

### 18 把現有模型與再生護盾

開放既有來源的全部 18 把槍：Classic、Shorty、Frenzy、Ghost、Sheriff、Stinger、Spectre、Bucky、Judge、Bulldog、Guardian、Phantom、Vandal、Marshal、Outlaw、Operator、Ares、Odin。原幾何資料不變，延續既有 Smite 呈現；沒有宣稱完整移植原版手部與換彈動畫。彈匣、備彈、射速、換彈與距離傷害參考固定版本 open-aim 的資料，售價及控制仍是本遊戲設定。

主武器與副武器分槽（1／2），商店內換購可退本次買入金額；副武器可右鍵退還。霰彈槍一發只扣一顆彈藥，實際送出有限的多彈丸序列；伺服器驗證順序、槍種、有效時間與射速，每顆至多造成一次傷害。為避免瞬間特效掉幀，每次只繪製前三顆的彈痕／衝擊與曳光。

再生護盾採使用者指定的 **25 護盾＋25 儲備**、價格 650：護盾存在時先吸收 100% 傷害，受傷後等 3 秒，以每秒 10 點從儲備回充，最高 25，沒有生命回復或無限儲備。這與來源參考的 25＋50 不同，介面明示 25＋25。支援單人與多人；多人由伺服器保管儲備及回充，不接受客戶端自報回滿。復活不送護盾／儲備；新回合補滿選定護盾，沿用此原型原有的回合補給規則，尚非原版完整經濟。

BANDIT 的名稱可在社群 API client 更新及武器輪盤找到，WARDEN 只核對到社群輪盤名單；本次未找到可驗證的幾何與數值，兩者在介面標示待核對，未以其他槍冒充。官方網站受目前環境外連規則阻擋，不能宣稱已完整核對最新官方槍庫。資料來源與限制見 [研究紀錄](docs/armory-reference.md)。多人後端需更新到 health.features 包含 armory，全員重新整理並重新加入。

### 購買頁素材

商店縮圖改用固定來源的 18 張槍枝 PNG，以及輕型、重型、再生護盾圖示，原始圖片位元組保留，詳細來源／雜湊見 assets/ui/buy/provenance.json。來源是 open-aim 第三方保存的遊戲美術，不是 Riot 官方下載或完整原版購買 UI。商店不再為了縮圖預先載入、排序並投影全部 18 個 3D 模型；第一人稱仍在裝備時載入相應模型。BANDIT／WARDEN 的模型與數值仍待核對。

重建素材：`python tools/export-buy-icons.py /path/to/open-aim`。本次只替換購買頁圖片與顯示，原版完整介面流程／動畫沒有取得。

### 商店排序與補彈

排列調整為 Bandit 在 Sheriff 前、Warden 在 Phantom 前，護盾順序為輕型 → 再生 → 重型。兩把待核對武器仍維持未開放。槍枝圖示、名稱、價格與擁有狀態共用置中軸線，空白的擁有狀態也保留固定高度。

本回合購買紀錄保留到下一回合，開槍不會失去退款資格。開商店後右鍵退款，再購買會取得全滿彈匣與備彈；點擊目前同一把已裝備武器也會免費補滿，不重複扣款。已進入遊玩的回合在重設時只結清紀錄，保留已買的槍，不自動退款或換回原槍；尚未開始遊玩的選單重設沿用取消未使用購買的規則。這是目前允許開啟商店時的原型規則，購買階段倒數／屏障仍未實作。


### Bot navigation and Sage placement update

Solo bots now random-walk from safe authored anchors at round start, with floor,
ledge, capsule and spacing checks, and randomly wear the available Jett/Sage/Iso/Clove rigs.
Tactical allies follow in a loose formation, share nearby last-seen contacts and
continue toward sites after the player dies. Both teams retain line-of-sight and
smoke checks before damaging enemies. Actual-map A* runs incrementally (20 node
expansions / 2.5 ms target per frame); map samples are cached, vision runs at about
5 Hz, character poses at 20 Hz, and every movement checks a swept capsule. This is
basic solo team AI, not the original game's full agent/Spike strategy or navmesh.

Sage walls sample the aimed floor rather than the caster's floor, validate each
section independently, retain supported sections beside obstacles, and lift agents
standing on their support floor while growing. Unsupported/obstructed sections
remain absent. Three-dimensional cast range and ceiling clearance still apply.
The Worker accepts validated four-section masks and preserves absent sections.

Plant detection now uses the same bounds, inclusive edges and floor-height bands
on client and Worker. Approach lanes, Haven C's unstriped courtyard and overlapping
upper/lower floors no longer count as sites. Reference and reconstruction limits:
[multiplayer/map-sites-reference.md](multiplayer/map-sites-reference.md). These are
reconstructed planting regions, not verified original game trigger volumes.


### Iso and Clove character appearances

The selector and solo bot appearance pool now include Iso and Clove alongside
Jett and Sage. Packed native character meshes, albedo/ORM maps and the shared
117-bone rig come from the same pinned open-aim source. The loader retains the
existing hitboxes, team outlines, locomotion, corpse and spectator behavior.
Network snapshots and reconnects preserve all four identities; old backends cannot
select the two new appearances until their `agent-models-4` feature is deployed.

Iso and Clove are appearance options with firearms, melee, movement and Spike;
their dedicated ability kits are not implemented. Their skill UI explicitly marks
this and cannot cast Sage/Jett abilities. First-person hands use the existing
authored mesh with per-agent sleeve/glove colours, not native full viewmodel rigs.
Agent-art source details: assets/ui/README.md; mesh hashes: assets/agents/provenance.json.


### Full available model catalog

All 28 complete character entries in the pinned open-aim `fD` table are now
exported and validated: Astra, Breach, Brimstone, Chamber, Clove, Cypher, Deadlock,
Fade, Gekko, Harbor, Iso, Jett, KAY/O, Killjoy, Miks, Neon, Omen, Raze, Reyna,
Sage, Skye, Sova, Tejo, Veto, Viper, Vyse, Waylay and Yoru. Phoenix has portrait
art but no complete mesh in this source, so no substitute model is advertised.
The historical `phoenix` wire identity continues to mean Sage.

The searchable character dialog replaces the four-button selector. Matching
portraits load lazily; native 3D meshes/textures load only for appearing characters.
Startup prewarming is limited to Jett/Sage, not the full catalog. Bot spawning,
remote actors, corpse rendering and spectator labels share the same catalog.
The backend advertises `agent-models-28`, retaining the previous four-role flag.
Roles beyond Jett/Sage remain appearance options without dedicated abilities.
Authored first-person hands are approximations, not original per-character rigs.


### Character selection stage

The picker now uses a full-screen composition with a central native 3D model,
actual teammate list, role/implemented-skill information, portrait rows and an
explicit confirmation action. Previewing, searching or cancelling does not change
the selected role; confirmation preserves backend capability checks. Dragging
rotates the model. No fabricated selection countdown or teammate identities are
shown. The roster still contains all 28 verified models.

The preview uses a separate scene capped at 30 FPS / one million render pixels,
pauses on close, and disposes its own cloned material textures when switching
models without disposing gameplay textures. It uses the existing rifle stance,
not original selection cinematics. Layout inspiration was inspected in public
community projects `arhmAli/Valorant-Agent-Menu-Idea` and
`fincci/valorant-agent-select-page`; these are community references, not verified
current Riot UI assets. No images or executable code were copied from those
projects. The blue stage background is authored CSS/geometry.


### Choose a role before entering gameplay

The first gameplay entry on a map or in a different room now opens character
selection before requesting fullscreen/pointer lock. Confirmation applies the
previewed role and starts gameplay in that same user gesture. Escape/cancel never
confirms a choice. Buying/resuming within the same session does not ask again;
manual appearance changes in the shop still work without starting the game.
A rematch invalidates the previous match selection, while reconnecting to the
same room retains it. Free roam and other gameplay entry buttons share the gate.

Four filters (Initiator / Controller, including the smoke-role label / Duelist /
Sentinel) combine with text search. All 28 verified models have a role identifier;
Miks is Controller and Veto is Sentinel. Each available role group contains seven
models. The existing ability-kit availability remains unchanged.
