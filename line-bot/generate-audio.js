/**
 * generate-audio.js
 *
 * 幫「今日單字」產生一段語音（mp3），把當天的單字唸出來，
 * 之後 GitHub Actions 會用 ffmpeg 轉成 LINE 要求的 m4a 格式再上傳。
 *
 * 用的是 Google 翻譯背後的免費文字轉語音端點，沒有官方 API 保證、
 * 也不需要申請任何金鑰。如果哪天這個端點失效或被擋，這支腳本會
 * 直接失敗結束 —— 這是設計成「失敗就跳過語音，不影響當天文字單字照常送出」，
 * 所以流程上是安全的（見 .github/workflows/daily-line-word.yml 裡這步有標記
 * continue-on-error）。
 *
 * 輸出：audio/word-of-the-day.mp3
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const VOCAB_PATH = path.join(__dirname, "..", "data", "toeic_vocab.json");
const OUTPUT_PATH = path.join(__dirname, "..", "audio", "word-of-the-day.mp3");
const WORDS_PER_DAY = 3;

function loadVocab() {
  const raw = fs.readFileSync(VOCAB_PATH, "utf-8");
  return JSON.parse(raw).words;
}

function pickTodaysWords(words, count) {
  // 跟 send-daily-word.js 用一模一樣的邏輯，確保語音內容跟當天推播的文字單字一致
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const start = (dayIndex * count) % words.length;
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(words[(start + i) % words.length]);
  }
  return picked;
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
  const words = loadVocab();
  const todaysWords = pickTodaysWords(words, WORDS_PER_DAY);

  // Google 這個端點單次請求長度有限制，單字間用句號隔開，讓語音自然停頓
  const text = todaysWords.map((w) => w.word).join(". ") + ".";
  console.log("準備轉換語音的內容：", text);

  const audioBuffer = await fetchTTS(text);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, audioBuffer);
  console.log(`語音檔已產生：${OUTPUT_PATH}（${audioBuffer.length} bytes）`);
}

main().catch((err) => {
  console.error("語音產生失敗（不影響文字推播照常進行）：", err.message);
  process.exit(1);
});
