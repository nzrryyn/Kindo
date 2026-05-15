"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './home.module.css';
import jsQR from 'jsqr';

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
  const [qrDetected, setQrDetected] = useState(false); // flash hijau saat QR terbaca
  const isProcessingRef = useRef(false); // cegah double-trigger
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

  // Profile state — sync dengan halaman user
  const [profileName, setProfileName] = useState('Cahaya Indra S.Pd');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Foto siswa per ID
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>({});

  // Bantuan form
  const [showBantuan, setShowBantuan] = useState(false);
  const [bantuanStep, setBantuanStep] = useState<'form' | 'sent'>('form');
  const [bantuanData, setBantuanData] = useState({ nama: '', kendala: '', kontak: '' });

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

    // Load profile nama dari halaman user
    const savedProfile = JSON.parse(localStorage.getItem('kindo_profile_guru') || '{}');
    if (savedProfile.namaLengkap) setProfileName(savedProfile.namaLengkap);
    if (savedProfile.photo) setProfilePhoto(savedProfile.photo);

    // Load foto siswa
    const savedPhotos = JSON.parse(localStorage.getItem('kindo_student_photos') || '{}');
    setStudentPhotos(savedPhotos);

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
  // Fungsi Scan QR — jsQR aktif
  // ─────────────────────────────────────────
  const stopScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isProcessingRef.current = false;
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

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && !isProcessingRef.current) {
        isProcessingRef.current = true;

        // ── Parse & validasi isi QR ──
        let qrData: { id?: number; lemdikId?: number; type?: string; createdAt?: string } | null = null;
        try {
          qrData = JSON.parse(code.data);
        } catch {
          // QR bukan JSON valid — abaikan, lanjut scan
          isProcessingRef.current = false;
          animationFrameRef.current = requestAnimationFrame(tickQRScan);
          return;
        }

        // Validasi field wajib
        if (!qrData || !qrData.type || !qrData.createdAt) {
          showToast("QR tidak valid. Pastikan scan QR yang benar.", true);
          isProcessingRef.current = false;
          animationFrameRef.current = requestAnimationFrame(tickQRScan);
          return;
        }

        // Validasi tanggal QR — harus hari ini
        const qrDate = qrData.createdAt.split(' ')[0]; // ambil bagian tanggal saja
        const today = new Date().toISOString().split('T')[0];
        if (qrDate !== today) {
          stopScan();
          showToast(`QR sudah kadaluarsa (dibuat ${qrDate}). Gunakan QR hari ini.`, true);
          return;
        }

        // Validasi tipe QR vs sesi yang sedang dibuka
        const qrType = qrData.type.toLowerCase();
        const isQRDatang = qrType.includes('datang');
        const isQRPulang = qrType.includes('pulang');

        if (!isQRDatang && !isQRPulang) {
          stopScan();
          showToast("Tipe QR tidak dikenali. Pastikan scan QR absen.", true);
          return;
        }

        // Validasi sesi — cocokkan QR dengan sesi yang sedang aktif
        if (scanSesi === 'datang' && !isQRDatang) {
          stopScan();
          showToast("Ini QR Pulang, bukan QR Datang. Scan QR yang sesuai.", true);
          return;
        }
        if (scanSesi === 'pulang' && !isQRPulang) {
          stopScan();
          showToast("Ini QR Datang, bukan QR Pulang. Scan QR yang sesuai.", true);
          return;
        }

        // Semua validasi lolos — catat absen
        setQrDetected(true);
        stopScan();
        setTimeout(() => {
          setQrDetected(false);
          processAbsenSucceed();
        }, 600);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(tickQRScan);
  };

  const startScan = async () => {
    isProcessingRef.current = false;
    setQrDetected(false);
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      animationFrameRef.current = requestAnimationFrame(tickQRScan);
    } catch (err) {
      alert("Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.");
      setIsScanning(false);
    }
  };

  // ─────────────────────────────────────────
  // Logika Buka Modal & Tentukan Sesi
  // ─────────────────────────────────────────
  const handleBukaScan = () => {
    const now = new Date();
    const jam = now.getHours() * 60 + now.getMinutes();
    const JAM_14 = 14 * 60;

    if (absenDatang && absenPulang) {
      showToast("Anda sudah absen datang & pulang hari ini.");
      return;
    }

    if (!absenDatang) {
      // Sesi datang — bisa kapan saja (terlambat jika > 08:00)
      setScanSesi('datang');
      setShowScanModal(true);
    } else if (!absenPulang) {
      // Sesi pulang — hanya setelah jam 14:00
      if (jam < JAM_14) {
        showToast("Absen pulang baru bisa dilakukan mulai jam 14:00", true);
        return;
      }
      setScanSesi('pulang');
      setShowScanModal(true);
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

  // Upload foto siswa
  const handleStudentPhotoUpload = (siswaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      const updated = { ...studentPhotos, [siswaId]: result };
      setStudentPhotos(updated);
      localStorage.setItem('kindo_student_photos', JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
  };

  // Kirim form bantuan
  const handleKirimBantuan = () => {
    if (!bantuanData.nama.trim() || !bantuanData.kendala.trim()) {
      showToast('Mohon isi nama dan kendala.', true);
      return;
    }
    const requests = JSON.parse(localStorage.getItem('kindo_bantuan') || '[]');
    requests.unshift({ ...bantuanData, id: Date.now(), timestamp: Date.now(), read: false });
    localStorage.setItem('kindo_bantuan', JSON.stringify(requests));
    setBantuanStep('sent');
  };

  const closeBantuan = () => {
    setShowBantuan(false);
    setBantuanStep('form');
    setBantuanData({ nama: '', kendala: '', kontak: '' });
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
                overflow: 'hidden',
              }}>
                {profilePhoto
                  ? <img src={profilePhoto} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Image src="/user.svg" alt="User" width={20} height={20} />
                }
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#F0F0F0' : '#333' }}>{profileName}</div>
                <div style={{ fontSize: 11, color: '#A8A8A8' }}>Kepala Sekolah</div>
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: isDark ? '#2E2E2E' : '#E8E8E8', marginBottom: 12 }} />

            {/* Menu items */}
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 8V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                label: 'Bantuan',
                action: () => { setShowUserPopup(false); setShowBantuan(true); }
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74485 20.1656 6.23582 20.3766 5.705 20.3766C5.17418 20.3766 4.66515 20.1656 4.29 19.79C3.91435 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91435 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95231 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87231 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83435 6.74485 3.62343 6.23582 3.62343 5.705C3.62343 5.17418 3.83435 4.66515 4.21 4.29C4.58515 3.91435 5.09418 3.70343 5.625 3.70343C6.15582 3.70343 6.66485 3.91435 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95231 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87231 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83435 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83435 19.71 4.21C20.0856 4.58515 20.2966 5.09418 20.2966 5.625C20.2966 6.15582 20.0856 6.66485 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                label: 'Pengaturan',
                action: () => {}
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.5899 22C20.5899 18.13 16.7399 15 11.9999 15C7.25991 15 3.40991 18.13 3.40991 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
                label: 'Profil',
                action: () => { setShowUserPopup(false); router.push('/user'); }
              },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                color: isDark ? '#E0E0E0' : '#333', fontSize: 13, transition: 'background 0.15s',
              }}
                onClick={item.action}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = isDark ? '#2A2A2A' : '#F0EFE9')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {item.icon}
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
                  {/* Overlay bracket + scan line selama scanning */}
                  <div className={styles.scanOverlay}>
                    <div className={qrDetected ? styles.bracketTL_success : styles.bracketTL} />
                    <div className={qrDetected ? styles.bracketTR_success : styles.bracketTR} />
                    <div className={qrDetected ? styles.bracketBL_success : styles.bracketBL} />
                    <div className={qrDetected ? styles.bracketBR_success : styles.bracketBR} />
                    {!qrDetected && <div className={styles.scanLine} />}
                    {qrDetected && (
                      <div className={styles.qrSuccessFlash}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
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
              <button className={styles.barKegiatanIconBtn} onClick={() => router.push('/data-siswa')} style={{ color: isDark ? '#E0E0E0' : '#2C2C2C' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.0001 7.16C17.9401 7.15 17.8701 7.15 17.8101 7.16C16.4301 7.11 15.3301 5.98 15.3301 4.58C15.3301 3.15 16.4801 2 17.9101 2C19.3401 2 20.4901 3.16 20.4901 4.58C20.4801 5.98 19.3801 7.11 18.0001 7.16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16.9704 14.4402C18.3404 14.6702 19.8504 14.4302 20.9104 13.7202C22.3204 12.7802 22.3204 11.2402 20.9104 10.3002C19.8404 9.59016 18.3104 9.35016 16.9404 9.59016" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.97047 7.16C6.03047 7.15 6.10047 7.15 6.16047 7.16C7.54047 7.11 8.64047 5.98 8.64047 4.58C8.64047 3.15 7.49047 2 6.06047 2C4.63047 2 3.48047 3.16 3.48047 4.58C3.49047 5.98 4.59047 7.11 5.97047 7.16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.00043 14.4402C5.63043 14.6702 4.12043 14.4302 3.06043 13.7202C1.65043 12.7802 1.65043 11.2402 3.06043 10.3002C4.13043 9.59016 5.66043 9.35016 7.03043 9.59016" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.0001 14.6302C11.9401 14.6202 11.8701 14.6202 11.8101 14.6302C10.4301 14.5802 9.33008 13.4502 9.33008 12.0502C9.33008 10.6202 10.4801 9.47021 11.9101 9.47021C13.3401 9.47021 14.4901 10.6302 14.4901 12.0502C14.4801 13.4502 13.3801 14.5902 12.0001 14.6302Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.08973 17.7804C7.67973 18.7204 7.67973 20.2603 9.08973 21.2003C10.6897 22.2703 13.3097 22.2703 14.9097 21.2003C16.3197 20.2603 16.3197 18.7204 14.9097 17.7804C13.3197 16.7204 10.6897 16.7204 9.08973 17.7804Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className={styles.barKegiatanDivider} />

              <button className={styles.barKegiatanIconBtn} onClick={() => router.push('/dokumentasi-kegiatan')} style={{ color: isDark ? '#E0E0E0' : '#2C2C2C' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.75 5H21.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M18.5 7.75V2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M2.66992 18.9501L7.59992 15.6401C8.38992 15.1101 9.52992 15.1701 10.2399 15.7801L10.5699 16.0701C11.3499 16.7401 12.6099 16.7401 13.3899 16.0701L17.5499 12.5001C18.3299 11.8301 19.5899 11.8301 20.3699 12.5001L21.9999 13.9001" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className={styles.barKegiatanDivider} />

              <button className={styles.barKegiatanIconBtn} onClick={() => router.push('/laporan-perkembangan')} style={{ color: isDark ? '#E0E0E0' : '#2C2C2C' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.5 18.5C16.6 18.5 17.5 17.6 17.5 16.5V7.5C17.5 6.4 16.6 5.5 15.5 5.5C14.4 5.5 13.5 6.4 13.5 7.5V16.5C13.5 17.6 14.39 18.5 15.5 18.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.5 18.5C9.6 18.5 10.5 17.6 10.5 16.5V13C10.5 11.9 9.6 11 8.5 11C7.4 11 6.5 11.9 6.5 13V16.5C6.5 17.6 7.39 18.5 8.5 18.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                    <div
                      className={styles.imageBox}
                      onClick={e => { e.stopPropagation(); document.getElementById(`photo-${siswa.id}`)?.click(); }}
                      title="Klik untuk ganti foto"
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      {studentPhotos[siswa.id]
                        ? <img src={studentPhotos[siswa.id]} alt={siswa.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        : <Image src="/icongmbr.png" alt="siswa" width={60} height={60} />
                      }
                      <input
                        id={`photo-${siswa.id}`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleStudentPhotoUpload(siswa.id, e)}
                      />
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
                <Image src="/icongmbr.png" alt="Rapor" width={57.86} height={59.37} />
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
      {/* ── MODAL BANTUAN ── */}
      {showBantuan && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: 24, boxSizing: 'border-box' as const,
        }} onClick={e => { if (e.target === e.currentTarget) closeBantuan(); }}>
          <div style={{
            width: '100%', maxWidth: 400, borderRadius: 24,
            backgroundColor: isDark ? '#1E1E1E' : '#F5F4EE',
            padding: '28px 24px', boxSizing: 'border-box' as const,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            animation: 'popupFadeIn 0.22s ease',
          }}>
            {bantuanStep === 'form' ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#F0F0F0' : '#1A1A1A', marginBottom: 20 }}>
                  Form Bantuan
                </div>
                {[
                  { label: 'Nama Lengkap', key: 'nama', placeholder: 'Masukkan nama Anda', type: 'text' },
                  { label: 'Kendala', key: 'kendala', placeholder: 'Ceritakan kendala Anda...', type: 'textarea' },
                  { label: 'Nomor HP / Email (opsional)', key: 'kontak', placeholder: 'Untuk dihubungi', type: 'text' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, color: '#A8A8A8', marginBottom: 6 }}>{field.label}</div>
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        placeholder={field.placeholder}
                        value={bantuanData[field.key as keyof typeof bantuanData]}
                        onChange={e => setBantuanData({ ...bantuanData, [field.key]: e.target.value })}
                        style={{
                          width: '100%', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E0E0E0'}`,
                          borderRadius: 12, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14,
                          backgroundColor: isDark ? '#2A2A2A' : '#fff', color: isDark ? '#F0F0F0' : '#333',
                          outline: 'none', resize: 'none', boxSizing: 'border-box' as const,
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={bantuanData[field.key as keyof typeof bantuanData]}
                        onChange={e => setBantuanData({ ...bantuanData, [field.key]: e.target.value })}
                        style={{
                          width: '100%', border: `1.5px solid ${isDark ? '#2E2E2E' : '#E0E0E0'}`,
                          borderRadius: 12, padding: '12px 14px', fontFamily: 'inherit', fontSize: 14,
                          backgroundColor: isDark ? '#2A2A2A' : '#fff', color: isDark ? '#F0F0F0' : '#333',
                          outline: 'none', boxSizing: 'border-box' as const,
                        }}
                      />
                    )}
                  </div>
                ))}
                <button onClick={handleKirimBantuan} style={{
                  width: '100%', height: 48, backgroundColor: '#FFB843', border: 'none',
                  borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  color: '#1A1A1A', marginTop: 4,
                }}>Kirim ke Admin</button>
                <div style={{ marginTop: 12, fontSize: 12, color: '#A8A8A8', textAlign: 'center' }}>
                  Kontak Admin: <span style={{ color: '#888' }}>081152003008 (WhatsApp)</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#F0F0F0' : '#1A1A1A', marginBottom: 8 }}>Terkirim!</div>
                <div style={{ fontSize: 14, color: '#A8A8A8', marginBottom: 24, lineHeight: 1.6 }}>
                  Kami akan menghubungi Anda melalui WhatsApp atau email setelah kendala ditangani.
                </div>
                <button onClick={closeBantuan} style={{
                  width: '100%', height: 48, backgroundColor: '#FFB843', border: 'none',
                  borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  color: '#1A1A1A',
                }}>Kembali</button>
                <div style={{ marginTop: 12, fontSize: 12, color: '#A8A8A8' }}>
                  Kontak Admin: <span style={{ color: '#888' }}>081152003008 (WhatsApp)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}