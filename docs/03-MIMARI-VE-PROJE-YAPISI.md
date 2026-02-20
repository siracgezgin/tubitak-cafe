# 03 — Mimari ve Proje Yapısı

## Genel Mimari: Clean Architecture

Proje, **Clean Architecture** prensipleri ile 4 katmana ayrılmıştır. Bağımlılık yönü her zaman dışarıdan içeriye doğrudur: dış katmanlar iç katmanlara bağımlı olabilir, iç katmanlar dış katmanlara **asla** bağımlı olamaz.

```
┌─────────────────────────────────────────────────┐
│              CafeML.WebAPI                       │  ← HTTP, Endpoints, SignalR Hub
│         (Giriş noktası / Sunum katmanı)          │
├─────────────────────────────────────────────────┤
│           CafeML.Application                     │  ← Uygulama servisleri (şu an minimal)
├─────────────────────────────────────────────────┤
│          CafeML.Infrastructure                   │  ← EF Core, ML.NET, DataGeneration
│     (Dış bağımlılıkların implementasyonları)     │
├─────────────────────────────────────────────────┤
│              CafeML.Core                         │  ← Domain entities + Interfaces
│        (Hiçbir dış bağımlılığı yoktur)           │
└─────────────────────────────────────────────────┘
```

---

## Backend Katmanları

### 1. `CafeML.Core` — Domain Katmanı

**Görevi**: İş alanının çekirdeği. Hiçbir framework veya dış kütüphane referansı içermez.

```
CafeML.Core/
├── Entities/
│   ├── CariKart.cs          # Müşteri hesabı
│   ├── Folyo.cs             # Sipariş/açık hesap başlığı
│   ├── FolyoHar.cs          # Sipariş kalemleri (satırlar)
│   ├── FolyoTahsilat.cs     # Ödeme kayıtları
│   ├── Masa.cs              # Masa (QR kodu burada tutulur)
│   ├── Menu.cs              # Menü tanımı
│   ├── MenuGrup.cs          # Menü grubu (kategori)
│   ├── MenuStokKart.cs      # Menü–Ürün ilişki tablosu
│   ├── Salon.cs             # Oturma alanı/salon
│   ├── SiparisTalep.cs      # Müşteri sipariş talebi başlığı
│   ├── SiparisTalepSatir.cs # Sipariş talebi kalemleri
│   ├── StokKart.cs          # Ürün/stok kartı
│   └── User.cs              # Kullanıcı (Admin/SubAdmin/Garson)
└── Interfaces/
    ├── ICustomerSegmenter.cs   # Müşteri segmentasyon sözleşmesi
    ├── IProductRecommender.cs  # Ürün öneri sözleşmesi
    └── ISalesForecaster.cs     # Satış tahmini sözleşmesi
```

> **Neden böyle?** ML algoritmalarını değiştirmek istediğinizde sadece Infrastructure'ı değiştirirsiniz. Core ve WebAPI etkilenmez.

---

### 2. `CafeML.Application` — Uygulama Katmanı

Şu an minimal tutulmuştur. Gelecekte use-case'ler ve servisler buraya taşınabilir. Core'a referans verir.

---

### 3. `CafeML.Infrastructure` — Altyapı Katmanı

**Görevi**: Tüm dış bağımlılıkların gerçek implementasyonları.

```
CafeML.Infrastructure/
├── Data/
│   └── CafeDbContext.cs         # EF Core DbContext, tablo mapping'leri
├── DataGeneration/
│   └── SyntheticDataGenerator.cs # Bogus ile sentetik veri üretimi
└── MachineLearning/
    ├── Models/
    │   ├── CustomerModels.cs     # K-Means input/output modelleri
    │   ├── RecommendationModels.cs # Matrix Factorization modelleri
    │   └── SalesModels.cs        # Zaman serisi modelleri
    ├── KMeansCustomerSegmenter.cs    # ICustomerSegmenter impl.
    ├── MatrixFactorizationRecommender.cs # IProductRecommender impl.
    ├── SimpleForecaster.cs       # ISalesForecaster (production)
    └── SsaSalesForecaster.cs     # ISalesForecaster (SSA alternatifi)
```

---

### 4. `CafeML.WebAPI` — Sunum Katmanı

**Görevi**: HTTP endpoint'leri, kimlik doğrulama, SignalR hub.

