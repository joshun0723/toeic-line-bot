/**
 * send-daily-word.js
 *
 * 每天執行一次，從共用單字庫挑出「今天的單字」，
 * 透過 LINE Messaging API 的 Push Message 端點推播給 Jo。
 *
 * 需要的環境變數（不要寫死在程式碼裡，用 GitHub Actions Secrets 設定）：
 *   LINE_CHANNEL_ACCESS_TOKEN  - LINE Developers Console 取得的 Channel access token
 *   LINE_USER_ID               - 要推播對象的 User ID（自己的帳號）
 *
 * 挑字邏輯：用「從今天算起經過的天數」對單字總數取餘數，
 * 這樣可以確保每天不同、且會照順序循環，不需要額外的資料庫記錄進度。
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const VOCAB_PATH = path.join(__dirname, "..", "data", "toeic_vocab.json");
const WORDS_PER_DAY = 3;
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

function loadVocab() {
  const raw = fs.readFileSync(VOCAB_PATH, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.words) || data.words.length === 0) {
    throw new Error("單字庫是空的，請確認 data/toeic_vocab.json");
  }
  return data.words;
}

function pickTodaysWords(words, count) {
  // 用 UTC 日期算出「從 epoch 起的第幾天」，確保每天固定、不會重覆推播同一天內容
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const start = (dayIndex * count) % words.length;
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(words[(start + i) % words.length]);
  }
  return picked;
}

function formatMessage(words) {
  const lines = [`📚 今日多益單字 (${new Date().toISOString().slice(0, 10)})`, ""];
  words.forEach((w, idx) => {
    lines.push(`${idx + 1}. ${w.word} (${w.pos})`);
    lines.push(`　${w.meaning_zh}`);
    lines.push(`　例句: ${w.example_en}`);
    lines.push(`　　${w.example_zh}`);
    lines.push("");
  });
  lines.push("加油！離滿分更近一步 💪");
  return lines.join("\n");
}

function pushMessages(token, userId, messages) {
  const payload = JSON.stringify({
    to: userId,
    messages,
  });

  const url = new URL(LINE_PUSH_URL);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`LINE API 回傳錯誤 ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  // .trim() 避免複製貼上夾帶看不見的空白或換行字元導致 HTTP 標頭出錯
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  const userId = (process.env.LINE_USER_ID || "").trim();

  if (!token || !userId) {
    console.error(
      "缺少環境變數 LINE_CHANNEL_ACCESS_TOKEN 或 LINE_USER_ID。\n" +
        "本機測試可用：LINE_CHANNEL_ACCESS_TOKEN=xxx LINE_USER_ID=yyy node send-daily-word.js\n" +
        "正式排程請在 GitHub Actions Secrets 中設定。"
    );
    process.exit(1);
  }

  const words = loadVocab();
  const todaysWords = pickTodaysWords(words, WORDS_PER_DAY);
  const message = formatMessage(todaysWords);

  console.log("準備推播內容：\n" + message);

  const messages = [{ type: "text", text: message }];

  // 語音檔是選擇性附加的：如果當次執行有成功產生語音並上傳，
  // GitHub Actions 會傳入這兩個環境變數；沒有的話（例如語音產生失敗）
  // 就只送文字，不會讓整次推播失敗。
  const audioUrl = (process.env.LINE_AUDIO_URL || "").trim();
  const audioDurationMs = parseInt(process.env.LINE_AUDIO_DURATION_MS || "", 10);

  if (audioUrl && Number.isFinite(audioDurationMs) && audioDurationMs > 0) {
    messages.push({
      type: "audio",
      originalContentUrl: audioUrl,
      duration: audioDurationMs,
    });
    console.log(`附加語音訊息：${audioUrl}（長度 ${audioDurationMs}ms）`);
  } else {
    console.log("本次沒有附加語音訊息（只送文字）。");
  }

  await pushMessages(token, userId, messages);
  console.log("推播成功！");
}

main().catch((err) => {
  console.error("推播失敗：", err.message);
  process.exit(1);
});
