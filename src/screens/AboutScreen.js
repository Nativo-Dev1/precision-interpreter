import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';

const AboutScreen = () => {
  return (
    <ScreenWrapper>
      <Header title="About Nativo" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Nativo Interpreter</Text>
        <Text style={styles.version}>Version 1.0.35</Text>
        <Text style={styles.text}>
          Nativo is a real-time bilingual voice and visual interpreter designed for clarity, speed, and cross-cultural communication.
        </Text>
        <Text style={styles.text}>
          • 🎤 Translate spoken language live{'\n'}
          • 📷 Translate text from photos (menus, signs, etc.){'\n'}
          • 🎧 Hear translated speech aloud in native voice{'\n'}
          • 📚 Review recent translations in History{'\n'}
        </Text>
        <Text style={styles.text}>
          Built with Expo, React Native, Google Cloud, and OpenAI.
        </Text>
        <Text style={styles.textMuted}>© 2025 Nativo Labs. All rights reserved.</Text>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default AboutScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    color: '#007AFF',
  },
  version: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 14,
    lineHeight: 22,
  },
  textMuted: {
    fontSize: 14,
    color: 'gray',
    marginTop: 30,
    textAlign: 'center',
  },
});
