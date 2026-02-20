# 05 — Backend API

## Genel Bilgiler

- **Base URL**: `http://localhost:5000`
- **API Tipi**: ASP.NET Core 8 Minimal API (Controller'sız)
- **Kimlik Doğrulama**: JWT Bearer Token
- **Swagger UI**: `http://localhost:5000/swagger` (development modunda)
- **SignalR Hub**: `ws://localhost:5000/hubs/orders`

---

## Kimlik Doğrulama (Auth)

### `POST /api/auth/login`
Kullanıcı girişi, JWT token döner.

**Request:**
```json
{
  "kullanici": "admin",
  "sifre": "admin123"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "kullanici": "admin", "ad": "Sirac", "soyad": "Yönetici", "rol": "Admin" }
}
```

### `GET /api/auth/me` 🔒
Mevcut oturumdaki kullanıcı bilgilerini döner.

**Token Süresi**: 12 saat  
**Algoritma**: HMAC-SHA256

---

## Kullanıcı Yönetimi

Tüm endpoint'ler **Admin veya SubAdmin** rolü gerektirir.

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/kullanicilar` | Tüm kullanıcıları listele |
| `POST` | `/api/kullanicilar` | Yeni kullanıcı oluştur |
| `PUT` | `/api/kullanicilar/{id}` | Kullanıcı güncelle |
| `DELETE` | `/api/kullanicilar/{id}` | Kullanıcı sil |

**Rol kısıtlamaları:**
- `SubAdmin` → yalnızca `Garson` oluşturabilir, Admin'i düzenleyemez/silemez
- `Admin` → `SubAdmin` veya `Garson` oluşturabilir
- Kimse kendi hesabını silemez

---

## Admin / Seed Endpoint'leri

| Method | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/seed` | Sentetik test verisi üretir (3 salon, 24 masa, 500 müşteri, 10.000 sipariş) |
| `DELETE` | `/api/reset` | Tüm veritabanını temizler |

> ⚠️ Bu endpoint'ler production ortamında kaldırılmalı veya korunmalıdır.

---

## Dashboard Endpoint'leri

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/dashboard` | Genel istatistikler (toplam sipariş, ciro, müşteri sayısı vb.) |
| `GET` | `/api/sales/daily` | Günlük satış verileri |
| `GET` | `/api/products` | Tüm aktif ürünler |
| `GET` | `/api/menu` | Kategorilere göre gruplandırılmış menü |

---

## Restoran Endpoint'leri 🔒

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/salonlar` | Aktif salonların listesi |
| `GET` | `/api/masalar` | Tüm masalar + doluluk durumu |
| `GET` | `/api/masalar/qr` | QR yönetim sayfası için masa + QR bilgileri |
| `GET` | `/api/masalar/{id}/adisyon` | Masanın aktif adisyonu (kalemler + ödemeler) |
| `POST` | `/api/masalar/{id}/odeme` | Ödeme al (parçalı veya tam) |
| `POST` | `/api/masalar/{id}/kapat` | Masayı kapat (bakiye sıfırsa) |

### Ödeme Request Örneği:
```json
{ "tutar": 150.00, "tip": "Nakit" }
```
`tip` değerleri: `"Nakit"` veya `"Kredi Kartı"`

---

## Sipariş Talepleri 🔒

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/siparis-talep` | Bekleyen talepleri listele |
| `POST` | `/api/siparis-talep` | Yeni talep oluştur (QR veya garson) |
| `POST` | `/api/siparis-talep/{id}/onayla` | Talebi onayla → Mutfak/Bar'a bildirim |
| `POST` | `/api/siparis-talep/{id}/iptal` | Talebi iptal et |

### Yeni Talep Request:
```json
{
  "masaId": 5,
  "satirlar": [
    { "stokkartId": 12, "miktar": 2, "not": "Az yağlı" },
    { "stokkartId": 7, "miktar": 1 }
  ]
}
```

---

## QR Menü Endpoint'leri (Public — Auth Gerektirmez)

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/qr/{masaId}` | Masa ID ile menü getir |
| `GET` | `/api/qr/kod/{qrKod}` | QR kodu ile masa ve menü getir |
| `POST` | `/api/siparis-talep/public` | QR üzerinden sipariş gönder |

### QR Menü Response Yapısı:
```json
{
  "masa": { "id": 5, "baslik": "Masa 3", "salon": "Bahçe", "qrKod": "QR-S01-03" },
  "kategoriler": [
    {
      "kategori": "Yiyecekler",
      "urunler": [
        { "id": 12, "baslik": "Hamburger", "fiyat": 85.00 }
      ]
    }
  ]
}
```

---

## ML — Satış Tahmini Endpoint'leri

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/forecast/sales?days=7` | Genel satış tahmini (1–14 gün) |
| `GET` | `/api/forecast/product/{id}?days=7` | Ürün bazlı talep tahmini |
| `POST` | `/api/forecast/retrain` | Modeli yeniden eğit |

### Tahmin Response Örneği:
```json
{
  "message": "7 günlük satış tahmini",
  "tahminler": [
    {
      "tarih": "2026-02-21",
      "tahminedilenSatis": 4250.75,
      "altSinir": 3800.00,
      "ustSinir": 4700.50,
      "guvenSeviyesi": "90%"
    }
  ]
}
```

---

## ML — Müşteri Segmentasyonu Endpoint'leri

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/segments` | Tüm segmentlerin özet istatistikleri |
| `GET` | `/api/segments/{customerId}` | Belirli müşterinin segmenti ve RFM skoru |
| `GET` | `/api/segments/customers?segment=&limit=50` | Segmente göre müşteri listesi |

### Segment Özet Response:
```json
{
  "toplamMusteri": 487,
  "segmentOzeti": [
    {
      "segment": "En Değerli Müşteriler",
      "musteriSayisi": 58,
      "ortRecency": 3.2,
      "ortFrequency": 18.5,
      "ortMonetary": 2450.00,
      "toplamCiro": 142100.00
    }
  ]
}
```

---

## ML — Ürün Önerileri Endpoint'leri

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/api/recommendations/customer/{id}?top=5` | Müşteriye özel ürün önerileri |
| `GET` | `/api/recommendations/product/{id}?top=5` | "Bunu alanlar bunları da aldı" |
| `POST` | `/api/recommendations/retrain` | Modeli yeniden eğit |

### Öneri Response:
```json
{
  "musteriId": 42,
  "oneriler": [
    { "urunId": 15, "urunAdi": "Cappuccino", "skor": 87.3 },
    { "urunId": 8,  "urunAdi": "Cheesecake", "skor": 72.1 }
  ]
}
```

---

## SignalR Hub: OrderHub

**URL**: `/hubs/orders`

### Client → Server Mesajları

| Metot | Açıklama |
|---|---|
| `GrubaKatil(grup)` | Bir gruba katıl (`garsonlar`, `mutfak`, `bar`, `dashboard`) |
| `GruptenAyril(grup)` | Gruptan ayrıl |
| `YeniTalepBildirimi(talep)` | Garsonlara yeni talep bildirimi gönder |
| `SiparisOnaylandi(siparis)` | Mutfak ve Bar'a onaylanan siparişi gönder |
| `DashboardGuncelle(data)` | Dashboard'a anlık veri gönder |

### Server → Client Mesajları

| Event | Hedef Grup | Açıklama |
|---|---|---|
| `YeniTalep` | `garsonlar` | Yeni sipariş talebi geldi |
| `YeniSiparis` | `mutfak`, `bar` | Onaylanan sipariş hazırlanmaya başlasın |
| `DashboardGuncellendi` | `dashboard` | Dashboard yenile |

### React'tan Bağlanma Örneği:
```javascript
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('http://localhost:5000/hubs/orders', {
    accessTokenFactory: () => localStorage.getItem('cafeml_token')
  })
  .withAutomaticReconnect()
  .build();

await connection.start();
await connection.invoke('GrubaKatil', 'garsonlar');
connection.on('YeniTalep', (talep) => console.log(talep));
```

---

## CORS Konfigürasyonu

Frontend'in backend'e erişebilmesi için izin verilen origin'ler:
- `http://localhost:3000` (Create React App)
- `http://localhost:5173` (Vite dev server)

Production'da bu listeye domain eklenmesi gerekir.

---

## JWT Token Formatı

Token payload (claims):
```
NameIdentifier: "1"         → Kullanıcı ID
Name: "admin"               → Kullanıcı adı
GivenName: "Sirac Yönetici" → Ad Soyad
Role: "Admin"               → Rol
```
