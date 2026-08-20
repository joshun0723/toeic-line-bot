# Jo 的語言學習 App 專案 — Phase 1

Phase 1 交付內容：多益進階單字庫、LINE 每日單字推播、Expo 手機 App 雛形（單字卡 + 限時模擬測驗）。
完整規劃請看專案文件庫裡的「語言學習 App 專案藍圖」和「LINE Official Account + Messaging API 申請教學」。

## 資料夾結構

```
language-app/
├── data/
│   └── toeic_vocab.json        # 共用單字庫（多益進階字彙/片語動詞/商用英文）
├── line-bot/
│   ├── send-daily-word.js      # 每日推播主程式（文字＋語音）
│   ├── generate-audio.js       # 產生當天單字的語音檔（mp3）
│   ├── get-follower-id.js      # 查詢你的 LINE User ID（推薦用這個）
│   ├── get-my-user-id.js       # 查 User ID 的備用方式（webhook，較複雜）
│   └── package.json
├── audio/                      # GitHub Actions 自動產生/更新，不用手動放東西進去
├── mobile-app/                 # Expo (React Native) App
│   ├── App.js
│   ├── src/
│   │   ├── data/vocab.js
│   │   └── screens/ (Home / Flashcard / Quiz)
│   └── assets/data/toeic_vocab.json
└── .github/workflows/
    └── daily-line-word.yml     # GitHub Actions 每日排程
```

## 1. 手機 App 怎麼試玩

App 是用 Expo 寫的，不需要先申請 Apple/Google 開發者帳號就能在自己手機上跑：

1. 手機安裝 **Expo Go** App（App Store / Google Play 都有，免費）
2. 在自己電腦上（不是這個雲端環境）：
   ```bash
   cd mobile-app
   npm install
   npx expo start
   ```
3. Terminal 會顯示一個 QR code，用手機 Expo Go App 掃描，就會直接在手機上打開這個 App
4. 目前有三個畫面：首頁、單字卡、限時模擬測驗（10題，每題20秒，練習多益後段答題節奏）

> 之後如果想正式上架 App Store / Google Play，同一個 Expo 專案可以直接 `eas build` 打包，不用重寫。

## 2. LINE 每日單字怎麼設定成「全自動」

⚠️ **重要**：因為加了語音功能（見下方第4節），這個 repo 必須設成 **Public（公開）**，
不能是 Private。原因是 LINE 的伺服器要能直接讀取語音檔的網址，Private repo 的檔案
沒辦法讓外部（LINE）存取。repo 裡不會有任何密碼/金鑰（那些是另外存在 GitHub
Secrets，跟 repo 內容是分開的兩個地方），公開的只有程式碼、單字資料、和每天的語音檔，
所以設 Public 是安全的，只是要知道這件事。

1. 先照專案文件「LINE Official Account + Messaging API 申請教學」申請帳號，拿到
   `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_USER_ID`（這步你已經完成了）
2. 到 https://github.com/new 建立一個新 repository：
   - Repository name 取一個名字，例如 `toeic-line-bot`
   - Visibility 選 **Public**
   - 不用勾選 "Add a README file"（我們已經有了）
   - 按 **Create repository**
3. 建好之後，網頁會停在一個空的 repo 頁面，找 **"uploading an existing file"** 這個連結
   （通常在頁面中間），點下去
4. 把 `language-app` 資料夾**裡面的所有東西**（`data/`、`line-bot/`、`mobile-app/`、
   `.github/`、`README.md` 這些）整個拖進瀏覽器的上傳區塊（不是拖 language-app
   這個資料夾本身，是拖它裡面的內容），等上傳完按 **Commit changes**
   > 如果瀏覽器拖曳資料夾有問題，也可以改用 Terminal 跑 git 指令上傳，需要的話跟我說
5. 到 repo 的 **Settings → Secrets and variables → Actions → New repository secret**，
   新增兩個 Secrets（名稱要完全一樣）：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_USER_ID`
6. 設定完成後，`.github/workflows/daily-line-word.yml` 會每天早上 8 點（日本時間）
   自動執行，透過 LINE 傳送當天的 3 個單字 + 一段語音給你
7. 想立刻測試不用等到明天：到 repo 的 **Actions** 頁籤 → 選 "Daily LINE TOEIC Word"
   → 按 **Run workflow** 手動觸發一次，可以在執行紀錄裡看每個步驟有沒有成功

### 本機測試（可選，純文字，不含語音）
```bash
cd line-bot
LINE_CHANNEL_ACCESS_TOKEN=你的token LINE_USER_ID=你的userID node send-daily-word.js
```

## 3. 單字庫怎麼擴充

直接編輯 `data/toeic_vocab.json`，依照現有格式新增物件即可（記得同步複製一份到 `mobile-app/assets/data/toeic_vocab.json`，讓 App 內容保持同步）。之後商用英文、日文的內容也會用類似的 JSON 結構擴充。

## 4. 每天的「晨間讀書包」內容（給約45分鐘通勤用）

考量到每天通勤時間比較長，每日推播已經從單純的3個單字，擴充成涵蓋多益四大項目的完整內容，
資料來源是 `data/toeic_daily_content.json`（文法/閱讀/聽力）+ `data/toeic_vocab.json`（單字）。
每天總共會收到 3-4 則 LINE 訊息：

1. **文字訊息**：6個單字 + 1題文法練習（含解說跟練習題）+ 1篇閱讀短文（含2題理解題），先不附答案
2. **語音訊息**：當天聽力短文的發音（GitHub Actions 自動產生，見下方運作方式）
3. **文字訊息**：聽力理解題目
4. **文字訊息**：文法／閱讀／聽力的完整解答

單字、文法、閱讀、聽力各自獨立循環（單字50個/文法10個/閱讀8篇/聽力8篇），組合起來要一段時間才會重複。

**語音怎麼運作**：GitHub Actions 每天會（1）用免費文字轉語音服務把當天聽力短文唸出來存成 mp3、
（2）用 `ffmpeg` 轉成 LINE 要求的 m4a 格式、（3）把音檔提交回 repo 產生公開網址、（4）連同文字
一起推播。這個語音服務沒有官方保證，如果哪天失效，**只會沒有語音，其他文字內容照常送達**。

**LINE 免費訊息額度提醒**：LINE 官方帳號的免費方案每月有推播則數上限（目前約200則）。
現在每天用 3-4 則，一個月大約 90-120 則，還有余裕，但如果你之後常常手動 Run workflow 測試，
或想再加更多內容，記得留意 LINE Official Account Manager 後台的「訊息數」用量，額度快用完
時可以考慮升級方案或減少推播則數。

## 5. 單字/文法/閱讀/聽力內容怎麼擴充

- 單字：編輯 `data/toeic_vocab.json`（記得同步複製一份到 `mobile-app/assets/data/toeic_vocab.json`）
- 文法/閱讀/聽力：編輯 `data/toeic_daily_content.json`，依現有格式新增物件即可
- 之後商用英文、日文的內容也會用類似的 JSON 結構擴充

## 已知限制（Phase 1）
- App 目前還沒有把文法/閱讀/聽力題型加進去，只有單字卡和限時模擬題（Phase 2 會同步進 App）
- 沒有雲端帳號系統，學習紀錄不會跨裝置同步（目前測驗結果只在單次使用時顯示）
- repo 需要是 Public 才能讓語音功能運作（詳見上方第2節說明）
