// src/components/ScheduledTransfers.js

import React, { useState, useEffect } from 'react';
import api from '../api';

const ScheduledTransfers = () => {
    // --- STATE ---
    const [myAccounts, setMyAccounts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [formData, setFormData] = useState({
        fromAccountNumber: '',
        toAccountNumber: '',
        amount: '',
        description: '',
        frequency: 'Monthly', // Varsayılan: Aylık
        dayOfMonth: 1,        // Varsayılan: Ayın 1'i
        dayOfWeek: 1,         // Varsayılan: Pazartesi
        endDate: ''
    });

    // --- VERİ ÇEKME ---
    const fetchData = async () => {
        try {
            // 1. Kullanıcının hesaplarını çek (Gönderen hesap seçimi için)
            const accRes = await api.get('/Banking/my-account');
            setMyAccounts(accRes.data.accounts || []);
            
            // İlk hesabı varsayılan olarak seç
            if (accRes.data.accounts && accRes.data.accounts.length > 0 && !formData.fromAccountNumber) {
                setFormData(prev => ({ ...prev, fromAccountNumber: accRes.data.accounts[0].accountNumber }));
            }

            // 2. Mevcut talimatları çek
            const transferRes = await api.get('/Banking/scheduled-transfers');
            setTransfers(transferRes.data || []);
            
            setLoading(false);
        } catch (err) {
            console.error("Veri çekme hatası", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- FORM İŞLEMLERİ ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!window.confirm("Bu düzenli transfer talimatını onaylıyor musunuz?")) return;

        try {
            // Veri Dönüştürme (Sayısal alanlar)
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                dayOfMonth: formData.frequency === 'Monthly' ? parseInt(formData.dayOfMonth) : null,
                dayOfWeek: formData.frequency === 'Weekly' ? parseInt(formData.dayOfWeek) : null,
                endDate: formData.endDate ? formData.endDate : null
            };

            await api.post('/Banking/scheduled-transfers', payload);
            alert("✅ Talimat başarıyla oluşturuldu.");
            fetchData(); // Listeyi yenile
            // Formu sıfırla (Hesap no hariç)
            setFormData({ ...formData, amount: '', description: '', toAccountNumber: '' });
        } catch (err) {
            alert("❌ Hata: " + (err.response?.data?.Message || err.response?.data || "İşlem başarısız."));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bu talimatı iptal etmek/silmek istediğinize emin misiniz?")) return;
        try {
            await api.delete(`/Banking/scheduled-transfers/${id}`);
            alert("🗑️ Talimat silindi.");
            setTransfers(transfers.filter(t => t.id !== id));
        } catch (err) {
            alert("Silme başarısız.");
        }
    };

    // --- YARDIMCI SEÇENEKLER ---
    const daysOfWeek = [
        { val: 1, label: 'Pazartesi' }, { val: 2, label: 'Salı' }, { val: 3, label: 'Çarşamba' },
        { val: 4, label: 'Perşembe' }, { val: 5, label: 'Cuma' }, { val: 6, label: 'Cumartesi' }, { val: 0, label: 'Pazar' }
    ];

    return (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            
            {/* SOL TARAF: YENİ TALİMAT FORMU */}
            <div style={{ flex: 1, minWidth: '300px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>➕ Yeni Talimat Oluştur</h3>
                <form onSubmit={handleSubmit}>
                    
                    {/* GÖNDEREN HESAP */}
                    <label style={labelStyle}>Gönderen Hesabınız</label>
                    <select name="fromAccountNumber" value={formData.fromAccountNumber} onChange={handleInputChange} style={inputStyle} required>
                        <option value="">Seçiniz</option>
                        {myAccounts.map(acc => (
                            <option key={acc.id} value={acc.accountNumber}>
                                {acc.currency} - {acc.accountNumber} (Bakiye: {acc.balance})
                            </option>
                        ))}
                    </select>

                    {/* ALICI HESAP */}
                    <label style={labelStyle}>Alıcı IBAN / Hesap No</label>
                    <input type="text" name="toAccountNumber" value={formData.toAccountNumber} onChange={handleInputChange} placeholder="TR..." style={inputStyle} required />

                    {/* TUTAR */}
                    <label style={labelStyle}>Tutar</label>
                    <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="0.00" style={inputStyle} required min="1" step="0.01" />

                    {/* SIKLIK (FREQUENCY) */}
                    <label style={labelStyle}>Tekrar Sıklığı</label>
                    <select name="frequency" value={formData.frequency} onChange={handleInputChange} style={inputStyle}>
                        <option value="Daily">Her Gün (Günlük)</option>
                        <option value="Weekly">Her Hafta (Haftalık)</option>
                        <option value="Monthly">Her Ay (Aylık)</option>
                        <option value="Yearly">Her Yıl (Yıllık)</option>
                    </select>

                    {/* HAFTALIK İSE GÜN SEÇİMİ */}
                    {formData.frequency === 'Weekly' && (
                        <div>
                            <label style={labelStyle}>Haftanın Günü</label>
                            <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleInputChange} style={inputStyle}>
                                {daysOfWeek.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                            </select>
                        </div>
                    )}

                    {/* AYLIK İSE GÜN SEÇİMİ */}
                    {formData.frequency === 'Monthly' && (
                        <div>
                            <label style={labelStyle}>Ayın Günü (1-31)</label>
                            <input type="number" name="dayOfMonth" value={formData.dayOfMonth} onChange={handleInputChange} min="1" max="31" style={inputStyle} />
                        </div>
                    )}

                    {/* AÇIKLAMA */}
                    <label style={labelStyle}>Açıklama (Opsiyonel)</label>
                    <input type="text" name="description" value={formData.description} onChange={handleInputChange} style={inputStyle} />

                    {/* BİTİŞ TARİHİ */}
                    <label style={labelStyle}>Bitiş Tarihi (Opsiyonel)</label>
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} style={inputStyle} />

                    <button type="submit" style={btnStyle}>Talimatı Kaydet</button>
                </form>
            </div>

            {/* SAĞ TARAF: MEVCUT TALİMATLAR LİSTESİ */}
            <div style={{ flex: 2, minWidth: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#27ae60', borderBottom: '2px solid #2ecc71', paddingBottom: '10px' }}>📋 Aktif Talimatlarım</h3>
                
                {loading ? <p>Yükleniyor...</p> : transfers.length === 0 ? <p style={{color:'#7f8c8d'}}>Henüz kayıtlı bir talimatınız yok.</p> : (
                    <div style={{overflowX:'auto'}}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa', color: '#2c3e50', textAlign: 'left' }}>
                                    <th style={thStyle}>Kime</th>
                                    <th style={thStyle}>Tutar</th>
                                    <th style={thStyle}>Sıklık</th>
                                    <th style={thStyle}>Sonraki İşlem</th>
                                    <th style={thStyle}>Durum</th>
                                    <th style={thStyle}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={tdStyle}>
                                            <div style={{fontWeight:'bold'}}>{item.toAccountOwner}</div>
                                            <div style={{fontSize:'11px', color:'#7f8c8d'}}>{item.toAccountNumber}</div>
                                        </td>
                                        <td style={{...tdStyle, fontWeight:'bold', color:'#27ae60'}}>{item.amount.toLocaleString()}</td>
                                        <td style={tdStyle}>{item.frequencyDisplay}</td>
                                        <td style={tdStyle}>{new Date(item.nextExecutionDate).toLocaleDateString()}</td>
                                        <td style={tdStyle}>
                                            {item.isActive 
                                                ? <span style={{color:'green', background:'#e8f5e9', padding:'3px 8px', borderRadius:'10px', fontSize:'11px'}}>Aktif</span>
                                                : <span style={{color:'red', background:'#ffebee', padding:'3px 8px', borderRadius:'10px', fontSize:'11px'}}>Pasif</span>
                                            }
                                        </td>
                                        <td style={tdStyle}>
                                            <button onClick={() => handleDelete(item.id)} style={deleteBtnStyle}>İptal Et</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- STYLES ---
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#34495e' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #ddd', boxSizing:'border-box' };
const btnStyle = { width: '100%', padding: '12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };
const thStyle = { padding: '10px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '10px', verticalAlign: 'middle' };
const deleteBtnStyle = { padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize:'12px' };

export default ScheduledTransfers;