"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './user.module.css';

export default function UserGuru() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  // Profile state
  const [namaLengkap, setNamaLengkap] = useState('Cahaya Indra S.Pd');
  const [password, setPassword] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingNama, setEditingNama] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);
    // Load saved profile
    const saved = JSON.parse(localStorage.getItem('kindo_profile_guru') || '{}');
    if (saved.namaLengkap) setNamaLengkap(saved.namaLengkap);
    if (saved.tanggal) setTanggal(saved.tanggal);
  }, []);

  const showToast = (msg: string, isError = false) => {
    setToast({ visible: true, message: msg, isError });
    setTimeout(() => setToast({ visible: false, message: '', isError: false }), 3000);
  };

  const handleSimpan = () => {
    const profile = { namaLengkap, tanggal };
    localStorage.setItem('kindo_profile_guru', JSON.stringify(profile));
    if (password) {
      // In a real app this would update the actual password
      showToast('Profil & password berhasil disimpan!');
    } else {
      showToast('Profil berhasil disimpan!');
    }
    setEditingNama(false);
  };

  const CalendarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 2V5" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.5 9.09H20.5" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.69 13.7H15.7" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.99 13.7H12" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.29 13.7H8.3" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EditIcon = () => (
    <svg width="19" height="19" viewBox="0 0 21 21" fill="none">
      <path d="M9.625 1.75H7.875C3.5 1.75 1.75 3.5 1.75 7.875V13.125C1.75 17.5 3.5 19.25 7.875 19.25H13.125C17.5 19.25 19.25 17.5 19.25 13.125V11.375" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.035 2.642L7.14 9.537C6.877 9.8 6.615 10.316 6.562 10.692L6.186 13.326C6.046 14.28 6.72 14.945 7.674 14.813L10.307 14.437C10.675 14.385 11.191 14.122 11.462 13.86L18.357 6.965C19.547 5.775 20.107 4.392 18.357 2.642C16.607 0.892 15.225 1.452 14.035 2.642Z" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.046 3.631C13.633 5.723 15.269 7.359 17.369 7.954" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EyeOpen = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M15.58 12C15.58 13.98 13.98 15.58 12 15.58C10.02 15.58 8.42 13.98 8.42 12C8.42 10.02 10.02 8.42 12 8.42C13.98 8.42 15.58 10.02 15.58 12Z" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 20.27C15.53 20.27 18.82 18.19 21.11 14.59C22.01 13.18 22.01 10.81 21.11 9.4C18.82 5.8 15.53 3.72 12 3.72C8.47 3.72 5.18 5.8 2.89 9.4C1.99 10.81 1.99 13.18 2.89 14.59C5.18 18.19 8.47 20.27 12 20.27Z" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EyeClosed = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14.53 9.47L9.47 14.53C8.82 13.88 8.42 12.99 8.42 12C8.42 10.02 10.02 8.42 12 8.42C12.99 8.42 13.88 8.82 14.53 9.47Z" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.82 5.77C16.07 4.45 14.07 3.73 12 3.73C8.47 3.73 5.18 5.81 2.89 9.41C1.99 10.82 1.99 13.19 2.89 14.6C3.68 15.84 4.6 16.91 5.6 17.77" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.42 19.53C9.56 20.01 10.77 20.27 12 20.27C15.53 20.27 18.82 18.19 21.11 14.59C22.01 13.18 22.01 10.81 21.11 9.4C20.78 8.88 20.42 8.39 20.05 7.93" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.51 12.7C15.25 14.11 14.1 15.26 12.69 15.52" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.47 14.53L2 22" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L14.53 9.47" stroke={isDark ? '#F8F7F2' : '#333333'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>

      {/* Header */}
      <div className={styles.headerRow}>
        <button className={styles.btnBack} onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className={styles.headerSpacer} />
      </div>

      {/* Main content */}
      <div className={styles.content}>

        {/* Avatar + Profil title */}
        <div className={styles.topSection}>
          <div className={styles.pageTitle}>Profil</div>
          <div className={styles.avatarWrap}>
            <div className={styles.avatarCircle}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#F0F0F0' : '#A8A8A8'} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="12" cy="9" r="3"/>
                <path d="M3 20c0-4 2.7-7 9-7s9 3 9 7"/>
              </svg>
            </div>
            <button className={styles.avatarEditBtn}>
              <EditIcon />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Nama Lengkap</label>
          <div className={styles.inputWrapper}>
            <input
              className={styles.input}
              type="text"
              value={namaLengkap}
              readOnly={!editingNama}
              onChange={e => setNamaLengkap(e.target.value)}
              placeholder="Nama lengkap"
            />
            <button className={styles.inputIconBtn} onClick={() => setEditingNama(p => !p)}>
              <EditIcon />
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <div className={styles.inputWrapper}>
            <input
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password baru"
            />
            <button className={styles.inputIconBtn} onClick={() => setShowPassword(p => !p)}>
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tanggal Lahir</label>
          <div className={styles.inputWrapper}>
            <input
              className={`${styles.input} ${styles.inputDate}`}
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
            />
            <span className={styles.inputIconStatic}>
              <CalendarIcon />
            </span>
          </div>
        </div>

        <button className={`${styles.btnSimpan} ${styles.btnGuru}`} onClick={handleSimpan}>
          Simpan
        </button>

      </div>

      {/* Navbar — sama persis navbar guru */}
      <nav className={styles.bottomNavbar}>
        <div className={styles.navItem} onClick={() => router.push('/home')}>
          <Image src="/home.svg" alt="Home" width={24} height={24} />
        </div>
        <div className={styles.navItem} onClick={() => router.push('/notif')}>
          <Image src="/notif.svg" alt="Notif" width={24} height={24} />
        </div>
        <div className={styles.navItem} onClick={() => router.push('/spp')}>
          <Image src="/spp.svg" alt="SPP" width={24} height={24} />
        </div>
        <div className={`${styles.navItem} ${styles.navActive}`}>
          <Image src="/user.svg" alt="User" width={24} height={24} />
        </div>
      </nav>

      {/* Toast */}
      {toast.visible && (
        <div className={`${styles.toast} ${toast.isError ? styles.toastErr : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}