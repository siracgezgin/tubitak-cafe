# XPos - Modern Restoran Yönetim Sistemi (QR & AI Destekli)

Bu proje, modern restoranlar için geliştirilmiş uçtan uca bir yönetim çözümüdür. Masaüstü (kasa/garson) uygulaması, müşteri web menüsü ve güvenli bir arka uç (backend) servisinden oluşur.

## 🚀 Proje Hakkında
XPos, geleneksel POS sistemlerini modern teknolojilerle birleştirir. Masalara özel QR kodlar ile müşteriler menüye ulaşabilir, yapay zeka destekli öneriler alabilir (hazırlık aşamasında) ve sipariş verebilirler. İşletme sahipleri ise masaüstü uygulamasından tüm süreci yönetir.

## ✨ Öne Çıkan Özellikler

### 🖥️ Masaüstü Uygulaması (XPos.Mobile - MAUI Blazor)
*   **Dashboard**: Günlük satışlar, doluluk oranları ve aktif siparişlerin görsel özeti.
*   **Masa Yönetimi**: 
    *   Sürükle-bırak veya tek tıkla masa durumu görüntüleme.
    *   **Güvenli QR Oluşturma**: Her masa için benzersiz, token tabanlı güvenli QR kodları üretir ve yazdırır.
    *   Özelleştirilebilir masa isimleri (Örn: "Loca 1", "Teras 5").
*   **Menü Yönetimi**: 
    *   Ürün ekleme, düzenleme ve silme.
    *   **Görsel Yükleme**: Cihazdan direkt fotoğraf yükleme ve Base64 dönüşümü.
    *   Kategori yönetimi.
    *   Anlık arama ve filtreleme.
*   **Sipariş Takibi**: Masalardan gelen siparişleri anlık görüntüleme.

### 🌐 Web Menü (XPos.Client - Blazor WA)
*   **Dijital Menü**: QR kod ile açılan, kategori bazlı modern menü arayüzü.
*   **Sepet Yönetimi**: Ürünleri sepete ekleme, miktar güncelleme.
*   **AI Lezzet Sihirbazı**: (Demo) Müşterinin damak tadına uygun yemek önerileri sunan akıllı asistan.
*   **Karanlık/Aydınlık Mod**: Responsive ve şık tasarım.

### 🔙 Backend (XPos.WebAPI - .NET 9)
*   **RESTful API**: Tüm veri trafiğini yöneten merkezi servis.
*   **Güvenlik**: Token tabanlı masa doğrulama sistemi.
*   **Veri Tabanı**: Entity Framework Core ile veri yönetimi (SQLite/LocalDB).

## 🛠️ Kullanılan Teknolojiler ve Mimari

Bu proje **.NET 9** ekosistemi üzerine inşa edilmiştir ve **Blazor Hybrid** mimarisini kullanır.

| Teknoloji | Kullanım Alanı | Açıklama |
| :--- | :--- | :--- |
| **.NET 9** | Core Framework | En güncel .NET sürümü ile yüksek performans. |
| **MAUI Blazor Hybrid** | Desktop App | Tek kod tabanı ile hem Windows hem Android üzerinde çalışan yönetim paneli. |
| **Blazor WebAssembly** | Web Client | Tarayıcı tabanlı, hızlı ve interaktif müşteri menüsü. |
| **ASP.NET Core WebAPI** | Backend | Servis katmanı ve iş mantığı. |
| **MudBlazor** | UI Library | Material Design tabanlı modern bileşen kütüphanesi. |
| **Entity Framework Core** | ORM | Veritabanı erişimi ve modelleme. |

## 📂 Proje Yapısı

*   `XPos.WebAPI`: Veritabanı bağlantıları, API uç noktaları (Endpoints) ve servisler.
*   `XPos.Mobile`: İşletme sahibinin kullandığı Cross-Platform (Masaüstü/Mobil) uygulama.
*   `XPos.Client`: Müşterilerin QR kod ile eriştiği Web arayüzü.
*   `XPos.Shared`: Tüm projeler arasında paylaşılan Veri Modelleri (DTOs) ve Sabitler.

## ▶️ Kurulum ve Çalıştırma

Projeyi çalıştırmak için 3 ana bileşeni ayağa kaldırmanız gerekir:

1.  **API'yi Başlatın:**
    `XPos.WebAPI` dizininde terminali açın ve `dotnet run` komutunu çalıştırın.
    *(Varsayılan adres: http://localhost:5029)*

2.  **Web İstemciyi (Client) Başlatın:**
    `XPos.Client` dizininde `dotnet run` çalıştırın.
    *(Müşteriler bu arayüzü kullanır)*

3.  **Masaüstü Uygulamasını (Mobile/Desktop) Başlatın:**
    `XPos.Mobile` dizininde `dotnet run -f net9.0-windows10.0.19041.0` komutunu çalıştırın.
    *(Yönetim paneli buradan açılır)*

## 🔮 Gelecek Planları ve Yol Haritası

Projenin bir sonraki fazında aşağıdaki özelliklerin geliştirilmesi planlanmaktadır:

1.  **Yapay Zeka (AI) Destekli Dinamik Kampanya Önerisi**:
    *   Makine öğrenmesi (ML) algoritmaları kullanılarak, müşterinin geçmiş sipariş verileri ve genel trendler analiz edilecek.
    *   Sistemin, müşteriye özel anlık "Yanına bu iyi gider" veya "Sana özel %10 indirim" gibi dinamik teklifler sunması sağlanacak.
    
2.  **Gelişmiş AI Lezzet Sihirbazı**:
    *   Müşterinin damak tadı profilini daha detaylı analiz eden ve "Acı sever misin?", "Hafif mi olsun?" gibi sorularla kişiselleştirilmiş menü oluşturan bir modül.

3.  **UI/UX İyileştirmeleri**:
    *   Web arayüzünde daha akıcı animasyonlar (Motion Design).
    *   Mobil uygulamada Garsonlar için "Hızlı Sipariş" modu.

## 💳 Ödeme Sistemleri Entegrasyonu (Teknik Altyapı)

Bu projede ödeme şu an manuel olarak işaretlenmektedir. Ancak gerçek dünya senaryolarında sistem, fiziksel POS cihazlarıyla (ÖKC) aşağıdaki yöntemlerle entegre çalışabilecek altyapıya sahiptir:

*   **GMP3 / Kablolu Entegrasyon**: Kasa ile POS cihazı arasında kablolu bağlantı kurularak (RS232/USB), tutarın otomatik olarak POS ekranına gönderilmesi yöntemidir.
*   **Android POS (App-to-App)**: Yeni nesil Android POS cihazlarında çalışan bir uygulama olarak, ödeme tutarı "Intent" yöntemiyle doğrudan banka uygulamasına iletilir ve sonuç (Başarılı/Başarısız) geri alınır.
*   **SoftPOS / API**: NFC özellikli telefonların veya tabletlerin temassız ödeme terminali olarak kullanılması için Bulut API entegrasyonu.

---
*Geliştirici Notu: Proje sunumu için hazırlanmıştır.*
