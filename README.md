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

## Ascent 風格重建版與訓練主頁

這一版使用程式自建場景，包含 A／B 點、A Main／B Main、中路、Tree／Market 通道、A 點高台樓梯，以及鐘塔、圓頂、瓦屋頂與陽台。它不是原作等比例地圖，不適合作為正式對戰的距離、報位或投擲物落點依據。未包含或轉載 SpikeAtlas 的地圖模型、貼圖或程式碼。

- **自由跑圖**：不計時、不生成敵人，可探索路線。
- **預瞄定位／移動追蹤**：60、90、120 秒或不限時訓練；即時顯示擊殺、命中率和爆頭率。統計來自實際射擊與命中，不含近戰或技能飛刀。
- 購買頁暫停訓練計時；時間到後顯示本輪結果。
- 靈敏度、訓練時間、完成次數與最佳擊殺只保存在使用者瀏覽器的 localStorage。
- 戰術模式保留 AI 反擊，A、B 區域都可裝包。樓梯和高台具有碰撞與高度支援。
- 裝飾細節依材質合併為 instanced mesh，降低繪製次數。

本輪參考 [SpikeAtlas 訓練器](https://spikeatlas.com/zh-tw/trainer/) 的訓練流程與 Ascent 建築語彙；該站的完整模型未提供公開再散布授權，因此沒有加入此專案。

訓練統計與階梯支援檢查：`node tests/test_trainer.cjs`。
