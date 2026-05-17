"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './homeadmin.module.css';
import {
  supabase,
  fetchNotifications,
  markNotificationsRead,
} from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Request = {
  id: string;           // notif row id dari Supabase
  type: 'forgot_password';
  nama: string;
  nik: string;
  wa: string;
};

type AbsenNotif = {
  id: string;
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeAdmin() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<Request[]>([]);
  const [absenNotifs, setAbsenNotifs] = useState<AbsenNotif[]>([]);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [unreadAbsen, setUnreadAbsen] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const role = localStorage.getItem('kindo_role');
    if (role !== 'admin') {
      router.replace('/');
      return;
    }
    loadAll();

    // Polling setiap 10 detik
    const interval = setInterval(loadAll, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Load data dari Supabase ─────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    // 1. Forgot-password requests
    const reqRows = await fetchNotifications('forgot_password');
    const mapped: Request[] = reqRows.map(r => ({
      id: r.id,
      type: 'forgot_password',
      nama: r.data?.nama ?? '',
      nik: r.data?.nik ?? '',
      wa: r.data?.wa ?? '',
    }));
    setRequests(mapped);

    // 2. Absen notifications
    const absenRows = await fetchNotifications('absen');
    const mappedAbsen: AbsenNotif[] = absenRows.map(r => ({
      id: r.id,
      nik: r.data?.nik ?? '',
      sesi: r.data?.sesi ?? 'datang',
      telat: r.data?.telat ?? false,
      time: r.data?.time ?? '',
      date: r.data?.date ?? '',
      tanggal: r.data?.tanggal ?? '',
      read: r.read ?? false,
    }));
    setAbsenNotifs(mappedAbsen);
    setUnreadAbsen(mappedAbsen.filter(n => !n.read).length);
  }, []);

  // ── Tab handling ────────────────────────────────────────────────────────────
  const handleTabChange = async (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'absen') {
      await markNotificationsRead('absen');
      setAbsenNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadAbsen(0);
    }
  };

  // ── Reset password ──────────────────────────────────────────────────────────
  const handleReset = (req: Request) => setModal({ type: 'confirm', request: req });

  const confirmReset = async () => {
    if (modal.type !== 'confirm') return;
    const req = modal.request;
    setLoading(true);

    try {
      // 1. Reset password user di tabel kindo_users berdasarkan NIK
      const { error: resetErr } = await supabase
        .from('kindo_users')
        .update({ password: 'user123' })
        .eq('nik', req.nik);

      if (resetErr) {
        console.error('confirmReset – update password:', resetErr);
        alert('Gagal reset password. Coba lagi.');
        setLoading(false);
        return;
      }

      // 2. Hapus notifikasi request dari tabel notifications
      const { error: delErr } = await supabase
        .from('notifications')
        .delete()
        .eq('id', req.id);

      if (delErr) console.error('confirmReset – delete notif:', delErr);

      // 3. Update local state
      setRequests(prev => prev.filter(r => r.id !== req.id));
      setModal({ type: 'done', request: req });
    } finally {
      setLoading(false);
    }
  };

  // ── Clear absen notifs ──────────────────────────────────────────────────────
  const clearAbsenNotifs = async () => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'absen');

    if (error) {
      console.error('clearAbsenNotifs:', error);
      return;
    }
    setAbsenNotifs([]);
    setUnreadAbsen(0);
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('kindo_role');
    localStorage.removeItem('kindo_nik');
    router.push('/');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.avatarBtn} onClick={handleLogout} title="Log out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
            stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d="M20.5901 22C20.5901 18.13 16.7402 15 12.0002 15C7.26015 15 3.41016 18.13 3.41016 22"
            stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className={styles.content}>
        <h1 className={styles.pageTitle}>Admin</h1>

        {/* ── Tab Bar ── */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('requests')}
          >
            Requests
            {requests.length > 0 && (
              <span className={styles.badge}>{requests.length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'absen' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('absen')}
          >
            Absensi Guru
            {unreadAbsen > 0 && (
              <span className={styles.badgeNew}>{unreadAbsen}</span>
            )}
          </button>
        </div>

        {/* ── Tab: Requests ── */}
        {activeTab === 'requests' && (
          <div className={styles.requestsBox}>
            {requests.length === 0 ? (
              <div className={styles.emptyState}>Tidak ada permintaan saat ini.</div>
            ) : (
              requests.map(req => (
                <div key={req.id} className={styles.requestCard}>
                  <div className={styles.requestInfo}>
                    <div className={styles.requestType}>Forgot password</div>
                    <div className={styles.requestDetail}>
                      Nama lengkap: <span>{req.nama}</span>
                    </div>
                    <div className={styles.requestDetail}>
                      NIK: <span>{req.nik}</span>
                    </div>
                    <div className={styles.requestDetail}>
                      Nomor WhatsApp: <span>{req.wa}</span>
                    </div>
                  </div>
                  <button
                    className={styles.btnReset}
                    onClick={() => handleReset(req)}
                    disabled={loading}
                  >
                    Reset Password
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: Absensi Guru ── */}
        {activeTab === 'absen' && (
          <div className={styles.requestsBox}>
            {absenNotifs.length === 0 ? (
              <div className={styles.emptyState}>Belum ada aktivitas absen.</div>
            ) : (
              <>
                <div className={styles.absenHeader}>
                  <span className={styles.absenCount}>{absenNotifs.length} aktivitas</span>
                  <button className={styles.btnClearAbsen} onClick={clearAbsenNotifs}>
                    Hapus semua
                  </button>
                </div>
                {absenNotifs.map(notif => (
                  <div
                    key={notif.id}
                    className={`${styles.absenCard} ${!notif.read ? styles.absenCardUnread : ''}`}
                  >
                    {!notif.read && <div className={styles.unreadDot} />}
                    <div className={styles.absenCardIcon}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z"
                          stroke={notif.sesi === 'datang' ? '#FFB843' : '#6BCB8B'}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        />
                        <path
                          d="M15.71 15.18L12.61 13.33C12.07 13.01 11.63 12.24 11.63 11.61V7.51"
                          stroke={notif.sesi === 'datang' ? '#FFB843' : '#6BCB8B'}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        />
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
                      <div className={styles.absenCardTime}>
                        {notif.time} · {notif.date}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <button className={styles.btnLogout} onClick={handleLogout}>
          Log out
        </button>
      </div>

      {/* ── Modal: Konfirmasi Reset ── */}
      {modal.type === 'confirm' && (
        <div
          className={styles.modalOverlay}
          onClick={e => { if (e.target === e.currentTarget) setModal({ type: 'none' }); }}
        >
          <div className={styles.modalCard}>
            <p className={styles.modalQuestion}>
              Reset password for<br />this user?
            </p>
            <button
              className={styles.btnModalSecondary}
              onClick={() => setModal({ type: 'none' })}
              disabled={loading}
            >
              No
            </button>
            <button
              className={styles.btnModalPrimary}
              onClick={confirmReset}
              disabled={loading}
            >
              {loading ? 'Resetting…' : 'Reset'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Complete ── */}
      {modal.type === 'done' && (
        <div
          className={styles.modalOverlay}
          onClick={e => { if (e.target === e.currentTarget) setModal({ type: 'none' }); }}
        >
          <div className={styles.modalCard}>
            <p className={styles.modalDoneTitle}>Reset complete!</p>
            <p className={styles.modalDoneDesc}>
              Please inform user that their password has been reset to &quot;user123&quot;
            </p>
            <button
              className={styles.btnModalPrimary}
              onClick={() => setModal({ type: 'none' })}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}