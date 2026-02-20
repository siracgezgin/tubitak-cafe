# 09 — Kullanıcı Rolleri ve Yetki Matrisi

## Roller

Sistemde 3 kullanıcı rolü vardır:

| Rol | Türkçe | Açıklama |
|---|---|---|
| `Admin` | Yönetici | Tam yetki. Sistemi kuran kişi. |
| `SubAdmin` | Ortak/Alt Yönetici | Admin ile neredeyse aynı görünüm, ancak başka Admin oluşturamaz ve silemez. |
| `Garson` | Garson | Yalnızca sipariş alabilir. Yönetim panellerine erişemez. |

---

## Yetki Matrisi

| İşlem | Admin | SubAdmin | Garson |
|---|---|---|---|
| **Dashboard görüntüleme** | ✅ | ✅ | ✅ |
| **ML Sayfaları** (Tahmin, Segment, Öneri) | ✅ | ✅ | ❌ |
| **Sipariş Alma** (Garson Paneli) | ✅ | ✅ | ✅ |
| **Talepleri Onaylama** | ✅ | ✅ | ✅ |
| **Mutfak Ekranı** | ✅ | ✅ | ✅ |
| **Bar Ekranı** | ✅ | ✅ | ✅ |
| **Menü Düzenleme** | ✅ | ✅ | ❌ |
| **Salon Yönetimi** | ✅ | ✅ | ❌ |
| **QR Kod Yönetimi** | ✅ | ✅ | ❌ |
| **Müşteri Listesi** | ✅ | ✅ | ❌ |
| **Sipariş Geçmişi** | ✅ | ✅ | ❌ |
| **Kullanıcı Listeleme** | ✅ | ✅ | ❌ |
| **SubAdmin Oluşturma** | ✅ | ❌ | ❌ |
| **Garson Oluşturma** | ✅ | ✅ | ❌ |
| **Admin Hesabını Düzenleme** | ✅ | ❌ | ❌ |
| **Admin Hesabını Silme** | ❌ | ❌ | ❌ |
| **Kendi Hesabını Silme** | ❌ | ❌ | ❌ |
| **Seed / Reset** | ✅ | ✅ | ❌ |

---

## Rol Hiyerarşisi

```
     Admin
    /     \
SubAdmin  SubAdmin
  /  \
Garson Garson
```

- `Admin`, `SubAdmin` ve `Garson` oluşturabilir
- `SubAdmin`, yalnızca `Garson` oluşturabilir
- `SubAdmin`, kendi oluşturduğu veya diğer `SubAdmin/Garson` hesapları düzenleyebilir
- Hiç kimse başka bir `Admin` oluşturamaz
- Hiç kimse kendi hesabını silemez

---

## Demo Kullanıcılar (Seed ile)

`POST /api/seed` çağrıldığında şu kullanıcılar otomatik oluşturulur:

| Kullanıcı Adı | Şifre | Rol | Oluşturan |
|---|---|---|---|
| `admin` | `admin123` | Admin | — |
| `ortak1` | `ortak123` | SubAdmin | admin |
| `garson1` | `garson123` | Garson | admin |
| `garson2` | `garson123` | Garson | ortak1 |

---

## JWT Token ve Rol Bilgisi

Token içine rol bilgisi gömülür:

```csharp
new Claim(ClaimTypes.Role, user.Rol)  // "Admin", "SubAdmin", "Garson"
```

Frontend'de `AuthContext` üzerinden erişilir:

```javascript
const { user } = useAuth();
// user.rol → "Admin" | "SubAdmin" | "Garson"

// Sadece Admin/SubAdmin için
if (user.rol === 'Admin' || user.rol === 'SubAdmin') {
  // Yönetim paneli
}
```

---

## Güvenlik Notları

1. **Şifreler** veritabanında BCrypt ile hashlenir (`cost factor 11`)
2. **Token süresi**: 12 saat, sonrasında yeniden giriş gerekir
3. **API tarafında** her korumalı endpoint `.RequireAuthorization()` ile işaretlidir
4. **Rol kontrolü** hem frontend (UI gizleme) hem de backend (API reddetme) katmanında uygulanır
5. **Public endpoint'ler** (`/api/qr/...`, `/api/siparis-talep/public`) JWT gerektirmez
