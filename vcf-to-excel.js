const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function convertVcfToExcel() {
    console.log('🚀 Starting VCF to Excel conversion...');
    
    // Look for VCF in parent directory (root)
    const vcfPath = path.join(__dirname, '..', 'contactogodzilla-shop.vcf');
    const outputPath = path.join(__dirname, '..', 'contactos.xlsx');
    
    if (!fs.existsSync(vcfPath)) {
        console.error('❌ Error: VCF file not found at', vcfPath);
        return;
    }

    const content = fs.readFileSync(vcfPath, 'utf8');
    const vcards = content.split('BEGIN:VCARD');
    
    const contacts = [];
    
    for (let vcard of vcards) {
        if (!vcard.trim()) continue;
        
        // Match FN: or FN;CHARSET=UTF-8:
        const fnMatch = vcard.match(/FN(?:;[^:]*)?:(.*)/);
        let name = fnMatch ? fnMatch[1].trim() : '';
        
        // Match TEL: or TEL;CELL: or TEL;TYPE=CELL:
        const telMatch = vcard.match(/TEL(?:;[^:]*)?:(.*)/);
        let phone = telMatch ? telMatch[1].replace(/[\s\+\-\(\)]/g, '').trim() : '';
        
        if (name || phone) {
            contacts.push({
                nombre: name,
                telefono: phone
            });
        }
    }

    console.log(`📊 Found ${contacts.length} prospective contacts.`);

    if (contacts.length === 0) {
        console.warn('⚠️ No contacts found in the VCF file.');
        return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(contacts);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos');
    
    // Write to file
    XLSX.writeFile(wb, outputPath);
    
    console.log(`✅ Success! Excel file saved as: ${outputPath}`);
}

convertVcfToExcel().catch(err => {
    console.error('💥 Critical error:', err);
});
