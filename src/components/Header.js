// src/components/Header.js
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

const coloredLetters = [
  { letter: 'N', color: '#2563eb' },
  { letter: 'a', color: '#10b981' },
  { letter: 't', color: '#ef4444' },
  { letter: 'i', color: '#facc15' },
  { letter: 'v', color: '#1e3a8a' },
  { letter: 'o', color: '#8b5cf6' },
];

export default function Header({ leftIcon, onLeftIconPress }) {
  return (
    <View style={styles.container}>
      {leftIcon && (
        <Pressable style={styles.leftIcon} onPress={onLeftIconPress}>
          {leftIcon}
        </Pressable>
      )}
      <Text style={styles.title}>
        {coloredLetters.map(({ letter, color }, i) => (
          <Text key={i} style={{ color }}>{letter}</Text>
        ))}
      </Text>
      <Text style={styles.subtitle}>
        Real-time Language interpreter
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',  // let the gradient show through
    position: 'relative',             // so we can absolutely position the icon
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    top: 40,      // aligns icon with the top padding where the title begins
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    color: '#374151',
  },
});
