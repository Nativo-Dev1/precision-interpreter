import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, StyleSheet } from 'react-native';

export default function ScreenWrapper({ children }) {
  return (
    <LinearGradient
      colors={['#e0f2fe', '#fef9c3', '#ffffff']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.wrapper}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
