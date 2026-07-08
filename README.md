# KUJANG v1.0.0

**Kendali Utama Jatuh Tempo & Antisipasi Gagal-waktu**

Sistem manajemen permohonan dan monitoring SLA untuk  
**KPP Madya Bandung — Direktorat Jenderal Pajak — Kemenkeu RI**

---

## 🚀 Setup & Menjalankan

### 1. Konfigurasi Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com/)
2. Aktifkan **Authentication → Sign-in method → Email/Password**
3. Buat **Firestore Database** (Production mode)
4. Salin kredensial ke file `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 2. Install dan Jalankan

```bash
cd C:\KUJANG
npm install
npm run dev
```

Buka: http://localhost:5173

### 3. Seed Data Demo

Setelah Firebase dikonfigurasi dan login sebagai admin, jalankan di browser console (F12):

```js
import('/src/services/seedService.js').then(m => m.seedDemoData().then(r => console.log(r)));
```

---

## Akun Demo

| NIP / Username     | Password   | Role      | Nama                  |
|--------------------|------------|-----------|-----------------------|
| 198001012005011001 | kujang2026 | Penyuluh  | EKA MARDIANA          |
| 198002022005012002 | kujang2026 | Penyuluh  | DANI HARDIMAN         |
| 198003032005011003 | kujang2026 | Penyuluh  | WIDHI KANGKO POERNOMO |
| 198004042005012004 | kujang2026 | Penyuluh  | PRAESTRYANA ARGENTI   |
| 198005052005012005 | kujang2026 | Penyuluh  | SUCI SURYATI          |
| admin001           | kujang2026 | Admin     | Administrator         |
| faisol001          | kujang2026 | Ketua KPP | Moch. Faisol          |

---

## Aset yang Perlu Dikopy Manual

Salin file berikut ke folder public/:

- logo-kujang.jpeg   — Logo KUJANG
- gedung-kpp.webp    — Foto gedung KPP Madya Bandung

---

## Redirect Setelah Login

| Role     | Redirect ke        |
|----------|--------------------|
| penyuluh | /dashboard         |
| admin    | /monitoring        |
| ketuakpp | /dashboard-ketua   |

---

## Tech Stack

React 18.3 + Vite 5.4 + Tailwind CSS 3.4 + Zustand 4.5 + TanStack Query 5  
React Router DOM 6.26 + Firebase 10 + SheetJS + React Hook Form + Zod + date-fns 3.6

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isLoggedIn() { return request.auth != null; }
    match /users/{uid}     { allow read: if isLoggedIn(); allow write: if isLoggedIn(); }
    match /cases/{id}      { allow read, write: if isLoggedIn(); }
    match /auditLogs/{id}  { allow read, create: if isLoggedIn(); }
  }
}
```

---

(c) 2026 KPP Madya Bandung - DJP - Zona Integritas WBK dan WBBM
