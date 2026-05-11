"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './loginguru.module.css';

const USERS = [
  { nik: '1401', password: 'Seiko', role: 'admin', redirect: '/home-admin' },
  { nik: '4555', password: 'dummyguru@4555', role: 'guru', redirect: '/home' },
];

export default function LoginGuru() {
  const router = useRouter();
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<'form' | 'sent'>('form');
  const [forgotData, setForgotData] = useState({ nama: '', nik: '', wa: '' });

  const handleLogin = () => {
    setError('');
    const user = USERS.find(u => u.nik === nik && u.password === password);
    if (!user) {
      setError('NIK atau kata sandi salah.');
      return;
    }
    localStorage.setItem('kindo_role', user.role);
    localStorage.setItem('kindo_nik', user.nik);
    router.push(user.redirect);
  };

  const handleForgotSubmit = () => {
    if (!forgotData.nama || !forgotData.nik || !forgotData.wa) return;
    // Simpan request ke localStorage (admin bisa baca dari sisi admin)
    const existing = JSON.parse(localStorage.getItem('kindo_requests') || '[]');
    existing.push({ ...forgotData, id: Date.now(), type: 'forgot_password' });
    localStorage.setItem('kindo_requests', JSON.stringify(existing));
    setForgotStep('sent');
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep('form');
    setForgotData({ nama: '', nik: '', wa: '' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Masuk Guru</h1>

        <div className={styles.inputGroup}>
          <label>NIK</label>
          <input
            type="text"
            placeholder="Masukkan NIK Anda"
            value={nik}
            onChange={e => { setNik(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Kata Sandi</label>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan Kata Sandi"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword(p => !p)}
              tabIndex={-1}
            >
              {showPassword ? (
                /* eye open */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M15.5799 11.9999C15.5799 13.9799 13.9799 15.5799 11.9999 15.5799C10.0199 15.5799 8.41992 13.9799 8.41992 11.9999C8.41992 10.0199 10.0199 8.41992 11.9999 8.41992C13.9799 8.41992 15.5799 10.0199 15.5799 11.9999Z" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11.9998 20.2697C15.5298 20.2697 18.8198 18.1897 21.1098 14.5897C22.0098 13.1797 22.0098 10.8097 21.1098 9.39973C18.8198 5.79973 15.5298 3.71973 11.9998 3.71973C8.46984 3.71973 5.17984 5.79973 2.88984 9.39973C1.98984 10.8097 1.98984 13.1797 2.88984 14.5897C5.17984 18.1897 8.46984 20.2697 11.9998 20.2697Z" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                /* eye closed */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14.5299 9.46992L9.46992 14.5299C8.81992 13.8799 8.41992 12.9899 8.41992 11.9999C8.41992 10.0199 10.0199 8.41992 11.9999 8.41992C12.9899 8.41992 13.8799 8.81992 14.5299 9.46992Z" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17.8198 5.77047C16.0698 4.45047 14.0698 3.73047 11.9998 3.73047C8.46984 3.73047 5.17984 5.81047 2.88984 9.41047C1.98984 10.8205 1.98984 13.1905 2.88984 14.6005C3.67984 15.8405 4.59984 16.9105 5.59984 17.7705" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.41992 19.5297C9.55992 20.0097 10.7699 20.2697 11.9999 20.2697C15.5299 20.2697 18.8199 18.1897 21.1099 14.5897C22.0099 13.1797 22.0099 10.8097 21.1099 9.39969C20.7799 8.87969 20.4199 8.38969 20.0499 7.92969" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.5104 12.7002C15.2504 14.1102 14.1004 15.2602 12.6904 15.5202" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.47 14.5303L2 22.0003" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22.0003 2L14.5303 9.47" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button
          type="button"
          className={styles.forgotPassword}
          onClick={() => setShowForgot(true)}
        >
          Lupa kata sandi?
        </button>

        <button type="button" className={styles.btnSubmit} onClick={handleLogin}>
          Masuk
        </button>
      </div>

      {/* ── MODAL LUPA PASSWORD ── */}
      {showForgot && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeForgot(); }}>
          <div className={styles.modalCard}>
            {forgotStep === 'form' ? (
              <>
                <h2 className={styles.modalTitle}>Form lupa password</h2>

                <div className={styles.inputGroup}>
                  <label>Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={forgotData.nama}
                    onChange={e => setForgotData({ ...forgotData, nama: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>NIK</label>
                  <input
                    type="text"
                    placeholder="Masukkan NIK"
                    value={forgotData.nik}
                    onChange={e => setForgotData({ ...forgotData, nik: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Nomor HP (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="Masukkan nomor"
                    value={forgotData.wa}
                    onChange={e => setForgotData({ ...forgotData, wa: e.target.value })}
                  />
                </div>

                <button className={styles.btnSubmit} onClick={handleForgotSubmit}>
                  Kirim ke Admin
                </button>

                <div className={styles.adminContact}>
                  Kontak Admin:<br />
                  <span>081152003008 (WhatsApp)</span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.sentIcon}>✓</div>
                <h2 className={styles.modalTitleCenter}>Terkirim!</h2>
                <p className={styles.sentDesc}>
                  Kami akan chat anda melalui WhatsApp ketika password telah di-reset
                </p>
                <button className={styles.btnSubmit} onClick={closeForgot}>
                  Kembali
                </button>
                <div className={styles.adminContact}>
                  Kontak Admin:<br />
                  <span>081152003008 (WhatsApp)</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
