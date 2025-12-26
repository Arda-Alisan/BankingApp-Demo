// src/components/Profile.js

import React, { useState, useEffect } from 'react';
import api from '../api'; 

const Profile = ({ profileData, onProfileUpdate }) => {
    
    // Veritabanından gelen verinin yüklendiğini kontrol et (Objenin doluluk kontrolü)
    const isProfileDataReady = Object.keys(profileData || {}).length > 0;
    
    // 1. Initial State
    const getInitialFormData = (data) => {
        const defaultUsername = localStorage.getItem('username') || 'Bilinmiyor';
        const defaultRole = localStorage.getItem('role') || 'Müşteri';

        return {
            FullName: data?.FullName || '', 
            Email: data?.Email || '',
            PhoneNumber: data?.PhoneNumber || '',
            Address: data?.Address || '',
            
            Username: data?.Username || defaultUsername,
            Role: data?.Role || defaultRole
        };
    };
    
    const [formData, setFormData] = useState(getInitialFormData(profileData));
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    // 2. profileData (prop) değiştiğinde, formu doldur (Database'den veri gelirse)
    useEffect(() => {
        if (isProfileDataReady) {
            setFormData(getInitialFormData(profileData));
            setError(''); 
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileData]);


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsSubmitting(true);
        
        try {
            const payload = {
                FullName: formData.FullName,
                Email: formData.Email,
                PhoneNumber: formData.PhoneNumber,
                Address: formData.Address
            };
            
            // API'ye güncelleme isteği gönder
            const res = await api.put('/Banking/update-profile', payload);
            
            setMessage(res.data.Message || '✅ Profil başarıyla güncellendi!');
            
            // Merkezi state'i güncelle (App.js'i tetikler)
            onProfileUpdate({
                ...profileData, 
                ...payload
            });
            
        } catch (err) {
            console.error("Güncelleme hatası:", err);
            let errorMessage = '❌ Güncelleme sırasında bir hata oluştu.';
            if (err.response && err.response.data && err.response.data.Message) {
                errorMessage = '❌ Hata: ' + err.response.data.Message;
            }
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Yükleniyor ekranı
    if (!isProfileDataReady) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <p style={{ fontWeight: 'bold' }}>Profil bilgileri veritabanından çekiliyor...</p>
            <p style={subTextStyle}>Lütfen bekleyin. Eğer form boşsa, lütfen bir kez doldurup kaydedin.</p>
             <div style={staticInfoStyle}>
                <p><strong>Kullanıcı Adı:</strong> {localStorage.getItem('username') || 'Bilinmiyor'}</p>
                <p><strong>Rol:</strong> {localStorage.getItem('role') || 'Müşteri'}</p>
            </div>
        </div>
    }

    // Normal İçerik
    return (
        <div className="card" style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', borderRadius: '10px', background: 'white' }}>
            <h2 style={{ textAlign: 'center', color: '#0984e3', marginBottom: '30px' }}>👤 Profil Bilgileri</h2>

            {message && <div style={successStyle}>{message}</div>}
            {error && <div style={errorStyle}>{error}</div>}
            
            <form onSubmit={handleUpdate}>
                {/* FullName */}
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Adı Soyadı</label>
                    <input 
                        type="text" 
                        name="FullName" 
                        value={formData.FullName || ''} // DB'den çekilen değer
                        onChange={handleChange}
                        style={inputStyle}
                        required
                    />
                </div>
                
                {/* Email */}
                <div style={formGroupStyle}>
                    <label style={labelStyle}>E-Posta</label>
                    <input 
                        type="email" 
                        name="Email" 
                        value={formData.Email || ''} 
                        onChange={handleChange}
                        style={inputStyle}
                        required
                    />
                </div>
                
                {/* Telefon Numarası */}
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Telefon</label>
                    <input 
                        type="text" 
                        name="PhoneNumber" 
                        value={formData.PhoneNumber || ''} 
                        onChange={handleChange}
                        style={inputStyle}
                    />
                </div>

                {/* Adres */}
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Adres</label>
                    <textarea 
                        name="Address" 
                        rows="3" 
                        value={formData.Address || ''} 
                        onChange={handleChange} 
                        style={{...inputStyle, height: '80px'}} 
                    />
                </div>
                
                <button type="submit" style={buttonStyle} disabled={isSubmitting}>
                    {isSubmitting ? 'Güncelleniyor...' : '💾 Kaydet ve Güncelle'}
                </button>
            </form>
            
            {/* Statik Bilgiler */}
            <div style={staticInfoStyle}>
                <p><strong>Kullanıcı Adı:</strong> {formData.Username}</p>
                <p><strong>Rol:</strong> {formData.Role}</p>
            </div>
        </div>
    );
};

// --- STYLES ---
const formGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#34495e' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' };
const buttonStyle = {
    width: '100%',
    padding: '12px',
    background: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '20px',
    transition: 'background 0.3s',
    opacity: '0.9' 
};
const successStyle = { color: '#155724', background: '#d4edda', padding: '10px', borderRadius: '5px', marginBottom:'15px', border:'1px solid #c3e6cb' };
const errorStyle = { color: '#721c24', background: '#f8d7da', padding: '10px', borderRadius: '5px', marginBottom:'15px', border:'1px solid #f5c6cb' };
const staticInfoStyle = {
    marginTop: '25px',
    padding: '15px',
    borderTop: '1px dashed #ccc',
    fontSize: '14px',
    color: '#636e72'
};
const subTextStyle = {fontSize: '12px', color: '#888'};

export default Profile;