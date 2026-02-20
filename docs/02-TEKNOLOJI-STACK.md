# 02 — Teknoloji Stack

Projede kullanılan tüm teknolojiler, kütüphaneler ve referans GitHub/NuGet repoları.

---

## 🖥️ Backend

### Çerçeve & Runtime

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **.NET 8** | 8.0 | Ana runtime | https://github.com/dotnet/runtime |
| **ASP.NET Core 8** | 8.0 | Web API çerçevesi | https://github.com/dotnet/aspnetcore |
| **C#** | 12 | Programlama dili | — |

### Veritabanı

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **PostgreSQL** | 15+ | Ana üretim veritabanı | https://github.com/postgres/postgres |
| **Entity Framework Core** | 8.0 | ORM | https://github.com/dotnet/efcore |
| **Npgsql.EF Core** | 8.0 | PostgreSQL EF sağlayıcısı | https://github.com/npgsql/efcore.pg |
| **EF Core InMemory** | 8.0 | Test/geliştirme için bellek içi DB | https://github.com/dotnet/efcore |

> ⚠️ Veritabanı tablo isimleri NARPOS POS sistemi ile uyumludur (`cffolyo`, `cfmasa`, `stokkart` vb.). Bu sayede mevcut NARPOS kullanan işletmeler doğrudan entegre olabilir.

### Makine Öğrenmesi

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **Microsoft ML.NET** | 5.0.0 | Ana ML çerçevesi | https://github.com/dotnet/machinelearning |
| **ML.NET TimeSeries** | 5.0.0 | SSA zaman serisi tahmini | https://github.com/dotnet/machinelearning |
| **ML.NET Recommender** | 0.23.0 | Matrix Factorization öneri | https://github.com/dotnet/machinelearning |
| **ML.NET AutoML** | 0.23.0 | Otomatik model seçimi | https://github.com/dotnet/machinelearning |
| **Microsoft.Extensions.ML** | 5.0.0 | ML model DI entegrasyonu | https://github.com/dotnet/machinelearning |

### Kimlik Doğrulama & Güvenlik

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **JWT Bearer Auth** | 8.0.0 | Stateless token auth | https://github.com/AzureAD/azure-activedirectory-identitymodel-extensions-for-dotnet |
| **BCrypt.Net-Next** | 4.0.3 | Şifre hashleme | https://github.com/BcryptNet/bcrypt.net |
| **System.IdentityModel.Tokens.Jwt** | — | JWT token oluşturma | — |

### Gerçek Zamanlı İletişim

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **ASP.NET Core SignalR** | 1.2.9 | WebSocket tabanlı real-time hub | https://github.com/dotnet/aspnetcore/tree/main/src/SignalR |

### Arka Plan İşler

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **Hangfire** | 1.8.23 | Zamanlanmış görevler (model yenileme) | https://github.com/HangfireIO/Hangfire |
| **Hangfire.PostgreSql** | 1.20.13 | Hangfire için PostgreSQL arka planı | https://github.com/frankhommers/Hangfire.PostgreSql |

### Test Verisi Üretimi

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **Bogus** | 35.6.5 | Gerçekçi Türkçe sahte veri üretimi | https://github.com/bchavez/Bogus |
| **Nager.Date** | 2.14.1 | Resmi tatil günlerini bilir (satış düzeltmesi için) | https://github.com/nager/Nager.Date |

### API Dokümantasyonu

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **Swagger / Swashbuckle** | 10.1.2 | Otomatik API dökümantasyonu | https://github.com/domaindrivendev/Swashbuckle.AspNetCore |

---

## 🎨 Frontend

### Çerçeve & Build

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **React** | 19.2.3 | UI kütüphanesi | https://github.com/facebook/react |
| **Vite** | 7.3.0 | Build tool & dev server | https://github.com/vitejs/vite |
| **JavaScript (JSX)** | ES2024 | Programlama dili | — |

### UI Kütüphanesi

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **MUI (Material UI)** | 7.3.6 | Ana UI component kütüphanesi | https://github.com/mui/material-ui |
| **MUI Icons Material** | 7.3.7 | İkon seti | https://github.com/mui/material-ui |
| **MUI X Charts** | 8.22.1 | Grafik/chart bileşenleri | https://github.com/mui/mui-x |
| **Mantis Dashboard** | 2.0.1 | Dashboard şablonu (CodedThemes) | https://mantisdashboard.com/free |
| **@emotion/react** | 11.14.0 | CSS-in-JS | https://github.com/emotion-js/emotion |
| **Ant Design Icons** | 6.1.0 | Ek ikon desteği | https://github.com/ant-design/ant-design-icons |

### Grafik & Görselleştirme

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **Chart.js** | 4.5.1 | Grafik kütüphanesi | https://github.com/chartjs/Chart.js |
| **react-chartjs-2** | 5.3.1 | Chart.js React sarmalayıcısı | https://github.com/reactchartjs/react-chartjs-2 |
| **framer-motion** | 12.23.26 | Animasyon kütüphanesi | https://github.com/framer/motion |

### QR Kod

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **qrcode.react** | 4.2.0 | QR kod SVG/PNG üretimi | https://github.com/zpao/qrcode.react |

### Routing & State

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **React Router DOM** | 7.11.0 | Client-side routing | https://github.com/remix-run/react-router |
| **SWR** | 2.3.8 | Data fetching & cache | https://github.com/vercel/swr |

### Form & Doğrulama

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **Formik** | 2.4.9 | Form yönetimi | https://github.com/jaredpalmer/formik |
| **Yup** | 1.7.1 | Schema doğrulama | https://github.com/jquense/yup |
| **react-number-format** | 5.4.4 | Para/sayı formatlama | https://github.com/s-yadav/react-number-format |

### Yardımcı

| Teknoloji | Versiyon | Açıklama | Kaynak |
|---|---|---|---|
| **lodash-es** | 4.17.22 | Utility fonksiyonları | https://github.com/lodash/lodash |
| **simplebar-react** | 3.3.2 | Özel scrollbar | https://github.com/Grsmto/simplebar |
| **react-device-detect** | 2.2.3 | Cihaz tipi algılama | https://github.com/duskload/react-device-detect |

---

## 🗃️ Mimari Pattern'ler

| Pattern | Kullanıldığı Yer |
|---|---|
| **Clean Architecture** | Backend katman yapısı (Core → Infrastructure → WebAPI) |
| **Repository Pattern (hafif)** | EF Core DbContext üzerinden |
| **Dependency Injection** | .NET built-in DI container |
| **Interface Segregation** | `ISalesForecaster`, `ICustomerSegmenter`, `IProductRecommender` |
| **Lazy Loading** | React `lazy()` + `Loadable` wrapper ile route-based code splitting |
| **Context API** | `AuthContext`, `ConfigContext` ile global state |

---

## 🔑 Özet: Hangi teknoloji ne için?

```
Kullanıcı QR tarar
      │
      ▼
React (qrcode.react ile üretilmiş QR)
      │
      ▼ HTTP / REST
ASP.NET Core WebAPI ──JWT──► Kimlik Doğrulama (BCrypt + JWT)
      │
      ├──► EF Core ──► PostgreSQL  (NARPOS uyumlu şema)
      │
      ├──► ML.NET
      │      ├── K-Means          (müşteri segmentasyonu)
      │      ├── SSA / Moving Avg (satış tahmini)
      │      └── Matrix Factor.   (ürün önerileri)
      │
      ├──► SignalR ──► Garson / Mutfak / Bar ekranları (gerçek zamanlı)
      │
      └──► Hangfire ──► Periyodik model yenileme görevi
```
