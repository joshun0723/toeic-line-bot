/**
 * get-follower-id.js
 *
 * 比原本 get-my-user-id.js 更簡單的取得 User ID 方式：
 * 不需要 ngrok、不需要架 webhook。
 *
 * 原理：呼叫 LINE Messaging API 的「Get follower IDs」端點，
 * 列出所有已經把這個官方帳號加為好友的使用者 ID。
 * 因為目前應該只有你自己加了這個帳號為好友，
 * 所以印出來的那個 ID 就是你的 User ID。
 *
 * 使用前請先：
 *   1. 用手機 LINE 掃描 LINE Developers Console「Messaging API」分頁上的 QR code，
 *      把你的官方帳號加為好友
 *   2. 準備好「Channel access token（長期）」
 *
 * 使用方式（在自己電腦的 terminal 執行）：
 *   cd line-bot
 *   LINE_CHANNEL_ACCESS_TOKEN=貼上你的token node get-follower-id.js
 */

const https = require("https");

// .trim() 是為了去掉複製貼上時可能夾帶的空白或換行字元，
// 不加的話貼上時如果多了一個看不見的換行，會讓 HTTP 標頭出錯 (ERR_INVALID_CHAR)。
const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();

if (!token) {
  console.error(
    "請先設定環境變數 LINE_CHANNEL_ACCESS_TOKEN，例如：\n" +
      "LINE_CHANNEL_ACCESS_TOKEN=你的token node get-follower-id.js"
  );
  process.exit(1);
}

// 診斷用：檢查 token 裡有沒有 HTTP 標頭不允許的字元（例如中文字、換行、其他符號），
// 但不會把完整 token 印出來，只印長度和是哪一個位置出問題。
const badCharIndex = [...token].findIndex((ch) => {
  const code = ch.codePointAt(0);
  return !(code === 0x09 || (code >= 0x20 && code <= 0x7e) || (code >= 0x80 && code <= 0xff));
});

console.log(`(診斷) Token 長度：${token.length} 字元`);

if (badCharIndex !== -1) {
  const ch = [...token][badCharIndex];
  console.error(
    `\nToken 裡第 ${badCharIndex + 1} 個字元不是有效的英數字/符號（可能是中文字、全形符號，或看不見的換行字元）。\n` +
      "常見原因：\n" +
      "1. 指令裡的「你的Token」沒有被換成真正複製的那串英數字\n" +
      "2. 從網頁複製時不小心多複製到中文說明文字\n" +
      "3. 複製的內容裡夾了換行符號\n" +
      "請重新回到 LINE Developers Console，只選取 Token 那一串英數字（通常是一長串沒有空格、看起來像亂碼的字母數字），重新複製貼上一次。"
  );
  process.exit(1);
}

const options = {
  hostname: "api.line.me",
  path: "/v2/bot/followers/ids",
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
};

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    if (res.statusCode !== 200) {
      console.error(`API 回傳錯誤 ${res.statusCode}:`, body);
      console.error(
        "常見原因：Token 貼錯、Token 已過期，或還沒把官方帳號加為好友。"
      );
      process.exit(1);
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error("回傳內容解析失敗：", body);
      process.exit(1);
    }

    if (!data.userIds || data.userIds.length === 0) {
      console.log("目前沒有任何人加這個官方帳號為好友。");
      console.log("請先用手機 LINE 掃描 QR code 加好友，再重新執行這支腳本。");
      return;
    }

    console.log("找到以下 User ID：");
    data.userIds.forEach((id) => console.log(" - " + id));

    if (data.userIds.length === 1) {
      console.log("\n這就是你的 LINE User ID，請把它交給我，設定成 LINE_USER_ID。");
    } else {
      console.log("\n有不只一個 ID，請確認哪一個是你自己的帳號再交給我。");
    }
  });
});

req.on("error", (err) => {
  console.error("請求失敗：", err.message);
});

req.end();
