"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './home.module.css';

const CLASS_DATA = {
  'Kelas A': 17, 'Kelas B': 16, 'Kelas C': 18, 'Kelas D': 15, 'Kelas E': 16,
};

export default function DataSiswaPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  // Kelas & tanggal
  const [selectedClass, setSelectedClass] = useState<keyof typeof CLASS_DATA>('Kelas A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSiswa, setShowAllSiswa] = useState(false);

  // Foto siswa
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>({});

  // Nama siswa — sinkron dengan home & halaman lain
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [gridTempName, setGridTempName] = useState('');

  // Absensi
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});

  // Toast
  const [toast, setToast] = useState({ visible: false, msg: '', err: false });
  const showToast = (msg: string, err = false) => {
    setToast({ visible: true, msg, err });
    setTimeout(() => setToast({ visible: false, msg: '', err: false }), 3000);
  };

  // ── INIT ──
  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);

    const savedPhotos = JSON.parse(localStorage.getItem('kindo_student_photos') || '{}');
    setStudentPhotos(savedPhotos);

    const savedNames = JSON.parse(localStorage.getItem('kindo_student_names') || '{}');
    setStudentNames(savedNames);

    const savedAtt = JSON.parse(localStorage.getItem('kindo_attendance') || '{}');
    setAttendanceData(savedAtt);

    // Sinkron nama jika diubah dari halaman lain
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'kindo_student_names' && e.newValue)
        setStudentNames(JSON.parse(e.newValue));
      if (e.key === 'kindo_student_photos' && e.newValue)
        setStudentPhotos(JSON.parse(e.newValue));
      if (e.key === 'kindo_attendance' && e.newValue)
        setAttendanceData(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ── HELPERS ──
  const getSiswaName = (id: string, def: string) => studentNames[id] || def;

  const isEditable = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today;
  };

  // ── UPLOAD FOTO ──
  const handleStudentPhotoUpload = (siswaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
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

  // ── EDIT NAMA ──
  const handleSaveGridName = (siswaId: string) => {
    const trimmed = gridTempName.trim();
    if (trimmed) {
      const updated = { ...studentNames, [siswaId]: trimmed };
      setStudentNames(updated);
      localStorage.setItem('kindo_student_names', JSON.stringify(updated));
    }
    setEditingStudentId(null);
  };

  // ── ABSENSI ──
  const handleAttendanceChange = (siswaId: string, value: string) => {
    const key = `${siswaId}_${selectedDate}`;
    const updated = { ...attendanceData, [key]: value };
    setAttendanceData(updated);
    localStorage.setItem('kindo_attendance', JSON.stringify(updated));
  };

  // ── LIST SISWA ──
  const allStudents = Array.from({ length: CLASS_DATA[selectedClass] }).map((_, i) => ({
    id: `${selectedClass.replace(' ', '')}_${i + 1}`,
    defaultName: `Siswa ${i + 1}`,
  }));
  const dummyStudents = allStudents
    .filter(s => getSiswaName(s.id, s.defaultName).toLowerCase().includes(searchQuery.toLowerCase()))
    .map(s => ({ id: s.id, name: getSiswaName(s.id, s.defaultName) }));

  return (
    <div className={`${styles.mainWrapper} ${isDark ? styles.dark : ''}`}>

      {/* ── HEADER ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '20px 24px 0',
        display: 'flex', alignItems: 'center', gap: 12,
        backgroundColor: isDark ? '#0F0F0F' : '#F8F7F2',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: isDark ? '#2A2A2A' : '#E8E8E8',
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: isDark ? '#F0F0F0' : '#333', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#F0F0F0' : '#333' }}>
          Absen Siswa
        </span>
      </div>

      {/* ── KONTEN ── */}
      <div style={{ paddingTop: 76 }}>

        {/* HIGHLIGHT SISWA — sama persis dengan home */}
        <div className={styles.container}>
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <select
                className={styles.dropdownFilter}
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value as keyof typeof CLASS_DATA); setShowAllSiswa(false); }}
              >
                {Object.keys(CLASS_DATA).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.headerRight}>
              <span className={styles.titleText}>Absen siswa</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={styles.searchBar}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className={styles.searchIcon}>
                    <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 22L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Cari siswa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className={styles.dateInputWrapper}>
                  <input
                    type="date"
                    className={`${styles.dropdownFilter} ${styles.dateInput}`}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.grid} ${showAllSiswa ? styles.gridExpanded : ''}`}>
            {(showAllSiswa ? dummyStudents : dummyStudents.slice(0, 9)).map(siswa => {
              const currentStatus = attendanceData[`${siswa.id}_${selectedDate}`] || 'Hadir';
              return (
                <div key={siswa.id} className={styles.card}>
                  {/* Foto */}
                  <div
                    className={styles.imageBox}
                    onClick={() => document.getElementById(`photo-ds-${siswa.id}`)?.click()}
                    title="Klik untuk ganti foto"
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {studentPhotos[siswa.id]
                      ? <img src={studentPhotos[siswa.id]} alt={siswa.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                      : <Image src="/icongmbr.png" alt="siswa" width={60} height={60} />
                    }
                    <input
                      id={`photo-ds-${siswa.id}`}
                      type="file" accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleStudentPhotoUpload(siswa.id, e)}
                    />
                  </div>

                  <div className={styles.infoArea}>
                    {/* Nama — klik untuk edit */}
                    {editingStudentId === siswa.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          autoFocus
                          value={gridTempName}
                          onChange={e => setGridTempName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveGridName(siswa.id);
                            if (e.key === 'Escape') setEditingStudentId(null);
                          }}
                          onBlur={() => handleSaveGridName(siswa.id)}
                          style={{
                            fontSize: 13, fontWeight: 600,
                            border: 'none', borderBottom: '1.5px solid #FFB843',
                            background: 'transparent', outline: 'none',
                            color: isDark ? '#F0F0F0' : '#333',
                            width: '100%', padding: '1px 0',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className={styles.studentName}
                        title="Klik untuk ubah nama"
                        style={{ cursor: 'text' }}
                        onClick={() => {
                          setEditingStudentId(siswa.id);
                          setGridTempName(getSiswaName(siswa.id, siswa.name));
                        }}
                      >
                        {getSiswaName(siswa.id, siswa.name)}
                      </div>
                    )}

                    <div>
                      <div className={styles.statusLabel}>Status Kehadiran</div>
                      <div className={styles.actionRow}>
                        <select
                          className={styles.dropdownAbsen}
                          value={currentStatus}
                          disabled={!isEditable()}
                          onChange={e => handleAttendanceChange(siswa.id, e.target.value)}
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Sakit">Sakit</option>
                          <option value="Izin">Izin</option>
                          <option value="Alfa">Alfa</option>
                        </select>
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

      {/* ── NAVBAR ── */}
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
        <div className={styles.navItem} onClick={() => router.push('/user')}>
          <Image src="/user.svg" alt="User" width={24} height={24} />
        </div>
      </nav>

      {/* ── TOAST ── */}
      {toast.visible && (
        <div className={`${styles.toast} ${toast.err ? styles.toastErr : ''}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}