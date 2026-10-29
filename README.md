# VALO

Three.js Ascent／Haven／Summit 訓練場。前端可使用 GitHub Pages／ChatGPT Sites；多人房間使用獨立 WebSocket 後端。

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

房間提供最多 10 人自由練習、20 Hz 狀態同步、射擊／傷害／擊殺、聊天、煙霧／牆／緩速同步、
五秒重生、短暫斷線重連。連線時停用各台電腦獨立的 AI 靶與裝拆包計時，避免各人看到不同狀態。
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
- **3** 切換 Smite 雷電槌；左鍵揮擊，**Y** 檢視。外觀依提供的參考圖以自製模型呈現。
- 切換武器會取消尚未完成的換彈，避免 ODIN 的較長換彈計時器修改其他武器的彈藥。

武器設定檢查：`node tests/test_weapons.cjs`。

## 完整 Ascent 模型

地圖已改為載入 GLB 場景與貼圖，取代先前程式產生的簡化庭院。模型約 13 MB，含約 233 萬個三角形；瀏覽器需解碼 KTX2 貼圖並建立碰撞索引，因此首次載入會顯示進度。載入完成前，進場按鈕停用；失敗時會提供重試。

來源為 [open-aim](https://github.com/unkwsr/open-aim) 的 Ascent 資產（其上游來源為 ishoutu 訓練器）。固定來源版本、檔案大小與 SHA-256 記於 [assets/ascent/provenance.json](assets/ascent/provenance.json)。地圖與貼圖屬 Riot Games；open-aim 的 MIT 授權不涵蓋地圖資產。本專案不聲稱擁有或獲得 Riot 官方授權。

- 場景保留原模型的建築、路線、貼圖與小地圖；以統一比例轉換配合現有玩家高度。
- 靜態物件依幾何、材質與空間分區合併為 InstancedMesh，使用世界邊界作視錐剔除。
- 牆壁、地面與階梯採三角形 BVH 和膠囊體檢查；不再以大方塊代替整間建築。
- 出生位置與訓練目標會檢查地面及身體空間，避免生在牆內。
- 自由跑圖與現有 ODIN、Smite、雷槌、蹲下和開鏡操作保留。
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
- Sage：C 冰牆、Q 緩速區、E 自我治療 30 HP／10 秒，45 秒冷卻。
  不再施放閃光、Jett 煙霧或飛刀。復活需連線倒地隊友，目前尚未實作。
- 重置訓練時補充技能／大絕；這是近似訓練行為，包含立即指定落點、單段冰牆，
  尚未重現完整投擲、裝備動畫、隊友治療與完整原版角色規則。

## ChatGPT Sites

`sites/` 為官方 create-sites 建立的新專案，保留現有網站與 DNS。
可建置完整地圖、槍械及音效，詳見 `sites/README.md`。
目前工作階段沒有 Sites 發佈工具／登入狀態；成功建置不代表已建立或上架 Sites。


### 購買階段退款與音效

同一次購買階段換主武器／護盾時，先退還該欄本次支付的金額，再檢查與扣除新裝備價格。
初始免費配給沒有退款金額；切回原有裝備不收費。Classic 不會取代主武器。
右鍵點擊本次購買的卡片，或按左側退款按鈕，可取消購買；成功進入戰場後不再退還已使用裝備。
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

新增地圖選單，可在 Ascent、Haven 與 Summit 之間切換；也可直接開啟 `?map=haven`。
Haven 使用完整 `triad` 場景 GLB、內嵌貼圖、原始碰撞與小地圖，約 11.6 MB 模型。
已設定雙方出生點、A／B／C 據點標示與訓練靶位置。
切換地圖會重新載入頁面，釋放上一張地圖資源並重置本次訓練。
安全落點只接受預期樓層附近的地板，遇到箱子會向四周找位置，避免落到地圖下方的底層碰撞面。

好友房間建立時固定地圖，加入者若正在另一張地圖會自動載入房間地圖並重新加入。
舊房間預設 Ascent；公共房間仍固定 Ascent。Haven 房需更新 Cloudflare 後端與遊戲客戶端，
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
Cloudflare 後端亦需更新；`/health` 的 maps 應包含 `summit`。

驗證：`node tests/test_summit_assets.cjs`、`node tests/test_summit_browser.cjs`、
`node tests/test_summit_multiplayer.cjs`。瀏覽器測試保留完整場景與碰撞，以單幀渲染檢查畫面。

Sunset 尚未加入：目前固定來源明確標示未提供，其他查到的工具需要本機遊戲 PAK 檔，
尚無可直接接入的完整場景。沒有用其他地圖冒充 Sunset。
