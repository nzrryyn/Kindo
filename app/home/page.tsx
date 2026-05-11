"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './home.module.css';

// Install dulu: npm install jsqr
// lalu import: import jsQR from 'jsqr';

const CLASS_DATA = {
  'Kelas A': 17, 'Kelas B': 16, 'Kelas C': 18, 'Kelas D': 15, 'Kelas E': 16,
};

// ✅ FIX 4: Tambah state untuk tahun & fase
type StudentAssessment = {
  bb: string;
  tb: string;
  catatan: string;
  tahun: string;
  fase: string;
  aspects: {
    [key: string]: { grade: string; image: string };
  };
};

export default function HomePage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // State Kegiatan
  const [kegiatanHarian, setKegiatanHarian] = useState([{ id: 1, text: '', time: '08:00' }]);

  // State Absen Guru — dual session (datang & pulang)
  type AbsenSesi = { done: boolean; time: string; telat: boolean } | null;
  const [absenDatang, setAbsenDatang] = useState<AbsenSesi>(null);
  const [absenPulang, setAbsenPulang] = useState<AbsenSesi>(null);
  const [scanSesi, setScanSesi] = useState<'datang' | 'pulang'>('datang');
  const [isScanning, setIsScanning] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ✅ FIX 3: Simpan stream di ref agar bisa dihentikan kapan saja
  const streamRef = useRef<MediaStream | null>(null);

  // ✅ FIX 1: Ref untuk animasi frame QR scanning
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State Highlight Siswa
  const [selectedClass, setSelectedClass] = useState<keyof typeof CLASS_DATA>('Kelas A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // State Rapor / Penilaian
  const [activeStudent, setActiveStudent] = useState<{ id: string; name: string } | null>(null);
  const [allAssessments, setAllAssessments] = useState<Record<string, StudentAssessment>>({});

  const [activeAspek, setActiveAspek] = useState('Jati diri');
  const [currentForm, setCurrentForm] = useState<StudentAssessment>({
    bb: '', tb: '', catatan: '', tahun: '2024/2025', fase: 'Fondasi', aspects: {}
  });

  const [toastData, setToastData] = useState({ visible: false, message: '', isError: false });
  const [showAllSiswa, setShowAllSiswa] = useState(false);

  // State User Popup
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Tutup popup kalau klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowUserPopup(false);
      }
    };
    if (showUserPopup) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserPopup]);

  const handleLogout = () => {
    // Hapus session/auth jika ada
    localStorage.removeItem('absenKindo');
    router.push('/');
  };

  // ─────────────────────────────────────────
  // 1. Initial Load & Timer
  // ─────────────────────────────────────────
  useEffect(() => {
    setIsClient(true);

    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);

    const savedKegiatan = localStorage.getItem('kegiatanKindo');
    if (savedKegiatan) setKegiatanHarian(JSON.parse(savedKegiatan));

    // Load absen datang & pulang — reset otomatis jika bukan hari ini
    const today = new Date().toISOString().split('T')[0];

    const savedDatang = localStorage.getItem('absenDatang');
    if (savedDatang) {
      try {
        const parsed = JSON.parse(savedDatang);
        if (parsed.tanggal === today) setAbsenDatang(parsed.sesi);
        else localStorage.removeItem('absenDatang'); // hari beda, reset
      } catch { localStorage.removeItem('absenDatang'); }
    }

    const savedPulang = localStorage.getItem('absenPulang');
    if (savedPulang) {
      try {
        const parsed = JSON.parse(savedPulang);
        if (parsed.tanggal === today) setAbsenPulang(parsed.sesi);
        else localStorage.removeItem('absenPulang'); // hari beda, reset
      } catch { localStorage.removeItem('absenPulang'); }
    }

    const savedAttendance = localStorage.getItem('kindo_attendance');
    if (savedAttendance) setAttendanceData(JSON.parse(savedAttendance));

    const savedAssessments = localStorage.getItem('kindo_assessments');
    if (savedAssessments) setAllAssessments(JSON.parse(savedAssessments));

    const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  // 2. Save Triggers
  useEffect(() => {
    if (isClient) localStorage.setItem('kegiatanKindo', JSON.stringify(kegiatanHarian));
  }, [kegiatanHarian, isClient]);

  useEffect(() => {
    if (isClient && absenDatang !== null) {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('absenDatang', JSON.stringify({ sesi: absenDatang, tanggal: today }));
    }
  }, [absenDatang, isClient]);

  useEffect(() => {
    if (isClient && absenPulang !== null) {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('absenPulang', JSON.stringify({ sesi: absenPulang, tanggal: today }));
    }
  }, [absenPulang, isClient]);

  const showToast = (message: string, isError: boolean = false) => {
    setToastData({ visible: true, message, isError });
    setTimeout(() => setToastData({ visible: false, message: '', isError: false }), 3000);
  };

  // ─────────────────────────────────────────
  // ✅ FIX 1 & 3: Fungsi Scan QR yang benar
  // ─────────────────────────────────────────
  const stopScan = () => {
    // Hentikan semua track kamera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Hentikan loop animasi
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsScanning(false);
  };

  const tickQRScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Gunakan jsQR untuk decode QR
      // Import di atas: import jsQR from 'jsqr';
      // const code = jsQR(imageData.data, imageData.width, imageData.height);
      // if (code) {
      //   // QR berhasil dibaca — validasi data QR di sini jika perlu
      //   stopScan();
      //   processAbsenSucceed();
      //   return;
      // }

      // ─── SIMULASI (hapus blok ini setelah jsQR diinstall) ───
      // Untuk sementara, deteksi otomatis setelah 3 detik
      // Ini hanya placeholder — ganti dengan logika jsQR di atas
    }

    animationFrameRef.current = requestAnimationFrame(tickQRScan);
  };

  // ─────────────────────────────────────────
  // Logika Buka Modal & Tentukan Sesi
  // ─────────────────────────────────────────
  const handleBukaScan = () => {
    const now = new Date();
    const jam = now.getHours() * 60 + now.getMinutes();
    const JAM_14 = 14 * 60;

    if (!absenDatang) {
      // Belum absen datang — buka scan datang (telat jika > 08:00)
      setScanSesi('datang');
      setShowScanModal(true);
    } else if (!absenPulang) {
      // Sudah absen datang — cek apakah sudah waktunya pulang (>= 14:00)
      if (jam < JAM_14) {
        showToast("Absen pulang baru bisa dilakukan mulai jam 14:00", true);
        return;
      }
      setScanSesi('pulang');
      setShowScanModal(true);
    } else {
      // Sudah absen keduanya
      showToast("Anda sudah absen datang & pulang hari ini.");
    }
  };

  const startScan = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      animationFrameRef.current = requestAnimationFrame(tickQRScan);

      // SIMULASI: hapus setelah jsQR diinstall
      setTimeout(() => {
        stopScan();
        processAbsenSucceed();
      }, 2500);

    } catch (err) {
      alert("Gagal mengakses kamera.");
      setIsScanning(false);
    }
  };

  const processAbsenSucceed = () => {
    const now = new Date();
    const jam = now.getHours() * 60 + now.getMinutes();
    const JAM_08 = 8 * 60;
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const nik = isClient ? (localStorage.getItem('kindo_nik') || 'Guru') : 'Guru';
    const today = now.toISOString().split('T')[0];

    const pushNotifAdmin = (sesi: 'datang' | 'pulang', telat: boolean) => {
      const notifs = JSON.parse(localStorage.getItem('kindo_notif_absen') || '[]');
      notifs.unshift({
        id: Date.now(),
        nik,
        sesi,
        telat,
        time: timeStr,
        date: dateStr,
        tanggal: today,
        read: false,
      });
      localStorage.setItem('kindo_notif_absen', JSON.stringify(notifs));
    };

    if (scanSesi === 'datang') {
      const telat = jam > JAM_08;
      const sesiObj = { done: true, time: `${timeStr}, ${dateStr}`, telat };
      setAbsenDatang(sesiObj);
      // Simpan ke localStorage langsung (tidak tunggu useEffect)
      localStorage.setItem('absenDatang', JSON.stringify({ sesi: sesiObj, tanggal: today }));
      pushNotifAdmin('datang', telat);
      showToast(telat ? "Absen datang tercatat — Anda terlambat!" : "Berhasil absen datang!");
    } else {
      const sesiObj = { done: true, time: `${timeStr}, ${dateStr}`, telat: false };
      setAbsenPulang(sesiObj);
      localStorage.setItem('absenPulang', JSON.stringify({ sesi: sesiObj, tanggal: today }));
      pushNotifAdmin('pulang', false);
      showToast("Berhasil absen pulang!");
    }
    setShowScanModal(false);
  };

  // ─────────────────────────────────────────
  // Fungsi Absen Siswa (Grid)
  // ─────────────────────────────────────────
  const isEditable = () => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate < today) return false;
    if (selectedDate === today) return currentTime.getHours() < 12;
    return false;
  };

  const handleAttendanceChange = (studentId: string, status: string) => {
    const newData = { ...attendanceData, [`${studentId}_${selectedDate}`]: status };
    setAttendanceData(newData);
    localStorage.setItem('kindo_attendance', JSON.stringify(newData));
  };

  // ─────────────────────────────────────────
  // Fungsi Penilaian Rapor
  // ─────────────────────────────────────────
  const openPenilaian = (siswa: { id: string; name: string }) => {
    setActiveStudent(siswa);
    setActiveAspek('Jati diri');
    const existing = allAssessments[siswa.id] || {
      bb: '', tb: '', catatan: '', tahun: '2024/2025', fase: 'Fondasi', aspects: {}
    };
    setCurrentForm(existing);
  };

  const handleAspectGradeChange = (grade: string) => {
    setCurrentForm(prev => ({
      ...prev,
      aspects: { ...prev.aspects, [activeAspek]: { ...(prev.aspects[activeAspek] || {}), grade } }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentForm(prev => ({
          ...prev,
          aspects: {
            ...prev.aspects,
            [activeAspek]: { ...(prev.aspects[activeAspek] || {}), image: reader.result as string }
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentForm(prev => ({
      ...prev,
      aspects: {
        ...prev.aspects,
        [activeAspek]: { ...(prev.aspects[activeAspek] || {}), image: '' }
      }
    }));
  };

  const handleSimpanPenilaian = () => {
    if (activeStudent) {
      const updatedAll = { ...allAssessments, [activeStudent.id]: currentForm };
      setAllAssessments(updatedAll);
      localStorage.setItem('kindo_assessments', JSON.stringify(updatedAll));
      showToast("Berhasil disimpan!");
      setActiveStudent(null);
    }
  };

  // List Siswa
  const dummyStudents = Array.from({ length: CLASS_DATA[selectedClass] }).map((_, i) => ({
    id: `${selectedClass.replace(' ', '')}_${i + 1}`,
    name: `Siswa ${i + 1}`
  })).filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`${styles.mainWrapper} ${isDark ? styles.dark : ''}`}>

      {/* ── TOMBOL USER + POPUP (pojok kanan atas) ── */}
      <div ref={popupRef} style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000 }}>
        <div
          onClick={() => setShowUserPopup(prev => !prev)}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
            border: `2px solid ${isDark ? '#3A3A3A' : '#D9D9D9'}`,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer', transition: 'transform 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Image src="/user.svg" alt="User" width={22} height={22} />
        </div>

        {showUserPopup && (
          <div style={{
            position: 'absolute', top: '54px', right: 0,
            width: 220, borderRadius: 15,
            backgroundColor: isDark ? '#1E1E1E' : '#F8F7F2',
            border: `1px solid ${isDark ? '#2E2E2E' : '#D9D9D9'}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            padding: '16px', boxSizing: 'border-box',
            animation: 'popupFadeIn 0.2s ease',
          }}>
            {/* Info user */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8',
                display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
              }}>
                <Image src="/user.svg" alt="User" width={20} height={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#F0F0F0' : '#333' }}>User 1</div>
                <div style={{ fontSize: 11, color: '#A8A8A8' }}>[jabatan user]</div>
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: isDark ? '#2E2E2E' : '#E8E8E8', marginBottom: 12 }} />

            {/* Menu items */}
            {[
              { icon: '/bantuan.svg', label: 'Bantuan' },
              { icon: '/pengaturan.svg', label: 'Pengaturan' },
              { icon: '/user1.svg', label: 'Profil' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                color: isDark ? '#E0E0E0' : '#333', fontSize: 13, transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#2A2A2A' : '#F0EFE9')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Image src={item.icon} alt={item.label} width={16} height={16} />
                {item.label}
              </div>
            ))}

            <div style={{ height: 1, backgroundColor: isDark ? '#2E2E2E' : '#E8E8E8', margin: '12px 0' }} />

            {/* Toggle dark mode */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 4px', marginBottom: 10,
            }}>
              <span style={{ fontSize: 13, color: isDark ? '#E0E0E0' : '#333' }}>
                {isDark ? 'Mode Gelap' : 'Mode Terang'}
              </span>
              <div
                onClick={() => {
                  const next = !isDark;
                  setIsDark(next);
                  localStorage.setItem('kindo_dark', String(next));
                }}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  backgroundColor: isDark ? '#F8F7F2' : '#333333',
                  position: 'relative', cursor: 'pointer',
                  transition: 'background 0.25s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 3, left: isDark ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%',
                  backgroundColor: isDark ? '#333333' : '#F8F7F2',
                  transition: 'left 0.25s',
                }} />
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%', height: 38,
                backgroundColor: isDark ? '#F8F7F2' : '#333333',
                color: isDark ? '#333333' : '#F8F7F2',
                border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Log out
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes popupFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── MODAL SCAN QR — UI baru ── */}
      {showScanModal && (
        <div className={styles.cameraModal} onClick={(e) => { if (e.target === e.currentTarget) { stopScan(); setShowScanModal(false); } }}>
          <div className={styles.scanCard}>
            {/* Area kamera / bracket */}
            <div className={styles.scanViewport}>
              {isScanning ? (
                <>
                  <video ref={videoRef} playsInline muted className={styles.scanVideo}></video>
                  <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                </>
              ) : (
                <div className={styles.scanBracketArea}>
                  <div className={styles.bracketTL} />
                  <div className={styles.bracketTR} />
                  <div className={styles.bracketBL} />
                  <div className={styles.bracketBR} />
                </div>
              )}
            </div>

            {/* Status Pills */}
            <div className={styles.scanStatusList}>
              {/* Pill Datang */}
              <div className={`${styles.scanStatusPill} ${absenDatang ? styles.pillActive : styles.pillInactive}`}>
                <span className={styles.pillIcon}>
                  {absenDatang ? (
                    <svg width="28" height="25" viewBox="0 0 49 44" fill="none"><path d="M24.2219 41.9994C34.0402 41.9994 41.9994 34.0402 41.9994 24.2219C41.9994 14.4036 34.0402 6.44434 24.2219 6.44434C14.4036 6.44434 6.44434 14.4036 6.44434 24.2219C6.44434 34.0402 14.4036 41.9994 24.2219 41.9994Z" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M24.2217 15.333V24.2218L28.6661 28.6662" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.66658 2L2 8.66658" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M46.4439 8.66658L39.7773 2" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.7332 36.8892L6.44434 42.0002" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M36.7549 36.8213L41.9993 41.999" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="28" height="25" viewBox="0 0 49 44" fill="none"><path d="M24.2219 41.9994C34.0402 41.9994 41.9994 34.0402 41.9994 24.2219C41.9994 14.4036 34.0402 6.44434 24.2219 6.44434C14.4036 6.44434 6.44434 14.4036 6.44434 24.2219C6.44434 34.0402 14.4036 41.9994 24.2219 41.9994Z" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M24.2217 15.333V24.2218L28.6661 28.6662" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.66658 2L2 8.66658" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M46.4439 8.66658L39.7773 2" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.7332 36.8892L6.44434 42.0002" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M36.7549 36.8213L41.9993 41.999" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </span>
                <span className={styles.pillText}>
                  {absenDatang
                    ? <><span className={styles.pillTitle}>Telah absen datang pada {absenDatang.time.split(',')[0]}</span><br /><span className={styles.pillSub}>{absenDatang.time.split(',')[1]?.trim()}{absenDatang.telat ? ' — Terlambat' : ''}</span></>
                    : <span className={styles.pillTextGray}>Anda belum absen datang!</span>
                  }
                </span>
              </div>

              {/* Pill Pulang */}
              <div className={`${styles.scanStatusPill} ${absenPulang ? styles.pillActive : styles.pillInactive}`}>
                <span className={styles.pillIcon}>
                  {absenPulang ? (
                    <svg width="28" height="25" viewBox="0 0 49 44" fill="none"><path d="M24.2219 41.9994C34.0402 41.9994 41.9994 34.0402 41.9994 24.2219C41.9994 14.4036 34.0402 6.44434 24.2219 6.44434C14.4036 6.44434 6.44434 14.4036 6.44434 24.2219C6.44434 34.0402 14.4036 41.9994 24.2219 41.9994Z" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M24.2217 15.333V24.2218L28.6661 28.6662" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.66658 2L2 8.66658" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M46.4439 8.66658L39.7773 2" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.7332 36.8892L6.44434 42.0002" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M36.7549 36.8213L41.9993 41.999" stroke="#FFB843" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="28" height="25" viewBox="0 0 49 44" fill="none"><path d="M24.2219 41.9994C34.0402 41.9994 41.9994 34.0402 41.9994 24.2219C41.9994 14.4036 34.0402 6.44434 24.2219 6.44434C14.4036 6.44434 6.44434 14.4036 6.44434 24.2219C6.44434 34.0402 14.4036 41.9994 24.2219 41.9994Z" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M24.2217 15.333V24.2218L28.6661 28.6662" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.66658 2L2 8.66658" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M46.4439 8.66658L39.7773 2" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.7332 36.8892L6.44434 42.0002" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M36.7549 36.8213L41.9993 41.999" stroke="#A8A8A8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </span>
                <span className={styles.pillText}>
                  {absenPulang
                    ? <><span className={styles.pillTitle}>Telah absen pulang pada {absenPulang.time.split(',')[0]}</span><br /><span className={styles.pillSub}>{absenPulang.time.split(',')[1]?.trim()}</span></>
                    : <span className={styles.pillTextGray}>Anda belum absen pulang!</span>
                  }
                </span>
              </div>
            </div>

            {/* Tombol aksi */}
            {!absenDatang || !absenPulang ? (
              <button
                className={styles.btnStartScan}
                onClick={isScanning ? stopScan : startScan}
              >
                {isScanning ? 'Batalkan Scan' : `Scan Absen ${scanSesi === 'datang' ? 'Datang' : 'Pulang'}`}
              </button>
            ) : (
              <button className={styles.btnStartScan} onClick={() => setShowScanModal(false)}>Tutup</button>
            )}
          </div>
        </div>
      )}

      <div className={styles.contentRow}>
        <div className={styles.leftColumn}>

          <div className={styles.topRow}>
            {/* KEGIATAN HARI INI */}
            <div className={styles.kegiatanWrapper}>
              <div className={styles.kegiatanTitle}>Kegiatan Hari Ini</div>
              <div className={styles.kegiatanBox}>
                {kegiatanHarian.map((keg) => (
                  <div key={keg.id} className={styles.kegiatanRow}>
                    <div className={styles.timeInputWrapper}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.timeIcon}>
                        <path d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15.71 15.1798L12.61 13.3298C12.07 13.0098 11.63 12.2398 11.63 11.6098V7.50977" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <input type="time" className={styles.inputWaktu} value={keg.time} onChange={(e) => {
                        setKegiatanHarian(kegiatanHarian.map(k => k.id === keg.id ? { ...k, time: e.target.value } : k));
                      }} />
                    </div>
                    <button className={styles.btnMinus} onClick={() => {
                      if (kegiatanHarian.length > 1) setKegiatanHarian(kegiatanHarian.filter(x => x.id !== keg.id));
                    }}>-</button>
                    <input type="text" className={styles.inputKegiatan} placeholder="Ketik kegiatan di sini..." value={keg.text} onChange={(e) => {
                      setKegiatanHarian(kegiatanHarian.map(k => k.id === keg.id ? { ...k, text: e.target.value } : k));
                    }} />
                  </div>
                ))}
                <button className={styles.btnPlus} onClick={() => {
                  if (kegiatanHarian.length < 6) setKegiatanHarian([...kegiatanHarian, { id: Date.now(), text: '', time: '09:00' }]);
                  else showToast("Max 6 kegiatan", true);
                }}>+</button>
              </div>
            </div>

            {/* STATUS ABSEN */}
            {/* Tombol dinonaktifkan jika sudah absen datang tapi belum jam 14:00 */}
            {(() => {
              const isBtnDisabled = !!(absenDatang && !absenPulang && isClient && currentTime.getHours() < 14);
              const dotGreen = !!(absenDatang && (absenPulang || currentTime.getHours() < 14));
              return (
                <div className={styles.absenBox}>
                  <div className={styles.absenLeft}>
                    <div className={styles.absenHeader}>
                      <div className={`${styles.absenDot} ${dotGreen ? styles.green : styles.red}`}></div>
                      <span className={styles.absenTitle}>Status absen</span>
                    </div>

                    {!absenDatang && (
                      <div className={styles.absenWarning}>⚠ Anda belum absen datang!</div>
                    )}
                    {absenDatang && !absenPulang && isClient && currentTime.getHours() < 14 && (
                      <div className={styles.absenSubtext}>✓ Datang tercatat. Absen pulang mulai jam 14:00.</div>
                    )}
                    {absenDatang && !absenPulang && isClient && currentTime.getHours() >= 14 && (
                      <div className={styles.absenWarning}>⚠ Anda belum absen pulang!</div>
                    )}
                    {absenDatang && (
                      <div className={styles.absenSubtext}>
                        Datang: {absenDatang.time}{absenDatang.telat ? ' (Terlambat)' : ''}
                      </div>
                    )}
                    {absenPulang && (
                      <div className={styles.absenSubtext}>Pulang: {absenPulang.time}</div>
                    )}
                    {!absenDatang && (
                      <div className={styles.absenSubtext}>Belum absen hari ini</div>
                    )}
                  </div>
                  <button
                    className={styles.btnScanQR}
                    onClick={handleBukaScan}
                    disabled={isBtnDisabled}
                    style={{ opacity: isBtnDisabled ? 0.45 : 1, cursor: isBtnDisabled ? 'not-allowed' : 'pointer' }}
                  >
                    <Image src="/camera.svg" alt="Scan QR" width={40} height={40} />
                  </button>
                </div>
              );
            })()}
          </div>

          {/* BAR KEGIATAN */}
          <div className={styles.barKegiatan}>
            {/* Kotak gelap — hanya icon */}
            <div className={styles.barKegiatanInner}>
              <button className={styles.barKegiatanIconBtn} onClick={() => router.push('/data-siswa')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.0001 7.16C17.9401 7.15 17.8701 7.15 17.8101 7.16C16.4301 7.11 15.3301 5.98 15.3301 4.58C15.3301 3.15 16.4801 2 17.9101 2C19.3401 2 20.4901 3.16 20.4901 4.58C20.4801 5.98 19.3801 7.11 18.0001 7.16Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16.9704 14.4402C18.3404 14.6702 19.8504 14.4302 20.9104 13.7202C22.3204 12.7802 22.3204 11.2402 20.9104 10.3002C19.8404 9.59016 18.3104 9.35016 16.9404 9.59016" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.97047 7.16C6.03047 7.15 6.10047 7.15 6.16047 7.16C7.54047 7.11 8.64047 5.98 8.64047 4.58C8.64047 3.15 7.49047 2 6.06047 2C4.63047 2 3.48047 3.16 3.48047 4.58C3.49047 5.98 4.59047 7.11 5.97047 7.16Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.00043 14.4402C5.63043 14.6702 4.12043 14.4302 3.06043 13.7202C1.65043 12.7802 1.65043 11.2402 3.06043 10.3002C4.13043 9.59016 5.66043 9.35016 7.03043 9.59016" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.0001 14.6302C11.9401 14.6202 11.8701 14.6202 11.8101 14.6302C10.4301 14.5802 9.33008 13.4502 9.33008 12.0502C9.33008 10.6202 10.4801 9.47021 11.9101 9.47021C13.3401 9.47021 14.4901 10.6302 14.4901 12.0502C14.4801 13.4502 13.3801 14.5902 12.0001 14.6302Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.08973 17.7804C7.67973 18.7204 7.67973 20.2603 9.08973 21.2003C10.6897 22.2703 13.3097 22.2703 14.9097 21.2003C16.3197 20.2603 16.3197 18.7204 14.9097 17.7804C13.3197 16.7204 10.6897 16.7204 9.08973 17.7804Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className={styles.barKegiatanDivider} />

              <button className={styles.barKegiatanIconBtn} onClick={() => router.push('/dokumentasi-kegiatan')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V10" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.75 5H21.25" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M18.5 7.75V2.25" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M2.66992 18.9501L7.59992 15.6401C8.38992 15.1101 9.52992 15.1701 10.2399 15.7801L10.5699 16.0701C11.3499 16.7401 12.6099 16.7401 13.3899 16.0701L17.5499 12.5001C18.3299 11.8301 19.5899 11.8301 20.3699 12.5001L21.9999 13.9001" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className={styles.barKegiatanDivider} />

              <button className={styles.barKegiatanIconBtn} onClick={() => router.push('/laporan-perkembangan')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.5 18.5C16.6 18.5 17.5 17.6 17.5 16.5V7.5C17.5 6.4 16.6 5.5 15.5 5.5C14.4 5.5 13.5 6.4 13.5 7.5V16.5C13.5 17.6 14.39 18.5 15.5 18.5Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.5 18.5C9.6 18.5 10.5 17.6 10.5 16.5V13C10.5 11.9 9.6 11 8.5 11C7.4 11 6.5 11.9 6.5 13V16.5C6.5 17.6 7.39 18.5 8.5 18.5Z" stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Label di luar kotak */}
            <div className={styles.barKegiatanLabels}>
              <span className={styles.barKegiatanLabel}>Data Siswa</span>
              <span className={styles.barKegiatanLabel}>Dokumentasi Kegiatan</span>
              <span className={styles.barKegiatanLabel}>Laporan Perkembangan</span>
            </div>
          </div>

          {/* HIGHLIGHT SISWA */}
          <div className={`${styles.container} ${activeStudent ? styles.shrink : ''}`}>
            <div className={styles.headerRow}>
              <div className={styles.headerLeft}>
                <select className={styles.dropdownFilter} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value as keyof typeof CLASS_DATA)}>
                  {Object.keys(CLASS_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.titleText}>Highlight siswa</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={styles.searchBar}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.searchIcon}>
                      <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Cari siswa..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className={styles.dateInputWrapper}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.calendarIcon}>
                      <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.5 9.08984H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15.6947 13.7002H15.7037" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11.9955 13.7002H12.0045" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.29431 13.7002H8.30329" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input type="date" className={`${styles.dropdownFilter} ${styles.dateInput}`} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.grid} ${showAllSiswa ? styles.gridExpanded : ''}`}>
              {(showAllSiswa ? dummyStudents : dummyStudents.slice(0, 9)).map((siswa) => {
                const currentStatus = attendanceData[`${siswa.id}_${selectedDate}`] || 'Hadir';
                return (
                  <div key={siswa.id} className={styles.card} onClick={() => openPenilaian(siswa)}>
                    <div className={styles.imageBox}>
                      <Image src="/icongmbr.png" alt="siswa" width={60} height={60} />
                    </div>
                    <div className={styles.infoArea}>
                      <div className={styles.studentName}>{siswa.name}</div>
                      <div>
                        <div className={styles.statusLabel}>Status Kehadiran</div>
                        <div className={styles.actionRow}>
                          <select
                            className={styles.dropdownAbsen}
                            value={currentStatus}
                            disabled={!isEditable()}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleAttendanceChange(siswa.id, e.target.value)}
                          >
                            <option value="Hadir">Hadir</option>
                            <option value="Sakit">Sakit</option>
                            <option value="Izin">Izin</option>
                            <option value="Alfa">Alfa</option>
                          </select>
                          <button className={styles.btnNilai} onClick={(e) => { e.stopPropagation(); openPenilaian(siswa); }}>
                            Nilai
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {dummyStudents.length > 9 && (
              <button
                className={styles.btnSelengkapnya}
                onClick={() => setShowAllSiswa(prev => !prev)}
              >
                {showAllSiswa ? 'Sembunyikan ↑' : `Selengkapnya (${dummyStudents.length - 9} lainnya) ↓`}
              </button>
            )}
          </div>
        </div>

        {/* KOLOM KANAN (RAPOR) */}
        {activeStudent && (
          <div className={styles.penilaianCard}>
            <div className={styles.penilaianHeader}>
              <div className={styles.penilaianImgBox}>
                <Image src="/gambar.svg" alt="Rapor" width={57.86} height={59.37} />
              </div>
              <div className={styles.penilaianInfo}>
                <div className={styles.penilaianName}>{activeStudent.name}</div>
                <div className={styles.kalender}>
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* ✅ FIX 4: Dropdown Tahun & Fase sekarang terhubung ke state */}
            <div className={styles.barDropdowns}>
              <select
                className={`${styles.dropdownItem} ${styles.dropdownAspek}`}
                value={activeAspek}
                onChange={(e) => setActiveAspek(e.target.value)}
              >
                <option value="Agama">Agama</option>
                <option value="Jati diri">Jati diri</option>
                <option value="Literasi & Sains">Dasar Literasi & Sains</option>
              </select>
              <select
                className={`${styles.dropdownItem} ${styles.dropdownTahun}`}
                value={currentForm.tahun}
                onChange={(e) => setCurrentForm({ ...currentForm, tahun: e.target.value })}
              >
                <option value="2021/2022">2021/2022</option>
                <option value="2022/2023">2022/2023</option>
                <option value="2023/2024">2023/2024</option>
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
              </select>
              <select
                className={`${styles.dropdownItem} ${styles.dropdownFase}`}
                value={currentForm.fase}
                onChange={(e) => setCurrentForm({ ...currentForm, fase: e.target.value })}
              >
                <option value="Fondasi">Fondasi</option>
              </select>
            </div>

            <div className={styles.barTentangAnak}>
              <input type="text" placeholder="BB (kg)" className={styles.inputBBTB} value={currentForm.bb} onChange={(e) => setCurrentForm({ ...currentForm, bb: e.target.value })} />
              <input type="text" placeholder="TB (cm)" className={styles.inputBBTB} value={currentForm.tb} onChange={(e) => setCurrentForm({ ...currentForm, tb: e.target.value })} />
            </div>

            <div className={styles.kotakPenilaian}>
              <div className={styles.radioGroup}>
                {['BB', 'MB', 'BSH', 'BSB'].map((val) => {
                  const fullText =
                    val === 'BB' ? 'BB (Belum Berkembang)' :
                    val === 'MB' ? 'MB (Mulai Berkembang)' :
                    val === 'BSH' ? 'BSH (Berkembang Sesuai Harapan)' :
                    'BSB (Berkembang Sangat Baik)';
                  return (
                    <label key={val} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="grade"
                        value={val}
                        checked={currentForm.aspects[activeAspek]?.grade === val}
                        onChange={() => handleAspectGradeChange(val)}
                      />
                      {fullText}
                    </label>
                  );
                })}
              </div>

              <input type="file" id="file-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              <div
                className={styles.btnUpload}
                onClick={() => !currentForm.aspects[activeAspek]?.image && document.getElementById('file-upload')?.click()}
              >
                {currentForm.aspects[activeAspek]?.image ? (
                  <>
                    <img src={currentForm.aspects[activeAspek].image} alt="Preview" />
                    <button className={styles.btnRemoveImage} onClick={handleRemoveImage}>X</button>
                  </>
                ) : (
                  <Image src="/camera.svg" alt="Upload" width={27} height={27} />
                )}
              </div>
            </div>

            <textarea
              className={styles.textareaCatatan}
              placeholder="Catatan guru untuk orang tua..."
              value={currentForm.catatan}
              onChange={(e) => setCurrentForm({ ...currentForm, catatan: e.target.value })}
            ></textarea>

            <button className={styles.btnSimpan} onClick={handleSimpanPenilaian}>Simpan</button>
          </div>
        )}

      </div>

      {toastData.visible && (
        <div className={`${styles.toast} ${toastData.isError ? styles.error : ''}`}>
          {toastData.message}
        </div>
      )}

      <nav className={styles.bottomNavbar}>
        <div className={styles.navItem} onClick={() => router.push('/home')}><Image src="/home.svg" alt="Home" width={24} height={24} /></div>
        <div className={styles.navItem} onClick={() => router.push('/notif')}><Image src="/notif.svg" alt="Notif" width={24} height={24} /></div>
        <div className={styles.navItem} onClick={() => router.push('/spp')}><Image src="/spp.svg" alt="SPP" width={24} height={24} /></div>
        <div className={styles.navItem} onClick={() => router.push('/user')}><Image src="/user.svg" alt="User" width={24} height={24} /></div>
      </nav>
    </div>
  );
}