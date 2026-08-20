/**
 * get-my-user-id.js
 *
 * 一次性小工具：用來查出你自己的 LINE User ID。
 *
 * 用法：
 *   1. npm install express（或用下面「不需要 npm」的替代方案，見 README）
 *   2. 設定環境變數 LINE_CHANNEL_SECRET
 *   3. 執行 node get-my-user-id.js，這會啟動一個本機伺服器監聽 LINE Webhook
 *   4. 需要搭配 ngrok 之類的工具把本機服務暴露到公開網址，
 *      並在 LINE Developers Console 的 Webhook URL 設定該網址
 *   5. 用手機 LINE 傳一則訊息給你的官方帳號（Bot）
 *   6. Terminal 會印出你的 User ID
 *
 * 如果覺得這個流程麻煩，更簡單的替代方案：
 *   直接在 LINE Official Account Manager 的「聊天」頁面，
 *   點開你和 Bot 的對話紀錄，有些介面會顯示或可以匯出使用者 ID；
 *   或是請告訴 Claude，由 Claude 提供另一個更簡單的一次性驗證連結方案。
 */

const http = require("http");
const crypto = require("crypto");

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const PORT = process.env.PORT || 3000;

if (!CHANNEL_SECRET) {
  console.error("請先設定環境變數 LINE_CHANNEL_SECRET");
  process.exit(1);
}

function verifySignature(body, signature) {
  const hash = crypto
    .createHmac("SHA256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(200);
    res.end("OK");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const signature = req.headers["x-line-signature"];
    if (!verifySignature(body, signature)) {
      console.warn("簽章驗證失敗，忽略此請求");
      res.writeHead(200);
      res.end("OK");
      return;
    }

    try {
      const payload = JSON.parse(body);
      for (const event of payload.events || []) {
        if (event.source && event.source.userId) {
          console.log("=================================");
          console.log("你的 LINE User ID 是:", event.source.userId);
          console.log("=================================");
        }
      }
    } catch (err) {
      console.error("解析訊息失敗:", err.message);
    }

    res.writeHead(200);
    res.end("OK");
  });
});

server.listen(PORT, () => {
  console.log(`Webhook 伺服器已啟動，監聽 port ${PORT}`);
  console.log("接下來請用 ngrok 等工具把這個 port 暴露到公開網址，並設定為 LINE Webhook URL");
});
