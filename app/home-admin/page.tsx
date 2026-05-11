"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './homeadmin.module.css';

type Request = {
  id: number;
  type: 'forgot_password';
  nama: string;
  nik: string;
  wa: string;
};

type AbsenNotif = {
  id: number;
  nik: string;
  sesi: 'datang' | 'pulang';
  telat: boolean;
  time: string;
  date: string;
  tanggal: string;
  read: boolean;
};

type ModalState =
  | { type: 'none' }
  | { type: 'confirm'; request: Request }
  | { type: 'done'; request: Request };

type Tab = 'requests' | 'absen';

export default function HomeAdmin() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<Request[]>([]);
  const [absenNotifs, setAbsenNotifs] = useState<AbsenNotif[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [unreadAbsen, setUnreadAbsen] = useState(0);

  useEffect(() => {
    const role = localStorage.getItem('kindo_role');
    if (role !== 'admin') {
      router.replace('/');
      return;
    }
    loadAll();
    const interval = setInterval(loadAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = () => {
    const savedReq = JSON.parse(localStorage.getItem('kindo_requests') || '[]') as Request[];
    setRequests(savedReq);
    const savedNotifs = JSON.parse(localStorage.getItem('kindo_notif_absen') || '[]') as AbsenNotif[];
    setAbsenNotifs(savedNotifs);
    setUnreadAbsen(savedNotifs.filter(n => !n.read).length);
  };

  const markAllRead = () => {
    const updated = absenNotifs.map(n => ({ ...n, read: true }));
    setAbsenNotifs(updated);
    setUnreadAbsen(0);
    localStorage.setItem('kindo_notif_absen', JSON.stringify(updated));
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'absen') markAllRead();
  };

  const handleReset = (req: Request) => setModal({ type: 'confirm', request: req });

  const confirmReset = () => {
    if (modal.type !== 'confirm') return;
    const req = modal.request;
    const updated = requests.filter(r => r.id !== req.id);
    localStorage.setItem('kindo_requests', JSON.stringify(updated));
    setRequests(updated);
    setModal({ type: 'done', request: req });
  };

  const handleLogout = () => {
    localStorage.removeItem('kindo_role');
    localStorage.removeItem('kindo_nik');
    router.push('/');
  };

  const clearAbsenNotifs = () => {
    localStorage.setItem('kindo_notif_absen', '[]');
    setAbsenNotifs([]);
    setUnreadAbsen(0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.avatarBtn} onClick={handleLogout} title="Log out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.5901 22C20.5901 18.13 16.7402 15 12.0002 15C7.26015 15 3.41016 18.13 3.41016 22" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className={styles.content}>
        <h1 className={styles.pageTitle}>Admin</h1>

        {/* Tab Bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('requests')}
          >
            Requests
            {requests.length > 0 && <span className={styles.badge}>{requests.length}</span>}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'absen' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('absen')}
          >
            Absensi Guru
            {unreadAbsen > 0 && <span className={styles.badgeNew}>{unreadAbsen}</span>}
          </button>
        </div>

        {/* TAB REQUESTS */}
        {activeTab === 'requests' && (
          <div className={styles.requestsBox}>
            {requests.length === 0 ? (
              <div className={styles.emptyState}>Tidak ada permintaan saat ini.</div>
            ) : (
              requests.map(req => (
                <div key={req.id} className={styles.requestCard}>
                  <div className={styles.requestInfo}>
                    <div className={styles.requestType}>Forgot password</div>
                    <div className={styles.requestDetail}>Nama lengkap: <span>{req.nama}</span></div>
                    <div className={styles.requestDetail}>NIK: <span>{req.nik}</span></div>
                    <div className={styles.requestDetail}>Nomor WhatsApp: <span>{req.wa}</span></div>
                  </div>
                  <button className={styles.btnReset} onClick={() => handleReset(req)}>Reset Password</button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB ABSENSI GURU */}
        {activeTab === 'absen' && (
          <div className={styles.requestsBox}>
            {absenNotifs.length === 0 ? (
              <div className={styles.emptyState}>Belum ada aktivitas absen.</div>
            ) : (
              <>
                <div className={styles.absenHeader}>
                  <span className={styles.absenCount}>{absenNotifs.length} aktivitas</span>
                  <button className={styles.btnClearAbsen} onClick={clearAbsenNotifs}>Hapus semua</button>
                </div>
                {absenNotifs.map(notif => (
                  <div key={notif.id} className={`${styles.absenCard} ${!notif.read ? styles.absenCardUnread : ''}`}>
                    {!notif.read && <div className={styles.unreadDot} />}
                    <div className={styles.absenCardIcon}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z"
                          stroke={notif.sesi === 'datang' ? '#FFB843' : '#6BCB8B'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15.71 15.18L12.61 13.33C12.07 13.01 11.63 12.24 11.63 11.61V7.51"
                          stroke={notif.sesi === 'datang' ? '#FFB843' : '#6BCB8B'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className={styles.absenCardBody}>
                      <div className={styles.absenCardTitle}>
                        <span className={styles.absenNik}>NIK {notif.nik}</span>
                        {' '}telah absen{' '}
                        <span className={notif.sesi === 'datang' ? styles.tagDatang : styles.tagPulang}>
                          {notif.sesi}
                        </span>
                        {notif.telat && <span className={styles.tagTelat}>· terlambat</span>}
                      </div>
                      <div className={styles.absenCardTime}>{notif.time} · {notif.date}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <button className={styles.btnLogout} onClick={handleLogout}>Log out</button>
      </div>

      {/* MODAL KONFIRMASI RESET */}
      {modal.type === 'confirm' && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setModal({ type: 'none' }); }}>
          <div className={styles.modalCard}>
            <p className={styles.modalQuestion}>Reset password for<br />this user?</p>
            <button className={styles.btnModalSecondary} onClick={() => setModal({ type: 'none' })}>No</button>
            <button className={styles.btnModalPrimary} onClick={confirmReset}>Reset</button>
          </div>
        </div>
      )}

      {/* MODAL RESET COMPLETE */}
      {modal.type === 'done' && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setModal({ type: 'none' }); }}>
          <div className={styles.modalCard}>
            <p className={styles.modalDoneTitle}>Reset complete!</p>
            <p className={styles.modalDoneDesc}>Please inform user that their password has been resetted to &quot;user123&quot;</p>
            <button className={styles.btnModalPrimary} onClick={() => setModal({ type: 'none' })}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
