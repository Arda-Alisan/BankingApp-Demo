import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const CurrencyExchange = () => {
    const [accounts, setAccounts] = useState([]);
    const [rates, setRates] = useState([]);
    
    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [amount, setAmount] = useState('');
    
    const [calculatedAmount, setCalculatedAmount] = useState(0);
    const [activeRate, setActiveRate] = useState(0);
    const [rateType, setRateType] = useState(''); 

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Verileri Yükle
    useEffect(() => {
        const fetchData = async () => {
            try {
                const accRes = await api.get('/Banking/my-account');
                const rateRes = await api.get('/Banking/rates');
                
                const accList = accRes.data.Accounts || accRes.data.accounts || [];
                const ratesList = rateRes.data.Rates || rateRes.data.rates || [];

                setAccounts(accList);
                setRates(ratesList);

                // Varsayılan seçimler
                if (accList.length >= 2) {
                    setFromAccount(accList[0].AccountNumber || accList[0].accountNumber);
                    setToAccount(accList[1].AccountNumber || accList[1].accountNumber);
                }
            } catch (err) {
                console.error("Veri hatası:", err);
            }
        };
        fetchData();
    }, []);

    // Hesaplama Mantığı
    useEffect(() => {
        if (!amount || !fromAccount || !toAccount) {
            setCalculatedAmount(0);
            return;
        }

        const fromAcc = accounts.find(a => (a.AccountNumber || a.accountNumber) === fromAccount);
        const toAcc = accounts.find(a => (a.AccountNumber || a.accountNumber) === toAccount);

        if (!fromAcc || !toAcc) return;

        const fromCurr = (fromAcc.Currency || fromAcc.currency).toUpperCase();
        const toCurr = (toAcc.Currency || toAcc.currency).toUpperCase();
        const inputVal = parseFloat(amount);

        let result = 0;
        let rateUsed = 1;
        let type = 'Transfer';

        const findRateData = (code) => rates.find(r => (r.Code === code || r.code === code));

        if (fromCurr === toCurr) {
            result = inputVal;
            type = 'Aynı Para Birimi';
        } 
        else if (fromCurr === 'TL') {
            const rateData = findRateData(toCurr);
            if (rateData) {
                rateUsed = rateData.Selling || rateData.selling;
                result = inputVal / rateUsed;
                type = `Banka Satış Kuru (${toCurr})`;
            }
        }
        else if (toCurr === 'TL') {
            const rateData = findRateData(fromCurr);
            if (rateData) {
                rateUsed = rateData.Buying || rateData.buying;
                result = inputVal * rateUsed;
                type = `Banka Alış Kuru (${fromCurr})`;
            }
        }
        else {
            const fromRateData = findRateData(fromCurr);
            const toRateData = findRateData(toCurr);
            if (fromRateData && toRateData) {
                const tlValue = inputVal * (fromRateData.Buying || fromRateData.buying);
                const targetSelling = toRateData.Selling || toRateData.selling;
                result = tlValue / targetSelling;
                
                rateUsed = result / inputVal; 
                type = 'Çapraz Kur';
            }
        }

        setCalculatedAmount(result);
        setActiveRate(rateUsed);
        setRateType(type);

    }, [amount, fromAccount, toAccount, accounts, rates]);

    const handleExchange = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            await api.post('/Banking/internal-transfer', {
                fromAccountNumber: fromAccount,
                toAccountNumber: toAccount,
                amount: parseFloat(amount)
            });
            setMessage('✅ İşlem Başarılı!');
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err) {
            setMessage('❌ Hata: ' + (err.response?.data || 'İşlem başarısız.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', background: 'white', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}>💱 Döviz Al / Sat</h2>

            <form onSubmit={handleExchange}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#7f8c8d' }}>Gönderen Hesap (Satılan)</label>
                    <select 
                        value={fromAccount} 
                        onChange={(e) => setFromAccount(e.target.value)}
                        style={inputStyle}
                        required
                    >
                        {accounts.map(acc => (
                            <option key={acc.AccountNumber || acc.accountNumber} value={acc.AccountNumber || acc.accountNumber}>
                                {acc.Currency || acc.currency} - {parseFloat(acc.Balance || acc.balance).toFixed(2)} Bakiye
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#7f8c8d' }}>Alan Hesap (Alınan)</label>
                    <select 
                        value={toAccount} 
                        onChange={(e) => setToAccount(e.target.value)}
                        style={inputStyle}
                        required
                    >
                        {accounts.map(acc => (
                            <option key={acc.AccountNumber || acc.accountNumber} value={acc.AccountNumber || acc.accountNumber}>
                                {acc.Currency || acc.currency} - {parseFloat(acc.Balance || acc.balance).toFixed(2)} Bakiye
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#7f8c8d' }}>Satılacak Tutar</label>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00" 
                        style={inputStyle}
                        required
                    />
                </div>

                <div style={{ background: '#f1f2f6', padding: '15px', borderRadius: '10px', marginBottom: '25px', textAlign: 'center' }}>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>
                        Kullanılan Kur: <strong>{activeRate.toFixed(4)}</strong> <br/>
                        <span style={{fontSize:'12px', color:'#7f8c8d'}}>({rateType})</span>
                    </p>
                    <hr style={{border:'0', borderTop:'1px solid #ddd', margin:'10px 0'}}/>
                    <p style={{ margin: '5px 0', fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>
                        Geçen Tutar: ~{calculatedAmount.toFixed(2)} 
                    </p>
                </div>

                {message && <div style={{ marginBottom: '20px', padding: '10px', borderRadius: '5px', background: message.includes('✅') ? '#d4edda' : '#f8d7da', color: message.includes('✅') ? '#155724' : '#721c24', textAlign: 'center' }}>{message}</div>}

                <button 
                    type="submit" 
                    disabled={loading || calculatedAmount <= 0 || fromAccount === toAccount}
                    style={{
                        width: '100%', padding: '15px', background: '#3498db', color: 'white', 
                        border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                        opacity: (loading || calculatedAmount <= 0) ? 0.6 : 1
                    }}
                >
                    {loading ? 'İşlem Yapılıyor...' : '💱 İşlemi Onayla'}
                </button>
            </form>
        </div>
    );
};

const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #bdc3c7', fontSize: '16px', boxSizing: 'border-box' };

export default CurrencyExchange;