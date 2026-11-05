# GitHub 技能素材核對（2026-11-05）

此文件記錄最初的來源調查。後續已接入的項目與實際限制，見 [source-ability-integration.md](source-ability-integration.md)。

## open-aim：確實有可用技能素材

核對完整 Git tree，固定版本：
https://github.com/unkwsr/open-aim/tree/807f55721e64ca457d763c64a4a1de7b11e5f3eb/site/aim-viewmodel

| 技能 | 實際檔案 | 可用內容與限制 |
| --- | --- | --- |
| Skye 飛鷹 | `flashfx.sky.json`（205,515 bytes） | 飛鷹模型 2,016 頂點／3,108 三角形；召喚、飛行光暈、閃光與消散，共 6 組系統。只有靜態幾何，未提供骨架拍翅動畫。 |
| Reyna 致盲眼 | `flashfx.rey.json`（359,845 bytes） | 眼球、球殼、光環與飄帶，共 10 個幾何模型；投射、生成、摧毀 3 組系統。 |
| Vyse 閃光花 | `flashfx.vys.json`（176,801 bytes） | 花朵模型 2,248 頂點／3,837 三角形；啟動、閃光、消散，共 4 組系統。模型名稱帶 VAT，但未確認有完整 VAT 動畫貼圖，不可直接宣稱原版展開動畫可用。 |
| Breach 閃光 | `flashfx.brc.json`（14,403 bytes） | 投射、預告、爆閃 3 組粒子系統；沒有技能機械臂模型。 |
| Jett 煙霧 | `smoke-jett-enemy.73177dc412.json` + `smoke-jett.0ba43fd2d2.bin` | 4 個網格、12 份 GLSL 材質、12 張內嵌影像；包含持續、消散預告及結束階段。實際只有敵方版本。 |
| Omen 煙霧 | `smoke-omen-ally.8d8898e624.json`、`smoke-omen-enemy.44b29d3c54.json` + `smoke-omen.ad2e865c05.bin` | 共用 5 個網格、8 份 GLSL 材質、13 張影像；有敵我兩種參數。 |

另外有 36 個 `flashfx.tex.*` 貼圖檔案。

### 繪製程式也存在，但需要移植

`site/next/js/OkAdunfX.js` 含飛鷹、眼球、花朵等 shader 對應與貼圖設定，例如 `skyHawk`、`eyeGlobe`、`vysRose`。
`site/next/js/CnrSARj_.js` 含煙霧資源載入與繪製程式。它們是已打包的應用程式模組，並非獨立 Three.js 插件。
煙霧 GLSL 使用 WebGL2、uniform buffer 及特定頂點屬性；需要轉接材質、資料格式與粒子生命週期，不能直接丟進現有場景。

程式還引用 Brimstone、Astra、Clove 等煙霧檔名，但完整 tree 並沒有那些檔案，也沒有 Jett 友方煙霧 JSON。只有程式中的名字，不算可用資源。

### 核對結果與建議

- 已下載上述 4 個 flash JSON、3 個煙霧 JSON、2 個煙霧 binary 作研究。
- 四份 flash JSON 的模型位置數值均為有限數，索引均落在頂點範圍內。
- 本機研究資料位於 `/tmp/valo-skill-audit/`，非正式網站依賴。
- 優先替換 Skye 飛鷹、Reyna 眼球；再處理 Jett／Omen 世界煙霧的 renderer 轉接。
- 現有 Killjoy 裝置與拘束動作、Jett 丟煙手勢是已接入的舊素材；本次找到的世界煙霧特效是另外一批。
- 以上不是完整技能遊戲邏輯；命中、遮蔽、冷卻、傷害與多人同步仍需由 VALO 實作。
- 來源 JSON 聲稱效果由遊戲粒子資料整理；此為來源作者的說明，不是 Riot 官方開發套件。

## Valorant-3D-Immersive-Guide：沒有完整技能包

固定版本：
https://github.com/abdullah-nadeem-lodhi/Valorant-3D-Immersive-Guide/tree/0813765657a56d5722760dd0db3a47ac22dc6876

實際檢查 `AgentVisual.jsx`、`AbilityCard.jsx`、`agents.js`、`ParticleField.jsx`：

- 公開模型仍是 Jett／Phoenix／Sage／Sova 四份完整人物；部分附屬道具先前已抽出接入。
- AbilityCard 和 agents.js 是技能名稱、介紹與提示，不含可施放實作。
- AgentVisual 播放模型中的第一段動畫，沒有逐項技能施法系統。
- ParticleField 是展示用的風、火星、螺旋粒子，不是技能道具或完整戰鬥特效。
- 在這兩個儲存庫中，未找到 Phoenix 火球、火牆、閃光與大招的完整獨立素材包。
