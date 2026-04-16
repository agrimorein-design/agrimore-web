import { db } from './config';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

async function wipeCollection(collectionName: string) {
  console.log(`🗑️ Wiping collection: ${collectionName}...`);
  const snapshot = await getDocs(collection(db, collectionName));
  const deletePromises: any[] = [];
  
  snapshot.forEach((docSnapshot) => {
    deletePromises.push(deleteDoc(doc(db, collectionName, docSnapshot.id)));
  });

  await Promise.all(deletePromises);
  console.log(`✅ Cleared ${snapshot.size} documents from ${collectionName}.`);
}

export async function wipeDatabase() {
  console.log('🔥 Starting Full Agrimore Database Wipe...\n');
  try {
    await wipeCollection('products');
    await wipeCollection('categories');
    await wipeCollection('deliverySlots');
    await wipeCollection('coupons');
    await wipeCollection('banners');
    await wipeCollection('comboOffers');
    await wipeCollection('flashSales');
    await wipeCollection('orders');
    await wipeCollection('subscriptions');
    
    console.log('\n✅ All demo data completely deleted! The database is fresh.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Wipe error:', e);
    process.exit(1);
  }
}

wipeDatabase();
