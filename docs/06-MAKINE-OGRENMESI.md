# 06 — Makine Öğrenmesi

Sistemde üç ayrı ML modeli çalışır. Hepsi **Microsoft ML.NET** kütüphanesi ile implemente edilmiştir ve `ISalesForecaster`, `ICustomerSegmenter`, `IProductRecommender` interface'leri üzerinden bağımsız biçimde değiştirilebilir.

---

## 1. Satış Tahmini (Sales Forecasting)

### Kullanılan Teknoloji
- **Birincil (Production)**: `SimpleForecaster` — Hareketli Ortalama + Trend + Günlük Faktör
- **Alternatif**: `SsaSalesForecaster` — ML.NET SSA (Singular Spectrum Analysis)

### SimpleForecaster Nasıl Çalışır?

#### Adım 1: Günlük Satış Verisi Çekme
```
cffolyohar + cffolyo → grupla (tarihe göre) → günlük toplam satış
```

#### Adım 2: Hareketli Ortalama
Son **7 günün** günlük satış ortalaması ve standart sapması hesaplanır.

$$\bar{x} = \frac{1}{7}\sum_{i=n-6}^{n} x_i$$

#### Adım 3: Haftalık Trend
Satışların artış/azalış eğilimi:

$$\text{trend} = \frac{\text{son hafta ortalama} - \text{önceki hafta ortalama}}{\text{önceki hafta ortalama}}$$

#### Adım 4: Günlük Faktörler
Pazartesi–Pazar her gün için tarihsel ortalamadan sapma faktörü hesaplanır. Örneğin Cumartesi satışları hafta içinden %30 yüksekse `dayFactor[6] = 1.30`.

#### Adım 5: Tahmin Formülü

$$\hat{y}_{d} = \bar{x} \times \text{dayFactor}[d] \times (1 + \text{trend})$$

#### Adım 6: Güven Aralığı (±1.5σ)

$$\text{AltSınır} = \max(0,\ \hat{y} - 1.5\sigma)$$
$$\text{ÜstSınır} = \hat{y} + 1.5\sigma$$

**Güven seviyesi**: %90

---

### SsaSalesForecaster (Alternatif — ML.NET SSA)

**SSA (Singular Spectrum Analysis)**: Zaman serisi verisini döngüsel ve trend bileşenlerine ayıran ileri düzey algoritma.

```csharp
// SSA parametreleri
WindowSize = 7        // Haftalık periyot
SeriesLength = 365    // 1 yıllık eğitim verisi
TrainSize = 300       // Eğitim için kullanılan gün sayısı
Horizon = 7           // Tahmin ufku (gün)
ConfidenceLevel = 0.95f
```

SSA kullanmak için `Program.cs`'de şu satırı değiştirin:
```csharp
// Mevcut:
builder.Services.AddScoped<ISalesForecaster, SimpleForecaster>();

// SSA ile:
builder.Services.AddScoped<ISalesForecaster, SsaSalesForecaster>();
```

---

## 2. Müşteri Segmentasyonu (Customer Segmentation)

### Kullanılan Teknoloji
**K-Means Kümeleme** + **RFM Analizi** → ML.NET `KMeansTrainer`

### RFM Nedir?

| Boyut | Açıklama | Hesaplama |
|---|---|---|
| **R — Recency** (Yenilik) | Müşterinin en son ne zaman sipariş verdiği | `(bugün - son sipariş tarihi).TotalDays` |
| **F — Frequency** (Sıklık) | Kaç kez sipariş verdiği | `COUNT(folyo)` |
| **M — Monetary** (Parasal) | Toplam harcama | `SUM(folyo.tutari)` |

### Veri Kaynağı

```sql
SELECT 
  carikart_id,
  MAX(tarih) AS son_siparis,
  COUNT(*) AS siparis_sayisi,
  SUM(tutari) AS toplam_harcama
FROM cffolyo
WHERE carikart_id IS NOT NULL AND is_iptal = 0
GROUP BY carikart_id
```

### K-Means: 4 Segment

| Cluster | Segment Adı | R | F | M | Strateji |
|---|---|---|---|---|---|
| 0 | **En Değerli Müşteriler** | Düşük (yakın zamanda geldi) | Yüksek | Yüksek | Koru, VIP teklifleri sun |
| 1 | **Sadık Müşteriler** | Orta | Yüksek | Orta | Sadakat programı ile tut |
| 2 | **Potansiyel Müşteriler** | Yüksek (uzun süredir gelmedi) | Düşük | Düşük | Geri kazanma kampanyası |
| 3 | **Risk Altındaki Müşteriler** | Yüksek | Orta | Orta | Acil iletişim, indirim |

