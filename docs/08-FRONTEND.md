# 08 — Frontend

## Genel Bilgiler

- **Framework**: React 19
- **Build Tool**: Vite 7
- **UI Kütüphanesi**: Material UI (MUI) v7
- **Şablon**: Mantis Dashboard (CodedThemes — free tier)
- **Dev Port**: `http://localhost:5173`

---

## Sayfa Haritası

```
/                         → CafeML Dashboard (giriş sonrası ana ekran)
/cafeml                   → Aynı dashboard

── ML Sayfaları ──────────────────────────────
/forecast                 → Satış Tahmini
/segments                 → Müşteri Segmentleri
/recommendations          → Ürün Önerileri

── Restoran Yönetimi ─────────────────────────
/menu                     → Menü Düzenleme
/salonlar                 → Salon Yönetimi
/siparisler               → Sipariş Listesi (Folio/Adisyon)
/musteriler               → Müşteri Listesi + CRM
/garson-panel             → Garson Sipariş Paneli
/mutfak                   → Mutfak Ekranı (real-time)
/bar                      → Bar Ekranı (real-time)
/talepler                 → Sipariş Talepleri
/qr-yonetim               → QR Kod Yönetimi
/kullanicilar             → Kullanıcı Yönetimi

── Giriş ─────────────────────────────────────
/login                    → Login Sayfası

── Public (Auth Gerektirmez) ──────────────────
/free/qr/:masaId          → QR Menü (müşteri)
/free/qr/kod/:qrKod       → QR Menü (kod ile)
```

---

## Sayfa Açıklamaları

### 📊 CafeMLDashboard (`/`)
Ana kontrol paneli. Şunları gösterir:
- Günlük / haftalık / aylık satış kartları
- En çok satan ürünler (bar chart)
- Haftalık satış trendi (line chart)
- Aktif masa sayısı
- Son siparişler akışı
- Bekleyen sipariş talepleri sayısı

---

### 📈 ForecastPage (`/forecast`)
`/api/forecast/sales?days=14` endpoint'inden veri çeker.

**Gösterilecekler:**
- Güven bandlı çizgi grafik (tahmin + alt/üst sınır)
- 14 günlük tahmin tablosu
- Güven seviyesi chip'i (%90)

**Kütüphaneler**: `react-chartjs-2`, `chart.js`

---

### 👥 SegmentsPage (`/segments`)
`/api/segments` endpoint'inden veri çeker.

**Gösterilecekler:**
- Her segment için kart: Müşteri sayısı, ortalama R/F/M, toplam ciro
- Pasta grafik: Segment dağılımı
- Detaylı müşteri tablosu (segment filtresiyle)

**Renk Kodlaması:**
- 🔴 En Değerli → Altın/turuncu
- 🔵 Sadık → Mavi
- 🟢 Potansiyel → Yeşil
- ⚠️ Risk Altında → Kırmızı

---

### 💡 RecommendationsPage (`/recommendations`)
`/api/recommendations/customer/{id}` ve `/api/recommendations/product/{id}` kullanır.

**Özellikler:**
- Müşteri ID girilerek kişiselleştirilmiş öneri
- Ürün seçilerek "Bunu alanlar ne aldı?" önerisi
- Skor çubuğu görselleştirmesi

---

### 🍽️ GarsonPanelPage (`/garson-panel`)
Garsonların sipariş aldığı ana ekran.

- Salon + masa seçimi
- Aktif menüden ürün ekleme
- Sipariş notu girişi
- Mevcut adisyon görüntüleme
- Ödeme alma (nakit / kredi kartı)
- SignalR ile anlık bildirim alma

---

### 👨‍🍳 MutfakBarPage (`/mutfak`, `/bar`)

**Mutfak ekranı**: Onaylanan siparişler anlık olarak görünür  
**Bar ekranı**: Aynı mantık, içecek siparişleri için

