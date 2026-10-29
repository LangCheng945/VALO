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
