import React, { useState } from 'react';

// Senin elindeki mevcut dosyaları buraya çağırıyoruz
import Accounts from './Accounts';
import Transfer from './Transfer';
import ScheduledTransfers from './ScheduledTransfers'; // Bunu az önce oluşturduğunu varsayıyorum

const CustomerPanel = () => {
    // Hangi sekmenin açık olduğunu tutan state (Varsayılan: Hesaplar)
    const [activeTab, setActiveTab] = useState('accounts');

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            
            {/* --- ÜST MENÜ (SABİT KISIM) --- */}
            <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '20px', 
                flexWrap: 'wrap', 
                borderBottom: '2px solid #eee', 
                paddingBottom: '15px' 
            }}>
                
                <button 
                    onClick={() => setActiveTab('accounts')} 
                    style={activeTab === 'accounts' ? activeTabStyle : tabStyle}
                >
                    🏠 Hesaplarım
                </button>

                <button 
                    onClick={() => setActiveTab('transfer')} 
                    style={activeTab === 'transfer' ? activeTabStyle : tabStyle}
                >
                    💸 Para Transferi
                </button>

                <button 
                    onClick={() => setActiveTab('scheduled')} 
                    style={activeTab === 'scheduled' ? activeTabStyle : tabStyle}
                >
                    🔁 Düzenli Transferler
                </button>
            </div>

            {/* --- DEĞİŞEN İÇERİK KISMI --- */}
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', minHeight: '600px' }}>
                
                {/* Duruma göre hangi dosyayı göstereceğini seçiyor */}
                {activeTab === 'accounts' && <Accounts />}
                {activeTab === 'transfer' && <Transfer />}
                {activeTab === 'scheduled' && <ScheduledTransfers />}

            </div>
        </div>
    );
};

// --- BASİT STİLLER ---
const tabStyle = { 
    padding: '12px 20px', 
    background: 'white', 
    border: '1px solid #ddd', 
    borderRadius: '5px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    color: '#555',
    transition: '0.3s'
};

const activeTabStyle = { 
    ...tabStyle, 
    background: '#3498db', 
    color: 'white', 
    borderColor: '#3498db',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px rgba(52, 152, 219, 0.3)'
};

export default CustomerPanel;