### ML Pipeline

```
[CustomerRfmData] → NormalizeMinMax → KMeansTrainer(k=4)
                              ↓
                    [CustomerClusterPrediction]
                    PredictedClusterId: 0-3
                    Distances: float[] (merkeze uzaklık)
```

### Segment Belirleme Mantığı

Model `PredictedClusterId` (0–3) döner. Bu ID, statik `SegmentNames` sözlüğü ile isimlendirilir. Ancak K-Means küme numaraları stabil olmadığı için, her eğitimden sonra RFM değerlerine bakılarak kümenin hangi segment olduğu dinamik olarak belirlenir:

```csharp
// Kümenin gerçek adını belirle
private string GetSegmentName(int clusterId, CustomerRfmData customer)
{
    if (customer.Recency < 30 && customer.Frequency > 10)
        return "En Değerli Müşteriler";
    if (customer.Frequency > 5)
        return "Sadık Müşteriler";
    if (customer.Recency > 90)
        return "Risk Altındaki Müşteriler";
    return "Potansiyel Müşteriler";
}
```

---

## 3. Ürün Öneri Sistemi (Product Recommendation)

### Kullanılan Teknoloji
**Matrix Factorization** → ML.NET `MatrixFactorizationTrainer`

### İki Tür Öneri

#### A) Kişiselleştirilmiş Öneri (`/api/recommendations/customer/{id}`)

**"Bu müşteriye ne önerelim?"**

1. Müşterinin geçmişte satın aldığı ürünler tespit edilir
2. Matrix Factorization modeli, almadığı tüm ürünler için bir skor üretir
3. En yüksek skorlu Top-N ürün önerilir

```
Müşteri × Ürün matrisini eğit
              ↓
    Müşteri vektörü × Ürün vektörü → Tahmin Skoru
              ↓
    Yüksek skor = Müşteri bu ürünü beğenecek
```

#### B) İlişkili Ürün Önerisi (`/api/recommendations/product/{id}`)

**"Bu ürünü alanlar ne aldı?"** (Market Basket Analysis benzeri)

1. Bu ürünü içeren tüm siparişler (folyo_id'ler) bulunur
2. Bu siparişlerdeki diğer ürünler sayılır
3. En çok birlikte satın alınan Top-N ürün döner

```sql
-- Kavramsal sorgu
SELECT stokkart_id, COUNT(*) as birlikte_sayi
FROM cffolyohar
WHERE folyo_id IN (
  SELECT DISTINCT folyo_id FROM cffolyohar WHERE stokkart_id = :urun_id
)
AND stokkart_id != :urun_id
GROUP BY stokkart_id
ORDER BY birlikte_sayi DESC
LIMIT 5
```

### Matrix Factorization Pipeline

```
[ProductEntry (CustomerId, ProductId)] → 
  MapValueToKey(CustomerId, ProductId) → 
  MatrixFactorizationTrainer(
    LabelColumnName: "Label",
    MatrixColumnIndexColumnName: "ProductId",
    MatrixRowIndexColumnName: "CustomerId"
  )
→ [ProductPrediction (Score)]
```

---

## Model Eğitim Stratejisi

### Lazy Training (Tembel Eğitim)

Modeller ilk istek geldiğinde eğitilir, sonraki isteklerde önbellekteki model kullanılır:

```csharp
private async Task EnsureModelTrainedAsync()
{
    if (_predictionEngine == null)   // Model yoksa
    {
        await TrainModelAsync();     // Eğit
    }
    // Sonraki isteklerde tekrar eğitmez
}
```

### Yeniden Eğitim

Modeli yeniden eğitmek için:
```
POST /api/forecast/retrain
POST /api/recommendations/retrain
```

Ya da Hangfire ile periyodik olarak (günlük, haftalık) zamanlanabilir.

---

## Minimum Veri Gereksinimleri

| Model | Minimum Veri | Aksi Halde |
|---|---|---|
| SimpleForecaster | 7 günlük satış | Boş liste döner |
| SsaSalesForecaster | 30 günlük satış | Boş liste döner |
| KMeansCustomerSegmenter | En az 4 kayıtlı müşteri | Boş liste döner |
| MatrixFactorizationRecommender | En az 10 müşteri–ürün etkileşimi | Boş liste döner |

---

## ML.NET Versiyon Notu

Projede **ML.NET 5.0** kullanılmaktadır. `Microsoft.ML.Recommender` paketi (v0.23.0) Matrix Factorization için ek platform bağımlılığı gerektirebilir. Sorun yaşanırsa:

```bash
# Linux için MKL kurulumu
sudo apt-get install -y libgomp1
```
