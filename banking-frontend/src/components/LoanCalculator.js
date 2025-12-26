import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const LoanCalculator = () => {
    const [amount, setAmount] = useState(50000); 
    const [term, setTerm] = useState(12);       
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [totalPayment, setTotalPayment] = useState(0);
    const [myLoans, setMyLoans] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const interestRate = 3.49; 
    const navigate = useNavigate();

    // Hesaplama
    useEffect(() => {
        const r = interestRate / 100;
        const n = term;
        const monthly = amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        
        setMonthlyPayment(monthly);
        setTotalPayment(monthly * term);
    }, [amount, term]);

    // Verileri Çek
    const fetchLoans = async () => {
        try {
            const res = await api.get('/Banking/my-loans');
            setMyLoans(res.data);
        } catch (err) {
            console.error("Kredi geçmişi alınamadı");
        }
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    // Başvuru Yap
    const handleApply = async () => {
        if(!window.confirm("Kredi başvurusunu onaylıyor musunuz?")) return;
        try {
            await api.post('/Banking/apply-loan', { amount: amount, termMonths: term });
            alert("✅ Başvuru alındı! Admin onayı bekleniyor.");
            fetchLoans();
        } catch (err) {
            alert("❌ Hata: " + (err.response?.data || "İşlem başarısız."));
        }
    };

    // Taksit Öde
    const handleRepay = async (loanId, monthlyAmount) => {
        if(!window.confirm(`${monthlyAmount.toFixed(2)} TL tutarındaki taksidi ödemek istiyor musunuz?`)) return;
        
        setLoading(true);
        try {
            await api.post('/Banking/repay-loan', loanId, {
                headers: { 'Content-Type': 'application/json' }
            });
            alert("✅ Taksit başarıyla ödendi!");
            fetchLoans(); 
        } catch (err) {
            alert("❌ Ödeme Başarısız: " + (err.response?.data || "Bakiye yetersiz olabilir."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            
            <h1 style={{ color: '#2c3e50', textAlign: 'center', marginBottom:'30px' }}>💰 Kredi İşlemleri</h1>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                
                {/* SOL: HESAPLAMA VE BAŞVURU */}
                <div style={{ flex: 1, background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', minWidth:'350px' }}>
                    <h3 style={{marginTop:0, color:'#34495e'}}>🧮 Yeni Kredi Hesapla</h3>
                    
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                            Tutar: <span style={{ color: '#3498db' }}>{amount.toLocaleString()} ₺</span>
                        </label>
                        <input type="range" min="1000" max="500000" step="1000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                            Vade: <span style={{ color: '#3498db' }}>{term} Ay</span>
                        </label>
                        <input type="range" min="3" max="36" step="1" value={term} onChange={(e) => setTerm(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ margin: '5px 0' }}>Faiz: <strong>%{interestRate}</strong></p>
                        <h2 style={{ color: '#27ae60', margin: '10px 0' }}>{monthlyPayment.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺ / Ay</h2>
                        <p style={{ fontSize: '12px', color: '#7f8c8d' }}>Toplam Geri Ödeme: {totalPayment.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</p>
                    </div>

                    <button onClick={handleApply} style={{ width: '100%', marginTop: '20px', padding: '15px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Başvuruyu Tamamla 🚀
                    </button>
                </div>

                {/* SAĞ: KREDİLERİM VE ÖDEME */}
                <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', minWidth:'350px' }}>
                    <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px', color:'#34495e' }}>📋 Kredilerim</h3>
                    
                    {myLoans.length === 0 ? (
                        <p style={{ color: '#7f8c8d', textAlign: 'center', marginTop: '50px' }}>Henüz bir krediniz yok.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {myLoans.map(loan => {
                                // Değerleri güvenli al (Büyük/Küçük harf ve null kontrolü)
                                const remaining = loan.remainingAmount !== undefined ? loan.remainingAmount : (loan.RemainingAmount || 0);
                                const monthly = loan.monthlyPayment || loan.MonthlyPayment || 0;
                                const total = loan.amount || loan.Amount || 0;
                                const term = loan.termMonths || loan.TermMonths || 0;
                                const status = loan.status || loan.Status;

                                // Borç bitti mi kontrolü (0.1 tolerans)
                                const isFinished = remaining <= 0.1;
                                // Ekranda göstermek için status
                                let displayStatus = status;
                                if(status === 'Approved' && isFinished) displayStatus = 'PaidOff';

                                return (
                                    <li key={loan.id} style={{ borderBottom: '1px solid #f1f1f1', padding: '20px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <div>
                                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{total.toLocaleString()} ₺</span>
                                                <span style={{ fontSize: '14px', color: '#7f8c8d', marginLeft: '10px' }}>({term} Ay)</span>
                                            </div>
                                            <span style={{ 
                                                padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold',
                                                background: displayStatus === 'Approved' ? '#d4edda' : displayStatus === 'PaidOff' ? '#cce5ff' : displayStatus === 'Rejected' ? '#f8d7da' : '#fff3cd',
                                                color: displayStatus === 'Approved' ? '#155724' : displayStatus === 'PaidOff' ? '#004085' : displayStatus === 'Rejected' ? '#721c24' : '#856404'
                                            }}>
                                                {displayStatus === 'Pending' ? 'Beklemede' : displayStatus === 'Approved' ? 'Aktif (Ödeniyor)' : displayStatus === 'PaidOff' ? 'Borç Bitti' : 'Reddedildi'}
                                            </span>
                                        </div>

                                        {/* DETAY VE ÖDEME ALANI */}
                                        {/* Sadece Onaylıysa VE Borç Bitmemişse Butonu Göster */}
                                        {displayStatus === 'Approved' && !isFinished && (
                                            <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
                                                    <span>Kalan Borç:</span>
                                                    <strong style={{ color: '#c0392b' }}>{remaining.toLocaleString()} ₺</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '15px' }}>
                                                    <span>Aylık Taksit:</span>
                                                    <strong>{monthly.toLocaleString()} ₺</strong>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => handleRepay(loan.id, monthly)}
                                                    disabled={loading}
                                                    style={{ 
                                                        width: '100%', padding: '10px', background: '#27ae60', color: 'white', 
                                                        border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold',
                                                        opacity: loading ? 0.6 : 1
                                                    }}
                                                >
                                                    {loading ? 'İşleniyor...' : '💳 Taksit Öde'}
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Borç Bittiyse */}
                                        {(displayStatus === 'PaidOff' || isFinished) && status !== 'Rejected' && (
                                            <div style={{textAlign:'center', color:'#27ae60', fontWeight:'bold', marginTop:'10px', background:'#f0fff4', padding:'10px', borderRadius:'5px'}}>
                                                🎉 Bu kredinin ödemesi tamamlandı!
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
};

export default LoanCalculator;