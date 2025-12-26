// src/components/AdminPanel.js

import React, { useState, useEffect } from 'react';
import api from '../api';

const AdminPanel = () => {
    // --- STATE'LER ---
    const [transactions, setTransactions] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loanRequests, setLoanRequests] = useState([]); 
    const [financialReport, setFinancialReport] = useState([]); 
    const [cardApplications, setCardApplications] = useState([]); 
    
    const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', email: '', role: 'Customer', initialBalance: 0 });
    const [adminTx, setAdminTx] = useState({ accountNumber: '', amount: '', type: 'Deposit' });
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('report'); 

    // --- VERİ ÇEKME ---
    const fetchData = async () => {
        try {
            const txRes = await api.get('/Banking/all-transactions');
            setTransactions(txRes.data || []);

            const logRes = await api.get('/Banking/system-logs');
            setLogs(logRes.data || []);

            const loanRes = await api.get('/Banking/admin/loans');
            setLoanRequests(loanRes.data || []);

            const reportRes = await api.get('/Banking/admin/financial-report');
            setFinancialReport(reportRes.data || []);

            const cardRes = await api.get('/Banking/admin/card-applications');
            setCardApplications(cardRes.data || []);

        } catch (err) {
            console.error("Admin verileri alınamadı", err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); 
        return () => clearInterval(interval);
    }, []);

    // --- İŞLEMLER ---
    const handleLoanProcess = async (loanId, decision) => {
        if(!window.confirm(decision === 'Approved' ? "Onaylıyor musunuz?" : "Reddediyor musunuz?")) return;
        try { 
            await api.post('/Banking/admin/process-loan', { loanId, decision }); 
            alert("İşlem Başarılı!"); 
            fetchData(); 
        } 
        catch (err) { alert("Hata: " + (err.response?.data?.Message || err.response?.data)); }
    };

    const handleCardProcess = async (cardId, requestedLimit, decision) => {
        let finalLimit = 0;
        if (decision === 'Approved') {
            const input = prompt(`Onaylanacak Limiti Girin (Talep: ${requestedLimit} TL):`, requestedLimit);
            if (input === null) return; 
            finalLimit = Number(input);
            if (isNaN(finalLimit) || finalLimit <= 0) { alert("Geçersiz limit!"); return; }
        } else {
            if(!window.confirm("Reddediyor musunuz?")) return;
        }

        try { 
            await api.post('/Banking/admin/process-card', { cardId, decision, approvedLimit: finalLimit }); 
            
            setCardApplications(prevList => 
                prevList.map(card => {
                    if (card.id === cardId) {
                        return { ...card, status: decision === 'Approved' ? 'Active' : 'Rejected', creditLimit: finalLimit };
                    }
                    return card;
                })
            );
            alert("İşlem Tamamlandı!");
        } 
        catch (err) { alert("Hata: " + (err.response?.data?.Message || err.response?.data)); }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setMessage(''); 

        try { 
            const response = await api.post('/Banking/add-user', newUser); 
            
            setMessage('✅ ' + (response.data.Message || 'Kullanıcı başarıyla eklendi!'));
            setNewUser({ username: '', password: '', fullName: '', email: '', role: 'Customer', initialBalance: 0 }); 
            fetchData(); 
            setTimeout(() => setMessage(''), 3000); 

        } catch (err) { 
            console.error("Kullanıcı ekleme hatası:", err);
            let errorMessage = 'Bilinmeyen bir hata oluştu.';
            if (err.response && err.response.data && err.response.data.Message) {
                errorMessage = err.response.data.Message;
            } 
            else if (err.response && err.response.data) {
                 errorMessage = JSON.stringify(err.response.data);
            }
            setMessage('❌ Hata: ' + errorMessage); 
            setTimeout(() => setMessage(''), 5000); 
        }
    };

    const handleAdminTransaction = async (e) => {
        e.preventDefault();
        if(!window.confirm("İşlemi onaylıyor musunuz?")) return;
        
        try { 
            const response = await api.post('/Banking/admin-transaction', { 
                accountNumber: adminTx.accountNumber, 
                amount: parseFloat(adminTx.amount), 
                transactionType: adminTx.type 
            }); 
            alert("✅ Başarılı! " + (response.data.Message || '')); 
            setAdminTx({ accountNumber: '', amount: '', type: 'Deposit' }); 
            fetchData(); 
        } 
        catch (err) { 
            alert("❌ Hata: " + (err.response?.data?.Message || err.response?.data)); 
        }
    };

    const copyToClipboard = (text) => {
        if(text) { navigator.clipboard.writeText(text); alert(`Kopyalandı: ${text}`); }
    };

    // 🔥 KARTLARI BURADA AYIRIYORUZ 🔥
    const pendingCards = cardApplications.filter(c => c.status === 'Pending');
    const historyCards = cardApplications.filter(c => c.status !== 'Pending');

    return (
        <div style={{ maxWidth: '1500px', margin: '30px auto', padding: '20px', fontFamily: 'Arial, sans-serif', background: '#e3f2fd', minHeight: '90vh', borderRadius: '10px' }}>
            <h1 style={{ color: '#01579b', textAlign: 'center', marginBottom:'30px' }}>🛡️ Yönetici Paneli</h1>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px', flexWrap:'wrap' }}>
                <button onClick={() => setActiveTab('report')} style={activeTab === 'report' ? activeTabStyle : tabStyle}>📊 Rapor</button>
                <button onClick={() => setActiveTab('money')} style={activeTab === 'money' ? activeTabStyle : tabStyle}>💸 Para Yönetimi</button>
                <button onClick={() => setActiveTab('cards')} style={activeTab === 'cards' ? activeTabStyle : tabStyle}>
                    💳 Kart Onay {pendingCards.length > 0 && <span style={{background:'red', color:'white', borderRadius:'50%', padding:'2px 6px', fontSize:'10px', verticalAlign:'top'}}>{pendingCards.length}</span>}
                </button>
                <button onClick={() => setActiveTab('loans')} style={activeTab === 'loans' ? activeTabStyle : tabStyle}>💰 Kredi Onay</button>
                <button onClick={() => setActiveTab('users')} style={activeTab === 'users' ? activeTabStyle : tabStyle}>👥 Üye Ekle</button>
                <button onClick={() => setActiveTab('transactions')} style={activeTab === 'transactions' ? activeTabStyle : tabStyle}>📜 İşlemler</button>
                <button onClick={() => setActiveTab('logs')} style={activeTab === 'logs' ? activeTabStyle : tabStyle}>🔒 Loglar</button>
            </div>

            {/* --- 0. RAPOR --- */}
            {activeTab === 'report' && (
                <div style={cardStyle}>
                    <h3>👥 Müşteri Varlık, Kart ve Kredi Raporu</h3>
                    <table style={tableStyle}>
                        <thead>
                            <tr style={{ background: '#01579b', color:'white' }}>
                                <th style={thStyle}>Müşteri</th>
                                <th style={thStyle}>Hesaplar (IBAN)</th>
                                <th style={thStyle}>Kartlar</th>
                                <th style={{...thStyle, width:'35%'}}>Kredi Detayları</th>
                                <th style={thStyle}>Genel Özet</th>
                            </tr>
                        </thead>
                        <tbody>
                            {financialReport.map((item, index) => {
                                const fullName = item.fullName || item.FullName || "Bilinmeyen";
                                const userId = item.userId || item.UserId || "-";
                                const accounts = item.accountList || item.AccountList || [];
                                const cards = item.cardList || item.CardList || []; 
                                const loansObj = item.loans || item.Loans || {};
                                const loansList = loansObj.list || loansObj.List || []; 
                                const totalLiabilities = item.totalLiabilities || item.TotalLiabilities || 0;
                                const totalAssets = item.totalAssets || item.TotalAssets || 0;

                                return (
                                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={tdStyle}>
                                            <strong style={{fontSize:'15px'}}>{fullName}</strong> <br/>
                                            <span style={{fontSize:'12px', color:'#7f8c8d'}}>ID: {userId}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            {accounts.length > 0 ? accounts.map((acc, idx) => (
                                                <div key={idx} style={{
                                                    background:'#f8f9fa', 
                                                    padding:'8px', 
                                                    marginBottom:'6px', 
                                                    borderRadius:'4px', 
                                                    border:'1px solid #eee', 
                                                    fontSize:'12px',
                                                    lineHeight: '1.4'
                                                }}>
                                                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                                                        <span style={{color: (acc.currency||acc.Currency)==='TL'?'#27ae60':'#2980b9', fontSize:'13px'}}>{acc.currency||acc.Currency}</span>
                                                        <span style={{color: '#34495e'}}>{(acc.balance||acc.Balance||0).toLocaleString()}</span>
                                                    </div>
                                                    <div style={{fontSize:'10px', color:'#7f8c8d', borderBottom: '1px dashed #ccc', paddingBottom: '5px', marginBottom: '5px'}}>
                                                        Sahibi: <strong style={{color: '#34495e'}}>{acc.accountOwnerUsername || acc.AccountOwnerUsername || 'Bilinmiyor'}</strong>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <span style={{fontFamily:'monospace', fontSize:'11px', color:'#7f8c8d'}}>
                                                            {acc.accountNumber || acc.AccountNumber || 'Hesap Numarası Yok'}
                                                        </span>
                                                        <button onClick={() => copyToClipboard(acc.accountNumber||acc.AccountNumber)} style={{
                                                            border:'none', background:'transparent', cursor:'pointer', fontSize:'10px', marginLeft:'5px', padding:0, color: '#2980b9'
                                                        }}>
                                                            📋 Kopyala
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : <span style={{color:'#ccc'}}>Hesap Yok</span>}
                                        </td>
                                        <td style={tdStyle}>
                                            {cards.length > 0 ? cards.map((card, idx) => {
                                                const type = card.cardType || card.CardType;
                                                const num = card.cardNumber || card.CardNumber || "????";
                                                const limit = card.creditLimit || card.CreditLimit || 0;
                                                const debt = card.currentDebt || card.CurrentDebt || 0;
                                                const status = card.status || card.Status;
                                                const isCredit = type === 'Credit';
                                                
                                                let statusColor = 'green';
                                                let statusText = 'AKTİF';
                                                let bg = isCredit ? '#fff8e1' : '#e3f2fd';

                                                if (status === 'Pending') {
                                                    statusColor = 'orange'; statusText = 'BEKLİYOR';
                                                } else if (status === 'Rejected') {
                                                    statusColor = 'red'; statusText = 'REDDEDİLDİ'; bg = '#ffebee'; 
                                                }

                                                return (
                                                    <div key={idx} style={{
                                                        padding:'5px', marginBottom:'5px', borderRadius:'4px', border:'1px solid #ddd',
                                                        background: bg, fontSize:'11px'
                                                    }}>
                                                        <div style={{fontWeight:'bold', display:'flex', justifyContent:'space-between', marginBottom:'2px'}}>
                                                            <span>{isCredit ? '💎 KREDİ' : '💳 BANKA'}</span>
                                                            <span style={{color: statusColor, fontSize:'10px', fontWeight:'900'}}>{statusText}</span>
                                                        </div>
                                                        <div style={{fontFamily:'monospace', color:'#555', fontSize:'10px'}}>{num}</div>
                                                        {isCredit && status === 'Active' && (
                                                            <div style={{marginTop:'3px', borderTop:'1px dashed #ccc', paddingTop:'2px'}}>
                                                                <div>L: {limit.toLocaleString()} ₺</div>
                                                                <div style={{color:'#c0392b'}}>B: {debt.toLocaleString()} ₺</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }) : <span style={{color:'#ccc', fontSize:'12px'}}>Kart Yok</span>}
                                        </td>
                                        
                                        {/* 🔥 KREDİ DETAYLARI - DÜZELTİLDİ 🔥 */}
                                        <td style={tdStyle}>
                                            {loansList.length > 0 ? loansList.map((loan, idx) => {
                                                const l_Total = loan.totalRepayment || loan.TotalRepayment || 0;
                                                const l_Remaining = loan.remainingAmount || loan.RemainingAmount || 0;
                                                const l_Status = loan.status || loan.Status || "";
                                                const l_Paid = l_Total - l_Remaining;
                                                
                                                // Durum Mantığı
                                                let statusText = 'ÖDENİYOR';
                                                let borderColor = '#f39c12'; // Turuncu
                                                let bgColor = '#fdfdfd';

                                                if (l_Status === 'PaidOff') {
                                                    statusText = 'BİTTİ'; borderColor = '#27ae60'; 
                                                } else if (l_Status === 'Rejected') {
                                                    statusText = 'REDDEDİLDİ'; borderColor = '#c0392b'; bgColor = '#ffebee';
                                                } else if (l_Status === 'Pending') {
                                                    statusText = 'ONAY BEKLİYOR'; borderColor = '#95a5a6';
                                                } else if (l_Status === 'Approved') {
                                                    statusText = 'ÖDENİYOR'; borderColor = '#2980b9';
                                                }

                                                return (
                                                    <div key={idx} style={{ padding: '5px', borderRadius: '5px', borderLeft: `4px solid ${borderColor}`, background: bgColor, border: '1px solid #eee', marginBottom:'5px', fontSize:'11px' }}>
                                                        <div style={{fontWeight:'bold', color: borderColor}}>Kredi ({loan.termMonths||loan.TermMonths} Ay) - {statusText}</div>
                                                        
                                                        {l_Status !== 'Rejected' && l_Status !== 'Pending' ? (
                                                            <div style={{display:'flex', justifyContent:'space-between', marginTop:'2px'}}>
                                                                <span style={{color:'#27ae60'}}>Ödenen: {l_Paid.toLocaleString()}</span>
                                                                <span style={{color:'#c0392b'}}>Kalan: {l_Remaining.toLocaleString()}</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{color:'#7f8c8d', fontStyle:'italic', marginTop:'2px'}}>
                                                                Talep: {(loan.amount||loan.Amount).toLocaleString()} ₺
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }) : <span style={{color:'#ccc'}}>-</span>}
                                        </td>

                                        {/* 🔥 GENEL ÖZET - GÜNCELLENDİ 🔥 */}
                                        <td style={tdStyle}>
                                            <div style={{ marginBottom: '15px', padding: '10px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9', textAlign:'center' }}>
                                                <div style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 'bold', textTransform:'uppercase', letterSpacing:'0.5px' }}>💰 Toplam Varlık</div>
                                                <div style={{ fontSize: '16px', color: '#1b5e20', fontWeight: 'bold', marginTop:'5px' }}>
                                                    {totalAssets.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                </div>
                                            </div>

                                            <div style={{ textAlign:'center', padding: '10px', background: '#ffebee', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
                                                <div style={{ fontSize: '11px', color: '#c62828', fontWeight: 'bold', textTransform:'uppercase', letterSpacing:'0.5px' }}>📉 Toplam Yükümlülük</div>
                                                <div style={{ fontSize: '16px', color: '#b71c1c', fontWeight: 'bold', marginTop:'5px' }}>
                                                    {totalLiabilities.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- KART BAŞVURULARI --- */}
            {activeTab === 'cards' && (
                <div>
                    <div style={{...cardStyle, borderLeft:'5px solid #d35400', marginBottom:'20px'}}>
                        <h3 style={{color:'#d35400'}}>⏳ Bekleyen Başvurular (İşlem Yapılacaklar)</h3>
                        {pendingCards.length === 0 ? <p style={{color:'#777'}}>Şu an bekleyen başvuru yok.</p> : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={{ background: '#e67e22', color:'white' }}>
                                        <th style={thStyle}>ID</th>
                                        <th style={thStyle}>Müşteri</th>
                                        <th style={thStyle}>Talep Edilen Limit</th>
                                        <th style={thStyle}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingCards.map(card => {
                                        const cId = card.id || card.Id;
                                        const reqLimit = card.requestedLimit || card.RequestedLimit || 0;
                                        
                                        return (
                                            <tr key={cId} style={{ borderBottom: '1px solid #eee', background: '#fffaf0' }}>
                                                <td style={{...tdStyle, fontWeight:'bold', color:'#555'}}>#{cId}</td>
                                                <td style={tdStyle}><strong>{card.user?.fullName || card.user?.username}</strong></td>
                                                <td style={{...tdStyle, fontWeight:'bold', color:'#d35400'}}>{reqLimit.toLocaleString()} ₺</td>
                                                <td style={tdStyle}>
                                                    <div style={{display:'flex', gap:'10px'}}>
                                                        <button onClick={() => handleCardProcess(cId, reqLimit, 'Approved')} style={{...miniBtn, background:'#27ae60', padding:'8px 15px', fontSize:'14px'}}>✅ Onayla</button>
                                                        <button onClick={() => handleCardProcess(cId, 0, 'Rejected')} style={{...miniBtn, background:'#c0392b', padding:'8px 15px', fontSize:'14px'}}>❌ Reddet</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div style={{...cardStyle, opacity:0.9, marginTop:'30px'}}>
                        <h3 style={{color:'#7f8c8d'}}>📜 Geçmiş İşlemler (Onaylanan/Reddedilen)</h3>
                        {historyCards.length === 0 ? <p style={{color:'#777'}}>Geçmiş işlem yok.</p> : (
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={{ background: '#bdc3c7', color:'white' }}>
                                        <th style={thStyle}>ID</th>
                                        <th style={thStyle}>Müşteri</th>
                                        <th style={thStyle}>Durum</th>
                                        <th style={thStyle}>Limit / Detay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyCards.map(card => {
                                        const status = card.status || card.Status;
                                        const isRejected = status === 'Rejected';
                                        const cId = card.id || card.Id;

                                        return (
                                            <tr key={cId} style={{ borderBottom: '1px solid #eee', background: isRejected ? '#ffebee' : '#f0fff4' }}>
                                                <td style={{...tdStyle, color:'#555'}}>#{cId}</td>
                                                <td style={tdStyle}>{card.user?.fullName || card.user?.username}</td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding:'5px 10px', borderRadius:'5px',
                                                        fontWeight:'bold', fontSize:'12px',
                                                        color: isRejected ? '#721c24' : '#155724',
                                                        background: isRejected ? '#f8d7da' : '#d4edda'
                                                    }}>
                                                        {isRejected ? 'REDDEDİLDİ ❌' : 'ONAYLANDI ✅'}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    {isRejected ? (
                                                        <span style={{color:'#777', fontStyle:'italic'}}>Onaylanmadı</span>
                                                    ) : (
                                                        <span>Limit: <strong>{(card.creditLimit||card.CreditLimit||0).toLocaleString()} ₺</strong></span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'money' && (
                <div style={{...cardStyle, maxWidth:'500px', margin:'0 auto'}}>
                    <h3 style={{color:'#27ae60'}}>💸 Hesaba Para Yatır / Çek</h3>
                    <form onSubmit={handleAdminTransaction}>
                        <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Hesap Numarası (IBAN)</label>
                        <input type="text" placeholder="Örn: TR3481..." value={adminTx.accountNumber} onChange={e => setAdminTx({...adminTx, accountNumber: e.target.value})} style={inputStyle} required />
                        <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Tutar</label>
                        <input type="number" placeholder="0.00" value={adminTx.amount} onChange={e => setAdminTx({...adminTx, amount: e.target.value})} style={inputStyle} required />
                        <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>İşlem Türü</label>
                        <select value={adminTx.type} onChange={e => setAdminTx({...adminTx, type: e.target.value})} style={inputStyle}>
                            <option value="Deposit">➕ Para Yatır (Ekle)</option>
                            <option value="Withdraw">➖ Para Çek (Azalt)</option>
                        </select>
                        <button type="submit" style={{...buttonStyle, background: adminTx.type === 'Deposit' ? '#27ae60' : '#c0392b'}}>
                            {adminTx.type === 'Deposit' ? 'Para Yatır' : 'Para Çek'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'loans' && (
                <div style={cardStyle}>
                    <h3>Kredi Başvuruları</h3>
                    <table style={tableStyle}>
                        <thead>
                            <tr style={{ background: '#ecf0f1' }}>
                                <th style={thStyle}>Başvuran</th>
                                <th style={thStyle}>Tutar / Vade</th>
                                <th style={thStyle}>Durum</th>
                                <th style={thStyle}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loanRequests.map(loan => (
                                <tr key={loan.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={tdStyle}>{loan.user?.fullName || loan.user?.username}</td>
                                    <td style={tdStyle}>{(loan.amount || 0).toLocaleString()} ₺ / {loan.termMonths} Ay</td>
                                    <td style={tdStyle}>
                                        <span style={{padding:'5px 10px', borderRadius:'5px', color:'white', fontSize:'12px', background: loan.status === 'Approved' ? '#27ae60' : loan.status === 'Rejected' ? '#c0392b' : loan.status === 'PaidOff' ? '#2980b9' : '#f39c12'}}>
                                            {loan.status === 'Pending' ? 'Bekliyor' : loan.status === 'Approved' ? 'Onaylandı' : loan.status === 'PaidOff' ? 'Ödendi' : 'Reddedildi'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        {loan.status === 'Pending' && (
                                            <div style={{display:'flex', gap:'10px'}}>
                                                <button onClick={() => handleLoanProcess(loan.id, 'Approved')} style={{...miniBtn, background:'#27ae60'}}>✅</button>
                                                <button onClick={() => handleLoanProcess(loan.id, 'Rejected')} style={{...miniBtn, background:'#c0392b'}}>❌</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'users' && (
                <div style={{...cardStyle, maxWidth:'500px', margin:'0 auto'}}>
                    <h3>Yeni Kullanıcı Oluştur</h3>
                    <form onSubmit={handleAddUser}>
                        <input type="text" placeholder="Kullanıcı Adı" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} style={inputStyle} required />
                        <input type="password" placeholder="Şifre" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={inputStyle} required />
                        <input type="text" placeholder="Ad Soyad" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} style={inputStyle} />
                        <input type="email" placeholder="E-Posta" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} />
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={inputStyle}>
                            <option value="Customer">Müşteri</option>
                            <option value="Admin">Admin</option>
                        </select>
                        {newUser.role === 'Customer' && (
                            <input type="number" placeholder="Başlangıç Bakiyesi" value={newUser.initialBalance} onChange={e => setNewUser({...newUser, initialBalance: e.target.value})} style={inputStyle} />
                        )}
                        <button type="submit" style={buttonStyle}>Kullanıcı Ekle</button>
                    </form>
                    {message && <div style={{ marginTop: '15px', color: message.includes('✅') ? 'green' : 'red', textAlign:'center' }}>{message}</div>}
                </div>
            )}

            {activeTab === 'transactions' && (
                <div style={cardStyle}>
                    <h3>Son Banka İşlemleri</h3>
                    <table style={tableStyle}>
                        <thead>
                            <tr style={{ background: '#ecf0f1' }}>
                                <th style={thStyle}>Tarih</th>
                                <th style={thStyle}>Kimden</th>
                                <th style={thStyle}>Kime</th>
                                <th style={thStyle}>Tutar</th>
                                <th style={thStyle}>Tip</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={tdStyle}>{new Date(t.transactionDate).toLocaleString()}</td>
                                    <td style={tdStyle}>{t.fromAccount?.user?.fullName || 'Banka'}</td>
                                    <td style={tdStyle}>{t.toAccount?.user?.fullName || 'Banka'}</td>
                                    <td style={{...tdStyle, fontWeight:'bold'}}>{(t.amount || 0).toFixed(2)}</td>
                                    <td style={tdStyle}>{t.transactionType}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'logs' && (
                <div style={cardStyle}>
                    <h3>Güvenlik Logları</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {logs.map(log => (
                            <li key={log.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                <strong>[{new Date(log.timestamp).toLocaleString()}]</strong> {log.user?.username} - {log.action} ({log.details})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- STYLES ---
const cardStyle = { background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px', fontSize: '14px', verticalAlign: 'top' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing:'border-box' };
const buttonStyle = { width: '100%', padding: '10px', background: '#c0392b', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold' };
const miniBtn = { padding:'5px 10px', color:'white', border:'none', borderRadius:'5px', cursor:'pointer' };

const tabStyle = { padding: '10px 20px', background: '#ecf0f1', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold', color:'#2c3e50' };
// Stilize edilmiş arka plan
const activeTabStyle = { ...tabStyle, background: '#01579b', color: 'white' }; // Başlık arka planı da mavi yapıldı

export default AdminPanel;