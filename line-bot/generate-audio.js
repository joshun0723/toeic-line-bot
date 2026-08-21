/**
 * generate-audio.js
 *
 * 幫「今日聽力短文」產生語音（mp3），內容是 data/toeic_daily_content.json
 * 裡 listening_scripts 當天輪到的那一篇，之後 GitHub Actions 會用 ffmpeg
 * 轉成 LINE 要求的 m4a 格式再上傳、當作聽力練習的音檔。
 *
 * 用的是 Google 翻譯背後的免費文字轉語音端點，沒有官方 API 保證、也不需要
 * 申請任何金鑰。如果哪天這個端點失效或被擋，這支腳本會直接失敗結束——
 * 這是設計成「失敗就跳過語音，不影響當天文字內容照常送出」，所以流程上
 * 是安全的（見 .github/workflows/daily-line-word.yml 裡這步有標記
 * continue-on-error）。
 *
 * 輸出：audio/word-of-the-day.mp3
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const CONTENT_PATH = path.join(__dirname, "..", "data", "toeic_daily_content.json");
const OUTPUT_PATH = path.join(__dirname, "..", "audio", "word-of-the-day.mp3");

function loadContent() {
  const raw = fs.readFileSync(CONTENT_PATH, "utf-8");
  return JSON.parse(raw);
}

function pickToday(items) {
  // 跟 send-daily-word.js 用一模一樣的邏輯，確保語音內容跟當天推播的聽力題一致
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return items[dayIndex % items.length];
}

function fetchTTS(text) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encoded}`;

    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`TTS 請求失敗，狀態碼 ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        }
      )
      .on("error", reject);
  });
}

async function main() {
  const content = loadContent();
  const listening = pickToday(content.listening_scripts);

  // Google 這個端點單次請求長度有限制（約200字），聽力短文控制在這個長度內
  const text = listening.script_en;
  console.log(`準備轉換語音（聽力主題：${listening.topic_zh}）：\n${text}`);

  const audioBuffer = await fetchTTS(text);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, audioBuffer);
  console.log(`語音檔已產生：${OUTPUT_PATH}（${audioBuffer.length} bytes）`);
}

main().catch((err) => {
  console.error("語音產生失敗（不影響文字內容照常送出）：", err.message);
  process.exit(1);
});
