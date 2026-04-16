import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image, StyleSheet, Platform } from 'react-native';
import { db } from '../../firebase/config';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit2, Trash2, ArrowLeft, X } from 'lucide-react-native';

const font = {
  fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  fontStyle: 'italic' as const,
};

export default function ManageProducts({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('kg');
  const [autoVariants, setAutoVariants] = useState(true);
  const [deliveryTime, setDeliveryTime] = useState('10 mins');
  const [distanceRange, setDistanceRange] = useState('1km-2km');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openForm = (prod: any = null) => {
    if (prod) {
      setEditingId(prod.id);
      setName(prod.name);
      setPrice(String(prod.price));
      setDiscountPrice(String(prod.discountPrice));
      setCategory(prod.category);
      setStock(String(prod.stock));
      setUnit(prod.unit || 'kg');
      setAutoVariants(prod.variantsEnabled !== false);
      setDeliveryTime(prod.deliveryTime);
      setDistanceRange(prod.distanceRange);
    } else {
      setEditingId(null);
      setName(''); setPrice(''); setDiscountPrice(''); setCategory(''); setStock('10'); setUnit('kg'); setAutoVariants(true);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name || !price) { Alert.alert('Error', 'Name and Price are required'); return; }
    setSaving(true);
    try {
      const pAmt = parseFloat(price) || 0;
      const dpAmt = discountPrice ? parseFloat(discountPrice) : pAmt;
      const variantsEnabled = autoVariants && ['kg', 'ltr', 'l', 'liter'].includes(unit.toLowerCase().trim());
      let productVariants = undefined;

      if (variantsEnabled) {
          const u = unit.toLowerCase().trim();
          if (u === 'kg') {
            productVariants = [
              { label: '1 kg', price: pAmt, discountPrice: dpAmt },
              { label: '500 g', price: pAmt * 0.5, discountPrice: dpAmt * 0.5 },
              { label: '250 g', price: pAmt * 0.25, discountPrice: dpAmt * 0.25 },
              { label: '200 g', price: pAmt * 0.20, discountPrice: dpAmt * 0.20 },
              { label: '100 g', price: pAmt * 0.10, discountPrice: dpAmt * 0.10 },
            ];
          } else {
            productVariants = [
              { label: '1 Ltr', price: pAmt, discountPrice: dpAmt },
              { label: '500 ml', price: pAmt * 0.5, discountPrice: dpAmt * 0.5 },
              { label: '250 ml', price: pAmt * 0.25, discountPrice: dpAmt * 0.25 },
            ];
          }
      }

      const id = editingId || Math.random().toString(36).substr(2, 9);
      const data = {
        name,
        price: pAmt,
        discountPrice: dpAmt,
        category,
        stock: parseInt(stock, 10) || 0,
        unit,
        deliveryTime,
        distanceRange,
        images: ['https://via.placeholder.com/300'],
        status: 'approved',
        variantsEnabled: variantsEnabled,
        ...(productVariants ? { variants: productVariants } : {}),
      };
      await setDoc(doc(db, 'products', id), data);
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm', 'Delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDoc(doc(db, 'products', id)); } },
    ]);
  };

  const handleApprove = async (id: string) => {
    try {
      await setDoc(doc(db, 'products', id), { status: 'approved' }, { merge: true });
      Alert.alert('Approved', 'Product is now published');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return <View style={s.loadWrap}><ActivityIndicator size="large" color="#145A32" /></View>;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft color="#D4A843" size={24} />
        </TouchableOpacity>
        <Text style={[font, s.headerTitle]}>Products</Text>
        <TouchableOpacity onPress={() => openForm(null)} style={s.addFab}>
          <Plus color="#145A32" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {products.map(p => (
          <View key={p.id} style={s.card}>
            <Image source={{ uri: p.images?.[0] }} style={s.cardImg} />
            <View style={s.cardInfo}>
              <Text style={[font, s.cardName]}>{p.name}</Text>
              <Text style={[font, s.cardMeta]}>₹{p.price} • Stock: {p.stock}</Text>
              {p.status === 'pending' && <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: 'bold', marginTop: 4 }}>⏳ PENDING APPROVAL</Text>}
            </View>
            {p.status === 'pending' && (
              <TouchableOpacity onPress={() => handleApprove(p.id)} style={[s.editBtn, { backgroundColor: '#D1FAE5', marginRight: 8 }]}>
                <Text style={{ color: '#059669', fontSize: 12, fontWeight: 'bold' }}>Approve</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => openForm(p)} style={s.editBtn}>
              <Edit2 color="#3B82F6" size={16} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(p.id)} style={s.deleteBtn}>
              <Trash2 color="#EF4444" size={16} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalBody}>
            <View style={s.modalHeader}>
              <Text style={[font, s.modalTitle]}>{editingId ? 'Edit Product' : 'New Product'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#6B7280" size={24} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput style={s.modalInput} placeholder="Product Name" placeholderTextColor="#9CA3AF" value={name} onChangeText={setName} />
              <View style={s.rowSplit}>
                <TextInput style={[s.modalInput, { flex: 1, marginRight: 8 }]} placeholder="Price (₹)" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={price} onChangeText={setPrice} />
                <TextInput style={[s.modalInput, { flex: 1 }]} placeholder="Discount Price" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={discountPrice} onChangeText={setDiscountPrice} />
              </View>
              <TextInput style={s.modalInput} placeholder="Category" placeholderTextColor="#9CA3AF" value={category} onChangeText={setCategory} />
              <TextInput style={s.modalInput} placeholder="Distance Range e.g 100m-500m" placeholderTextColor="#9CA3AF" value={distanceRange} onChangeText={setDistanceRange} />
              <View style={s.rowSplit}>
                <TextInput style={[s.modalInput, { flex: 1, marginRight: 8 }]} placeholder="Stock" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={stock} onChangeText={setStock} />
                <TextInput style={[s.modalInput, { flex: 1 }]} placeholder="Unit (kg/ltr)" placeholderTextColor="#9CA3AF" value={unit} onChangeText={setUnit} />
              </View>

              {['kg', 'ltr', 'l', 'liter'].includes(unit.toLowerCase().trim()) && (
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' }}
                  onPress={() => setAutoVariants(!autoVariants)}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: autoVariants ? '#16A34A' : 'transparent' }}>
                    {autoVariants && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[font, { fontSize: 13, fontWeight: '800', color: '#16A34A' }]}>Auto Generate Variants</Text>
                    <Text style={[font, { fontSize: 11, color: '#15803D', marginTop: 2 }]}>Adds 500g, 250g based on 1 {unit}</Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={s.rowSplit}>
                <TextInput style={[s.modalInput, { flex: 1, marginRight: 8 }]} placeholder="Delivery Time" placeholderTextColor="#9CA3AF" value={deliveryTime} onChangeText={setDeliveryTime} />
                <TextInput style={[s.modalInput, { flex: 1 }]} placeholder="Distance Range" placeholderTextColor="#9CA3AF" value={distanceRange} onChangeText={setDistanceRange} />
              </View>

              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={[font, s.cancelBtnText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#145A32" /> : <Text style={[font, s.saveBtnText]}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#145A32', paddingTop: 54, paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, zIndex: 10 },
  headerTitle: { color: '#D4A843', fontSize: 24, fontWeight: '900' },
  addFab: { backgroundColor: '#D4A843', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardImg: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { fontSize: 15, fontWeight: '900', color: '#1F2937' },
  cardMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  editBtn: { padding: 10, backgroundColor: '#EFF6FF', borderRadius: 10, marginRight: 8 },
  deleteBtn: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBody: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#145A32' },
  modalInput: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, fontSize: 16, color: '#1F2937', marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  rowSplit: { flexDirection: 'row' },
  modalBtns: { flexDirection: 'row', marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginRight: 10 },
  cancelBtnText: { color: '#6B7280', fontWeight: '900', fontSize: 16 },
  saveBtn: { flex: 1, backgroundColor: '#D4A843', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#145A32', fontWeight: '900', fontSize: 16 },
});
