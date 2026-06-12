# Avengers WikiVerse Backend

Backend ini memakai PHP native + MySQL, cocok dijalankan di Laragon tanpa framework.

File fungsi PHP utama:
- `api/functions.php`: fungsi auth, dashboard, favorite, notification, dan settings.
- `api/index.php`: router endpoint API.
- `api/config.php`: koneksi database.

## Setup

1. Jalankan Apache dan MySQL di Laragon.
2. Buka `http://localhost/KULIAHHH/SEMESTER%204/PROJECT/avengers-wikiverse/api/install.php`.
3. Login seed:
   - Admin: `admin@wikiverse.test` / `admin123`
   - User: `agent001` / `user123`

Alternatif manual: import `database/schema.sql` lewat phpMyAdmin.

Jika muncul `Access denied for user 'root'`, ubah `DB_USER` / `DB_PASS` di `api/config.php` sesuai akun MySQL Laragon kamu, lalu buka `api/install.php` lagi.