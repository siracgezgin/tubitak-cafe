# 04 — Veritabanı

## Veritabanı Motoru

- **Üretim**: PostgreSQL 15+
- **Geliştirme / Demo**: EF Core InMemory (bağlantı dizgisi yoksa otomatik devreye girer)
- **ORM**: Entity Framework Core 8

---

## NARPOS Uyumluluğu

Tablo isimleri, **NARPOS** POS sisteminin kullandığı şema ile birebir uyumludur. Bu sayede:
- Mevcut NARPOS kullanan bir işletme, aynı veritabanına bağlanarak geçmiş verilerini ML için kullanabilir
- Yeni kurulumda synthetic veri üreteci (`SyntheticDataGenerator`) ile başlanabilir

---

## Tablo Yapıları

### `cfsalon` — Salonlar

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Salon ID |
| `kodu` | VARCHAR | Salon kodu (S01, S02...) |
| `baslik` | VARCHAR | Salon adı (Bahçe, Teras, VIP...) |

---

### `cfmasa` — Masalar

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Masa ID |
| `salon_id` | INT FK | Bağlı salon |
| `kodu` | VARCHAR | Masa kodu (M001, M002...) |
| `baslik` | VARCHAR | Masa adı (Masa 1, Masa 2...) |
| `qr_kod` | VARCHAR(50) **UNIQUE** | QR koda gömülü benzersiz kod |

> `qr_kod` alanı her masa için benzersizdir. Format: `QR-S01-01`

---

### `cffolyo` — Folyo (Açık Hesap / Sipariş Başlığı)

NARPOS terminolojisinde "folyo" = bir masanın açık hesabıdır.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Folyo ID |
| `masa_id` | INT FK | Bağlı masa |
| `carikart_id` | INT FK (nullable) | Müşteri hesabı (kayıtlı müşteri ise) |
| `tarih` | DATETIME | Açılış tarihi |
| `tutari` | DECIMAL(12,4) | Toplam tutar |
| `odenen` | DECIMAL(12,4) | Ödenen tutar |
| `created_at` | DATETIME | Oluşturulma |
| `updated_at` | DATETIME | Son güncelleme |

Computed alan (DB'de yoktur): `Bakiye = Tutari - Odenen`

---

### `cffolyohar` — Folyo Hareketi (Sipariş Kalemleri)

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Hareket ID |
| `folyo_id` | INT FK | Bağlı folyo |
| `stokkart_id` | INT FK | Sipariş edilen ürün |
| `miktar` | DECIMAL(12,4) | Adet/miktar |
| `tutari` | DECIMAL(12,4) | Satır tutarı |
| `created_at` | DATETIME | Sipariş zamanı |

> Bu tablo ML tahminlerinin ve önerilerin temel veri kaynağıdır.

---

### `cffolyotahsilat` — Ödeme Kayıtları

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Tahsilat ID |
| `folyo_id` | INT FK | Bağlı folyo |
| `tutari` | DECIMAL(12,4) | Ödeme tutarı |
| `tarih` | DATETIME | Ödeme tarihi |

---

### `stokkart` — Stok Kartı (Ürünler)

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Ürün ID |
| `kodu` | VARCHAR | Ürün kodu |
| `baslik` | VARCHAR | Ürün adı (Hamburger, Latte...) |
| `kdvorani` | DECIMAL(12,4) | KDV oranı |
| `bfsatis1` | DECIMAL(12,4) | Satış fiyatı |

---

### `carikart` — Cari Kart (Müşteri Hesapları)

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Müşteri ID |
| (Diğer alanlar) | — | NARPOS tanımlı ek alanlar |

---

### `cfmenu` — Menü

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Menü ID |
| (Diğer alanlar) | — | Menü başlık ve ayarları |

---

### `cfmenugrup` — Menü Grubu (Kategori)

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Grup ID |
| `menu_id` | INT FK | Bağlı menü |
| (Diğer alanlar) | — | Grup başlık, sıralama |

---

### `cfmenustokkart` — Menü–Ürün İlişkisi

Çoktan çoğa ilişki tablosu. Bileşik birincil anahtar.

| Kolon | Tip | Açıklama |
|---|---|---|
| `menugrup_id` | INT PK+FK | Menü grubu |
| `menu_id` | INT PK+FK | Menü |
| `stokkart_id` | INT PK+FK | Ürün |

---

### `users` — Kullanıcılar

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Kullanıcı ID |
| `kullanici` | VARCHAR(50) **UNIQUE** | Kullanıcı adı |
| `sifre_hash` | VARCHAR(256) | BCrypt hash |
| `ad` | VARCHAR(100) | Ad |
| `soyad` | VARCHAR(100) | Soyad |
| `rol` | VARCHAR(20) | Admin / SubAdmin / Garson |
| `olusturan_id` | INT nullable | Kim oluşturdu |
| `enabled` | BOOL | Hesap aktif mi |
| `created_at` | DATETIME | — |
| `updated_at` | DATETIME | — |

---

### `siparis_talepler` — Sipariş Talepleri

QR menüden gelen veya garsonun oluşturduğu sipariş talepleri.

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Talep ID |
| `masa_id` | INT FK | Hangi masa |
| `durum` | VARCHAR(20) | `bekliyor` / `onaylandi` / `iptal` |
| `onaylayan_user_id` | INT FK nullable | Onaylayan garson/admin |
| `olusturulma_tarihi` | DATETIME | Talep zamanı |

---

### `siparis_talep_satirlar` — Sipariş Talep Kalemleri

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | INT PK | Satır ID |
| `siparis_talep_id` | INT FK | Bağlı talep |
| `stokkart_id` | INT FK | İstenen ürün |
| `miktar` | DECIMAL | Adet |

---

## İlişki Diyagramı

```
cfsalon (1) ──────< (N) cfmasa
                         │
                         └──< cffolyo
                                 │
                                 ├──< cffolyohar >── stokkart
                                 └──< cffolyotahsilat

carikart (1) ──────────────────< cffolyo

cfmenu (1) ──< cfmenugrup >── cfmenustokkart >── stokkart

siparis_talepler >── siparis_talep_satirlar >── stokkart
siparis_talepler ──> cfmasa
siparis_talepler ──> users (onaylayan)

users (olusturan_id) ──> users
```

---

## In-Memory vs PostgreSQL

Sistem başlarken şu mantıkla karar verir:

```csharp
// Program.cs
var useInMemory = string.IsNullOrEmpty(connectionString) ||
                  config.GetValue<bool>("UseInMemoryDatabase", false) ||
                  Environment.GetEnvironmentVariable("USE_INMEMORY") == "true";
```

| Durum | Kullanılan DB |
|---|---|
| `appsettings.json`'da bağlantı dizgisi varsa | PostgreSQL |
| Bağlantı dizgisi yoksa | InMemory |
| `UseInMemoryDatabase: true` ise | InMemory |
| `USE_INMEMORY=true` env değişkeni varsa | InMemory |

InMemory modda uygulama başlarken `SyntheticDataGenerator` ile otomatik test verisi üretilir.

---

## Bağlantı Konfigürasyonu

`appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=cafeml;Username=postgres;Password=postgres"
  }
}
```

Ortam değişkeni ile de belirtilebilir:
```bash
ConnectionStrings__DefaultConnection="Host=db;Database=cafeml;Username=postgres;Password=gizli"
```
