// Utilitaires pour traiter les fichiers XLS/XLSX avec SheetJS
// Note: Vous devrez inclure la bibliothèque SheetJS dans votre extension

class ExcelHandler {
    constructor() {
        // Vérifier si SheetJS est disponible
        if (typeof XLSX === 'undefined') {
            console.warn('SheetJS non trouvé. Le support Excel sera limité.');
        }
    }
    
    async parseExcelFile(file) {
        if (typeof XLSX === 'undefined') {
            throw new Error('Bibliothèque SheetJS requise pour les fichiers Excel');
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Prendre la première feuille
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    
                    // Convertir en JSON
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    
                    if (jsonData.length === 0) {
                        throw new Error('Le fichier Excel est vide');
                    }
                    
                    // Extraire les en-têtes et les données
                    const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
                    const data = [];
                    
                    for (let i = 1; i < jsonData.length; i++) {
                        if (jsonData[i].some(cell => cell !== undefined && cell !== '')) {
                            const row = {};
                            headers.forEach((header, index) => {
                                row[header] = jsonData[i][index] ? jsonData[i][index].toString() : '';
                            });
                            data.push(row);
                        }
                    }
                    
                    resolve({ headers, data });
                    
                } catch (error) {
                    reject(new Error(`Erreur lors de la lecture du fichier Excel: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Erreur lors de la lecture du fichier'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
}