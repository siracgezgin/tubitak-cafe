# 07 — QR Kod Yönetimi

## Genel Bakış

QR Kod sistemi, müşterilerin herhangi bir uygulama indirmeden masalarına ait dijital menüye erişmesini ve sipariş verebilmesini sağlar.

---

## Kullanılan Kütüphane

| Kütüphane | Versiyon | Açıklama | GitHub |
|---|---|---|---|
| **qrcode.react** | 4.2.0 | SVG/Canvas QR kod üretimi | https://github.com/zpao/qrcode.react |

---

## QR Kod Mimarisi

```
┌──────────────────────────────────────────────────┐
│               QR Yönetim Akışı                    │
│                                                    │
│  Admin/SubAdmin                                    │
│       │                                            │
│       ▼                                            │
│  QRYonetimPage (frontend)                         │
│  ─ Her masa için QR SVG üretir                    │
│  ─ İndirme: PNG olarak kaydet (Canvas API)        │
│  ─ Yazdırma: Tarayıcı print API                  │
│                                                    │
│  QR içindeki URL:                                 │
│  http://your-domain.com/free/qr/{masaId}          │
│                                                    │
│  Müşteri QR Tarar                                 │
│       │                                            │
│       ▼                                            │
│  /free/qr/:masaId (public route)                  │
│  QRMenuPage — auth gerektirmez                    │
│       │                                            │
│       ▼                                            │
│  GET /api/qr/kod/{qrKod}  veya  /api/qr/{masaId} │
│       │                                            │
│       ▼                                            │
│  Masa bilgisi + Menü kategorileri + Ürünler       │
│       │                                            │
│       ▼                                            │
│  Müşteri sepete ekler, sipariş gönderir           │
│  POST /api/siparis-talep/public                   │
│       │                                            │
│       ▼                                            │
│  SignalR → Garson paneli bildirimi                │
└──────────────────────────────────────────────────┘
```

---

## QR Kod Yapısı

### Veritabanında Saklama

Her masa kaydında `qr_kod` VARCHAR(50) alanı bulunur:
```
qr_kod: "QR-S01-03"   → Salon 1, Masa 3
qr_kod: "QR-S02-07"   → Salon 2, Masa 7
```

Bu alan **UNIQUE** index ile korunur — iki masa aynı QR koduna sahip olamaz.

### QR'a Gömülen URL

QR kod aslında şu URL'yi içerir:
```
http://your-domain.com/free/qr/{masaId}
```

- `masaId` ile doğrudan masa ID'si, **veya**
- `qrKod` (ör: `QR-S01-03`) ile QR kod stringi kullanılabilir

---

## Admin Tarafı: QR Yönetim Sayfası

**Sayfa**: `frontend/src/pages/restoran/QRYonetimPage.jsx`  
**Route**: `/qr-yonetim`  
**Gerekli Rol**: Admin veya SubAdmin

### Özellikler

1. **Listeleme**: Tüm masalar QR kod bilgisiyle listelenir
2. **Arama**: Masa veya salon adına göre filtreleme
3. **QR Önizleme**: Seçilen masa için QR kodunu popup'ta göster
4. **İndirme** (PNG olarak):
   - SVG QR kodu `Canvas` API ile PNG'ye dönüştürülür
   - Üstüne masa adı, salon adı ve QR kod değeri yazılır
   - `600×720` px boyutunda PNG dosyası indirilir
5. **Yazdırma**: Tarayıcının `window.print()` ile yazdırma dialog'u açılır

### İndirme İşlemi (Canvas API)

```javascript
const svg = document.getElementById(`qr-svg-${masa.id}`);
const canvas = document.createElement('canvas');
canvas.width = 600; canvas.height = 720;
const ctx = canvas.getContext('2d');

// 1. Beyaz arka plan
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 600, 720);

// 2. QR görüntüsünü yerleştir
ctx.drawImage(img, 50, 30, 500, 500);

// 3. Masa başlığını yaz
ctx.fillStyle = '#1976d2';
ctx.font = 'bold 36px Arial';
ctx.fillText(masa.baslik, 300, 580);

// 4. PNG olarak kaydet
const link = document.createElement('a');
link.download = `QR-${masa.baslik}.png`;
link.href = canvas.toDataURL('image/png');
link.click();
```

---

## Müşteri Tarafı: QR Menü Sayfası

**Sayfa**: `frontend/src/pages/public/QRMenuPage.jsx`  
**Route**: `/free/qr/:masaId` veya `/free/qr/kod/:qrKod`  
**Gerekli Auth**: ❌ Yok — herkese açık

### Özellikler

1. **Masa Bilgisi**: Hangi masa ve salon olduğu gösterilir
2. **Menü Görüntüleme**: Kategorilere göre gruplandırılmış ürünler
3. **Arama**: Ürün adına göre anlık filtreleme
4. **Sepet**:
   - Ürün ekleme / çıkarma
   - Ürün başına not (ör: "Az tuzlu")
   - Miktar güncelleme
5. **Sipariş Gönderme**: Sepet içeriği `/api/siparis-talep/public` endpoint'ine gönderilir
6. **Başarı Ekranı**: Sipariş onaylandıktan sonra animasyonlu başarı mesajı

### Mobil Optimizasyon

QR menü sayfası mobil cihazlara özel tasarlanmıştır:
- Responsive grid layout
- Büyük dokunma hedefleri (Add/Remove butonları)
- Kaydırmalı kategori filtresi
- Alt kayan sepet çubuğu (floating cart button)

---

## Güvenlik

- QR menü sayfası **kimlik doğrulama gerektirmez** → menüyü herkes görebilir
- Sipariş gönderme de açıktır → QR'a sahip herkes sipariş verebilir
- Kötüye kullanım önlemi olarak rate limiting eklenebilir (şu an implemente değil)
- `masaId` integer olduğundan brute-force koruması ileride eklenebilir

---

## QR Kod Üretimi: qrcode.react

Frontend'de QR kodları şu şekilde üretilir:

```jsx
import { QRCodeSVG } from 'qrcode.react';

<QRCodeSVG
  id={`qr-svg-${masa.id}`}
  value={`${window.location.origin}/free/qr/${masa.id}`}
  size={256}
  level="M"           // Hata düzeltme seviyesi: L, M, Q, H
  includeMargin={true}
/>
```

**Hata Düzeltme Seviyeleri:**
- `L`: %7 veri kurtarma
- `M`: %15 (önerilen — logo eklenebilir)
- `Q`: %25
- `H`: %30 (en dayanıklı — logo için ideal)

---

## Geliştirme Önerileri

1. **Logo eklemek** için `QRCodeSVG`'nin `imageSettings` prop'u kullanılabilir:
```jsx
<QRCodeSVG
  value={url}
  imageSettings={{
    src: "/logo.png",
    x: undefined,
    y: undefined,
    height: 40,
    width: 40,
    excavate: true,
  }}
/>
```

2. **QR kodu dinamik güncellemek** için masaya yeni bir QR kodu atanabilir (mevcut endpoint'e `PUT /api/masalar/{id}/qr` eklenerek)

3. **Analitik** için QR tarama sayıları loglanabilir
