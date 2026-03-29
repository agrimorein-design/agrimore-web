import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Search, Plus, Edit2, X, Eye, EyeOff, Save, Trash2, ChevronDown, Image as ImgIcon, CheckCircle, Circle, Star } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('kg');
  const [description, setDescription] = useState('');
  // Multiple images (max 5)
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  // Variants
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variants, setVariants] = useState<{label:string; price:string; discountPrice:string}[]>([]);
  const [varLabel, setVarLabel] = useState('');
  const [varPrice, setVarPrice] = useState('');
  const [varDiscPrice, setVarDiscPrice] = useState('');

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsub2 = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // Image management (max 5)
  const addImage = () => {
    if (!newImageUrl.trim()) { Alert.alert('Error', 'Enter image URL'); return; }
    if (images.length >= 5) { Alert.alert('Max 5', 'Maximum 5 images allowed'); return; }
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const [uploadingImg, setUploadingImg] = useState(false);
  const handleDirectUpload = async () => {
    try {
      if (images.length >= 5) { Alert.alert('Max 5', 'Maximum 5 images allowed'); return; }
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions!'); return; }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setUploadingImg(true);
        const imgUri = result.assets[0].uri;
        const blob: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() { resolve(xhr.response); };
          xhr.onerror = function() { reject(new TypeError('Network request failed')); };
          xhr.responseType = 'blob';
          xhr.open('GET', imgUri, true);
          xhr.send(null);
        });
        
        const storage = getStorage();
        const filename = `products/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(storageRef);
        
        setImages(prev => [...prev, downloadUrl]);
      }
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));

  // Variants
  const addVariant = () => {
    if (!varLabel || !varPrice) { Alert.alert('Error', 'Label and price required'); return; }
    setVariants([...variants, { label: varLabel, price: varPrice, discountPrice: varDiscPrice || varPrice }]);
    setVarLabel(''); setVarPrice(''); setVarDiscPrice('');
  };
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));

  const openForm = (p: any = null) => {
    if (p) {
      setEditId(p.id);
      setName(p.name || '');
      setCategory(p.categoryName || p.category || '');
      setIsFeatured(!!p.isFeatured);
      setPrice(String(p.price || ''));
      setDiscountPrice(String(p.discountPrice || ''));
      setStock(String(p.stock || '0'));
      setUnit(p.unit || 'kg');
      setDescription(p.description || '');
      setImages(p.images || (p.imageUrl ? [p.imageUrl] : []));
      setVariantsEnabled(!!p.variantsEnabled || (p.variants && p.variants.length > 0));
      setVariants((p.variants || []).map((v: any) => ({ label: v.label || '', price: String(v.price || ''), discountPrice: String(v.discountPrice || v.price || '') })));
    } else {
      setEditId(null);
      setName(''); setCategory(''); setIsFeatured(false); setPrice(''); setDiscountPrice(''); setStock('10'); setUnit('kg'); setDescription(''); setImages([]); setVariantsEnabled(false); setVariants([]);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name) { Alert.alert('Error', 'Name is required'); return; }
    if (!variantsEnabled && !price) { Alert.alert('Error', 'Price is required when variants are OFF'); return; }
    if (variantsEnabled && variants.length === 0) { Alert.alert('Error', 'Add at least one variant'); return; }

    setSaving(true);
    try {
      const parsedVariants = variantsEnabled ? variants.map(v => ({ label: v.label, price: parseFloat(v.price) || 0, discountPrice: parseFloat(v.discountPrice) || parseFloat(v.price) || 0 })) : [];
      let finalPrice = parseFloat(price) || 0;
      let finalDiscount = parseFloat(discountPrice) || finalPrice || 0;
      
      if (variantsEnabled && parsedVariants.length > 0) {
         finalPrice = Math.min(...parsedVariants.map(v => v.price));
         finalDiscount = Math.min(...parsedVariants.map(v => v.discountPrice));
      }

      const data = {
        name,
        categoryName: category,
        price: finalPrice,
        discountPrice: finalDiscount,
        isFeatured,
        variantsEnabled,
        stock: parseInt(stock, 10) || 0,
        unit,
        description,
        images,
        variants: parsedVariants,
        status: 'approved',
        updatedAt: new Date()
      };
      if (editId) {
        await updateDoc(doc(db, 'products', editId), data);
      } else {
        await addDoc(collection(db, 'products'), { ...data, isAvailable: true, createdAt: new Date() });
      }
      setShowForm(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this product?')) {
        try {
          await deleteDoc(doc(db, 'products', id));
          window.alert('✅ Successfully deleted from Database (Real Delete)');
        } catch (e: any) {
          window.alert('❌ Error deleting from server: ' + e.message);
        }
      }
    } else {
      Alert.alert('Confirm Delete', 'Delete this product?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'products', id));
              Alert.alert('Success', '✅ Successfully deleted from Database (Real Delete)');
            } catch (e: any) {
              Alert.alert('Error', '❌ Error deleting from server: ' + e.message);
            }
          }
        }
      ]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const msg = `Are you sure you want to delete ${selectedIds.length} products entirely?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'products', id))))
          .then(() => { setSelectedIds([]); setIsSelectMode(false); window.alert('Products wiped'); })
          .catch(e => window.alert('Error: ' + e.message));
      }
    } else {
      Alert.alert('Bulk Delete', msg, [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'products', id))));
              setSelectedIds([]);
              setIsSelectMode(false);
              Alert.alert('Success', 'Products wiped from database');
            } catch(e:any) { Alert.alert('Error', e.message); }
          }
        }
      ]);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    const activeList = filtered.length > 0 ? filtered : products;
    if (selectedIds.length === activeList.length && activeList.length > 0) setSelectedIds([]);
    else setSelectedIds(activeList.map(c => c.id));
  };

  const toggleVis = async (id: string, curr: boolean) => {
    await updateDoc(doc(db, 'products', id), { isAvailable: !curr });
  };

  const toggleFeature = async (id: string, curr: boolean) => {
    await updateDoc(doc(db, 'products', id), { isFeatured: !curr });
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'products', id), { status: 'approved' });
      if (Platform.OS === 'web') {
         window.alert('✅ Product Approved!');
      } else {
         Alert.alert('Success', '✅ Product Approved!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const filtered = search ? products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase())) : products;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>{showForm ? (editId ? 'Edit Product' : 'New Product') : 'Products'}</Text>
          <Text style={[font, s.hSub]}>{showForm ? 'Fill product details' : `${products.length} total`}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {!showForm && isSelectMode && selectedIds.length > 0 && (
            <TouchableOpacity style={s.bulkDelBtn} onPress={handleBulkDelete}>
              <Trash2 color="#FFF" size={16} />
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 12 }}>Delete ({selectedIds.length})</Text>
            </TouchableOpacity>
          )}
          {!showForm && !isSelectMode && (
            <TouchableOpacity style={s.addBtn} onPress={() => openForm(null)}>
              <Plus color="#FFF" size={16} />
              <Text style={[font, { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 13 }]}>Add</Text>
            </TouchableOpacity>
          )}
          {showForm && (
            <TouchableOpacity onPress={() => setShowForm(false)}><X color="#6B7280" size={24} /></TouchableOpacity>
          )}
        </View>
      </View>

      {!showForm && isSelectMode && (
        <View style={s.selectAllRow}>
          <TouchableOpacity style={s.selAllBtn} onPress={toggleSelectAll}>
            {selectedIds.length === (filtered.length || products.length) && (filtered.length || products.length) > 0 ? <CheckCircle color="#3B82F6" size={20} /> : <Circle color="#9CA3AF" size={20} />}
            <Text style={[font, { marginLeft: 8, fontSize: 14, color: selectedIds.length === (filtered.length || products.length) && (filtered.length || products.length) > 0 ? '#3B82F6' : '#6B7280', fontWeight: '700' }]}>
              Select All {search ? 'Matches' : 'Products'}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[font, { fontSize: 12, color: '#9CA3AF' }]}>{selectedIds.length} selected</Text>
            <TouchableOpacity onPress={exitSelectMode} style={{ padding: 4 }}><X color="#9CA3AF" size={20} /></TouchableOpacity>
          </View>
        </View>
      )}

      {showForm ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Product Name */}
          <Text style={[font, s.label]}>Product Name *</Text>
          <TextInput style={[font, s.input]} value={name} onChangeText={setName} placeholder="e.g. Organic Broccoli" />

          {/* Category Dropdown */}
          <Text style={[font, s.label]}>Category *</Text>
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
              {categories.length === 0 && (
                <View style={{ padding: 12, alignItems: 'center' }}>
                   <Text style={[font, { color: '#EF4444', fontSize: 12 }]}>No categories found. Create a category first!</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Featured Toggle */}
          <Text style={[font, s.label]}>Feature Product</Text>
          <TouchableOpacity style={s.dropdown} onPress={() => setIsFeatured(!isFeatured)}>
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
               <Star color={isFeatured ? '#F59E0B' : '#9CA3AF'} fill={isFeatured ? '#F59E0B' : 'transparent'} size={20} />
               <Text style={[font, { color: '#111827', fontSize: 14 }]}>{isFeatured ? 'Featured (Shown on Home)' : 'Not Featured'}</Text>
             </View>
          </TouchableOpacity>

          {/* Variants Toggle */}
          <Text style={[font, s.label, { marginTop: 16 }]}>Enable Variants (Weight/Size Options)</Text>
          <TouchableOpacity 
            style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 10}} 
            onPress={() => setVariantsEnabled(!variantsEnabled)}
          >
            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: variantsEnabled ? '#3B82F6' : '#9CA3AF', backgroundColor: variantsEnabled ? '#3B82F6' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {variantsEnabled && <CheckCircle color="#FFF" size={14} />}
            </View>
            <Text style={[font, { color: '#111827', fontSize: 14, fontWeight: 'bold' }]}>
              Product has variants (different sizes or weights)
            </Text>
          </TouchableOpacity>

          {/* Price Row (Hidden if Variants ON) */}
          {!variantsEnabled && (
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
          )}

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

          {/* Description */}
          <Text style={[font, s.label]}>Description</Text>
          <TextInput style={[font, s.input, { height: 70, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Product description..." multiline />

          {/* ─── Images (Max 5) ─── */}
          <Text style={[font, s.label, { marginTop: 16 }]}>📷 Product Images ({images.length}/5)</Text>
          {/* Image Previews */}
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
          {/* Add Image URL or Upload */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput style={[font, s.input, { flex: 1 }]} value={newImageUrl} onChangeText={setNewImageUrl} placeholder="Paste image URL..." />
            <TouchableOpacity style={s.imgAddBtn} onPress={addImage} disabled={images.length >= 5}>
              <Text style={[font, { color: '#FFF', fontWeight: '800', fontSize: 13 }]}>Add URL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.imgAddBtn, { backgroundColor: '#10B981', paddingHorizontal: 12 }]} onPress={handleDirectUpload} disabled={images.length >= 5 || uploadingImg}>
              {uploadingImg ? <ActivityIndicator color="#FFF" size="small" /> : <><ImgIcon color="#FFF" size={16} /><Text style={[font, { color: '#FFF', fontWeight: '800', fontSize: 13, marginLeft: 6 }]}>Upload</Text></>}
            </TouchableOpacity>
          </View>
          {images.length === 0 && (
            <View style={s.uploadArea}>
              <ImgIcon color="#9CA3AF" size={32} />
              <Text style={[font, { color: '#9CA3AF', marginTop: 8, fontSize: 12 }]}>Add up to 5 image URLs</Text>
            </View>
          )}

          {/* ─── Variants ─── */}
          {variantsEnabled && (
            <View style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 16 }}>
              <Text style={[font, { fontSize: 14, fontWeight: 'bold', color: '#111827', marginBottom: 12 }]}>📦 Variant List</Text>
              
              {variants.map((v, i) => (
                <View key={i} style={s.variantRow}>
                  <Text style={[font, { flex: 1, fontWeight: '700', color: '#374151' }]}>{v.label}</Text>
                  <Text style={[font, { color: '#9CA3AF', textDecorationLine: 'line-through', fontSize: 12 }]}>₹{v.price}</Text>
                  <Text style={[font, { fontWeight: '800', color: '#145A32', marginLeft: 6 }]}>₹{v.discountPrice}</Text>
                  <TouchableOpacity onPress={() => removeVariant(i)} style={{ marginLeft: 8 }}><Trash2 color="#EF4444" size={16} /></TouchableOpacity>
                </View>
              ))}
              
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <TextInput style={[font, s.input, { flex: 1, backgroundColor: '#FFF' }]} value={varLabel} onChangeText={setVarLabel} placeholder="e.g. 250g" />
                <TextInput style={[font, s.input, { width: 65, backgroundColor: '#FFF' }]} value={varPrice} onChangeText={setVarPrice} placeholder="MRP" keyboardType="numeric" />
                <TextInput style={[font, s.input, { width: 65, backgroundColor: '#FFF' }]} value={varDiscPrice} onChangeText={setVarDiscPrice} placeholder="Sale" keyboardType="numeric" />
                <TouchableOpacity style={s.varAddBtn} onPress={addVariant}><Plus color="#FFF" size={18} /></TouchableOpacity>
              </View>
            </View>
          )}

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

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {filtered.map(p => {
              const isSelected = selectedIds.includes(p.id);
              return (
              <View 
                key={p.id} 
                style={[s.card, p.isAvailable === false && { opacity: 0.5 }, isSelected && { borderColor: '#3B82F6', borderWidth: 2, backgroundColor: '#EFF6FF' }]}
              >
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  activeOpacity={isSelectMode ? 0.7 : 1}
                  onLongPress={() => { if (!isSelectMode){ setIsSelectMode(true); toggleSelect(p.id); } }}
                  onPress={() => isSelectMode ? toggleSelect(p.id) : null}
                >
                  {isSelectMode && (
                    <View style={{ padding: 6, marginLeft: -4, marginRight: 8 }}>
                      {isSelected ? <CheckCircle color="#3B82F6" size={24} /> : <Circle color="#D1D5DB" size={24} />}
                    </View>
                  )}
                  {p.images?.[0] ? (
                    <Image source={{ uri: p.images[0] }} style={s.img} />
                  ) : (
                    <View style={s.imgPlaceholder}><Text style={{ fontSize: 20 }}>📦</Text></View>
                  )}
                  <View style={s.info}>
                    <Text style={[font, s.pName]} numberOfLines={1}>{p.name}</Text>
                    {p.status === 'pending' && (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 }}>
                        <Text style={[font, { fontSize: 10, color: '#D97706', fontWeight: 'bold' }]}>PENDING APPROVAL</Text>
                      </View>
                    )}
                    <Text style={[font, s.pCat]}>{p.categoryName || 'No Cat'}{p.variants?.length ? ` • ${p.variants.length} variants` : ''}{p.images?.length > 1 ? ` • ${p.images.length} imgs` : ''}</Text>
                    <Text style={[font, s.pPrice]}>₹{p.discountPrice || p.price} <Text style={{ color: '#9CA3AF', textDecorationLine: p.discountPrice ? 'line-through' : 'none', fontSize: 11 }}>{p.discountPrice ? `₹${p.price}` : ''}</Text> • Stock: <Text style={{ color: p.stock > 0 ? '#10B981' : '#EF4444' }}>{p.stock}</Text>{p.unit ? ` ${p.unit}` : ''}</Text>
                  </View>
                </TouchableOpacity>

                <View style={s.actionsRow}>
                  {p.status === 'pending' && (
                    <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => handleApprove(p.id)}>
                      <CheckCircle color="#10B981" size={16} />
                      <Text style={[font, { fontSize: 13, color: '#10B981', fontWeight: '800' }]}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.iconBtn} onPress={() => toggleFeature(p.id, !!p.isFeatured)}>
                    <Star color={p.isFeatured ? '#F59E0B' : '#9CA3AF'} fill={p.isFeatured ? '#F59E0B' : 'transparent'} size={16} />
                  </TouchableOpacity>
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
            )})}
          </ScrollView>
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
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827' },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, maxHeight: 200 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  // Image styles
  imgPreviewWrap: { position: 'relative', marginRight: 10 },
  imgPreview: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6' },
  imgRemoveBtn: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mainBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  imgAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' },
  uploadArea: { width: '100%', height: 100, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  // Variant styles
  variantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 10, borderRadius: 10, marginBottom: 6, gap: 4 },
  varAddBtn: { backgroundColor: '#10B981', padding: 12, borderRadius: 10, justifyContent: 'center' },
  saveBtn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', padding: 16, borderRadius: 14, marginTop: 24, marginBottom: 40 },
  saveBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  // List view
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#374151' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  img: { width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: '#F3F4F6' },
  imgPlaceholder: { width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  pName: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2 },
  pCat: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  pPrice: { fontSize: 12, fontWeight: 'bold', color: '#4B5563' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  iconBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F8FAFC', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bulkDelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  selectAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selAllBtn: { flexDirection: 'row', alignItems: 'center' },
});
