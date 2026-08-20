import vocabData from "../../assets/data/toeic_vocab.json";

/**
 * 回傳完整單字陣列
 */
export function getAllWords() {
  return vocabData.words;
}

/**
 * 跟 LINE bot (line-bot/send-daily-word.js) 相同的邏輯，
 * 確保 App 上看到的「今日單字」跟 LINE 推播的內容一致。
 */
export function getTodaysWords(count = 3) {
  const words = getAllWords();
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const start = (dayIndex * count) % words.length;
  const picked = [];
  for (let i = 0; i < count; i++) {
    picked.push(words[(start + i) % words.length]);
  }
  return picked;
}

/**
 * 從單字庫隨機取出 n 個字，用於出題（不重複）
 */
export function getRandomWords(n) {
  const words = [...getAllWords()];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.slice(0, n);
}
