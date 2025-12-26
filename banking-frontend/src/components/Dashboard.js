import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [activeAccount, setActiveAccount] = useState(null);
    
    // 💱 Kurlar
    const [marketInfo, setMarketInfo] = useState({ 
        USD: 0, EUR: 0, GBP: 0, ALTIN: 0, LastUpdate: '-' 
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // 🔥 TARİH VE SAAT FORMATI YARDIMCI FONKSİYONU 🔥
    const formatDateTime = (dateString) => {
        if (!dateString) return '---';
        const date = new Date(dateString);
        
        return date.toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // 1. Hesap Verilerini Çek
    const fetchAccountData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/');
                return;
            }

            const response = await api.get('/Banking/my-account');
            const ownerName = response.data.Owner || response.data.owner || "Kullanıcı";
            setUser(ownerName);

            const accountsList = response.data.Accounts || response.data.accounts || [];

            if (accountsList.length > 0) {
                setAccounts(accountsList);
                const currentAccNo = activeAccount ? (activeAccount.AccountNumber || activeAccount.accountNumber) : null;
                const newActiveAccount = accountsList.find(acc => (acc.AccountNumber || acc.accountNumber) === currentAccNo) || accountsList[0];
                setActiveAccount(newActiveAccount);
            } else {
                setError('Henüz bir hesabınız yok. "Yeni Hesap Aç" menüsünden hesap oluşturun.');
            }

        } catch (err) {
            console.error("Dashboard Hatası:", err);
            if (err.response && err.response.status === 401) {
                localStorage.clear();
                navigate('/');
            } else {
                setError('Veriler yüklenirken bir hata oluştu.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 2. Piyasa Kurlarını Çek
    const fetchMarketRates = async () => {
        try {
            const response = await api.get(`/Banking/rates?t=${Date.now()}`);
            const data = response.data;
            const ratesList = data.Rates || data.rates || []; 

            const findRate = (code) => {
                const item = ratesList.find(r => (r.Code === code || r.code === code));
                return item ? (item.Selling || item.selling || 0) : 0;
            };

            setMarketInfo({
                USD: findRate('USD'),
                EUR: findRate('EUR'),
                GBP: findRate('GBP'),
                ALTIN: findRate('ALTIN'),
                LastUpdate: data.LastUpdate || data.lastUpdate || '-'
            });

        } catch (err) {
            console.error("Kur çekme hatası:", err);
        }
    };

    useEffect(() => {
        fetchAccountData();
        fetchMarketRates(); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 💰 TOPLAM VARLIK HESAPLAMA (TL Cinsinden)
    const calculateTotalAssets = () => {
        let totalInTL = 0;

        accounts.forEach(acc => {
            const balance = acc.Balance || acc.balance || 0;
            const currency = (acc.Currency || acc.currency || '').toUpperCase();

            if (currency === 'TL') {
                totalInTL += balance;
            } else if (currency === 'USD') {
                totalInTL += balance * marketInfo.USD;
            } else if (currency === 'EUR') {
                totalInTL += balance * marketInfo.EUR;
            } else if (currency === 'GBP') {
                totalInTL += balance * marketInfo.GBP;
            } else if (currency === 'ALTIN') {
                totalInTL += balance * marketInfo.ALTIN;
            }
        });

        return totalInTL;
    };

    const handleDownloadPdf = async () => {
        if (!activeAccount) return;
        const accountNo = activeAccount.AccountNumber || activeAccount.accountNumber;
        try {
            const response = await api.get('/Banking/export-statement', {
                params: { accountNumber: accountNo },
                responseType: 'blob', 
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `HesapOzeti_${accountNo}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("PDF İndirme Hatası:", err);
            alert("PDF indirilirken hata oluştu.");
        }
    };

    const handleAccountChange = (e) => {
        const selectedVal = e.target.value;
        const selectedAcc = accounts.find(acc => (acc.AccountNumber || acc.accountNumber) === selectedVal);
        setActiveAccount(selectedAcc);
    };

    if (loading) return <div style={{textAlign:'center', marginTop:'50px'}}>Yükleniyor...</div>;

    // Toplam tutarı hesapla
    const totalAssets = calculateTotalAssets();

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            
            {/* Üst Başlık */}
            <div style={{ marginBottom: '25px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', borderBottom: '1px solid #ddd', paddingBottom: '15px' }}>
                <div>
                    <h2 style={{ color: '#2c3e50', margin: 0 }}>👋 Hoşgeldin, {user}</h2>
                    <p style={{ color: '#7f8c8d', margin: '5px 0 0 0', fontSize: '14px' }}>Finansal durum özetiniz aşağıdadır.</p>
                </div>

                {/* 💰 TOPLAM VARLIK KARTI */}
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '14px', color: '#7f8c8d', display:'block' }}>Toplam Varlığım (Yaklaşık)</span>
                    <span style={{ fontSize: '28px', color: '#2c3e50', fontWeight: 'bold' }}>
                        {totalAssets.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{fontSize:'16px'}}>₺</span>
                    </span>
                </div>
            </div>

            {/* 💱 PİYASA KURLARI KARTI */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
                <div style={{ 
                    display: 'flex', gap: '30px', background: '#fff', padding: '15px 30px', 
                    borderRadius: '50px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', alignItems: 'center', border: '1px solid #eee'
                }}>
                    <div style={{ fontWeight: 'bold', color: '#555', borderRight: '2px solid #eee', paddingRight: '20px' }}>
                        🏛️ Piyasa <span style={{fontSize:'12px', fontWeight:'normal'}}>({marketInfo.LastUpdate})</span>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>USD</span>
                        <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '16px' }}>{marketInfo.USD.toFixed(2)}</span>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>EUR</span>
                        <span style={{ color: '#2980b9', fontWeight: 'bold', fontSize: '16px' }}>{marketInfo.EUR.toFixed(2)}</span>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>GBP</span>
                        <span style={{ color: '#8e44ad', fontWeight: 'bold', fontSize: '16px' }}>{marketInfo.GBP.toFixed(2)}</span>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '12px', color: '#888' }}>ALTIN</span>
                        <span style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '16px' }}>{marketInfo.ALTIN.toFixed(0)}</span>
                    </div>
                </div>
            </div>

            {error && <div style={{ color: 'red', textAlign: 'center', margin: '20px' }}>{error}</div>}

            {activeAccount && (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    
                    {/* Sol Taraf: Hesap Seçimi */}
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', minWidth: '300px' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#34495e' }}>Hesaplarım</h3>
                        
                        <select 
                            onChange={handleAccountChange} 
                            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }}
                            value={activeAccount.AccountNumber || activeAccount.accountNumber}
                        >
                            {accounts.map(acc => {
                                const accNo = acc.AccountNumber || acc.accountNumber;
                                const curr = acc.Currency || acc.currency;
                                return (
                                    <option key={accNo} value={accNo}>
                                        {curr} Hesabı - {accNo}
                                    </option>
                                );
                            })}
                        </select>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: '#7f8c8d' }}>Mevcut Bakiye</p>
                            <h1 style={{ color: '#27ae60', margin: '10px 0' }}>
                                {(activeAccount.Balance || activeAccount.balance).toFixed(2)} {activeAccount.Currency || activeAccount.currency}
                            </h1>
                        </div>
                    </div>

                    {/* Sağ Taraf: İşlem Geçmişi */}
                    <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', minWidth: '300px' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h3 style={{ marginTop: 0 }}>Son İşlemler</h3>
                            <button 
                                onClick={handleDownloadPdf}
                                style={{background: 'transparent', color:'#3498db', textDecoration:'underline', fontWeight:'bold', border:'none', cursor:'pointer', fontSize:'16px'}}
                            >
                                📄 PDF İndir
                            </button>
                        </div>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                            <thead>
                                <tr style={{ background: '#ecf0f1', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Tarih ve Saat</th>
                                    <th style={{ padding: '10px' }}>Açıklama</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeAccount.Transactions || activeAccount.transactions || []).length === 0 ? (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '15px', textAlign: 'center', color: '#999' }}>Bu hesapta henüz işlem yok.</td>
                                    </tr>
                                ) : (
                                    // Sadece son 10 işlemi gösterelim
                                    (activeAccount.Transactions || activeAccount.transactions).slice(0, 10).map((tx, index) => {
                                        const type = tx.TransactionType || tx.transactionType;
                                        const myAccountId = activeAccount.Id || activeAccount.id;
                                        const toAccountId = tx.ToAccountId || tx.toAccountId;
                                        const currency = activeAccount.Currency || activeAccount.currency;
                                        const counterpartyName = tx.CounterpartyName || tx.counterpartyName;
                                        const counterpartyAccountNo = tx.CounterpartyAccountNo || tx.counterpartyAccountNo || '---';
                                        
                                        
                                        let isIncoming = false;
                                        // Gelen/Giden yönü belirleme
                                        if (type && (type.includes('Gelen') || type.includes('Yatırma') || type.includes('Kredi'))) isIncoming = true;
                                        else if (type && (type.includes('Giden') || type.includes('Çekme') || type.includes('Ödeme'))) isIncoming = false;
                                        else isIncoming = String(toAccountId) === String(myAccountId);

                                        const amount = tx.Amount || tx.amount;
                                        const color = isIncoming ? 'green' : 'red';
                                        const sign = isIncoming ? '+' : '-';
                                        
                                        const directionSymbol = isIncoming ? '⬆️' : '⬇️'; // Ok işareti eklendi

                                        const description = type === 'Transfer' 
                                            ? `${directionSymbol} ${type} (${isIncoming ? 'Gelen' : 'Giden'})`
                                            : `${directionSymbol} ${type}`;

                                        return (
                                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '10px', fontSize: '12px' }}>
                                                    {formatDateTime(tx.TransactionDate || tx.transactionDate)}
                                                </td>
                                                <td style={{ padding: '10px', fontSize: '14px' }}>
                                                    {description} <br/>
                                                    <span style={{fontSize:'11px', color:'#777'}}>
                                                        İlgili: {counterpartyName}
                                                    </span>
                                                    {/* 🔥 IBAN'ı gösteren GÜNCELLENMİŞ KISIM 🔥 */}
                                                    {counterpartyAccountNo !== '---' && !type.includes('Vezne') && !type.includes('Admin') && (
                                                        <span style={{
                                                            fontSize:'11px', 
                                                            color:'#7f8c8d', // Gri renk
                                                            fontFamily: 'monospace', 
                                                            display: 'block', 
                                                            marginTop: '2px'
                                                        }}>
                                                            Hesap No: {counterpartyAccountNo}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ 
                                                    padding: '10px', textAlign: 'right', 
                                                    color: color, fontWeight: 'bold', fontSize: '14px'
                                                }}>
                                                    {sign}{Math.abs(amount).toFixed(2)} {currency}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Tüm işlemleri gör butonu */}
                        {(activeAccount.Transactions || activeAccount.transactions || []).length > 10 && (
                            <div style={{textAlign:'center', marginTop:'15px'}}>
                                <button 
                                    onClick={() => navigate('/accounts')}
                                    style={{background: '#f8f9fa', border:'1px solid #ccc', padding:'8px 15px', borderRadius:'5px', cursor:'pointer'}}
                                >
                                    Tüm İşlemleri Gör →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;