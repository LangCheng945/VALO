# ValoNow 區域網路多人

## Windows 10／11 房主

解壓縮完整的 ValoNow-LAN-Windows.zip，保留 game 資料夾，雙擊 Start-LAN.cmd。
也可在命令提示字元執行：

    ValoNow-LAN.exe --host 0.0.0.0 --port 8787

不用安裝 Node.js，不需要管理員權限啟動。若獨立執行檔無法啟動，可雙擊 Start-LAN-Portable-Node.cmd；它使用隨附的官方 node.exe，同樣不用安裝 Node.js。

視窗會列出網址，例如 http://192.168.1.20:8787/?network=lan。房主與同學都開啟這個網址，在「區域網路多人（LAN）」建立房間，再把六碼房號告訴同學加入。每房最多 10 人。房主的伺服器視窗必須持續開著。

--host 指定監聽 IP（預設 0.0.0.0）；--port 指定連接埠（預設 8787）；--root 指定遊戲資料夾。

## 原始碼啟動

安裝 Node.js 22 以上，在專案根目錄執行：

    npm --prefix lan ci --omit=dev
    node lan/cli.mjs --host 0.0.0.0 --port 8787 --root .

Windows 也可以使用 lan\start-windows.cmd。macOS／Linux 可用同樣的 Node.js 指令。

## 瀏覽器與校園網路

請從房主提供的 LAN 網址開啟遊戲，這樣網頁、HTTP API 與 WS 都在同一來源。不要從 https://valonow.langcheng.uk 直接連接 http://192.168.x.x；線上網站的 LAN 選單會提供導向 LAN 網頁的連結，而不會嘗試繞過 mixed content／私人網路權限限制。

如學校要求 HTTPS，可指定由學校或受信任 CA 核發、涵蓋該主機名稱的憑證：

    ValoNow-LAN.exe --port 8787 --cert server.pem --key server-key.pem

瀏覽器會自動使用 WSS。若 Chrome 顯示存取區域網路的權限提示，須按學校政策允許；拒絕時無法連線，程式不會跳過權限檢查。自行簽發而未被同學電腦信任的憑證會失敗；程式不會關閉 TLS 驗證或指示同學略過警告。

若無法連入，先確認 IP、Port、房主視窗仍開著、雙方在允許互連的網段。Windows 防火牆或學校 VLAN／無線隔離可能禁止入站連線；需要時請請管理員按學校規定處理。程式不會新增防火牆規則，也不會提升權限或規避限制。

## 資料與限制

所有房間、玩家、技能、回合與重連票券都保存在房主記憶體，不使用 Cloudflare Durable Objects、SQL 或外部帳號。遊戲資料由封裝附帶的 game 資料夾提供，LAN 遊玩不需要 Cloudflare 遊戲 API。

位置同步約 15 Hz、伺服器快照最多 20 Hz，沿用客戶端插值；重複狀態會省略，LAN 客戶端使用玩家差量快照，WebSocket 支援壓縮。重要事件仍由現有共同規則驗證。

玩家短暫斷線可自動重連，票券約保留 60 秒。伺服器關閉會通知玩家；房主關閉程式或電腦後，所有房間資料消失。沒有房主遷移或跨重啟存檔。

獨立 exe 為跨平台建置，未數位簽章；本次未在實體 Windows 電腦驗證。若學校不允許執行未核准程式，請由管理員確認後使用。不同實體學校電腦之間的連線仍須在現場驗收。

## v1.1.1 角色技能更新

新增 Phoenix、Chamber、Deadlock、Gekko、Harbor、KAY/O、Miks、Tejo、Veto、Waylay、Yoru 的 44 個技能。請房主下載新版完整包並重新啟動，所有同學開啟房主提供的 LAN 網址；不要只更新公開網站。舊伺服器會提示更新，原本模式仍可使用。

操作、測試與還原限制見 `docs/agent-batch-abilities.md`。
