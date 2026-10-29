# VALO

靜態網頁遊戲，使用 Three.js 與 Firebase Authentication / Cloud Firestore。

## 本機啟動

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

離線模式不需要 Firebase；前端套件與字型仍透過 CDN 載入，需要網路。

## 啟用多人連線

1. 在 Firebase Console 建立專案，新增「網頁」應用程式。
2. 在 Authentication → Sign-in method 啟用 Anonymous（匿名登入）。
3. 建立 Cloud Firestore 資料庫，並設定適當的存取規則。
4. 將專案設定中的公開 `firebaseConfig` 物件填入 `firebase-config.js`：

   ```js
   if (typeof window.__firebase_config === 'undefined') {
       window.__firebase_config = {
           apiKey: '你的網頁應用程式 API key',
           authDomain: '你的專案.firebaseapp.com',
           projectId: '你的專案 ID',
           appId: '你的網頁應用程式 ID'
       };
   }
   ```

   此設定會公開給瀏覽器；不要填入服務帳戶私鑰或管理員憑證。
5. 將實際網站網域加入 Authentication 的 Authorized domains；確認 API key 的網站限制允許這些網域。
6. 部署時一併發布 `index.html` 與 `firebase-config.js`。所有玩家必須使用同一個 Firebase 專案及 `__app_id`（預設 `default-app-id`）。

目前程式使用以下 Firestore 路徑：

- `artifacts/{appId}/public/data/val_rooms/{roomCode}`：房間狀態。
- `artifacts/{appId}/public/data/val_room_{roomCode}_players/{uid}`：玩家狀態。
- `artifacts/{appId}/public/data/val_room_{roomCode}_events/{eventId}`：聊天與戰鬥事件。

規則需允許登入玩家監聽對應房間、寫入自己的玩家狀態及送出事件。不要為正式網站開放整個資料庫的無條件讀寫。現有戰鬥事件由客戶端送出；正式公開對戰仍需額外的成員授權及防作弊設計。

驗證時使用兩個獨立瀏覽器或無痕視窗，確認兩邊 UID 不同，建立並加入同一房號，檢查成員、移動和聊天是否雙向同步。只有看到房號，不能代表資料庫已成功同步。

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
