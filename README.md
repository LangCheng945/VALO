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
