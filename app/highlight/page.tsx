"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './highlight.module.css';

const CLASS_DATA = {
  'Kelas A': 17, 'Kelas B': 16, 'Kelas C': 18, 'Kelas D': 15, 'Kelas E': 16,
};

type StudentAssessment = {
  bb: string;
  tb: string;
  catatan: string;
  aspects: {
    [key: string]: { grade: string; image: string };
  };
};

export default function HomePage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  // State Kegiatan
  const [kegiatanHarian, setKegiatanHarian] = useState([{ id: 1, text: '', time: '08:00' }]);

  // State Absen
  const [isAbsen, setIsAbsen] = useState(false);
  const [absenText, setAbsenText] = useState("Belum absen");
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // State Highlight Siswa
  const [selectedClass, setSelectedClass] = useState<keyof typeof CLASS_DATA>('Kelas A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // State Rapor / Penilaian
  const [activeStudent, setActiveStudent] = useState<{id: string, name: string} | null>(null);
  const [allAssessments, setAllAssessments] = useState<Record<string, StudentAssessment>>({});
  
  const [activeAspek, setActiveAspek] = useState('Jati diri');
  const [currentForm, setCurrentForm] = useState<StudentAssessment>({
    bb: '', tb: '', catatan: '', aspects: {}
  });

  const [toastData, setToastData] = useState({ visible: false, message: '', isError: false });

  // 1. Initial Load & Timer
  useEffect(() => {
    setIsClient(true);
    const savedKegiatan = localStorage.getItem('kegiatanKindo');
    if (savedKegiatan) setKegiatanHarian(JSON.parse(savedKegiatan));

    const savedAbsen = localStorage.getItem('absenKindo');
    if (savedAbsen) {
      const parsed = JSON.parse(savedAbsen);
      setIsAbsen(parsed.isAbsen); setAbsenText(parsed.absenText);
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
    if (isClient) localStorage.setItem('absenKindo', JSON.stringify({ isAbsen, absenText }));
  }, [isAbsen, absenText, isClient]);

  const showToast = (message: string, isError: boolean = false) => {
    setToastData({ visible: true, message, isError });
    setTimeout(() => setToastData({ visible: false, message: '', isError: false }), 3000);
  };

  // --- Fungsi Scan ---
  const startScan = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setTimeout(() => { stopScan(stream); processAbsenSucceed(); }, 2500);
    } catch (err) {
      alert("Gagal mengakses kamera.");
      setIsScanning(false);
    }
  };

  const stopScan = (stream: MediaStream) => {
    stream.getTracks().forEach(track => track.stop());
    setIsScanning(false);
  };

  const processAbsenSucceed = () => {
    const now = new Date();
    setIsAbsen(true);
    setAbsenText(`Sudah melakukan absensi pada pukul ${now.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}, ${now.toLocaleDateString('id-ID')}`);
    showToast("Berhasil Absen!");
  };

  // --- Fungsi Absen Siswa (Grid) ---
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

  // --- Fungsi Penilaian Rapor ---
  const openPenilaian = (siswa: {id: string, name: string}) => {
    setActiveStudent(siswa);
    setActiveAspek('Jati diri');
    const existing = allAssessments[siswa.id] || { bb: '', tb: '', catatan: '', aspects: {} };
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
          aspects: { ...prev.aspects, [activeAspek]: { ...(prev.aspects[activeAspek] || {}), image: reader.result as string } }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Fungsi Hapus Foto
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Mencegah kotak upload ter-klik
    setCurrentForm(prev => ({
      ...prev,
      aspects: {
        ...prev.aspects,
        [activeAspek]: {
          ...(prev.aspects[activeAspek] || {}),
          image: '' // Kosongkan fotonya
        }
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
  }));

  return (
    <div className={styles.mainWrapper}>
      
      {isScanning && (
        <div className={styles.cameraModal}>
          <div className={styles.scanOverlayText}>Arahkan Kamera ke QR Absen</div>
          <div className={styles.videoContainer}>
            <video ref={videoRef} playsInline muted></video>
          </div>
          <button className={styles.btnCancelScan} onClick={() => setIsScanning(false)}>Batal Scan</button>
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
                    <input type="time" className={styles.inputWaktu} value={keg.time} onChange={(e) => {
                      setKegiatanHarian(kegiatanHarian.map(k => k.id === keg.id ? { ...k, time: e.target.value } : k));
                    }} />
                    <button className={styles.btnMinus} onClick={() => {
                      if(kegiatanHarian.length > 1) setKegiatanHarian(kegiatanHarian.filter(x => x.id !== keg.id));
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
            <div className={styles.absenBox}>
              <div className={styles.absenLeft}>
                <div className={styles.absenHeader}>
                  <div className={`${styles.absenDot} ${isAbsen ? styles.green : styles.red}`}></div>
                  <span className={styles.absenTitle}>Status absen</span>
                </div>
                <div className={styles.absenSubtext}>{absenText}</div>
              </div>
              <button className={styles.btnScanQR} onClick={startScan}>
                <Image src="/camera.svg" alt="Scan QR" width={40} height={40} />
              </button>
            </div>
          </div>

          {/* HIGHLIGHT SISWA */}
          <div className={`${styles.container} ${activeStudent ? styles.shrink : ''}`}>
            <div className={styles.headerRow}>
              <div className={styles.headerLeft}>
                <select className={styles.dropdownFilter} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value as any)}>
                  {Object.keys(CLASS_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.titleText}>Highlight siswa</span>
                <input type="date" className={`${styles.dropdownFilter} ${styles.dateInput}`} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}/>
              </div>
            </div>

            <div className={styles.grid}>
              {dummyStudents.map((siswa) => {
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
                  {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}
                </div>
              </div>
            </div>

            <div className={styles.barDropdowns}>
              <select className={`${styles.dropdownItem} ${styles.dropdownAspek}`} value={activeAspek} onChange={(e) => setActiveAspek(e.target.value)}>
                <option value="Jati diri">Jati diri</option>
                <option value="Literasi & Sains">Dasar Literasi & Sains</option>
              </select>
              <select className={`${styles.dropdownItem} ${styles.dropdownTahun}`}>
                <option value="2021/2022">2021/2022</option>
                <option value="2022/2023">2022/2023</option>
                <option value="2023/2024">2023/2024</option>
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
              </select>
              <select className={`${styles.dropdownItem} ${styles.dropdownFase}`}>
                <option value="Fondasi">Fondasi</option>
              </select>
            </div>

            <div className={styles.barTentangAnak}>
              <input type="text" placeholder="BB (kg)" className={styles.inputBBTB} value={currentForm.bb} onChange={(e) => setCurrentForm({...currentForm, bb: e.target.value})} />
              <input type="text" placeholder="TB (cm)" className={styles.inputBBTB} value={currentForm.tb} onChange={(e) => setCurrentForm({...currentForm, tb: e.target.value})} />
            </div>

            <div className={styles.kotakPenilaian}>
              <div className={styles.radioGroup}>
                {['BB', 'MB', 'BSH', 'BSB'].map((val) => {
                  const fullText = val === 'BB' ? 'BB (Belum Berkembang)' : val === 'MB' ? 'MB (Mulai Berkembang)' : val === 'BSH' ? 'BSH (Berkembang Sesuai Harapan)' : 'BSB (Berkembang Sangat baik)';
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
              <div className={styles.btnUpload} onClick={() => !currentForm.aspects[activeAspek]?.image && document.getElementById('file-upload')?.click()}>
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

            <textarea className={styles.textareaCatatan} placeholder="Catatan guru untuk orang tua..." value={currentForm.catatan} onChange={(e) => setCurrentForm({...currentForm, catatan: e.target.value})}></textarea>
            
            <button className={styles.btnSimpan} onClick={handleSimpanPenilaian}>Simpan</button>
          </div>
        )}

      </div>

      {toastData.visible && <div className={`${styles.toast} ${toastData.isError ? styles.error : ''}`}>{toastData.message}</div>}

      <nav className={styles.bottomNavbar}>
        <div className={styles.navItem} onClick={() => router.push('/home')}><Image src="/home.svg" alt="Home" width={24} height={24} /></div>
        <div className={styles.navItem} onClick={() => router.push('/notif')}><Image src="/notif.svg" alt="Notif" width={24} height={24} /></div>
        <div className={styles.navItem} onClick={() => router.push('/spp')}><Image src="/spp.svg" alt="SPP" width={24} height={24} /></div>
        <div className={styles.navItem} onClick={() => router.push('/user')}><Image src="/user.svg" alt="User" width={24} height={24} /></div>
      </nav>
    </div>
  );
}