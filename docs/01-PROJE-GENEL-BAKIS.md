# 01 — CafeML: Proje Genel Bakış

## Nedir?

**CafeML**, restoran ve kafe işletmeleri için geliştirilmiş yapay zeka destekli bir **POS (Point of Sale) ve yönetim sistemidir**. Geleneksel bir kasa sisteminin ötesine geçerek makine öğrenmesi (ML) yeteneklerini işletme yönetimine entegre eder.

---

## Ne İçin Geliştirildi?

| Problem | CafeML Çözümü |
|---|---|
| Satışların ne kadar olacağını tahmin edememe | ML tabanlı satış tahmini (7–14 gün ilerisi) |
| Hangi müşterilerin "değerli" olduğunu bilmeme | RFM analizi + K-Means kümeleme |
| Müşterilere doğru ürün önermeme | Matrix Factorization tabanlı öneri sistemi |
| Garsonların elle sipariş alması | QR Kod → Dijital menü → Otomatik sipariş akışı |
| Mutfak/bar ile garson senkronizasyonu | SignalR ile gerçek zamanlı bildirimler |
| Veri kaybı riski | PostgreSQL + In-Memory fallback mimarisi |

---

## Sistem Bileşenleri

```
┌─────────────────────────────────────────────────────────────────┐
│                        CafeML Sistemi                           │
│                                                                  │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐  │
│  │   Frontend   │◄──►│    Backend API    │◄──►│  PostgreSQL  │  │
│  │  React + MUI │    │  ASP.NET Core 8   │    │  Veritabanı  │  │
│  │  (Vite)      │    │  + SignalR        │    │              │  │
│  └──────────────┘    └───────────────────┘    └──────────────┘  │
│         │                     │                                  │
│         │                     ▼                                  │
│  ┌──────────────┐    ┌───────────────────┐                      │
│  │  QR Menü     │    │    ML Katmanı     │                      │
│  │  (Public)    │    │  (Microsoft ML.NET)│                     │
│  │  Kimlik Doğ. │    │  K-Means / SSA /  │                      │
│  │  Gerektirmez │    │  Matrix Factor.   │                      │
│  └──────────────┘    └───────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Temel Özellikler

### 🍽️ Restoran Yönetimi
- Salon ve masa yönetimi
- QR kod ile müşteri self-servis sipariş
- Garson paneli (talep onaylama)
- Mutfak & Bar ekranı (anlık sipariş görüntüleme)
- Menü düzenleme (ürün / grup / fiyat)
- Cari kart (müşteri hesabı) takibi

### 🤖 Yapay Zeka / ML Özellikleri
- **Satış Tahmini**: Gelecek 7–14 günün satışını öngörür
- **Müşteri Segmentasyonu**: Müşterileri 4 segmente ayırır (En değerli, Sadık, Potansiyel, Risk altında)
- **Ürün Önerileri**: "Bunu alanlar bunları da aldı" ve kişiselleştirilmiş öneriler

### 📊 Dashboard
- Günlük/haftalık/aylık satış özeti
- En çok satan ürünler
- Aktif masa durumu
- Bekleyen sipariş talepleri

### 🔐 Güvenlik & Kullanıcı Yönetimi
- JWT tabanlı kimlik doğrulama
- Rol bazlı erişim: Admin / SubAdmin / Garson
- BCrypt ile şifre hashleme

---

## Proje Kök Yapısı

```
tbtk/
├── src/                        # Backend (.NET 8)
│   ├── CafeML.Core/            # Domain entities & interfaces
│   ├── CafeML.Application/     # Application katmanı
│   ├── CafeML.Infrastructure/  # EF Core, ML.NET, DataGeneration
│   └── CafeML.WebAPI/          # API endpoints, SignalR hubs
├── frontend/                   # Frontend (React 19 + Vite)
│   └── src/
│       ├── pages/              # Sayfa bileşenleri
│       ├── components/         # Ortak bileşenler
│       └── contexts/           # Auth, Config context
├── docs/                       # 📖 Bu dokümantasyon
└── CafeML.sln                  # .NET solution dosyası
```

---

## Devam Eden Okuma Sırası

| Dosya | Konu |
|---|---|
| [02-TEKNOLOJI-STACK.md](02-TEKNOLOJI-STACK.md) | Kullanılan tüm teknolojiler ve GitHub repoları |
| [03-MIMARI-VE-PROJE-YAPISI.md](03-MIMARI-VE-PROJE-YAPISI.md) | Mimari kararlar, katman yapısı |
| [04-VERITABANI.md](04-VERITABANI.md) | Veritabanı tabloları ve ilişkiler |
| [05-BACKEND-API.md](05-BACKEND-API.md) | API endpoint listesi, auth, SignalR |
| [06-MAKINE-OGRENMESI.md](06-MAKINE-OGRENMESI.md) | ML modelleri: tahmin, segmentasyon, öneri |
| [07-QR-KOD-YONETIMI.md](07-QR-KOD-YONETIMI.md) | QR kod sistemi nasıl çalışır |
| [08-FRONTEND.md](08-FRONTEND.md) | Frontend sayfaları, routing, state |
| [09-KULLANICI-ROLLERI.md](09-KULLANICI-ROLLERI.md) | Roller ve yetki matrisi |
| [10-KURULUM-VE-CALISTIRMA.md](10-KURULUM-VE-CALISTIRMA.md) | Adım adım kurulum kılavuzu |
