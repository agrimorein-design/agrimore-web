import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

const TAGS = ['Fast Delivery', 'Fresh Items', 'Good Packaging', 'Great Value', 'Polite Driver', 'On Time'];

export default function RateOrder({ route, navigation }: any) {
  const order = route?.params?.order || { id: 'DEMO12345678' };
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={s.root}>
        <View style={s.celebrationWrap}>
          <Text style={s.celebrationEmoji}>🎉</Text>
          <Text style={[font, s.celebrationTitle]}>Thank You!</Text>
          <Text style={[font, s.celebrationSub]}>Your feedback helps us improve our service</Text>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} color="#D4A843" size={36} fill={i <= rating ? '#D4A843' : 'transparent'} />
            ))}
          </View>
          <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={[font, s.doneBtnText]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const labels = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft color="#D4A843" size={22} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Rate Order</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Order ID */}
        <View style={s.orderPill}>
          <Text style={[font, s.orderPillText]}>Order #{(order.id || '').substring(0, 8).toUpperCase()}</Text>
        </View>

        {/* Rating */}
        <Text style={[font, s.prompt]}>How was your experience?</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setRating(i)} style={s.starBtn}>
              <Star color="#D4A843" size={44} fill={i <= rating ? '#D4A843' : 'transparent'} />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={[font, s.ratingLabel]}>{labels[rating]}</Text>
        )}

        {/* Tags */}
        <Text style={[font, s.tagTitle]}>What did you like?</Text>
        <View style={s.tagGrid}>
          {TAGS.map((tag, i) => (
            <TouchableOpacity
              key={i}
              style={[s.tagChip, selectedTags.includes(tag) && s.tagChipActive]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[font, s.tagText, selectedTags.includes(tag) && s.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <Text style={[font, s.noteLabel]}>Add a note (optional)</Text>
        <TextInput
          style={[font, s.noteInput]}
          placeholder="Tell us more about your experience..."
          placeholderTextColor="#9CA3AF"
          multiline
          value={note}
          onChangeText={setNote}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, rating === 0 && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={rating === 0}
        >
          <Text style={[font, s.submitBtnText]}>Submit Rating</Text>
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
  orderPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(20,90,50,0.08)',
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, marginBottom: 28,
  },
  orderPillText: { color: '#145A32', fontSize: 13, fontWeight: '700' },
  prompt: { fontSize: 22, fontWeight: '900', color: '#1F2937', textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  starBtn: { padding: 6 },
  ratingLabel: { textAlign: 'center', fontSize: 16, fontWeight: '900', color: '#D4A843', marginBottom: 28 },
  tagTitle: { fontSize: 16, fontWeight: '900', color: '#145A32', marginBottom: 14 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  tagChip: {
    backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 10, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  tagChipActive: { backgroundColor: 'rgba(212,168,67,0.15)', borderColor: '#D4A843' },
  tagText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tagTextActive: { color: '#D4A843', fontWeight: '900' },
  noteLabel: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 10 },
  noteInput: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, fontSize: 14, color: '#1F2937',
    minHeight: 100, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 28,
  },
  submitBtn: {
    backgroundColor: '#D4A843', paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    shadowColor: '#D4A843', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitBtnText: { color: '#145A32', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  // Celebration screen
  celebrationWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  celebrationEmoji: { fontSize: 72, marginBottom: 20 },
  celebrationTitle: { fontSize: 32, fontWeight: '900', color: '#145A32', marginBottom: 8 },
  celebrationSub: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  doneBtn: {
    backgroundColor: '#145A32', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16, marginTop: 20,
  },
  doneBtnText: { color: '#D4A843', fontSize: 16, fontWeight: '900' },
});
