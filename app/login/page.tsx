"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Import useRouter untuk pindah halaman
import styles from './login.module.css';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const router = useRouter(); // Inisialisasi router

  // Fungsi untuk menangani saat kotak diklik
  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    
    // Memberikan jeda 300ms agar efek transisi warna aktif terlihat sebelum pindah halaman
    setTimeout(() => {
      if (role === 'guru') {
        router.push('/login/loginguru');
      } else if (role === 'wali') {
        router.push('/login/loginortu'); // Nanti akan diarahkan ke folder loginortu
      }
    }, 300);
  };

  // Fungsi untuk tombol Lanjut (jika user memilih untuk menggunakan tombol Lanjut)
  const handleNextBtn = () => {
    if (selectedRole === 'guru') {
      router.push('/login/loginguru');
    } else if (selectedRole === 'wali') {
      router.push('/login/loginortu');
    } else {
      alert("Silakan pilih peran terlebih dahulu!");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>Masuk sebagai</h1>

        {/* Kartu Guru */}
        <div 
          className={`${styles.optionCard} ${selectedRole === 'guru' ? styles.active : ''}`}
          onClick={() => handleRoleSelect('guru')}
        >
          <div className={styles.radioCircle}></div>
          <div className={styles.icon}>
            <Image src="/iconguru.svg" alt="Ikon Guru" width={28} height={28} />
          </div>
          <div className={styles.textGroup}>
            <h3>Guru</h3>
            <p>Kelola absensi, penilaian, dan laporan kelas.</p>
          </div>
        </div>

        {/* Kartu Wali/Orang tua */}
        <div 
          className={`${styles.optionCard} ${selectedRole === 'wali' ? styles.active : ''}`}
          onClick={() => handleRoleSelect('wali')}
        >
          <div className={styles.radioCircle}></div>
          <div className={styles.icon}>
            <Image src="/user1.svg" alt="Ikon Wali" width={28} height={28} />
          </div>
          <div className={styles.textGroup}>
            <h3>Wali / Orang tua</h3>
            <p>Pantau aktivitas, kehadiran, dan tumbuh kembang anak.</p>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className={styles.actionButtons}>
          <Link href="/">
            <button className={styles.btnBack}>Sebelumnya</button>
          </Link>
          <button className={styles.btnNext} onClick={handleNextBtn}>Lanjut</button>
        </div>
      </div>
    </div>
  );
}