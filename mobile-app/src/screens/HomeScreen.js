import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";

export default function HomeScreen({ onNavigate }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>TOEIC Full Score</Text>
      <Text style={styles.subtitle}>目標：845 → 990 滿分</Text>

      <Pressable style={styles.card} onPress={() => onNavigate("flashcards")}>
        <Text style={styles.cardTitle}>📚 今日單字卡</Text>
        <Text style={styles.cardDesc}>
          跟你 LINE 每天收到的單字同步，點卡片看中文意思和例句
        </Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => onNavigate("quiz")}>
        <Text style={styles.cardTitle}>⏱ 限時模擬測驗</Text>
        <Text style={styles.cardDesc}>
          針對你「最後15題來不及寫」的弱點，每題限時作答，訓練考試節奏感
        </Text>
      </Pressable>

      <View style={styles.tipBox}>
        <Text style={styles.tipText}>
          💡 小提醒：多益 Part 7 建議每題花費不超過 55-60 秒，這個測驗模式會幫你練習抓時間。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 64,
    backgroundColor: "#f5f7fa",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  subtitle: {
    fontSize: 15,
    color: "#5a6b7d",
    marginTop: 4,
    marginBottom: 28,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e3a5f",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: "#6b7a8d",
    lineHeight: 20,
  },
  tipBox: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#eaf2ff",
    borderRadius: 12,
  },
  tipText: {
    fontSize: 13,
    color: "#3a5a8c",
    lineHeight: 19,
  },
});
