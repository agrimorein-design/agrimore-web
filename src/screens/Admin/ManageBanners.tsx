import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, StyleSheet, Platform } from 'react-native';
import { db } from '../../firebase/config';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, ArrowLeft, ImagePlus } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function ManageBanners({ navigation }: any) {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'banners'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBanners(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddBanner = async () => {
    if (!imageUrl.trim()) { Alert.alert('Error', 'Please enter a valid Image URL'); return; }
    setAdding(true);
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'banners', id), { imageUrl: imageUrl.trim(), isActive: true, createdAt: serverTimestamp() });
      setImageUrl('');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to add banner');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDoc(doc(db, 'banners', id)); } catch (e) { Alert.alert('Error', 'Failed to delete banner'); }
  };

  if (loading) return <View style={s.loadWrap}><ActivityIndicator size="large" color="#145A32" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft color="#D4A843" size={24} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Banners</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Add Banner Form */}
      <View style={s.addCard}>
        <View style={s.addHeader}>
          <ImagePlus color="#D4A843" size={20} />
          <Text style={[font, s.addTitle]}>Add New Banner</Text>
        </View>
        <TextInput
          style={[font, s.addInput]}
          placeholder="Paste Image URL (Firebase Storage/Other)"
          placeholderTextColor="#9CA3AF"
          value={imageUrl}
          onChangeText={setImageUrl}
        />
        <TouchableOpacity style={s.addBtn} onPress={handleAddBanner} disabled={adding}>
          {adding ? <ActivityIndicator color="#145A32" /> : <Text style={[font, s.addBtnText]}>Add Banner to App</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {banners.map((b) => (
          <View key={b.id} style={s.bannerCard}>
            <Image source={{ uri: b.imageUrl }} style={s.bannerImg} resizeMode="cover" />
            <TouchableOpacity style={s.deleteFab} onPress={() => handleDelete(b.id)}>
              <Trash2 color="#FFF" size={16} />
            </TouchableOpacity>
          </View>
        ))}
        {banners.length === 0 && (
          <Text style={[font, s.emptyText]}>No banners active. Add one above.</Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#145A32', paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, zIndex: 10 },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900' },
  addCard: { backgroundColor: '#FFF', margin: 20, marginBottom: 0, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  addHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  addTitle: { fontSize: 16, fontWeight: '900', color: '#145A32', marginLeft: 10 },
  addInput: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, fontSize: 15, color: '#1F2937', marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  addBtn: { backgroundColor: '#D4A843', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  addBtnText: { color: '#145A32', fontWeight: '900', fontSize: 16 },
  scroll: { padding: 20 },
  bannerCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, position: 'relative' },
  bannerImg: { width: '100%', height: 160, backgroundColor: '#E5E7EB' },
  deleteFab: { position: 'absolute', top: 10, right: 10, backgroundColor: '#EF4444', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 16 },
});
