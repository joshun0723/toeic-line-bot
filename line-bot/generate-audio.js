/**
 * generate-audio.js
 *
 * 幫「今日聽力短文」產生語音（mp3），內容是 data/toeic_daily_content.json
 * 裡 listening_scripts 當天輪到的那一篇，之後 GitHub Actions 會用 ffmpeg
 * 轉成 LINE 要求的 m4a 格式再上傳、當作聽力練習的音檔。
 *
 * 用的是 Google 翻譯背後的免費文字轉語音端點，沒有官方 API 保證、也不需要
 * 申請任何金鑰。這個端點單次請求的文字長度大約 200 字元左右會回傳 400 錯誤，
 * 而我們的聽力短文都超過這個長度，所以這裡會先把短文拆成幾段（每段控制在
 * 180 字元內、盡量從句尾斷開），分開請求語音後再把音檔接起來，避免超長
 * 就直接失敗。如果哪天這個端點整個失效或被擋，這支腳本會直接失敗結束——
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
const MAX_CHUNK_LEN = 180; // 留一點餘裕，避免壓線超過端點的限制

function loadContent() {
  const raw = fs.readFileSync(CONTENT_PATH, "utf-8");
  return JSON.parse(raw);
}

function pickToday(items) {
  // 跟 send-daily-word.js 用一模一樣的邏輯，確保語音內容跟當天推播的聽力題一致
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return items[dayIndex % items.length];
}

/**
 * 把長文字切成多段，每段盡量在句尾（. ! ?）斷開；如果單一句子本身就超長，
 * 再用空白斷詞硬切一次，確保每段都不超過 MAX_CHUNK_LEN。
 */
function splitIntoChunks(text, maxLen = MAX_CHUNK_LEN) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxLen) return [chunk];
    const words = chunk.split(" ");
    const subChunks = [];
    let buf = "";
    for (const w of words) {
      if ((buf + " " + w).trim().length > maxLen && buf) {
        subChunks.push(buf.trim());
        buf = w;
      } else {
        buf = (buf + " " + w).trim();
      }
    }
    if (buf) subChunks.push(buf.trim());
    return subChunks;
  });
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
            reject(new Error(`TTS 請求失敗，狀態碼 ${res.statusCode}（文字長度 ${text.length}）`));
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeSpeech(text) {
  const chunks = splitIntoChunks(text);
  console.log(`文字長度 ${text.length}，切成 ${chunks.length} 段分別請求語音`);

  const buffers = [];
  for (let i = 0; i < chunks.length; i++) {
    const buf = await fetchTTS(chunks[i]);
    buffers.push(buf);
    // 每段之間稍微停頓一下，避免太快連續請求被端點擋掉
    if (i < chunks.length - 1) await delay(300);
  }
  return Buffer.concat(buffers);
}

async function main() {
  const content = loadContent();
  const listening = pickToday(content.listening_scripts);

  const text = listening.script_en;
  console.log(`準備轉換語音（聽力主題：${listening.topic_zh}）：\n${text}`);

  const audioBuffer = await synthesizeSpeech(text);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, audioBuffer);
  console.log(`語音檔已產生：${OUTPUT_PATH}（${audioBuffer.length} bytes）`);
}

main().catch((err) => {
  console.error("語音產生失敗（不影響文字內容照常送出）：", err.message);
  process.exit(1);
});
