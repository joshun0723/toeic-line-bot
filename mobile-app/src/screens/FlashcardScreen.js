import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Speech from "expo-speech";
import { getAllWords } from "../data/vocab";

export default function FlashcardScreen({ onNavigate }) {
  const words = getAllWords();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const word = words[index];

  function playPronunciation() {
    // 用手機內建的語音合成朗讀單字，不需要下載音檔、不需要網路
    Speech.stop();
    Speech.speak(word.word, { language: "en-US", rate: 0.9 });
  }

  function next() {
    setRevealed(false);
    setIndex((i) => (i + 1) % words.length);
  }

  function prev() {
    setRevealed(false);
    setIndex((i) => (i - 1 + words.length) % words.length);
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => onNavigate("home")}>
        <Text style={styles.back}>← 返回</Text>
      </Pressable>

      <Text style={styles.progress}>
        {index + 1} / {words.length}
      </Text>

      <Pressable style={styles.card} onPress={() => setRevealed((r) => !r)}>
        {!revealed ? (
          <>
            <Text style={styles.word}>{word.word}</Text>
            <Text style={styles.pos}>{word.pos}</Text>
            <Text style={styles.hint}>(點卡片查看意思)</Text>
          </>
        ) : (
          <>
            <Text style={styles.word}>{word.word}</Text>
            <Text style={styles.meaning}>{word.meaning_zh}</Text>
            <Text style={styles.example}>{word.example_en}</Text>
            <Text style={styles.exampleZh}>{word.example_zh}</Text>
          </>
        )}
      </Pressable>

      <Pressable style={styles.speakBtn} onPress={playPronunciation}>
        <Text style={styles.speakBtnText}>🔊 播放發音</Text>
      </Pressable>

      <View style={styles.navRow}>
        <Pressable style={styles.navBtn} onPress={prev}>
          <Text style={styles.navBtnText}>上一個</Text>
        </Pressable>
        <Pressable style={[styles.navBtn, styles.navBtnPrimary]} onPress={next}>
          <Text style={[styles.navBtnText, styles.navBtnTextPrimary]}>下一個</Text>
        </Pressable>
      </View>
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
  back: {
    fontSize: 16,
    color: "#3a5a8c",
    marginBottom: 12,
  },
  progress: {
    textAlign: "center",
    color: "#8a97a8",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    minHeight: 260,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  word: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e3a5f",
    textAlign: "center",
  },
  pos: {
    fontSize: 14,
    color: "#8a97a8",
    marginTop: 8,
  },
  hint: {
    fontSize: 13,
    color: "#b0bac6",
    marginTop: 20,
  },
  meaning: {
    fontSize: 20,
    color: "#2c5282",
    marginTop: 12,
    fontWeight: "600",
  },
  example: {
    fontSize: 14,
    color: "#4a5568",
    marginTop: 20,
    textAlign: "center",
  },
  exampleZh: {
    fontSize: 13,
    color: "#8a97a8",
    marginTop: 6,
    textAlign: "center",
  },
  speakBtn: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "#eaf2ff",
  },
  speakBtnText: {
    fontSize: 15,
    color: "#3a5a8c",
    fontWeight: "600",
  },
  navRow: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
  },
  navBtnPrimary: {
    backgroundColor: "#1e3a5f",
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a5568",
  },
  navBtnTextPrimary: {
    color: "#ffffff",
  },
});
