import React, { useEffect, useState } from 'react';
import api from '../api';

const Market = () => {
    const [marketData, setMarketData] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('-');
    
    // Sayfa ilk açılış yüklemesi
    const [initialLoading, setInitialLoading] = useState(true);
    // Yenile butonu yüklemesi
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchRates = async (isManual = false) => {
        // Eğer manuel yenileme ise buton loading'ini, değilse sayfa loading'ini aç
        if (isManual) setIsRefreshing(true);
        
        try {
            // Cache'i kırmak için timestamp ekledik
            const response = await api.get(`/Banking/rates?t=${Date.now()}`);
            const data = response.data;
            
            console.log("Piyasa Verisi Güncellendi:", data);

            const list = data.Rates || data.rates || [];
            
            setMarketData(list);
            setLastUpdate(data.LastUpdate || data.lastUpdate || '-');
        } catch (err) {
            console.error("Piyasa verileri alınamadı:", err);
        } finally {
            setInitialLoading(false);
            
            // Buton animasyonunu görmek için yarım saniye yapay gecikme (Hissiyat için)
            if (isManual) {
                setTimeout(() => setIsRefreshing(false), 500);
            }
        }
    };

    useEffect(() => {
        fetchRates();
        const interval = setInterval(() => fetchRates(false), 60000); // 1 dakikada bir sessizce güncelle
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            
            {/* Başlık Alanı */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ color: '#2c3e50', margin: '0 0 5px 0' }}>📈 Canlı Döviz Kurları</h1>
                    <p style={{ color: '#7f8c8d', margin: 0, fontSize: '14px' }}>
                        Son Güncelleme: <strong>{lastUpdate}</strong> (TCMB & Global Piyasalar)
                    </p>
                </div>
                
                {/* 🔄 GELİŞMİŞ YENİLE BUTONU */}
                <button 
                    onClick={() => fetchRates(true)}
                    disabled={isRefreshing} // Yüklenirken tıklamayı engelle
                    style={{
                        padding: '10px 20px', 
                        background: isRefreshing ? '#95a5a6' : '#3498db', // Yüklenirken gri, normalde mavi
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px', 
                        cursor: isRefreshing ? 'wait' : 'pointer',
                        fontWeight: 'bold',
                        transition: 'background 0.3s',
                        minWidth: '120px' // Buton boyutu oynamasın diye
                    }}
                >
                    {isRefreshing ? '⏳ Yükleniyor...' : '🔄 Yenile'}
                </button>
            </div>

            {/* Tablo Alanı */}
            <div style={{ background: 'white', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#34495e', color: 'white' }}>
                            <th style={thStyle}>Döviz Cinsi</th>
                            <th style={thStyle}>Kod</th>
                            <th style={{...thStyle, textAlign:'right'}}>Alış (₺)</th>
                            <th style={{...thStyle, textAlign:'right'}}>Satış (₺)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialLoading ? (
                             <tr><td colSpan="4" style={{padding:'40px', textAlign:'center', color:'#777'}}>Veriler yükleniyor...</td></tr>
                        ) : marketData.length === 0 ? (
                            <tr><td colSpan="4" style={{padding:'40px', textAlign:'center', color:'#e74c3c'}}>Veri bulunamadı. Backend çalışıyor mu?</td></tr>
                        ) : (
                            marketData.map((item, index) => {
                                const code = item.Code || item.code;
                                const name = item.Name || item.name;
                                const buying = item.Buying || item.buying || 0;
                                const selling = item.Selling || item.selling || 0;

                                return (
                                    <tr key={code || index} style={{ borderBottom: '1px solid #eee', background: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                                <span style={{fontSize:'28px'}}>{getFlag(code)}</span>
                                                <span style={{fontWeight:'bold', color:'#2d3436', fontSize:'16px'}}>{name}</span>
                                            </div>
                                        </td>
                                        <td style={{...tdStyle, color:'#636e72', fontWeight:'bold', fontFamily:'monospace', fontSize:'16px'}}>
                                            {code}
                                        </td>
                                        <td style={{...tdStyle, textAlign:'right', color:'#27ae60', fontWeight:'bold', fontSize:'18px'}}>
                                            {buying.toFixed(4)} <span style={{fontSize:'12px', color:'#aaa'}}>₺</span>
                                        </td>
                                        <td style={{...tdStyle, textAlign:'right', color:'#c0392b', fontWeight:'bold', fontSize:'18px'}}>
                                            {selling.toFixed(4)} <span style={{fontSize:'12px', color:'#aaa'}}>₺</span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            
            <div style={{marginTop:'20px', textAlign:'center', fontSize:'13px', color:'#95a5a6'}}>
                * Döviz kurları TCMB üzerinden, Altın fiyatları ise uluslararası piyasalardan (Ons bazlı) anlık olarak çekilmektedir.
            </div>
        </div>
    );
};

// Bayrak Yardımcısı
const getFlag = (code) => {
    if (!code) return '💰';
    const flags = {
        'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧', 'CHF': '🇨🇭', 
        'JPY': '🇯🇵', 'CAD': '🇨🇦', 'AUD': '🇦🇺', 'ALTIN': '🥇', 
        'DKK': '🇩🇰', 'SEK': '🇸🇪', 'NOK': '🇳🇴', 'SAR': '🇸🇦', 'KWD': '🇰🇼'
    };
    return flags[code.toUpperCase()] || '💵';
};

// Stiller
const thStyle = { padding: '15px 25px', textAlign: 'left', fontWeight: '600', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px' };
const tdStyle = { padding: '15px 25px', fontSize: '15px' };

export default Market;