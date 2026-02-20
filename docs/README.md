# CafeML — Dokümantasyon

Bu klasör, CafeML projesinin teknik dokümantasyonunu içerir. Aşağıdaki sırayla okuyunuz.

---

## 📚 Okuma Sırası

| # | Dosya | İçerik |
|---|---|---|
| 1 | [01-PROJE-GENEL-BAKIS.md](01-PROJE-GENEL-BAKIS.md) | Projenin amacı, bileşenleri, genel mimarisi |
| 2 | [02-TEKNOLOJI-STACK.md](02-TEKNOLOJI-STACK.md) | Kullanılan tüm teknolojiler, kütüphaneler ve GitHub repoları |
| 3 | [03-MIMARI-VE-PROJE-YAPISI.md](03-MIMARI-VE-PROJE-YAPISI.md) | Clean Architecture, katman yapısı, dosya düzeni |
| 4 | [04-VERITABANI.md](04-VERITABANI.md) | Tablo yapıları, ilişkiler, NARPOS uyumluluğu |
| 5 | [05-BACKEND-API.md](05-BACKEND-API.md) | Tüm API endpoint'leri, auth, SignalR |
| 6 | [06-MAKINE-OGRENMESI.md](06-MAKINE-OGRENMESI.md) | Satış tahmini, müşteri segmentasyonu, ürün önerileri |
| 7 | [07-QR-KOD-YONETIMI.md](07-QR-KOD-YONETIMI.md) | QR kod üretimi, yönetimi ve müşteri akışı |
| 8 | [08-FRONTEND.md](08-FRONTEND.md) | Tüm sayfalar, routing, state yönetimi |
| 9 | [09-KULLANICI-ROLLERI.md](09-KULLANICI-ROLLERI.md) | Roller (Admin/SubAdmin/Garson) ve yetki matrisi |
| 10 | [10-KURULUM-VE-CALISTIRMA.md](10-KURULUM-VE-CALISTIRMA.md) | Adım adım kurulum ve production konfigürasyonu |

---

## ⚡ Hızlı Başlangıç

```bash
# 1. Backend (InMemory mod - PostgreSQL gerekmez)
cd src/CafeML.WebAPI && dotnet run

# 2. Test verisi üret
curl -X POST http://localhost:5000/api/seed

# 3. Frontend
cd frontend && npm install && npm start

# 4. Tarayıcıdan aç
# http://localhost:5173  →  admin / admin123
```
