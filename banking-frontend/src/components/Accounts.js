import React, { useState, useEffect } from 'react';
import api from '../api';
import OpenAccount from './OpenAccount';

const Accounts = () => {
    const [accountData, setAccountData] = useState({ owner: '', accounts: [] });
    const [selectedAccount, setSelectedAccount] = useState(null); 
    
    // 🔥🔥 YENİ STATE: Tüm düzenli transferleri tutacak
    const [allScheduledTransfers, setAllScheduledTransfers] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // 1. Hesapları Çek
            const res = await api.get('/Banking/my-account');
            setAccountData(res.data);
            
            if (res.data.accounts && res.data.accounts.length > 0) {
                const currentId = selectedAccount ? selectedAccount.Id : null;
                const newSelected = res.data.accounts.find(acc => acc.Id === currentId) || res.data.accounts[0];
                setSelectedAccount(newSelected);
            }

            // 🔥🔥 2. Düzenli Transferleri Çek (Yeni Eklendi)
            const scheduledRes = await api.get('/Banking/scheduled-transfers');
            setAllScheduledTransfers(scheduledRes.data || []);

        } catch (err) {
            console.error("Veriler alınamadı", err);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("IBAN Kopyalandı: " + text);
    };

    const currentTransactions = selectedAccount 
        ? (selectedAccount.Transactions || selectedAccount.transactions || []) 
        : [];

    // 🔥🔥 FİLTRELEME: Seçili hesaba ait aktif düzenli transferleri bul
    const currentScheduled = selectedAccount 
        ? allScheduledTransfers.filter(t => t.fromAccountNumber === selectedAccount.AccountNumber && t.isActive)
        : [];

    const formatAmount = (amount, currency, isFrom) => {
        const sign = isFrom ? '-' : '+';
        const absAmount = Math.abs(amount || 0);
        const color = isFrom ? '#c0392b' : '#27ae60';
        return (
            <span style={{ color: color, fontWeight: 'bold' }}>
                {sign}{absAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
            </span>
        );
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '---';
        const date = new Date(dateString);
        return date.toLocaleString('tr-TR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
    };
    
    const handleExport = async (accountNumber) => {
        try {
            const response = await api.get(`/Banking/export-statement?accountNumber=${accountNumber}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `HesapOzeti_${accountNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('PDF indirme hatası: ' + (err.response?.data?.message || 'Bilinmeyen Hata'));
        }
    };

    const ownerName = accountData.owner || (accountData.OwnerName || 'Müşteri'); 

    return (
        <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#2c3e50' }}>👋 Merhaba, {ownerName}</h2>
                <p style={{ margin: '5px 0 0', color: '#7f8c8d' }}>Varlıklarınızı buradan yönetebilirsiniz.</p>
            </div>

            <OpenAccount onAccountOpened={fetchData} ownerName={ownerName} />

            <h3 style={{ color: '#34495e', marginTop:'30px' }}>💰 Hesap Listesi</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '40px' }}>
                {accountData.accounts && accountData.accounts.length > 0 ? (
                    accountData.accounts.map(acc => {
                        const isSelected = selectedAccount && selectedAccount.Id === acc.Id;
                        return (
                            <div 
                                key={acc.Id} 
                                onClick={() => setSelectedAccount(acc)}
                                style={{
                                    flex: '1 1 300px',
                                    background: isSelected ? '#f7f7f7' : 'white',
                                    padding: '20px',
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                    borderLeft: `5px solid ${acc.currency === 'TL' ? '#27ae60' : acc.currency === 'USD' ? '#2980b9' : acc.currency === 'EUR' ? '#8e44ad' : '#f1c40f'}`,
                                    cursor: 'pointer',
                                    opacity: isSelected ? 1 : 0.8,
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>{acc.currency} Hesabı</span>
                                    <span style={{ background: '#ecf0f1', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>{isSelected ? 'SEÇİLİ' : 'DETAY GÖR'}</span>
                                </div>
                                
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
                                    {acc.balance.toLocaleString()} <span style={{ fontSize: '16px', color: '#7f8c8d' }}>{acc.currency}</span>
                                </div>
                                <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'monospace', color: '#555' }}>{acc.accountNumber}</span>
                                    <button onClick={(e) => {e.stopPropagation(); copyToClipboard(acc.accountNumber);}} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }} title="Kopyala">📋</button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p style={{ color: '#7f8c8d' }}>Henüz bir hesabınız yok.</p>
                )}
            </div>

            {selectedAccount && (
                <div style={{ background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    
                    {/* BAŞLIK VE PDF BUTONU */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#34495e' }}>
                            İşlem Geçmişi ({selectedAccount.Currency} {selectedAccount.AccountNumber})
                        </h3>
                        <button 
                            onClick={() => handleExport(selectedAccount.AccountNumber)}
                            style={{ padding: '8px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        >
                            📄 PDF İndir
                        </button>
                    </div>

                    {/* 🔥🔥 YENİ BÖLÜM: BU HESABA AİT BEKLEYEN DÜZENLİ TRANSFERLER 🔥🔥 */}
                    {currentScheduled.length > 0 && (
                        <div style={{ marginBottom: '30px', border: '1px solid #ffeeba', background: '#fff3cd', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{ marginTop: 0, color: '#856404', display:'flex', alignItems:'center' }}>
                                🔁 Bu Hesap İçin Aktif Düzenli Transfer Emirleri
                            </h4>
                            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {currentScheduled.map(sch => (
                                    <li key={sch.id} style={{ marginBottom: '5px', color: '#856404', fontSize:'14px' }}>
                                        <strong>{sch.toAccountOwner}</strong> ({sch.toAccountNumber}) hesabına <strong>{sch.frequencyDisplay}</strong>: 
                                        <span style={{ fontWeight: 'bold' }}> {sch.amount.toLocaleString()} {selectedAccount.Currency}</span>
                                        <span style={{ fontSize:'12px', marginLeft:'10px', fontStyle:'italic' }}>(Sonraki: {new Date(sch.nextExecutionDate).toLocaleDateString()})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* İŞLEM GEÇMİŞİ TABLOSU */}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#ecf0f1' }}>
                                <th style={tableHeaderStyle}>Tarih ve Saat</th> 
                                <th style={tableHeaderStyle}>Açıklama</th>
                                <th style={tableHeaderStyle}>İlgili Kişi/Hesap</th>
                                <th style={tableHeaderStyle}>Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTransactions.length > 0 ? (
                                currentTransactions.map(t => {
                                    const isOutgoing = t.FromAccountId === selectedAccount.Id && t.ToAccountId !== selectedAccount.Id; 
                                    // Döviz işleminde kendi hesabından çıkışsa
                                    const adjustedOutgoing = (t.TransactionType === 'Döviz Al/Sat' && t.FromAccountId === selectedAccount.Id) ? true : isOutgoing;
                                    
                                    const details = t.Details || t.TransactionType;

                                    return (
                                        <tr key={t.Id || t.id} style={tableRowStyle}>
                                            <td style={{...tableCellStyle, fontFamily: 'monospace', fontSize: '12px'}}>
                                                {formatDateTime(t.TransactionDate)}
                                            </td> 
                                            <td style={tableCellStyle}>{details}</td>
                                            <td style={tableCellStyle}>{t.CounterpartyName}</td>
                                            <td style={tableCellStyle}>
                                                {formatAmount(t.Amount, selectedAccount.Currency, adjustedOutgoing)}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '15px', color: '#7f8c8d' }}>Bu hesapta henüz bir işlem yapılmamıştır.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
};

// --- STYLES ---
const tableHeaderStyle = { padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', fontSize: '14px' };
const tableRowStyle = { borderBottom: '1px solid #eee' };
const tableCellStyle = { padding: '12px', fontSize: '13px' };

export default Accounts;