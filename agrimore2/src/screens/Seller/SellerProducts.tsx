import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { db, storage } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Edit2, X, Eye, EyeOff, Save, Trash2, ChevronDown, Image as ImgIcon } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function SellerProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('kg');
  const [autoVariants, setAutoVariants] = useState(true);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Listen only to this seller's products
    const unsub1 = onSnapshot(
      query(collection(db, 'products'), where('sellerId', '==', user.uid)),
      (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    const unsub2 = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  // Image management
  const addImage = () => {
    if (!newImageUrl.trim()) { Alert.alert('Error', 'Enter image URL'); return; }
    if (images.length >= 5) { Alert.alert('Max 5', 'Maximum 5 images allowed'); return; }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleDirectUpload = async () => {
    try {
      if (images.length >= 5) { Alert.alert('Max 5', 'Maximum 5 images allowed'); return; }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera roll permission needed!'); return; }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setUploadingImg(true);
        const imgUri = result.assets[0].uri;
        const blob: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new TypeError('Network request failed'));
          xhr.responseType = 'blob';
          xhr.open('GET', imgUri, true);
          xhr.send(null);
        });
        const filename = `seller-products/${user!.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(storageRef);
        setImages(prev => [...prev, downloadUrl]);
      }
    } catch (e: any) { Alert.alert('Upload Error', e.message); }
    finally { setUploadingImg(false); }
  };

  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));

  const openForm = (p: any = null) => {
    if (p) {
      setEditId(p.id);
      setName(p.name || '');
      setCategory(p.categoryName || p.category || '');
      setPrice(String(p.price || ''));
      setDiscountPrice(String(p.discountPrice || ''));
      setStock(String(p.stock || '0'));
      setUnit(p.unit || 'kg');
      setDescription(p.description || '');
      setImages(p.images || (p.imageUrl ? [p.imageUrl] : []));
    } else {
      setEditId(null);
      setName(''); setCategory(''); setPrice(''); setDiscountPrice(''); setStock('10'); setUnit('kg'); setAutoVariants(true); setDescription(''); setImages([]);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name) { Alert.alert('Error', 'Name is required'); return; }
    if (!price) { Alert.alert('Error', 'Price is required'); return; }

    setSaving(true);
    try {
      const pAmt = parseFloat(price) || 0;
      const dpAmt = parseFloat(discountPrice) || pAmt;
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

      const data = {
        name,
        categoryName: category,
        price: pAmt,
        discountPrice: dpAmt,
        stock: parseInt(stock, 10) || 0,
        unit,
        description,
        images,
        sellerId: user!.uid,
        status: 'pending',
        updatedAt: new Date(),
        variantsEnabled: variantsEnabled,
        ...(productVariants ? { variants: productVariants } : {}),
      };
      if (editId) {
        await updateDoc(doc(db, 'products', editId), data);
      } else {
        await addDoc(collection(db, 'products'), { ...data, isAvailable: true, createdAt: new Date() });
      }
      setShowForm(false);
      Alert.alert('Success', editId ? 'Product updated!' : 'Product added!');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const doDelete = async () => {
      try {
        await deleteDoc(doc(db, 'products', id));
        Alert.alert('Deleted', 'Product removed successfully');
      } catch (e: any) { Alert.alert('Error', e.message); }
    };

    if (Platform.OS === 'web') {
      if (Platform.OS === 'web') { if (window.confirm('Delete this product?')) doDelete(); } else { Alert.alert('Confirm', 'Delete this product?', [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', onPress: () => { doDelete(); } }]); }
    } else {
      Alert.alert('Confirm', 'Delete this product?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete }
      ]);
    }
  };

  const toggleVis = async (id: string, curr: boolean) => {
    await updateDoc(doc(db, 'products', id), { isAvailable: !curr });
  };

  const filtered = search ? products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase())) : products;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>{showForm ? (editId ? 'Edit Product' : 'New Product') : 'My Products'}</Text>
          <Text style={[font, s.hSub]}>{showForm ? 'Fill product details' : `${products.length} total`}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {!showForm && (
            <TouchableOpacity style={s.addBtn} onPress={() => openForm(null)}>
              <Plus color="#FFF" size={16} />
              <Text style={[font, { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 13 }]}>Add</Text>
            </TouchableOpacity>
          )}
          {showForm && (
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showForm ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Product Name */}
          <Text style={[font, s.label]}>Product Name *</Text>
          <TextInput style={[font, s.input]} value={name} onChangeText={setName} placeholder="e.g. Fresh Tomatoes" />

          {/* Category */}
          <Text style={[font, s.label]}>Category</Text>
          <TouchableOpacity style={s.dropdown} onPress={() => setShowCatDropdown(!showCatDropdown)}>
            <Text style={[font, { color: category ? '#111827' : '#9CA3AF', fontSize: 14 }]}>{category || 'Select Category...'}</Text>
            <ChevronDown color="#9CA3AF" size={16} />
          </TouchableOpacity>
          {showCatDropdown && (
            <ScrollView style={s.dropdownList} nestedScrollEnabled>
              {categories.map(c => (
                <TouchableOpacity key={c.id} style={[s.dropdownItem, category === c.name && { backgroundColor: '#EFF6FF' }]}
                  onPress={() => { setCategory(c.name); setShowCatDropdown(false); }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>{c.emoji}</Text>
                  <Text style={[font, { color: category === c.name ? '#3B82F6' : '#374151', fontSize: 14 }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Price */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={[font, s.label, { marginTop: 0 }]}>Price (₹) *</Text>
              <TextInput style={[font, s.input]} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="100" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font, s.label, { marginTop: 0 }]}>Sale Price</Text>
              <TextInput style={[font, s.input]} value={discountPrice} onChangeText={setDiscountPrice} keyboardType="numeric" placeholder="80" />
            </View>
          </View>

          {/* Stock & Unit */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[font, s.label]}>Stock</Text>
              <TextInput style={[font, s.input]} value={stock} onChangeText={setStock} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[font, s.label]}>Unit</Text>
              <TextInput style={[font, s.input]} value={unit} onChangeText={setUnit} placeholder="kg / pcs / ltr" />
            </View>
          </View>

          {['kg', 'ltr', 'l', 'liter'].includes(unit.toLowerCase().trim()) && (
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' }}
              onPress={() => setAutoVariants(!autoVariants)}
              activeOpacity={0.7}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: autoVariants ? '#16A34A' : 'transparent' }}>
                {autoVariants && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[font, { fontSize: 13, fontWeight: '800', color: '#16A34A' }]}>Auto Generate Variants</Text>
                <Text style={[font, { fontSize: 11, color: '#15803D', marginTop: 2 }]}>Automatically adds 500g, 250g, etc. based on 1 {unit}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Description */}
          <Text style={[font, s.label]}>Description</Text>
          <TextInput style={[font, s.input, { height: 70, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Product description..." multiline />

          {/* Images */}
          <Text style={[font, s.label, { marginTop: 16 }]}>📷 Product Images ({images.length}/5)</Text>
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {images.map((url, i) => (
                <View key={i} style={s.imgPreviewWrap}>
                  <Image source={{ uri: url }} style={s.imgPreview} />
                  <TouchableOpacity style={s.imgRemoveBtn} onPress={() => removeImage(i)}>
                    <X color="#FFF" size={12} />
                  </TouchableOpacity>
                  {i === 0 && <View style={s.mainBadge}><Text style={[font, { color: '#FFF', fontSize: 8, fontWeight: '800' }]}>MAIN</Text></View>}
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput style={[font, s.input, { flex: 1 }]} value={newImageUrl} onChangeText={setNewImageUrl} placeholder="Paste image URL..." />
            <TouchableOpacity style={s.imgAddBtn} onPress={addImage} disabled={images.length >= 5}>
              <Text style={[font, { color: '#FFF', fontWeight: '800', fontSize: 13 }]}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.imgAddBtn, { backgroundColor: '#10B981', paddingHorizontal: 12 }]} onPress={handleDirectUpload} disabled={images.length >= 5 || uploadingImg}>
              {uploadingImg ? <ActivityIndicator color="#FFF" size="small" /> : <><ImgIcon color="#FFF" size={16} /><Text style={[font, { color: '#FFF', fontWeight: '800', fontSize: 13, marginLeft: 6 }]}>Upload</Text></>}
            </TouchableOpacity>
          </View>

          {/* Save */}
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]} disabled={saving} onPress={handleSave}>
            {saving ? <ActivityIndicator color="#FFF" /> : (
              <><Save color="#FFF" size={18} /><Text style={[font, s.saveBtnTxt]}>{editId ? 'Update Product' : 'Save Product'}</Text></>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={s.searchBar}>
            <Search color="#9CA3AF" size={18} />
            <TextInput style={[font, s.searchInput]} value={search} onChangeText={setSearch} placeholder="Search products..." placeholderTextColor="#9CA3AF" />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#D4A843" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              {filtered.length === 0 && (
                <View style={s.emptyBox}>
                  <Text style={{ fontSize: 48 }}>🛍️</Text>
                  <Text style={[font, { color: '#6B7280', marginTop: 8, fontSize: 16, fontWeight: '800' }]}>No products yet</Text>
                  <Text style={[font, { color: '#9CA3AF', marginTop: 4, fontSize: 13 }]}>Tap "Add" to list your first product</Text>
                </View>
              )}
              {filtered.map(p => (
                <View key={p.id} style={[s.card, p.isAvailable === false && { opacity: 0.5 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {p.images?.[0] ? (
                      <Image source={{ uri: p.images[0] }} style={s.img} />
                    ) : (
                      <View style={s.imgPlaceholder}><Text style={{ fontSize: 20 }}>📦</Text></View>
                    )}
                    <View style={s.info}>
                      <Text style={[font, s.pName]} numberOfLines={1}>{p.name}</Text>
                      <Text style={[font, s.pCat]}>{p.categoryName || 'No Category'}</Text>
                      <Text style={[font, s.pPrice]}>
                        ₹{p.discountPrice || p.price}
                        {p.discountPrice ? <Text style={{ color: '#9CA3AF', textDecorationLine: 'line-through', fontSize: 11 }}> ₹{p.price}</Text> : null}
                        {' '}• Stock: <Text style={{ color: p.stock > 0 ? '#10B981' : '#EF4444' }}>{p.stock}</Text>
                        {p.unit ? ` ${p.unit}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={s.actionsRow}>
                    <TouchableOpacity style={s.iconBtn} onPress={() => toggleVis(p.id, p.isAvailable !== false)}>
                      {p.isAvailable !== false ? <Eye color="#10B981" size={16} /> : <EyeOff color="#EF4444" size={16} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={s.iconBtn} onPress={() => openForm(p)}>
                      <Edit2 color="#3B82F6" size={16} />
                      <Text style={[font, { fontSize: 13, color: '#3B82F6', fontWeight: '800' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(p.id)}>
                      <X color="#EF4444" size={16} />
                      <Text style={[font, { fontSize: 13, color: '#EF4444', fontWeight: '800' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D4A843', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827' },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, maxHeight: 200 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  imgPreviewWrap: { position: 'relative', marginRight: 10 },
  imgPreview: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6' },
  imgRemoveBtn: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mainBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#D4A843', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  imgAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', paddingVertical: 14 },
  saveBtn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4A843', padding: 16, borderRadius: 14, marginTop: 24, marginBottom: 40 },
  saveBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#374151' },
  emptyBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  img: { width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: '#F3F4F6' },
  imgPlaceholder: { width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  pName: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2 },
  pCat: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  pPrice: { fontSize: 12, fontWeight: 'bold', color: '#4B5563' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  iconBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F8FAFC', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
