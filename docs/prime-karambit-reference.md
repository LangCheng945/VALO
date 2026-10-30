# 紫金爪刀對照狀態

日期：2026-10-30。

## 已核對的範圍

直接來源是使用者提供的 512 × 280 紫金爪刀圖片。以尾環中心約 (448,54) 為原點，依圖描出金色外輪廓、黑色握柄、銀色折面和鉤刃；像素點到模型單位的轉換為每像素 0.00062。`karambit.js` 保留這些輪廓點，便於對照。修正先前握柄過長、刀身過窄、輪廓過直及銀色刀面不足的問題。畫面名稱改為「紫金爪刀 PRIME//2.0 KARAMBIT」。模型仍是自製近似，並非擷取的官方模型。

## 尚未完成的範圍

尚未核對原版切刀、展示影片及不同升級等級的動作差異。現有 0.68 秒展刃和 2.2 秒兩圈旋轉是自製動作，不能視為官方動作或官方時間。此次沒有宣稱或新增經影片確認的原版動作。

直接讀取以下參考頁時，環境網路代理回傳 403，無法查看內容：

- https://playvalorant.com/en-us/news/dev/prime-2-0-skin-line/
- https://valorant.fandom.com/wiki/Prime//2.0_Collection

另查詢了可讀的 GitHub 模型庫 `64fade/valorant-3d-models`，目前只有 Fade 角色，未找到可核對的紫金爪刀模型或動畫。未將下載來源的描述當作實際看過影片的證據。

已成功儲存環境連線設定草稿，保留原有五個自訂網域，新增官方、Wiki 與 YouTube 參考所需網域；草稿不會立即套用，需使用者在環境設定檢查、儲存並發布。狀態工具仍顯示原有允許清單，所以影片核對仍待處理。

## 驗證

`node --test tests/test_karambit_rules.mjs`、`node tests/test_karambit_browser.cjs`、`node tests/test_weapons.cjs` 通過；Sites build 與 lint 通過。這些驗證功能、shader、展刃與旋轉可正常中斷／回位，不證明與原版動畫一致。
