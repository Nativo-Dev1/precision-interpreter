// src/components/ScreenWrapper.js
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';   // ← new import

export default function ScreenWrapper({ children }) {
  return (
    <>
      {/* White background + dark icons */}
      <StatusBar backgroundColor="#ffffff" style="dark" translucent={false} />

      <LinearGradient
        colors={['#e0f2fe', '#fef9c3', '#ffffff']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.wrapper}>
          {children}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  wrapper: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
