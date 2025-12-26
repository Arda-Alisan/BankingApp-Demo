import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const Transfer = () => {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [toAccountNumber, setToAccountNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 1. Hesap Verilerini Çek
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const response = await api.get('/Banking/my-account');
                // Backend'den gelen veri yapısını kontrol et (büyük/küçük harf duyarlılığı)
                const list = response.data.accounts || response.data.Accounts || [];

                if (list.length > 0) {
                    setAccounts(list);
                    setSelectedAccount(list[0]); // İlk hesabı varsayılan seç
                }
            } catch (err) {
                console.error("Hesap verileri alınamadı:", err);
                setMessage({ text: 'Hesap bilgileri yüklenemedi.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchAccounts();
    }, []);

    // 2. Transfer İşlemi
    const handleTransfer = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        if (!selectedAccount) {
            setMessage({ text: 'Lütfen bir gönderen hesap seçin.', type: 'error' });
            return;
        }

        // Güvenli veri okuma (Null check ve büyük/küçük harf kontrolü)
        const balance = selectedAccount.Balance ?? selectedAccount.balance ?? 0;
        const currency = selectedAccount.Currency ?? selectedAccount.currency ?? 'TL';
        const fromAccNo = selectedAccount.AccountNumber ?? selectedAccount.accountNumber;

        if (parseFloat(amount) > balance) {
            setMessage({ text: `❌ Yetersiz Bakiye! Mevcut: ${balance.toLocaleString()} ${currency}`, type: 'error' });
            return;
        }

        if (fromAccNo === toAccountNumber) {
            setMessage({ text: '❌ Kendi kendinize transfer yapamazsınız. Farklı bir hesap girin.', type: 'error' });
            return;
        }

        try {
            const payload = {
                FromAccountNumber: fromAccNo,
                ToAccountNumber: toAccountNumber,
                Amount: parseFloat(amount)
            };

            const response = await api.post('/Banking/transfer', payload);
            
            setMessage({ text: `✅ ${response.data.Message || 'Transfer Başarılı!'}`, type: 'success' });
            
            // Formu temizle
            setAmount('');
            setToAccountNumber('');
            
            // (Opsiyonel) Bakiyeyi güncellemek için sayfayı yenilemeye gerek yok ama kullanıcıya güncel bakiyeyi göstermek istersen api.get tekrar çağrılabilir.

        } catch (err) {
            console.error("Transfer hatası:", err);
            const errorMsg = err.response?.data?.Message || err.response?.data || 'Transfer işlemi başarısız oldu.';
            setMessage({ text: `❌ ${errorMsg}`, type: 'error' });
        }
    };

    if (loading) return <div style={{textAlign:'center', marginTop:'50px', fontSize:'18px'}}>Hesaplar Yükleniyor...</div>;

    if (accounts.length === 0) {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px', color: '#7f8c8d' }}>
                <h3>Transfer yapabilmek için aktif bir hesabınız olmalı.</h3>
                <button 
                    onClick={() => navigate('/open-account')} 
                    style={{ padding:'10px 20px', background:'#3498db', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', marginTop:'10px'}}
                >
                    Hesap Aç
                </button>
            </div>
        );
    }

    // Seçili hesap bilgilerini güvenli okuma
    const currentCurrency = selectedAccount ? (selectedAccount.Currency || selectedAccount.currency) : '';
    const currentBalance = selectedAccount ? (selectedAccount.Balance || selectedAccount.balance) : 0;
    const currentAccNo = selectedAccount ? (selectedAccount.AccountNumber || selectedAccount.accountNumber) : '';

    return (
        <div style={{ maxWidth: '600px', margin: '30px auto', background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '25px', borderBottom:'2px solid #f0f2f5', paddingBottom:'10px' }}>
                💸 Para Transferi
            </h2>

            {message.text && (
                <div style={{ 
                    padding: '15px', 
                    borderRadius: '5px', 
                    marginBottom: '20px', 
                    fontWeight: 'bold',
                    textAlign: 'center',
                    background: message.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: message.type === 'success' ? '#155724' : '#721c24'
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleTransfer}>
                
                {/* GÖNDEREN HESAP */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Gönderen Hesap</label>
                    <select 
                        style={inputStyle}
                        onChange={(e) => {
                            const val = e.target.value;
                            const acc = accounts.find(a => (a.AccountNumber || a.accountNumber) === val);
                            setSelectedAccount(acc);
                        }}
                        value={currentAccNo}
                    >
                        {accounts.map(acc => {
                            const accNo = acc.AccountNumber || acc.accountNumber;
                            const curr = acc.Currency || acc.currency;
                            const bal = acc.Balance || acc.balance;
                            return (
                                <option key={acc.Id || acc.id} value={accNo}>
                                    {curr} - {accNo} (Bakiye: {bal.toLocaleString()})
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* ALICI HESAP */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Alıcı IBAN / Hesap No</label>
                    <input 
                        type="text" 
                        placeholder="Örn: TR..." 
                        value={toAccountNumber}
                        onChange={(e) => setToAccountNumber(e.target.value)}
                        required
                        style={inputStyle}
                    />
                </div>

                {/* TUTAR */}
                <div style={{ marginBottom: '25px' }}>
                    <label style={labelStyle}>Gönderilecek Tutar</label>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min="1"
                            step="0.01"
                            style={{ ...inputStyle, paddingRight: '50px' }} 
                        />
                        <span style={{ 
                            position: 'absolute', 
                            right: '15px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            fontWeight: 'bold', 
                            color: '#7f8c8d' 
                        }}>
                            {currentCurrency}
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px', textAlign:'right' }}>
                        Mevcut Bakiye: {currentBalance.toLocaleString()} {currentCurrency}
                    </div>
                </div>

                <button type="submit" style={btnStyle}>Transferi Tamamla</button>
            </form>
        </div>
    );
};

// --- STYLES ---
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '15px', boxSizing:'border-box' };
const btnStyle = { width: '100%', padding: '14px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.3s' };

export default Transfer;