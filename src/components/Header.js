// src/components/Header.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const coloredLetters = [
  { letter: 'N', color: '#2563eb' },
  { letter: 'a', color: '#10b981' },
  { letter: 't', color: '#ef4444' },
  { letter: 'i', color: '#facc15' },
  { letter: 'v', color: '#1e3a8a' },
  { letter: 'o', color: '#8b5cf6' },
];

export default function Header({
  leftIcon,
  onLeftIconPress,
  subtitle = 'Real-time Language interpreter',
}) {
  return (
    <View style={styles.container}>
      {leftIcon && (
        <TouchableOpacity
          onPress={onLeftIconPress}
          style={styles.leftIconWrapper}
        >
          {leftIcon}
        </TouchableOpacity>
      )}
      <Text style={styles.title}>
        {coloredLetters.map(({ letter, color }, i) => (
          <Text key={i} style={{ color }}>
            {letter}
          </Text>
        ))}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // if you have a gradient behind
    position: 'relative',
  },
  leftIconWrapper: {
    position: 'absolute',
    top: 40,        // same as paddingTop
    left: 12,       // your desired left margin
    zIndex: 10,
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
