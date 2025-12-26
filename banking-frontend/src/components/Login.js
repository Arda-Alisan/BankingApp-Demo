// src/components/Login.js - TEMA UYUMLU 

import React, { useState } from 'react';
import api from '../api'; 

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await api.post('/Banking/login', {
                username: username,
                password: password
            });

            // Backend'den gelen token, role ve username'i alıyoruz
            const { token, role, username: returnedUsername } = response.data;
            
            // 1. Verileri kalıcı olarak kaydet
            localStorage.setItem('token', token);
            localStorage.setItem('role', role);
            localStorage.setItem('username', returnedUsername); 

            // Token'ı Axios'a ekle (Hemen sonraki API çağrıları için kritik)
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // App.js'e haber ver
            onLoginSuccess();
            
        } catch (err) {
            console.error("Login hatası:", err);
            if (err.response && err.response.status === 401) {
                setError('❌ Kullanıcı adı veya şifre yanlış!');
            } else if (err.response && err.response.status === 404) {
                setError('❌ Sunucu adresi bulunamadı (404).');
            } else {
                setError('❌ Bir hata oluştu. Sunucu kapalı olabilir.');
            }
        }
    };

    return (
        // CSS'teki .login-container ve .login-card sınıfları kullanıldı
        <div className="login-container">
            <div className="login-card"> 
                <h2 style={{ color: '#333' }}>Grup 1 Bank - Giriş</h2>
                
                {/* Hata mesajı stili korundu, çünkü bu özel bir mesaj kutusu */}
                {error && <div style={{ color: 'red', marginBottom: '15px', background:'#ffeaea', padding:'10px', borderRadius:'5px' }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '15px' }}>
                        {/* CSS'teki input stiline güveniliyor */}
                        <input 
                            type="text" 
                            placeholder="Kullanıcı Adı (arda veya admin)" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        {/* CSS'teki input stiline güveniliyor */}
                        <input 
                            type="password" 
                            placeholder="Şifre (123)" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required
                        />
                    </div>
                    {/* CSS'teki button[type="submit"] stiline güveniliyor */}
                    <button 
                        type="submit" 
                    >
                        Giriş Yap
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;