import React, { useState, useEffect } from 'react';
import api from '../api';

const Cards = () => {
    const [cards, setCards] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    
    const [newCardType, setNewCardType] = useState('Debit');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [requestedLimit, setRequestedLimit] = useState(10000); 

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const cardRes = await api.get('/Banking/my-cards');
            setCards(cardRes.data);

            const accRes = await api.get('/Banking/my-account');
            const accList = accRes.data.Accounts || accRes.data.accounts || [];
            setAccounts(accList.filter(acc => (acc.currency || acc.Currency) === 'TL'));
        } catch (err) {
            console.error("Veri hatası:", err);
        }
    };

    const handleCreateCard = async (e) => {
        e.preventDefault();
        try {
            await api.post('/Banking/create-card', {
                cardType: newCardType,
                linkedAccountNumber: newCardType === 'Debit' ? selectedAccount : null,
                requestedLimit: newCardType === 'Credit' ? Number(requestedLimit) : 0
            });
            alert("✅ Başvuru işlemi tamamlandı.");
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert("Hata: " + (err.response?.data || "İşlem başarısız."));
        }
    };

    const formatCardNumber = (num) => num ? num.replace(/(\d{4})/g, '$1 ').trim() : '**** **** **** ****';

    // 🔥 KARTLARI BURADA AYIRIYORUZ 🔥
    // Ekranda kart olarak gözükecekler (Aktif ve Bekleyenler)
    const visibleCards = cards.filter(c => c.status !== 'Rejected');
    
    // Sadece uyarı mesajı olarak gözükecekler (Reddedilenler)
    const rejectedCards = cards.filter(c => c.status === 'Rejected');

    return (
        <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '20px' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                <h1 style={{ color: '#2c3e50', margin:0 }}>💳 Kartlarım</h1>
                <button 
                    onClick={() => setShowModal(true)}
                    style={{padding:'10px 20px', background:'#2980b9', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}
                >
                    + Yeni Kart Başvurusu
                </button>
            </div>

            {/* 🔥 REDDEDİLEN BAŞVURULAR (UYARI MESAJLARI) 🔥 */}
            {rejectedCards.length > 0 && (
                <div style={{marginBottom: '30px'}}>
                    {rejectedCards.map(card => (
                        <div key={card.id} style={{
                            padding: '15px', 
                            backgroundColor: '#ffebee', // Açık kırmızı
                            color: '#c62828', // Koyu kırmızı yazı
                            border: '1px solid #ef9a9a', 
                            borderRadius: '8px', 
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{fontSize: '20px'}}>❌</span>
                            <span>
                                <strong>{(card.requestedLimit || 0).toLocaleString()} ₺</strong> limitli 
                                {card.cardType === 'Credit' ? ' Kredi Kartı' : ' Banka Kartı'} başvurunuz <strong>reddedilmiştir.</strong>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* KART LİSTESİ (SADECE AKTİF VE BEKLEYENLER) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' }}>
                {visibleCards.length === 0 && rejectedCards.length === 0 ? <p style={{color:'#777'}}>Henüz bir kartınız yok.</p> : visibleCards.map(card => {
                    const isPending = card.status === 'Pending';
                    const isCredit = card.cardType === 'Credit';

                    // Kart Rengi
                    let bg = 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'; // Debit
                    if (isCredit) bg = 'linear-gradient(135deg, #1e130c 0%, #9a8478 100%)'; // Credit
                    if (isPending) bg = '#95a5a6'; // Gri (Bekleyen)

                    return (
                        <div key={card.id} style={{
                            width: '350px', height: '220px', borderRadius: '15px', padding: '25px',
                            color: 'white', position: 'relative', boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                            background: bg,
                            fontFamily: '"Courier New", Courier, monospace',
                            opacity: isPending ? 0.9 : 1
                        }}>
                            {/* Üst Kısım */}
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
                                <div style={{width:'50px', height:'35px', background:'#f1c40f', borderRadius:'5px', opacity:0.8}}></div>
                                
                                {isPending ? (
                                    <span style={{background:'orange', padding:'5px', borderRadius:'5px', fontSize:'12px', fontWeight:'bold', color:'black'}}>ONAY BEKLİYOR ⏳</span>
                                ) : (
                                    <span style={{fontWeight:'bold', fontSize:'18px', fontStyle:'italic'}}>Grup 1 Bank</span>
                                )}
                            </div>

                            {/* Kart Numarası */}
                            <div style={{fontSize:'22px', letterSpacing:'2px', marginBottom:'20px', textShadow:'2px 2px 2px black'}}>
                                {formatCardNumber(card.cardNumber)}
                            </div>

                            {/* Tarih ve CVV */}
                            <div style={{display:'flex', gap:'20px', fontSize:'12px', marginBottom:'20px'}}>
                                <div><div style={{opacity:0.8, fontSize:'10px'}}>VALID THRU</div><div>{card.expiryDate}</div></div>
                                <div><div style={{opacity:0.8, fontSize:'10px'}}>CVV</div><div>{card.cvv}</div></div>
                            </div>

                            {/* İsim ve Tip */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
                                <div style={{fontSize:'16px', textTransform:'uppercase', textShadow:'1px 1px 1px black'}}>{card.cardHolderName}</div>
                                <div style={{fontSize:'14px', fontWeight:'bold', background:'white', color:'black', padding:'2px 5px', borderRadius:'3px'}}>
                                    {isCredit ? 'CREDIT' : 'DEBIT'}
                                </div>
                            </div>

                            {/* Alt Bilgi */}
                            <div style={{position:'absolute', bottom:'-40px', left:0, width:'100%', color:'#333', textAlign:'center'}}>
                                {isPending ? (
                                    <span>Talep Edilen Limit: <strong>{card.requestedLimit.toLocaleString()} ₺</strong></span>
                                ) : isCredit ? (
                                    <span>Limit: {card.creditLimit.toLocaleString()} ₺ | Borç: {card.currentDebt.toLocaleString()} ₺</span>
                                ) : (
                                    <span>Bağlı Hesap: {card.linkedAccount?.accountNumber || '---'}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL */}
            {showModal && (
                <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
                    <div style={{background:'white', padding:'30px', borderRadius:'10px', width:'400px', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
                        <h2 style={{marginTop:0, textAlign:'center'}}>Kart Başvurusu</h2>
                        <form onSubmit={handleCreateCard}>
                            <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Kart Türü</label>
                            <select value={newCardType} onChange={(e) => setNewCardType(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', borderRadius:'5px'}}>
                                <option value="Debit">💳 Banka Kartı (Debit)</option>
                                <option value="Credit">💎 Kredi Kartı (Credit)</option>
                            </select>

                            {newCardType === 'Debit' && (
                                <>
                                    <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Bağlanacak TL Hesabı</label>
                                    <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', borderRadius:'5px'}} required>
                                        <option value="">Hesap Seçiniz...</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.accountNumber || acc.AccountNumber}>
                                                {acc.accountNumber || acc.AccountNumber} - {acc.balance || acc.Balance} ₺
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {newCardType === 'Credit' && (
                                <>
                                    <label style={{display:'block', marginBottom:'5px', fontWeight:'bold'}}>Talep Edilen Limit (₺)</label>
                                    <input type="number" min="1000" max="100000" value={requestedLimit} onChange={(e) => setRequestedLimit(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'15px', borderRadius:'5px', border:'1px solid #ccc'}} required />
                                </>
                            )}

                            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                                <button type="button" onClick={() => setShowModal(false)} style={{flex:1, padding:'10px', background:'#ccc', border:'none', borderRadius:'5px', cursor:'pointer'}}>İptal</button>
                                <button type="submit" style={{flex:1, padding:'10px', background:'#27ae60', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>Başvur</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cards;