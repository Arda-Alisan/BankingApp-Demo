import React, { useState } from 'react';
import api from '../api'; 

const OpenAccount = ({ onAccountOpened, ownerName }) => {
    const [currency, setCurrency] = useState('TL'); 
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const supportedCurrencies = ['TL', 'USD', 'EUR', 'ALTIN']; 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        
        try {
            const payload = { currency: currency };
            const response = await api.post('/Banking/open-new-account', payload);

            // Backend'den dönen hesap numarasını alıyoruz
            const newAccountNumber = response.data.AccountNumber || response.data.accountNumber || 'Bilinmiyor';
            
            // Kullanıcı adı kontrolü
            const activeUser = ownerName || "Sayın Müşteri";

            // 🔥 İSTEDİĞİN ÖZEL MESAJ FORMATI 🔥
            setMessage(`✅ Sayın ${activeUser}, ${newAccountNumber} numaralı ${currency} hesabınız başarıyla oluşturulmuştur.`);
            
            // Listeyi yenilemesi için üst bileşene haber ver
            if (onAccountOpened) {
                 onAccountOpened();
            }
            
        } catch (err) {
            console.error("Hesap açma hatası:", err);
            const errorMsg = err.response?.data?.message || err.response?.data || 'Bilinmeyen Hata';
            setError(`❌ ${errorMsg}`);
        }
    };

    return (
        <div style={{ background: '#ecf0f1', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#2c3e50' }}>➕ Yeni Hesap Aç</h3>
            
            {/* Başarı Mesajı Kutusu */}
            {message && (
                <div style={{ 
                    color: '#155724', 
                    background: '#d4edda', 
                    padding: '15px', 
                    borderRadius: '5px', 
                    marginBottom:'15px', 
                    border:'1px solid #c3e6cb', 
                    fontWeight:'bold',
                    textAlign: 'center'
                }}>
                    {message}
                </div>
            )}
            
            {/* Hata Mesajı Kutusu */}
            {error && (
                <div style={{ 
                    color: '#721c24', 
                    background: '#f8d7da', 
                    padding: '10px', 
                    borderRadius: '5px', 
                    marginBottom:'10px', 
                    border:'1px solid #f5c6cb' 
                }}>
                    {error}
                </div>
            )}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #bdc3c7', flex: 1 }}
                >
                    {supportedCurrencies.map(c => (
                        <option key={c} value={c}>{c} Hesabı</option>
                    ))}
                </select>
                
                <button 
                    type="submit" 
                    style={{ 
                        padding: '10px 20px', 
                        background: '#2980b9', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Hesap Aç
                </button>
            </form>
            <small style={{color:'#7f8c8d'}}>*Her para biriminden en fazla 6 adet hesap açabilirsiniz.</small>
        </div>
    );
};

export default OpenAccount;