import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { getRandomWords, getAllWords } from "../data/vocab";

const QUESTION_COUNT = 10;
const SECONDS_PER_QUESTION = 20; // 模擬多益後段閱讀題的時間壓力

function buildQuestions() {
  const allWords = getAllWords();
  const chosen = getRandomWords(QUESTION_COUNT);

  return chosen.map((word) => {
    const distractorPool = allWords.filter((w) => w.id !== word.id);
    const distractors = [];
    const usedIdx = new Set();
    while (distractors.length < 3 && distractors.length < distractorPool.length) {
      const idx = Math.floor(Math.random() * distractorPool.length);
      if (!usedIdx.has(idx)) {
        usedIdx.add(idx);
        distractors.push(distractorPool[idx].meaning_zh);
      }
    }
    const options = [word.meaning_zh, ...distractors];
    // 洗牌選項
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      word: word.word,
      pos: word.pos,
      correctAnswer: word.meaning_zh,
      options,
    };
  });
}

export default function QuizScreen({ onNavigate }) {
  const questions = useMemo(() => buildQuestions(), []);
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]); // { correct: bool, timedOut: bool, timeUsed: number }
  const [finished, setFinished] = useState(false);

  const current = questions[qIndex];

  const goNext = useCallback(
    (record) => {
      setResults((prev) => [...prev, record]);
      if (qIndex + 1 >= questions.length) {
        setFinished(true);
      } else {
        setQIndex((i) => i + 1);
        setSecondsLeft(SECONDS_PER_QUESTION);
        setSelected(null);
      }
    },
    [qIndex, questions.length]
  );

  useEffect(() => {
    // 一旦選了答案就暫停倒數，避免在切換到下一題的過渡期間繼續扣秒數
    if (finished || selected) return;
    if (secondsLeft <= 0) {
      goNext({ correct: false, timedOut: true, timeUsed: SECONDS_PER_QUESTION });
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, finished, selected, goNext]);

  function handleSelect(option) {
    if (selected) return; // 防止重複點擊
    setSelected(option);
    const timeUsed = SECONDS_PER_QUESTION - secondsLeft;
    const correct = option === current.correctAnswer;
    setTimeout(() => goNext({ correct, timedOut: false, timeUsed }), 500);
  }

  if (finished) {
    const correctCount = results.filter((r) => r.correct).length;
    const timedOutCount = results.filter((r) => r.timedOut).length;
    const avgTime =
      results.reduce((sum, r) => sum + r.timeUsed, 0) / results.length;

    return (
      <View style={styles.container}>
        <Text style={styles.resultTitle}>測驗結果</Text>
        <Text style={styles.resultScore}>
          {correctCount} / {questions.length} 答對
        </Text>
        <View style={styles.statBox}>
          <Text style={styles.statLine}>⏱ 平均作答時間：{avgTime.toFixed(1)} 秒</Text>
          <Text style={styles.statLine}>⌛ 因超時未答：{timedOutCount} 題</Text>
        </View>
        {timedOutCount > 0 && (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              有 {timedOutCount} 題超時 — 這正是模擬你在正式考試最後段來不及作答的狀況。
              建議：先讀題目關鍵字（誰/做什麼/何時），不要每個字都讀完再選答案。
            </Text>
          </View>
        )}
        <Pressable style={styles.primaryBtn} onPress={() => onNavigate("home")}>
          <Text style={styles.primaryBtnText}>返回首頁</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => onNavigate("home")}>
          <Text style={styles.back}>← 離開測驗</Text>
        </Pressable>
        <Text style={styles.progress}>
          {qIndex + 1} / {questions.length}
        </Text>
      </View>

      <View style={[styles.timerBox, secondsLeft <= 5 && styles.timerBoxUrgent]}>
        <Text style={[styles.timerText, secondsLeft <= 5 && styles.timerTextUrgent]}>
          {secondsLeft}s
        </Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionLabel}>這個字的中文意思是？</Text>
        <Text style={styles.questionWord}>{current.word}</Text>
        <Text style={styles.questionPos}>{current.pos}</Text>
      </View>

      {current.options.map((option) => {
        const isSelected = selected === option;
        const isCorrect = option === current.correctAnswer;
        const showFeedback = selected !== null;
        return (
          <Pressable
            key={option}
            style={[
              styles.optionBtn,
              showFeedback && isCorrect && styles.optionCorrect,
              showFeedback && isSelected && !isCorrect && styles.optionWrong,
            ]}
            onPress={() => handleSelect(option)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
    backgroundColor: "#f5f7fa",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  back: {
    fontSize: 15,
    color: "#3a5a8c",
  },
  progress: {
    color: "#8a97a8",
  },
  timerBox: {
    alignSelf: "center",
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  timerBoxUrgent: {
    backgroundColor: "#fed7d7",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4a5568",
  },
  timerTextUrgent: {
    color: "#c53030",
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 13,
    color: "#8a97a8",
    marginBottom: 8,
  },
  questionWord: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  questionPos: {
    fontSize: 13,
    color: "#8a97a8",
    marginTop: 4,
  },
  optionBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionCorrect: {
    backgroundColor: "#c6f6d5",
    borderColor: "#38a169",
  },
  optionWrong: {
    backgroundColor: "#fed7d7",
    borderColor: "#c53030",
  },
  optionText: {
    fontSize: 15,
    color: "#2d3748",
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e3a5f",
    textAlign: "center",
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 20,
    textAlign: "center",
    color: "#2c5282",
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statLine: {
    fontSize: 15,
    color: "#4a5568",
    marginBottom: 6,
  },
  tipBox: {
    backgroundColor: "#eaf2ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tipText: {
    fontSize: 13,
    color: "#3a5a8c",
    lineHeight: 19,
  },
  primaryBtn: {
    backgroundColor: "#1e3a5f",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
});
