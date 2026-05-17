// lib/supabase.ts
// Install: npm install @supabase/supabase-js
// Buat file .env.local di root project:
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────
// student_names
// ─────────────────────────────────────────
export async function fetchStudentNames(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('student_names').select('id, name');
  if (error) { console.error('fetchStudentNames:', error); return {}; }
  return Object.fromEntries((data || []).map(r => [r.id, r.name]));
}

export async function upsertStudentName(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('student_names')
    .upsert({ id, name, updated_at: new Date().toISOString() });
  if (error) console.error('upsertStudentName:', error);
}

// ─────────────────────────────────────────
// student_photos  (simpan URL, bukan base64)
// Upload file ke Supabase Storage dulu, lalu simpan URL-nya
// ─────────────────────────────────────────
export async function fetchStudentPhotos(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('student_photos').select('id, photo_url');
  if (error) { console.error('fetchStudentPhotos:', error); return {}; }
  return Object.fromEntries((data || []).map(r => [r.id, r.photo_url]));
}

export async function upsertStudentPhoto(id: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `students/${id}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('student-photos')
    .upload(path, file, { upsert: true });
  if (uploadErr) { console.error('uploadStudentPhoto:', uploadErr); return null; }

  const { data } = supabase.storage.from('student-photos').getPublicUrl(path);
  const url = data.publicUrl;

  const { error: dbErr } = await supabase
    .from('student_photos')
    .upsert({ id, photo_url: url, updated_at: new Date().toISOString() });
  if (dbErr) console.error('upsertStudentPhoto db:', dbErr);
  return url;
}

export async function deleteStudentPhoto(id: string): Promise<void> {
  await supabase.from('student_photos').delete().eq('id', id);
}

// ─────────────────────────────────────────
// attendance
// ─────────────────────────────────────────
export async function fetchAttendance(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('attendance').select('id, status');
  if (error) { console.error('fetchAttendance:', error); return {}; }
  // id = siswaId_tanggal
  return Object.fromEntries((data || []).map(r => [r.id, r.status]));
}

export async function upsertAttendance(
  siswaId: string, tanggal: string, status: string
): Promise<void> {
  const id = `${siswaId}_${tanggal}`;
  const { error } = await supabase
    .from('attendance')
    .upsert({ id, siswa_id: siswaId, tanggal, status, updated_at: new Date().toISOString() });
  if (error) console.error('upsertAttendance:', error);
}

// ─────────────────────────────────────────
// assessments
// Primary key: (siswa_id, tahun) — 1 siswa bisa punya penilaian per tahun ajaran
// Key format di frontend: `${siswaId}__${tahun}`
// ─────────────────────────────────────────
export async function fetchAssessments(): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('assessments')
    .select('siswa_id, tahun, data');
  if (error) { console.error('fetchAssessments:', error); return {}; }
  return Object.fromEntries(
    (data || []).map(r => [`${r.siswa_id}__${r.tahun}`, { ...r.data, tahun: r.tahun }])
  );
}

// Upsert berdasarkan (siswa_id, tahun) — tidak akan menimpa tahun lain
export async function upsertAssessment(siswaId: string, data: any): Promise<void> {
  const tahun = data.tahun || '2024/2025';
  const { error } = await supabase
    .from('assessments')
    .upsert(
      { siswa_id: siswaId, tahun, data, updated_at: new Date().toISOString() },
      { onConflict: 'siswa_id,tahun' }
    );
  if (error) console.error('upsertAssessment:', error);
}

// Realtime subscription — penilaian siswa
export function subscribeAssessments(
  onChange: (assessments: Record<string, any>) => void
) {
  return supabase
    .channel('assessments_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'assessments' },
      async () => {
        const data = await fetchAssessments();
        onChange(data);
      }
    )
    .subscribe();
}

// ─────────────────────────────────────────
// spp_records
// ─────────────────────────────────────────
export type SppRow = {
  id: string; siswa_id: string; bulan: string;
  nominal: number; status: string; updated_at?: string;
  // field tambahan yang disimpan di kolom terpisah atau bisa diperluas via jsonb
};

export async function fetchSppRecords(): Promise<any[]> {
  const { data, error } = await supabase.from('spp_records').select('*').order('updated_at', { ascending: false });
  if (error) { console.error('fetchSppRecords:', error); return []; }
  return data || [];
}

export async function upsertSppRecord(record: {
  id: string; siswa_id: string; bulan: string; nominal: number; status: string;
}): Promise<void> {
  const { error } = await supabase
    .from('spp_records')
    .upsert({ ...record, updated_at: new Date().toISOString() });
  if (error) console.error('upsertSppRecord:', error);
}

// ─────────────────────────────────────────
// notifications
// ─────────────────────────────────────────
export async function fetchNotifications(type?: string): Promise<any[]> {
  let q = supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) { console.error('fetchNotifications:', error); return []; }
  return data || [];
}

export async function insertNotification(type: string, data: any): Promise<void> {
  const { error } = await supabase.from('notifications').insert({ type, data, read: false });
  if (error) console.error('insertNotification:', error);
}

export async function markNotificationsRead(type: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('type', type).eq('read', false);
  if (error) console.error('markNotificationsRead:', error);
}

// ─────────────────────────────────────────
// dokumentasi
// ─────────────────────────────────────────
export async function fetchDokumentasi(): Promise<any[]> {
  const { data, error } = await supabase
    .from('dokumentasi').select('id, data').order('updated_at', { ascending: false });
  if (error) { console.error('fetchDokumentasi:', error); return []; }
  return (data || []).map(r => ({ id: r.id, ...r.data }));
}

export async function upsertDokumentasi(id: string, dokData: any): Promise<void> {
  const { error } = await supabase
    .from('dokumentasi')
    .upsert({ id, data: dokData, updated_at: new Date().toISOString() });
  if (error) console.error('upsertDokumentasi:', error);
}

export async function deleteDokumentasi(id: string): Promise<void> {
  const { error } = await supabase.from('dokumentasi').delete().eq('id', id);
  if (error) console.error('deleteDokumentasi:', error);
}

// ─────────────────────────────────────────
// Realtime subscription — nama siswa
// Dipakai di semua halaman agar nama sinkron
// ─────────────────────────────────────────
export function subscribeStudentNames(
  onChange: (names: Record<string, string>) => void
) {
  return supabase
    .channel('student_names_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_names' },
      async () => {
        const names = await fetchStudentNames();
        onChange(names);
      }
    )
    .subscribe();
}