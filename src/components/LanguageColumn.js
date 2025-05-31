import React, { useEffect, useRef } from 'react';
import { View, FlatList, Pressable, Text, StyleSheet } from 'react-native';
import languages from '../constants/languages';

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
  const filtered = languages
    .filter(l => l.code !== excludeCode)
    .sort((a, b) => a.label.localeCompare(b.label));

  useEffect(() => {
    const idx = filtered.findIndex(l => l.code === selected.code);
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
    }
  }, [selected]);

  const handlePress = item => {
    if (item.code === selected.code && countdown != null) {
      onStop();
      return;
    }
    if (item.code !== selected.code && countdown != null) return;
    if (item.code !== selected.code) onSelect(item);
    onStart();
  };

  const handleScrollEnd = e => {
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
        keyExtractor={i => i.code}
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
          <Pressable
            onPress={() => handlePress(item)}
            style={styles.flagItem}
          >
            <Text style={styles.flagText}>{item.flag}</Text>
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
  flagText: { fontSize: 48 },
  langLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  countdown: { fontSize: 20, fontWeight: '700', color: '#dc2626' },
});
