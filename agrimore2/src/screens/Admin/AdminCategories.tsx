import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Plus, X, ChevronDown, Eye, EyeOff, RefreshCw, Trash2, CheckCircle, Circle } from 'lucide-react-native';

const font = { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const SECTIONS = ['Fruits & Vegetables', 'Dairy & Bakery', 'Grocery & Staples', 'Snacks & Branded Foods', 'Beverages', 'Personal Care', 'Home Care', 'Meats & Seafood'];

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openForm = (c: any = null) => {
    if (c) {
      setEditId(c.id);
      setName(c.name || '');
      setEmoji(c.emoji || '');
      setImageUrl(c.imageUrl || '');
      setSectionName(c.sectionName || '');
    } else {
      setEditId(null);
      setName(''); setEmoji(''); setImageUrl(''); setSectionName('');
    }
    setAdding(true);
  };

  const handleUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Need camera roll access.'); return; }
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.8,
        aspect: [1, 1]
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
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
        const filename = `categories/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        const downloadUrl = await getDownloadURL(storageRef);
        setImageUrl(downloadUrl);
      }
    } catch (e: any) { Alert.alert('Upload Error', e.message); }
    finally { setUploadingImg(false); }
  };

  useEffect(() => {
    const unsubCat = onSnapshot(collection(db, 'categories'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      list.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      setCategories(list);
      setLoading(false);
    });

    const unsubProd = onSnapshot(collection(db, 'products'), (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        const catName = data.categoryName || data.category;
        if (catName) {
          counts[catName] = (counts[catName] || 0) + 1;
        }
      });
      setProductCounts(counts);
    });

    return () => { unsubCat(); unsubProd(); };
  }, []);

  const handleSave = async () => {
    if (!name || !emoji || !sectionName) { Alert.alert('Error', 'All fields required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateDoc(doc(db, 'categories', editId), {
          name, sectionName, emoji, imageUrl, updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          name, sectionName, emoji, imageUrl, priority: categories.length + 1,
          isVisible: true, showOnHome: true, status: 'active', productCount: 0, createdAt: new Date(),
        });
      }
      setName(''); setEmoji(''); setImageUrl(''); setSectionName(''); setAdding(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this category permanently from the database?')) {
        try {
          await deleteDoc(doc(db, 'categories', id));
          Platform.OS === 'web' ? window.alert('✅ Category deleted successfully from Backend') : Alert.alert('Notice', '✅ Category deleted successfully from Backend');
        } catch (e: any) {
          Platform.OS === 'web' ? window.alert('❌ Error: ' + e.message) : Alert.alert('Notice', '❌ Error: ' + e.message);
        }
      }
    } else {
      Alert.alert('Delete', 'Delete this category?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
             try {
               await deleteDoc(doc(db, 'categories', id));
               Alert.alert('Success', '✅ Category deleted successfully from Backend');
             } catch (e: any) {
               Alert.alert('Error', '❌ Error: ' + e.message);
             }
          } 
        }
      ]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const msg = `Delete ${selectedIds.length} categories?`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'categories', id))))
          .then(() => { setSelectedIds([]); setIsSelectMode(false); Platform.OS === 'web' ? window.alert('Selected categories deleted') : Alert.alert('Notice', 'Selected categories deleted'); })
          .catch(e => Platform.OS === 'web' ? window.alert('Error: ' + e.message) : Alert.alert('Notice', 'Error: ' + e.message));
      }
    } else {
      Alert.alert('Bulk Delete', msg, [
        { text: 'Cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'categories', id))));
              setSelectedIds([]);
              setIsSelectMode(false);
              Alert.alert('Success', 'Selected categories deleted');
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
    if (selectedIds.length === categories.length) setSelectedIds([]);
    else setSelectedIds(categories.map(c => c.id));
  };

  const toggleHome = async (id: string, val: boolean) => {
    await updateDoc(doc(db, 'categories', id), { showOnHome: !val });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  // Group by section
  const grouped: Record<string, any[]> = {};
  categories.forEach(c => {
    const sec = c.sectionName || 'Other';
    if (!grouped[sec]) grouped[sec] = [];
    grouped[sec].push(c);
  });

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={[font, s.hTitle]}>Categories</Text>
          <Text style={[font, s.hSub]}>{categories.length} total</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {isSelectMode && selectedIds.length > 0 && (
            <TouchableOpacity style={s.bulkDelBtn} onPress={handleBulkDelete}>
              <Trash2 color="#FFF" size={16} />
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 12 }}>Delete ({selectedIds.length})</Text>
            </TouchableOpacity>
          )}
          {!adding && !isSelectMode && (
            <TouchableOpacity style={s.addBtn} onPress={() => openForm(null)}>
              <Plus color="#FFF" size={16} />
              <Text style={[font, { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 13 }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSelectMode && (
        <View style={s.selectAllRow}>
          <TouchableOpacity style={s.selAllBtn} onPress={toggleSelectAll}>
            {selectedIds.length === categories.length && categories.length > 0 ? <CheckCircle color="#3B82F6" size={20} /> : <Circle color="#9CA3AF" size={20} />}
            <Text style={[font, { marginLeft: 8, fontSize: 14, color: selectedIds.length === categories.length && categories.length > 0 ? '#3B82F6' : '#6B7280', fontWeight: '700' }]}>
              Select All Categories
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[font, { fontSize: 12, color: '#9CA3AF' }]}>{selectedIds.length} selected</Text>
            <TouchableOpacity onPress={exitSelectMode} style={{ padding: 4 }}><X color="#9CA3AF" size={20} /></TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {adding && (
          <View style={s.formCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={[font, { fontSize: 18, fontWeight: '800', color: '#111827' }]}>{editId ? 'Edit Category' : 'New Category'}</Text>
              <TouchableOpacity onPress={() => setAdding(false)}><X color="#6B7280" size={22} /></TouchableOpacity>
            </View>

            <Text style={[font, s.label]}>Parent Section</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setShowSectionDropdown(!showSectionDropdown)}>
              <Text style={[font, { color: sectionName ? '#111827' : '#9CA3AF', fontSize: 14 }]}>{sectionName || 'Select Section...'}</Text>
              <ChevronDown color="#9CA3AF" size={16} />
            </TouchableOpacity>
            {showSectionDropdown && (
              <View style={s.dropdownList}>
                {SECTIONS.map(sec => (
                  <TouchableOpacity key={sec} style={[s.dropdownItem, sectionName === sec && { backgroundColor: '#EFF6FF' }]}
                    onPress={() => { setSectionName(sec); setShowSectionDropdown(false); }}>
                    <Text style={[font, { color: sectionName === sec ? '#3B82F6' : '#374151', fontSize: 14 }]}>{sec}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[font, s.label]}>Category Name</Text>
            <TextInput style={[font, s.input]} value={name} onChangeText={setName} placeholder="e.g. Snacks" />
            <Text style={[font, s.label]}>Emoji Icon</Text>
            <TextInput style={[font, s.input]} value={emoji} onChangeText={setEmoji} placeholder="e.g. 🍿" />

            <Text style={[font, s.label]}>Main Category Image (URL or Upload)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[font, s.input, { flex: 1 }]} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." />
              <TouchableOpacity style={s.uploadBtn} onPress={handleUpload} disabled={uploadingImg}>
                {uploadingImg ? <ActivityIndicator color="#FFF" size="small"/> : <><Text style={[font,{color:'#FFF',fontWeight:'800',fontSize:12}]}>Upload</Text></>}
              </TouchableOpacity>
            </View>
            {imageUrl ? <Image source={{uri: imageUrl}} style={s.previewMain} /> : null}

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={[font, s.saveBtnTxt]}>{editId ? 'Update Category' : 'Save Category'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {Object.keys(grouped).map(sec => (
          <View key={sec} style={{ marginBottom: 20 }}>
            <Text style={[font, s.secTitle]}>{sec} ({grouped[sec].length})</Text>
            {grouped[sec].map(c => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <View 
                  key={c.id} 
                  style={[s.card, isSelected && { borderColor: '#3B82F6', borderWidth: 2, backgroundColor: '#EFF6FF' }]}
                >
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    activeOpacity={isSelectMode ? 0.7 : 1}
                    onLongPress={() => { if (!isSelectMode){ setIsSelectMode(true); toggleSelect(c.id); } }}
                    onPress={() => isSelectMode ? toggleSelect(c.id) : null}
                  >
                    {isSelectMode && (
                      <View style={{ padding: 10, marginLeft: -8, marginRight: 2 }}>
                        {isSelected ? <CheckCircle color="#3B82F6" size={24} /> : <Circle color="#D1D5DB" size={24} />}
                      </View>
                    )}
                    {c.imageUrl ? (
                      <Image source={{uri: c.imageUrl}} style={s.catImage} />
                    ) : (
                      <Text style={{ fontSize: 24, marginRight: 12, width: 36, textAlign: 'center' }}>{c.emoji}</Text>
                    )}
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[font, s.catName]}>{c.name}</Text>
                      <Text style={[font, s.catSub]}>{productCounts[c.name] || 0} products</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={s.actionsRow}>
                    <TouchableOpacity style={s.toggleBtn} onPress={() => toggleHome(c.id, !!c.showOnHome)}>
                      {c.showOnHome ? <Eye color="#10B981" size={16} /> : <EyeOff color="#9CA3AF" size={16} />}
                      <Text style={[font, { fontSize: 13, color: c.showOnHome ? '#10B981' : '#6B7280', fontWeight: '800' }]}>{c.showOnHome ? 'Hide Home' : 'Show Home'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.toggleBtn} onPress={() => openForm(c)}>
                      <Text style={[font, { fontSize: 13, color: '#3B82F6', fontWeight: '800' }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.toggleBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(c.id)}>
                      <X color="#EF4444" size={16} />
                      <Text style={[font, { fontSize: 13, color: '#EF4444', fontWeight: '800' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  hSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  formCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#111827' },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownList: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4, marginBottom: 8 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  saveBtn: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  saveBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  secTitle:{fontSize:18,fontWeight:'800',color:'#111827',marginBottom:12},
  card:{backgroundColor:'#FFF',padding:16,borderRadius:16,marginBottom:16,borderWidth:1,borderColor:'#E5E7EB'},
  catImage:{width:48,height:48,borderRadius:12,marginRight:14,backgroundColor:'#F3F4F6'},
  catName:{fontSize:16,fontWeight:'800',color:'#374151'},
  catSub:{fontSize:12,color:'#9CA3AF',marginTop:2},
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10 },
  toggleBtn:{flexDirection: 'row', alignItems: 'center', backgroundColor:'#F9FAFB',paddingHorizontal: 12, paddingVertical: 8,borderRadius:10, gap: 6},
  delBtn:{backgroundColor:'#FEF2F2',paddingHorizontal: 12, paddingVertical: 8,borderRadius:10,justifyContent:'center'},
  uploadBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  previewMain: { width: 80, height: 80, borderRadius: 12, marginTop: 10, alignSelf: 'center', backgroundColor: '#F3F4F6' },
  bulkDelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  selectAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selAllBtn: { flexDirection: 'row', alignItems: 'center' },
});