```
CafeML.WebAPI/
├── Program.cs          # Tüm endpoint'ler ve DI konfigürasyonu (Minimal API)
├── Hubs/
│   └── OrderHub.cs     # SignalR: sipariş bildirimleri
├── appsettings.json    # PostgreSQL bağlantısı, JWT config
└── appsettings.Development.json
```

> **Not**: Proje **Minimal API** yaklaşımını kullanır. Geleneksel Controller sınıfları yerine `Program.cs` içinde `app.MapPost(...)`, `app.MapGet(...)` ile endpoint'ler tanımlanır.

---

## Frontend Yapısı

```
frontend/src/
├── App.jsx                # Root bileşen, router kurulumu
├── index.jsx              # React DOM render noktası
├── config.js              # Global konfigürasyon
│
├── api/
│   ├── cafeml.js          # Backend API helper fonksiyonları
│   └── menu.js            # Menü API helper'ları
│
├── components/            # Yeniden kullanılabilir bileşenler
│   ├── Loadable.jsx       # Lazy loading wrapper
│   ├── Loader.jsx         # Yükleme spinner
│   ├── MainCard.jsx       # Sayfa kart çerçevesi
│   ├── ProtectedRoute.jsx # JWT korumalı rota wrapper
│   └── ScrollTop.jsx
│
├── contexts/
│   ├── AuthContext.jsx    # Kullanıcı oturumu ve JWT state
│   └── ConfigContext.jsx  # Tema ve konfigürasyon state
│
├── hooks/
│   ├── useConfig.js       # ConfigContext hook'u
│   └── useLocalStorage.js # LocalStorage hook'u
│
├── layout/
│   ├── Auth/              # Login sayfası layout
│   └── Dashboard/         # Ana dashboard layout (sidebar, header)
│
├── menu-items/            # Sol sidebar menü tanımları
│   ├── index.jsx
│   ├── dashboard.jsx
│   ├── restoran.jsx       # Restoran yönetimi menüleri
│   ├── utilities.jsx      # ML sayfaları menüleri
│   └── ...
│
├── pages/
│   ├── auth/              # Giriş sayfası
│   ├── dashboard/         # CafeML ana dashboard
│   ├── ml/                # ML sayfaları (Tahmin, Segmentler, Öneriler)
│   ├── restoran/          # Restoran yönetim sayfaları
│   └── public/            # QR Menü (auth gerektirmez)
│
├── routes/
│   ├── index.jsx          # Router config
│   ├── MainRoutes.jsx     # Korumalı rotalar (auth gerektirir)
│   └── LoginRoutes.jsx    # Login ve public rotalar
│
└── themes/                # MUI tema konfigürasyonu
    ├── index.jsx
    ├── palette.js         # Renk paleti
    └── typography.js      # Font ayarları
```

---

## Dependency Injection Konfigürasyonu

`Program.cs`'de servisler şu sırayla kayıt edilir:

```csharp
// Veritabanı (PostgreSQL veya InMemory)
builder.Services.AddDbContext<CafeDbContext>(...);

// ML Servisleri (Scoped — her request yeni instance)
builder.Services.AddScoped<ISalesForecaster, SimpleForecaster>();
builder.Services.AddScoped<ICustomerSegmenter, KMeansCustomerSegmenter>();
builder.Services.AddScoped<IProductRecommender, MatrixFactorizationRecommender>();

// Veri üretici (Transient)
builder.Services.AddTransient<SyntheticDataGenerator>();

// SignalR
builder.Services.AddSignalR();

// JWT Auth
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)...
```

---

## Veri Akışı Örneği: QR Sipariş

```
Müşteri QR tarar
      │
      ▼
React QRMenuPage (auth yok)
      │ GET /api/qr/kod/{qrKod}
      ▼
WebAPI → CafeDbContext → PostgreSQL
      │ Masa + Menü bilgisi döner
      ▼
Müşteri sepete ürün ekler, sipariş gönderir
      │ POST /api/siparis-talep
      ▼
WebAPI SiparisTalep kaydeder
      │
      ├─► SignalR → OrderHub → Garson gruplarına bildirim
      │
      └─► Garson TaleplerPage'de görür, onaylar
              │ POST /api/siparis-talep/{id}/onayla
              ▼
          SignalR → Mutfak/Bar gruplarına YeniSiparis bildirimi
```
