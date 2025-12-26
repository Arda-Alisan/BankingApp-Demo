// src/App.js - 

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Profile from './components/Profile';
import Dashboard from './components/Dashboard'; // Muhtemelen Accounts.js buranın içinde veya benzeri
import AdminPanel from './components/AdminPanel'; 
import Transfer from './components/Transfer'; 
import OpenAccount from './components/OpenAccount'; 
import Market from './components/Market'; 
import CurrencyExchange from './components/CurrencyExchange'; 
import LoanCalculator from './components/LoanCalculator'; 
import Cards from './components/Cards'; 
import ScheduledTransfers from './components/ScheduledTransfers'; // 🔥 YENİ EKLENDİ
import api from './api';
import './App.css'; 

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState(''); 
    const [refreshKey, setRefreshKey] = useState(0); 
    const [profileData, setProfileData] = useState({}); 
    
    const navigate = useNavigate();
    const location = useLocation(); 

    const fetchProfileData = async () => {
        const token = localStorage.getItem('token');
        const defaultUsername = localStorage.getItem('username');
        const defaultRole = localStorage.getItem('role'); 

        const fallbackData = { 
            FullName: '', Email: '', PhoneNumber: '', Address: '',
            Username: defaultUsername || 'Bilinmiyor',
            Role: defaultRole || 'Müşteri'
        };

        if (!token) {
             setProfileData(fallbackData);
             return;
        }

        try {
            const response = await api.get('/Banking/profile');
            const apiData = response.data;
            setProfileData({
                ...apiData,
                Username: apiData.Username || defaultUsername || 'Bilinmiyor',
                Role: apiData.Role || defaultRole || 'Müşteri',
                FullName: apiData.FullName || ''
            }); 
        } catch (err) {
            console.error("Profil verisi çekilemedi:", err);
            setProfileData(fallbackData);
        }
    };
    
    const updateProfileData = (newFields) => {
        setProfileData(prev => ({ ...prev, ...newFields }));
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role'); 
        
        if (token) {
            setIsAuthenticated(true);
            if (role) setUserRole(role);
            fetchProfileData();
        } else {
             setIsAuthenticated(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, refreshKey]); 

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
        const role = localStorage.getItem('role');
        setUserRole(role);
        setRefreshKey(prev => prev + 1); 
        navigate('/dashboard'); 
    };

    const handleLogout = () => {
        localStorage.clear(); 
        setIsAuthenticated(false);
        setUserRole('');
        setProfileData({}); 
        setRefreshKey(prev => prev + 1);
        navigate('/');
    };
    
    const handleAccountOpened = () => {
        setRefreshKey(prev => prev + 1); 
        navigate('/dashboard'); 
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />; 
    }
    
    const profileText = profileData.Username || profileData.FullName || userRole;

    return (
        <div> 
            {/* --- Üst Menü (Header) --- */}
            <div className="header">
                <div style={{display:'flex', gap:'25px', alignItems:'center'}}>
                    <h3 style={{margin:0}}>Grup 1 Bank</h3> 
                    
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className={location.pathname === '/dashboard' ? 'active-nav' : ''} 
                    >
                        💳 Ana Sayfa
                    </button>

                    <button 
                        onClick={() => navigate('/market')} 
                        className={location.pathname === '/market' ? 'active-nav' : ''}
                    >
                        📈 Piyasa
                    </button>
                    
                    <button 
                        onClick={() => navigate('/profile')} 
                        className={location.pathname === '/profile' ? 'active-nav' : ''}
                    >
                        👤 Profilim ({profileText})
                    </button>
                    
                    {userRole === 'Customer' && (
                        <>
                            <button 
                                onClick={() => navigate('/cards')} 
                                className={location.pathname === '/cards' ? 'active-nav' : ''}
                            >
                                💳 Kartlar
                            </button>

                            <button 
                                onClick={() => navigate('/transfer')} 
                                className={location.pathname === '/transfer' ? 'active-nav' : ''}
                            >
                                💸 Transfer
                            </button>

                            {/* 🔥🔥 YENİ EKLENEN BUTON 🔥🔥 */}
                            <button 
                                onClick={() => navigate('/scheduled')} 
                                className={location.pathname === '/scheduled' ? 'active-nav' : ''}
                            >
                                🔁 Düzenli Ödeme
                            </button>

                            <button 
                                onClick={() => navigate('/exchange')} 
                                className={location.pathname === '/exchange' ? 'active-nav' : ''}
                            >
                                💱 Döviz
                            </button>

                            <button 
                                onClick={() => navigate('/loans')} 
                                className={location.pathname === '/loans' ? 'active-nav' : ''}
                            >
                                💰 Kredi
                            </button>

                            <button 
                                onClick={() => navigate('/open-account')} 
                                className="nav-accent-btn" 
                            >
                                ➕ Hesap Aç
                            </button>
                        </>
                    )}
                    
                    {userRole === 'Admin' && (
                        <button 
                            onClick={() => navigate('/admin')} 
                            className={`nav-admin-btn ${location.pathname === '/admin' ? 'active-admin-nav' : ''}`}
                        >
                            🛡️ Admin Paneli
                        </button>
                    )}
                </div>

                <button onClick={handleLogout} className="logout-btn">Çıkış Yap</button>
            </div>

            {/* --- SAYFA YÖNLENDİRMELERİ (ROUTES) --- */}
            <div className="dashboard-container"> 
                <Routes>
                    <Route 
                        path="/profile" 
                        element={
                            <Profile 
                                profileData={profileData} 
                                onProfileUpdate={updateProfileData} 
                            />
                        } 
                    />
                    
                    <Route path="/dashboard" element={<Dashboard key={refreshKey} />} />
                    <Route path="/market" element={<Market />} />
                    
                    {userRole === 'Customer' && (
                        <>
                            <Route path="/cards" element={<Cards />} />
                            <Route path="/transfer" element={<Transfer key={refreshKey} />} />
                            
                            {/* 🔥🔥 YENİ ROTA EKLENDİ 🔥🔥 */}
                            <Route path="/scheduled" element={<ScheduledTransfers />} />

                            <Route path="/exchange" element={<CurrencyExchange />} />
                            <Route path="/loans" element={<LoanCalculator />} />
                            <Route path="/open-account" element={<OpenAccount onAccountOpened={handleAccountOpened} />} />
                        </>
                    )}

                    {userRole === 'Admin' && (
                        <Route path="/admin" element={<AdminPanel />} />
                    )}

                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
            </div>
        </div>
    );
}

export default App;