# 10 — Kurulum ve Çalıştırma

## Gereksinimler

| Bileşen | Minimum Versiyon | İndirme |
|---|---|---|
| **.NET SDK** | 8.0 | https://dotnet.microsoft.com/download/dotnet/8.0 |
| **Node.js** | 18+ | https://nodejs.org |
| **PostgreSQL** | 15+ (opsiyonel) | https://www.postgresql.org/download |

PostgreSQL kurulu değilse sistem otomatik olarak **InMemory** veritabanı kullanır.

---

## Hızlı Başlangıç (InMemory — PostgreSQL Gerekmez)

### 1. Repoyu Klonla

```bash
git clone <repo-url>
cd tbtk
```

### 2. Backend'i Çalıştır

```bash
cd src/CafeML.WebAPI
dotnet run
```

Backend `http://localhost:5000` adresinde başlar.  
InMemory mod aktif olduğundan veritabanı otomatik oluşturulur.

### 3. Test Verisi Üret

```bash
curl -X POST http://localhost:5000/api/seed
```

Çıktı:
```json
{
  "message": "Sentetik veri oluşturuldu!",
  "salonlar": 3,
  "masalar": 24,
  "urunler": 45,
  "musteriler": 500,
  "siparisler": 10000,
  "siparisSatirlari": 35000,
  "kullanicilar": 4
}
```

> ⚠️ **InMemory'de restart sonrası veri kaybolur.** Her `dotnet run` sonrasında tekrar `POST /api/seed` çağırın.
> Apriori modeli seed sonrasında ilk endpoint isteğiyle otomatik eğitilir (~580ms).

### 4. Frontend'i Çalıştır

```bash
# Yeni terminal aç
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:3000` adresinde başlar.

### 5. Giriş Yap

`http://localhost:3000/login` adresine git:

| Kullanıcı | Şifre | Rol |
|---|---|---|
| `admin` | `admin123` | Admin (tam yetki) |
| `ortak1` | `ortak123` | SubAdmin |
| `garson1` | `garson123` | Garson |

---

## PostgreSQL ile Kurulum

### 1. PostgreSQL Veritabanı Oluştur

```sql
CREATE DATABASE cafeml;
CREATE USER cafeml_user WITH PASSWORD 'gizli_sifre';
GRANT ALL PRIVILEGES ON DATABASE cafeml TO cafeml_user;
```

### 2. Bağlantı Dizgisini Yapılandır

`src/CafeML.WebAPI/appsettings.json` dosyasını düzenle:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=cafeml;Username=cafeml_user;Password=gizli_sifre"
  }
}
```

### 3. Veritabanı Tabloları

> **Not**: EF Core migration'ları şu an yapılandırılmamıştır. NARPOS'tan gelen mevcut veritabanı kullanılacaksa tablolar zaten mevcuttur.

Yeni kurulumda tabloları oluşturmak için EF Core migration ekleyebilirsiniz:

```bash
cd src/CafeML.WebAPI
dotnet ef migrations add InitialCreate --project ../CafeML.Infrastructure
dotnet ef database update
```

Ya da InMemory modda `POST /api/seed` ile sentetik veri üretip, EnsureCreated ile tabloları oluşturabilirsiniz.

---

## NARPOS Entegrasyonu

Mevcut NARPOS kullanan bir işletmeyseniz:

1. `appsettings.json`'da NARPOS'un PostgreSQL bağlantısını girin
2. Backend'i çalıştırın
3. EF Core model konfigürasyonları NARPOS tablo adlarıyla eşleştirilmiştir:
   - `cffolyo`, `cffolyohar`, `cffolyotahsilat`
   - `cfmasa`, `cfsalon`
   - `stokkart`, `carikart`
   - `cfmenu`, `cfmenugrup`, `cfmenustokkart`
4. `users` ve `siparis_talepler` tabloları **yeni** tablolardır, oluşturulmaları gerekir

---

## Servis Yapılandırması (Production)

### Backend Systemd Servisi (Linux)

```ini
# /etc/systemd/system/cafeml-api.service

[Unit]
Description=CafeML Web API
After=network.target

[Service]
WorkingDirectory=/opt/cafeml/api
ExecStart=/usr/bin/dotnet CafeML.WebAPI.dll
Restart=always
RestartSec=10
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000
Environment=ConnectionStrings__DefaultConnection=Host=localhost;Database=cafeml;Username=cafeml_user;Password=gizli

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable cafeml-api
sudo systemctl start cafeml-api
```

### Frontend Build

```bash
cd frontend
npm run build
# dist/ klasörü oluşur, Nginx veya başka web sunucusuyla servis edilebilir
```

### Nginx Konfigürasyonu (Örnek)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    root /opt/cafeml/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API (proxy)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
    }

    # SignalR WebSocket
    location /hubs/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## Ortam Değişkenleri

| Değişken | Açıklama | Örnek |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL bağlantı dizgisi | `Host=db;Database=cafeml;...` |
| `USE_INMEMORY` | `true` ise InMemory kullan | `true` |
| `Jwt__Key` | JWT imzalama anahtarı (min 32 karakter) | `uzun-gizli-anahtar-buraya` |
| `Jwt__Issuer` | JWT issuer değeri | `CafeML` |
| `ASPNETCORE_ENVIRONMENT` | `Development` veya `Production` | `Production` |

---

## CORS Ayarları (Production)

`Program.cs` içinde CORS politikasını güncelleyin:

```csharp
policy.WithOrigins(
    "http://localhost:5173",   // Geliştirme
    "https://your-domain.com"  // Production
)
```

---

## Swagger API Dokümantasyonu

Development modunda `http://localhost:5000/swagger` adresinden tüm endpoint'leri test edebilirsiniz.

---

## Sık Karşılaşılan Sorunlar

### Port çakışması
```bash
# 5000 portunu kullanan process'i bul
lsof -i :5000
# veya
dotnet run --urls "http://localhost:5001"
```

### ML.NET MKL hatası (Linux)
```bash
sudo apt-get install -y libgomp1
```

### CORS hatası
Frontend `http://localhost:3000`'den istek atıyorsa, `Program.cs` CORS listesinde bu origin olduğundan emin olun.

### InMemory'de veri gitmesi
InMemory veritabanı uygulama her yeniden başladığında sıfırlanır. Her restart sonrası `POST /api/seed` ile yeniden seed yapın.

### Frontend `npm install` hatası
```bash
node --version  # 18+ olmalı
npm install --legacy-peer-deps
```
