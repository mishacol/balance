// Helper script to migrate your backup data
// Run this in your browser console (F12) on the app page

async function migrateBackupFile() {
  console.log('🚀 Starting backup migration helper...');
  
  // Step 1: Read the backup file you attached
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log(`📁 Processing file: ${file.name} (${file.size} bytes)`);
    
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      console.log('📊 File structure:', {
        keys: Object.keys(data),
        transactionCount: data.transactions?.length || 0,
        version: data.version,
        exportDate: data.exportDate
      });
      
      if (!data.transactions || data.transactions.length === 0) {
        console.error('❌ No transactions found in this file!');
        return;
      }
      
      console.log(`✅ Found ${data.transactions.length} transactions to migrate`);
      
      // Step 2: Use the app's import function
      const { importData } = useTransactionStore.getState();
      
      console.log('📥 Starting import through Supabase...');
      await importData(content);
      
      console.log('🎉 Migration completed! Check your app for the imported data.');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  };
  
  input.click();
}

// Run the migration helper
migrateBackupFile();
