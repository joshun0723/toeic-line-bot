import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";

import HomeScreen from "./src/screens/HomeScreen";
import FlashcardScreen from "./src/screens/FlashcardScreen";
import QuizScreen from "./src/screens/QuizScreen";

export default function App() {
  const [screen, setScreen] = useState("home");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {screen === "home" && <HomeScreen onNavigate={setScreen} />}
      {screen === "flashcards" && <FlashcardScreen onNavigate={setScreen} />}
      {screen === "quiz" && <QuizScreen onNavigate={setScreen} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
});
