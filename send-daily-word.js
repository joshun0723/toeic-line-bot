/**
 * send-daily-word.js
 *
 * 每天執行一次，組合當天的「晨間通勤讀書包」：
 *   - 單字（6個，來自 data/toeic_vocab.json）
 *   - 文法練習題（1題，來自 data/toeic_daily_content.json）
 *   - 閱讀短文＋理解題（1篇，來自 data/toeic_daily_content.json）
 *   - 聽力短文語音＋理解題（1篇，音檔由 generate-audio.js 產生）
 *   - 解答（文法/閱讀/聽力答案一起送出）
 * 透過 LINE Messaging API 的 Push Message 端點推播給 Jo。
 *
 * 需要的環境變數（不要寫死在程式碼裡，用 GitHub Actions Secrets 設定）：
 *   LINE_CHANNEL_ACCESS_TOKEN   - LINE Developers Console 取得的 Channel access token
 *   LINE_USER_ID                - 要推播對象的 User ID（自己的帳號）
 *   LINE_AUDIO_URL               - （選填）聽力音檔的公開網址，GitHub Actions 自動產生
 *   LINE_AUDIO_DURATION_MS       - （選填）聽力音檔長度（毫秒）
 *
 * 挑選邏輯：用「從 epoch 起經過的天數」對各類內容的總數量取餘數，
 * 這樣每天都不同、照順序循環，不需要額外的資料庫記錄進度。
 * 單字、文法、閱讀、聽力各自獨立循環（長度不同），所以組合久了不會一直重複。
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const VOCAB_PATH = path.join(__dirname, "..", "data", "toeic_vocab.json");
const CONTENT_PATH = path.join(__dirname, "..", "data", "toeic_daily_content.json");
const WORDS_PER_DAY = 6;
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LETTERS = ["A", "B", "C", "D"];

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function dayIndex() {
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
}

function pickWords(words, count) {
  const start = (dayIndex() * count) % words.length;
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(words[(start + i) % words.length]);
  }
  return picked;
}

function pickToday(items) {
  return items[dayIndex() % items.length];
}

function formatOptions(options) {
  return options.map((opt, i) => `　(${LETTERS[i]}) ${opt}`).join("\n");
}

function buildVocabAndGrammarAndReadingMessage(words, grammar, reading) {
  const lines = [`📚 晨間讀書包 (${new Date().toISOString().slice(0, 10)})`, ""];

  lines.push("── 單字 ──");
  words.forEach((w, idx) => {
    lines.push(`${idx + 1}. ${w.word} (${w.pos}) ${w.meaning_zh}`);
    lines.push(`　${w.example_en}`);
  });

  lines.push("", "── 文法練習 ──");
  lines.push(`重點：${grammar.topic}`);
  lines.push(grammar.explanation_zh);
  lines.push(`例句：${grammar.example_en}`);
  lines.push("");
  lines.push("練習題：");
  lines.push(grammar.question_stem);
  lines.push(formatOptions(grammar.options));

  lines.push("", "── 閱讀 ──");
  lines.push(`【${reading.title_zh}】`);
  lines.push(reading.passage_en);
  reading.questions.forEach((q, i) => {
    lines.push("");
    lines.push(`Q${i + 1}. ${q.q}`);
    lines.push(formatOptions(q.options));
  });

  lines.push("", "🎧 聽力練習音檔在下一則訊息，聽完再看下下則的題目喔！");

  return lines.join("\n");
}

function buildListeningQuestionMessage(listening) {
  const lines = [`🎧 聽力理解（主題：${listening.topic_zh}）`, ""];
  listening.questions.forEach((q, i) => {
    lines.push(`Q${i + 1}. ${q.q}`);
    lines.push(formatOptions(q.options));
    lines.push("");
  });
  lines.push("答案在下一則訊息，建議先自己作答完再看喔！");
  return lines.join("\n");
}

function buildAnswerKeyMessage(grammar, reading, listening) {
  const lines = ["✅ 今日解答", ""];

  lines.push("【文法】");
  lines.push(`正解：(${LETTERS[grammar.correct_index]}) ${grammar.options[grammar.correct_index]}`);
  lines.push(grammar.answer_explanation_zh);

  lines.push("", "【閱讀】");
  reading.questions.forEach((q, i) => {
    lines.push(`Q${i + 1} 正解：(${LETTERS[q.correct_index]}) ${q.options[q.correct_index]}`);
  });

  lines.push("", "【聽力】");
  listening.questions.forEach((q, i) => {
    lines.push(`Q${i + 1} 正解：(${LETTERS[q.correct_index]}) ${q.options[q.correct_index]}`);
  });

  lines.push("", "今天也辛苦了，明天通勤時間見 💪");
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

  const vocabData = loadJSON(VOCAB_PATH);
  const content = loadJSON(CONTENT_PATH);

  if (!Array.isArray(vocabData.words) || vocabData.words.length === 0) {
    throw new Error("單字庫是空的，請確認 data/toeic_vocab.json");
  }

  const words = pickWords(vocabData.words, WORDS_PER_DAY);
  const grammar = pickToday(content.grammar_points);
  const reading = pickToday(content.reading_passages);
  const listening = pickToday(content.listening_scripts);

  const messages = [
    { type: "text", text: buildVocabAndGrammarAndReadingMessage(words, grammar, reading) },
  ];

  // 語音是選擇性附加的：如果當次執行有成功產生語音並上傳，
  // GitHub Actions 會傳入這兩個環境變數；沒有的話（例如語音產生失敗）
  // 就跳過語音跟聽力題目訊息，只送文字＋解答，不會讓整次推播失敗。
  const audioUrl = (process.env.LINE_AUDIO_URL || "").trim();
  const audioDurationMs = parseInt(process.env.LINE_AUDIO_DURATION_MS || "", 10);
  const hasAudio = audioUrl && Number.isFinite(audioDurationMs) && audioDurationMs > 0;

  if (hasAudio) {
    messages.push({
      type: "audio",
      originalContentUrl: audioUrl,
      duration: audioDurationMs,
    });
    messages.push({ type: "text", text: buildListeningQuestionMessage(listening) });
    console.log(`附加聽力語音：${audioUrl}（長度 ${audioDurationMs}ms）`);
  } else {
    console.log("本次沒有聽力語音（語音產生失敗或跳過），只送文字內容。");
  }

  messages.push({ type: "text", text: buildAnswerKeyMessage(grammar, reading, listening) });

  console.log(`本次共送出 ${messages.length} 則訊息`);
  await pushMessages(token, userId, messages);
  console.log("推播成功！");
}

main().catch((err) => {
  console.error("推播失敗：", err.message);
  process.exit(1);
});
