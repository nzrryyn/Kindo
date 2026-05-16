import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      {/* Navbar Fixed */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <Image src="/logokindo.svg" alt="Logo Kindo" width={100} height={40} />
        </div>
        <div className={styles.navLinks}>
        </div>
      </nav>

      {/* Konten Kiri */}
      <main className={styles.mainContent}>
        <div className={styles.textSection}>
          <h1 className={styles.title}>Mewujudkan Generasi<br/>Emas yang Ceria dan<br/>Berakhlak.</h1>
          <p className={styles.subtitle}>
            Sistem Informasi Manajemen Terpadu PAUD. Memantau kehadiran guru dan tumbuh kembang anak dalam satu genggaman.
          </p>
          <Link href="/login" className={styles.loginBtn}>
            Masuk
          </Link>
        </div>
      </main>

      {/* Dekorasi Kanan (Kotak Gradasi) */}
      <div className={styles.graphicsWrapper}>
        <div className={`${styles.gradientBox} ${styles.box1}`}></div>
        <div className={`${styles.gradientBox} ${styles.box2}`}></div>
        <div className={`${styles.gradientBox} ${styles.box3}`}></div>
      </div>
    </div>
  );
}