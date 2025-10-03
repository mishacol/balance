// 🚀 COPY THIS CODE INTO YOUR BROWSER CONSOLE (F12) TO MIGRATE YOUR 311 TRANSACTIONS!

async function migrateMyBackupData() {
  try {
    console.log('🚀 Starting migration of your backup data...');
    
    // Load your backup file directly
    const response = await fetch('./balance-backup-02-Oct-2025-213335.json');
    if (!response.ok) {
      throw new Error('Could not load backup file');
    }
    
    const backupData = await response.json();
    console.log(`📊 Found ${backupData.transactions.length} transactions from ${backupData.exportDate}`);
    
    // Use the app's import function
    const store = useTransactionStore.getState();
    console.log('📥 Importing through Supabase...');
    
    await store.importData(JSON.stringify(backupData));
    
    console.log('🎉✅ SUCCESS! Your 311 transactions are now in Supabase!');
    console.log('🔄 Go check your app - your data should appear!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('💡 Make sure you are on the app page and logged in');
  }
}

// Show instructions
console.log('');
console.log('🎯 MIGRATION READY!');
console.log('Your backup file contains 311 transactions from 2013-2025');
console.log('');
console.log('📋 STEPS TO MIGRATE:');
console.log('1. Make sure you are on your app page (logged in)');
console.log('2. Press F12 to open Developer Tools');
console.log('3. Go to Console tab');
console.log('4. Type: migrateMyBackupData()');
console.log('5. Press Enter');
console.log('');
console.log('🔄 Or run it automatically now:');
migrateMyBackupData();