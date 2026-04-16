import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
];

export default function Language({ navigation }: any) {
  const [selected, setSelected] = useState('en');

  const handleApply = () => {
    navigation.goBack();
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Language</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[font, s.prompt]}>Choose your preferred language</Text>

        {LANGUAGES.map((lang) => {
          const isActive = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[s.langCard, isActive && s.langCardActive]}
              onPress={() => setSelected(lang.code)}
            >
              <Text style={s.flag}>{lang.flag}</Text>
              <View style={s.langInfo}>
                <Text style={[font, s.langName, isActive && { color: '#145A32' }]}>{lang.name}</Text>
                <Text style={[font, s.langNative]}>{lang.native}</Text>
              </View>
              <View style={[s.radio, isActive && s.radioActive]}>
                {isActive && <Check color="#FFF" size={14} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.applyBtn} onPress={handleApply}>
          <Text style={[font, s.applyBtnText]}>Apply Language</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#145A32',
    paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#145A32', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900' },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  prompt: { fontSize: 16, color: '#4B5563', marginBottom: 24 },
  langCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20,
    padding: 20, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  langCardActive: { borderColor: '#D4A843', backgroundColor: 'rgba(212,168,67,0.06)' },
  flag: { fontSize: 28, marginRight: 16 },
  langInfo: { flex: 1 },
  langName: { fontSize: 16, fontWeight: '900', color: '#1F2937', marginBottom: 2 },
  langNative: { fontSize: 14, color: '#9CA3AF' },
  radio: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { backgroundColor: '#D4A843', borderColor: '#D4A843' },
  applyBtn: {
    backgroundColor: '#D4A843', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 16,
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  applyBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
