// components/LanguageColumn.js

import React, { useEffect, useRef } from 'react';
import { View, FlatList, Pressable, Text, StyleSheet } from 'react-native';
import { languages } from '../constants/languages';

const ITEM_HEIGHT = 100;

export default function LanguageColumn({
  selected,
  onSelect,
  onStart,
  onStop,
  countdown,
  locked,
  excludeCode,
}) {
  const listRef = useRef(null);

  // Filter out the excluded code and sort alphabetically
  const filtered = languages
    .filter((l) => l.value !== excludeCode)
    .sort((a, b) => a.label.localeCompare(b.label));

  // Scroll to the selected language on mount/update
  useEffect(() => {
    const idx = filtered.findIndex((l) => l.value === selected.value);
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
    }
  }, [selected, filtered]);

  const handlePress = (item) => {
    if (item.value === selected.value && countdown != null) {
      onStop();
      return;
    }
    if (item.value !== selected.value && countdown != null) return;
    if (item.value !== selected.value) onSelect(item);
    onStart();
  };

  const handleScrollEnd = (e) => {
    if (locked || countdown != null) return;
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const lang = filtered[idx];
    if (lang) onSelect(lang);
  };

  return (
    <View style={styles.scrollWrapper}>
      {countdown != null && <Text style={styles.countdown}>{countdown}</Text>}

      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(i) => i.value}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!locked && countdown == null}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, idx) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * idx,
          index: idx,
        })}
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePress(item)} style={styles.flagItem}>
            {/* Render flag emoji */}
            <Text style={styles.flagEmoji}>{item.flag}</Text>
            {/* Render language label */}
            <Text style={styles.langLabel}>{item.label}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollWrapper: {
    height: ITEM_HEIGHT,
    width: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  flagItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  langLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  countdown: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
  },
});