SignalR `YeniSiparis` eventini dinler. Yeni sipariş geldiğinde:
1. Sesli bildirim (tarayıcı API)
2. Ekrana sipariş kartı eklenir
3. "Hazır" butonuyla sipariş tamamlanır

---

### 📋 TaleplerPage (`/talepler`)
QR veya garson üzerinden gelen bekleyen sipariş taleplerini listeler.

- `bekliyor` / `onaylandi` / `iptal` filtresi
- Talep onaylama → SignalR üzerinden Mutfak'a iletilir
- İptal etme

---

### 📱 QRYonetimPage (`/qr-yonetim`)
Tüm masaların QR kodlarını yönetir.

- QR SVG önizleme
- PNG indirme
- Yazdırma
- Masa/Salon arama

---

### 🍔 MenuDuzenlePage (`/menu`)
Menü düzenleme ekranı.

- Kategoriler ve ürünler listesi
- Fiyat güncelleme
- Ürün aktif/pasif yapma
- Yeni ürün/kategori ekleme

---

### 👤 KullaniciYonetimPage (`/kullanicilar`)
Kullanıcı yönetimi (Admin/SubAdmin erişimli).

- Kullanıcı listesi (rol ve durum bilgisiyle)
- Yeni kullanıcı oluşturma
- Kullanıcı aktif/pasif yapma
- Şifre sıfırlama
- Rol bazlı kısıtlamalar uygulanır

---

### 🌐 QRMenuPage (`/free/qr/:masaId`) — Public
Müşterilere özel, auth gerektirmeyen mobil menü.

- Menüyü kategorilere göre listele
- Arama
- Sepete ekleme (miktar + not)
- Sipariş gönderme
- Başarı animasyonu

---

## Routing Yapısı

```
frontend/src/routes/
├── index.jsx        → React Router root config
├── MainRoutes.jsx   → 🔒 ProtectedRoute içinde, /login'e yönlendirir
└── LoginRoutes.jsx  → /login ve /free/* (public) sayfaları
```

### Protected Route Mantığı

```jsx
// ProtectedRoute.jsx
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}
```

---

## Durum Yönetimi (State Management)

Redux veya Zustand kullanılmamaktadır. Durum yönetimi şu yollarla sağlanır:

| Yöntem | Kullanıldığı Yer |
|---|---|
| **React Context** (`AuthContext`) | JWT token, kullanıcı bilgisi, login/logout |
| **React Context** (`ConfigContext`) | Tema (light/dark), dil ayarları |
| **Local State** (`useState`) | Her sayfanın kendi verisi |
| **SWR** | Cache ve revalidation gerektiren data fetching |
| **LocalStorage** | JWT token kalıcı tutma (`cafeml_token`) |

---

## Tema

MUI tema konfigürasyonu `frontend/src/themes/` altındadır:

```
themes/
├── index.jsx        → createTheme() ile MUI tema oluşturur
├── palette.js       → Birincil renk: #1976d2 (mavi), secondary: turuncu
├── typography.js    → Font: Public Sans (Google Fonts)
└── overrides/       → MUI component override'ları
```

---

## Lazy Loading & Code Splitting

Tüm sayfa bileşenleri `React.lazy()` + özel `Loadable` wrapper ile yüklenir:

```jsx
// MainRoutes.jsx
const ForecastPage = Loadable(lazy(() => import('pages/ml/ForecastPage')));
```

Bu sayede ilk yükleme paketi küçük tutulur, sayfalara gidildikçe chunk'lar indirilir.

---

## API İletişimi

Tüm authenticated API çağrıları şu yapıdadır:

```javascript
const token = localStorage.getItem('cafeml_token');

const res = await fetch(`http://localhost:5000/api/endpoint`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

Public endpoint'ler (QR menü) için `Authorization` header'ı gönderilmez.

---

## Ortam Değişkenleri

API base URL şu an sayfalar içinde hardcoded:
```javascript
const API_BASE = 'http://localhost:5000/api';
```

Production'da `.env` ile yönetmek için:
```bash
# .env
VITE_API_BASE=https://api.your-domain.com
```
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
```
