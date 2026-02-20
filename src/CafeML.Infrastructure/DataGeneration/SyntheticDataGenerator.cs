using Bogus;
using CafeML.Core.Entities;

namespace CafeML.Infrastructure.DataGeneration;

/// <summary>
/// Bogus kütüphanesi ile gerçekçi sentetik veri üretici
/// İş kurallarına uygun ağırlıklı rastgelelik kullanır
/// </summary>
public class SyntheticDataGenerator
{
    private readonly Faker _faker;
    private readonly Random _random;

    // Türkçe ürün isimleri
    private static readonly string[] Yiyecekler = new[]
    {
        "Hamburger", "Cheeseburger", "Köfte", "Tavuk Şiş", "Adana Kebap",
        "Lahmacun", "Pide", "Pizza", "Makarna", "Salata",
        "Çorba", "Tost", "Sandviç", "Döner", "İskender",
        "Tantuni", "Kokoreç", "Midye Tava", "Balık", "Kanat"
    };

    private static readonly string[] Icecekler = new[]
    {
        "Kola", "Fanta", "Sprite", "Ayran", "Şalgam",
        "Çay", "Türk Kahvesi", "Americano", "Latte", "Cappuccino",
        "Meyve Suyu", "Limonata", "Su", "Soda", "Bira"
    };

    private static readonly string[] Tatlilar = new[]
    {
        "Künefe", "Baklava", "Sütlaç", "Kazandibi", "Profiterol",
        "Tiramisu", "Cheesecake", "Brownie", "Dondurma", "Waffle"
    };

    public SyntheticDataGenerator(int seed = 12345)
    {
        _random = new Random(seed);
        _faker = new Faker("tr");
    }

    /// <summary>
    /// Salon verileri üretir
    /// </summary>
    public List<Salon> GenerateSalonlar(int count = 3)
    {
        var salonlar = new List<Salon>();
        var salonAdlari = new[] { "Bahçe", "İç Mekan", "Teras", "VIP", "Sigara İçilen" };

        for (int i = 0; i < Math.Min(count, salonAdlari.Length); i++)
        {
            salonlar.Add(new Salon
            {
                Id = i + 1,
                SubeId = 1,
                Kodu = $"S{i + 1:D2}",
                Baslik = salonAdlari[i],
                SortOrder = i + 1,
                Enabled = true,
                CompanyId = 1
            });
        }

        return salonlar;
    }

    /// <summary>
    /// Masa verileri üretir
    /// </summary>
    public List<Masa> GenerateMasalar(List<Salon> salonlar, int masaPerSalon = 8)
    {
        var masalar = new List<Masa>();
        int masaId = 1;

        foreach (var salon in salonlar)
        {
            for (int i = 1; i <= masaPerSalon; i++)
            {
                masalar.Add(new Masa
                {
                    Id = masaId,
                    SubeId = 1,
                    SalonId = salon.Id,
                    Kodu = $"M{masaId:D3}",
                    Baslik = $"Masa {i}",
                    SortOrder = i,
                    Enabled = true,
                    CompanyId = 1,
                    QrKod = $"QR-{salon.Kodu}-{i:D2}"
                });
                masaId++;
            }
        }

        return masalar;
    }

    /// <summary>
    /// Ürün (StokKart) verileri üretir
    /// </summary>
    public List<StokKart> GenerateStokKartlar()
    {
        var stokKartlar = new List<StokKart>();
        int id = 1;

        // Yiyecekler
        foreach (var yiyecek in Yiyecekler)
        {
            stokKartlar.Add(new StokKart
            {
                Id = id++,
                Kodu = $"YYC{id - 1:D3}",
                Baslik = yiyecek,
                KartTipi = "ürün",
                Birim = "Adet",
                KdvOrani = 10,
                BFSatis1 = _random.Next(50, 200),
                OzelKod1 = "Yiyecek",
                Enabled = true
            });
        }

        // İçecekler
        foreach (var icecek in Icecekler)
        {
            stokKartlar.Add(new StokKart
            {
                Id = id++,
                Kodu = $"ICC{id - 1:D3}",
                Baslik = icecek,
                KartTipi = "ürün",
                Birim = "Adet",
                KdvOrani = 10,
                BFSatis1 = _random.Next(15, 60),
                OzelKod1 = "İçecek",
                Enabled = true
            });
        }

        // Tatlılar
        foreach (var tatli in Tatlilar)
        {
            stokKartlar.Add(new StokKart
            {
                Id = id++,
                Kodu = $"TTL{id - 1:D3}",
                Baslik = tatli,
                KartTipi = "ürün",
                Birim = "Adet",
                KdvOrani = 10,
                BFSatis1 = _random.Next(40, 120),
                OzelKod1 = "Tatlı",
                Enabled = true
            });
        }

        return stokKartlar;
    }

    /// <summary>
    /// Müşteri (CariKart) verileri üretir
    /// </summary>
    public List<CariKart> GenerateCariKartlar(int count = 500)
    {
        var musteriListesi = new List<CariKart>();

        for (int i = 1; i <= count; i++)
        {
            var ad = _faker.Name.FirstName();
            var soyad = _faker.Name.LastName();

            musteriListesi.Add(new CariKart
            {
                Id = i,
                Kodu = $"M{i:D5}",
                Ad = ad,
                Soyad = soyad,
                Unvan = $"{ad} {soyad}",
                Telefon = _faker.Phone.PhoneNumber("05## ### ## ##"),
                Email = _faker.Internet.Email(ad, soyad, "gmail.com"),
                Adres = _faker.Address.FullAddress(),
                CreatedAt = DateTime.UtcNow.AddDays(-_random.Next(1, 365)),
                Enabled = true
            });
        }

        return musteriListesi;
    }

    /// <summary>
    /// Sipariş (Folyo ve FolyoHar) verileri üretir
    /// Hafta sonu + akşam saatlerine ağırlık verir
    /// </summary>
    public (List<Folyo> Folyolar, List<FolyoHar> FolyoHarlar) GenerateSiparisler(
        List<Masa> masalar,
        List<StokKart> stokKartlar,
        List<CariKart> cariKartlar,
        int folyoCount = 10000)
    {
        var folyolar = new List<Folyo>();
        var folyoHarlar = new List<FolyoHar>();

        // Popüler ürünleri belirle (daha sık sipariş edilecek)
        var populerYiyecekler = stokKartlar.Where(s => s.OzelKod1 == "Yiyecek").Take(10).ToList();
        var populerIcecekler = stokKartlar.Where(s => s.OzelKod1 == "İçecek").Take(8).ToList();
        var populerTatlilar = stokKartlar.Where(s => s.OzelKod1 == "Tatlı").Take(5).ToList();

        int harId = 1;

        for (int i = 1; i <= folyoCount; i++)
        {
            // Tarih üretimi - son 1 yıl
            var tarih = GenerateWeightedDate();

            // Masa seçimi
            var masa = masalar[_random.Next(masalar.Count)];

            // Müşteri ataması (%60 kayıtlı müşteri)
            int? cariKartId = null;
            if (_random.NextDouble() < 0.6)
            {
                cariKartId = cariKartlar[_random.Next(cariKartlar.Count)].Id;
            }

            var folyo = new Folyo
            {
                Id = i,
                MasaId = masa.Id,
                CariKartId = cariKartId,
                Tarih = tarih,
                FolyoTipi = "STD",
                BelgeSira = i,
                IsHesapKapali = 1,
                IsKapali = 1,
                IsIptal = 0,
                CreatedAt = tarih,
                UpdatedAt = tarih,
                Guid = Guid.NewGuid()
            };

            // Sipariş satırları üret (1-5 arası ürün)
            var itemCount = GetWeightedItemCount();
            decimal toplamTutar = 0;

            for (int j = 0; j < itemCount; j++)
            {
                var urun = GetWeightedProduct(populerYiyecekler, populerIcecekler, populerTatlilar, j);
                var miktar = j == 0 ? 1 : (_random.NextDouble() < 0.7 ? 1 : 2);
                var fiyat = urun.BFSatis1;
                var tutar = fiyat * (decimal)miktar;

                folyoHarlar.Add(new FolyoHar
                {
                    Id = harId++,
                    FolyoId = folyo.Id,
                    StokKartId = urun.Id,
                    IslemNo = (short)(j + 1),
                    Miktar = (decimal)miktar,
                    BFiyat = fiyat,
                    KdvOrani = urun.KdvOrani,
                    KdvTutari = tutar * urun.KdvOrani / 100,
                    Tutari = tutar,
                    SatirNet = tutar,
                    Pb = "TRY",
                    IsIkram = 0,
                    IsKapali = 1,
                    IsIptal = 0,
                    CreatedAt = tarih,
                    UpdatedAt = tarih,
                    Guid = Guid.NewGuid()
                });

                toplamTutar += tutar;
            }

            folyo.Tutari = toplamTutar;
            folyo.Odenen = toplamTutar;
            folyolar.Add(folyo);
        }

        return (folyolar, folyoHarlar);
    }

    /// <summary>
    /// Ağırlıklı tarih üretir - Hafta sonu ve akşam saatlerine öncelik
    /// </summary>
    private DateTime GenerateWeightedDate()
    {
        var baseDate = DateTime.UtcNow.AddDays(-_random.Next(1, 365));

        // Hafta sonu ağırlığı (%60)
        if (_random.NextDouble() < 0.4 && baseDate.DayOfWeek != DayOfWeek.Saturday && baseDate.DayOfWeek != DayOfWeek.Sunday)
        {
            // Hafta sonuna taşı
            int daysUntilSaturday = ((int)DayOfWeek.Saturday - (int)baseDate.DayOfWeek + 7) % 7;
            baseDate = baseDate.AddDays(daysUntilSaturday);
        }

        // Saat ağırlıkları
        int hour;
        var hourRoll = _random.NextDouble();

        if (hourRoll < 0.25)
        {
            // Öğle (12:00-14:00) - %25
            hour = _random.Next(12, 15);
        }
        else if (hourRoll < 0.85)
        {
            // Akşam (19:00-22:00) - %60
            hour = _random.Next(19, 23);
        }
        else
        {
            // Diğer saatler - %15
            hour = _random.Next(10, 24);
        }

        return baseDate.Date.AddHours(hour).AddMinutes(_random.Next(0, 60));
    }

    /// <summary>
    /// Ağırlıklı ürün sayısı - çoğu sipariş 2-3 ürün
    /// </summary>
    private int GetWeightedItemCount()
    {
        var roll = _random.NextDouble();
        if (roll < 0.15) return 1;       // %15 tek ürün
        if (roll < 0.50) return 2;       // %35 iki ürün
        if (roll < 0.80) return 3;       // %30 üç ürün
        if (roll < 0.95) return 4;       // %15 dört ürün
        return 5;                        // %5 beş ürün
    }

    /// <summary>
    /// Ağırlıklı ürün seçimi - İlk ürün yiyecek, sonra içecek/tatlı
    /// </summary>
    private StokKart GetWeightedProduct(
        List<StokKart> yiyecekler,
        List<StokKart> icecekler,
        List<StokKart> tatlilar,
        int itemIndex)
    {
        if (itemIndex == 0)
        {
            // İlk ürün genelde yiyecek (%90)
            if (_random.NextDouble() < 0.9)
                return yiyecekler[_random.Next(yiyecekler.Count)];
        }
        else if (itemIndex == 1)
        {
            // İkinci ürün genelde içecek (%80)
            if (_random.NextDouble() < 0.8)
                return icecekler[_random.Next(icecekler.Count)];
        }
        else
        {
            // Sonraki ürünler tatlı olabilir (%40)
            if (_random.NextDouble() < 0.4)
                return tatlilar[_random.Next(tatlilar.Count)];
        }

        // Varsayılan: rastgele kategori
        var allProducts = yiyecekler.Concat(icecekler).Concat(tatlilar).ToList();
        return allProducts[_random.Next(allProducts.Count)];
    }

    /// <summary>
    /// Tüm verileri tek seferde üretir
    /// </summary>
    public SyntheticDataSet GenerateAll(
        int salonCount = 3,
        int masaPerSalon = 8,
        int musteriCount = 500,
        int siparisCount = 10000)
    {
        var salonlar = GenerateSalonlar(salonCount);
        var masalar = GenerateMasalar(salonlar, masaPerSalon);
        var stokKartlar = GenerateStokKartlar();
        var cariKartlar = GenerateCariKartlar(musteriCount);
        var (folyolar, folyoHarlar) = GenerateSiparisler(masalar, stokKartlar, cariKartlar, siparisCount);

        return new SyntheticDataSet
        {
            Salonlar = salonlar,
            Masalar = masalar,
            StokKartlar = stokKartlar,
            CariKartlar = cariKartlar,
            Folyolar = folyolar,
            FolyoHarlar = folyoHarlar
        };
    }
}

/// <summary>
/// Üretilen tüm sentetik verileri içeren konteyner
/// </summary>
public class SyntheticDataSet
{
    public List<Salon> Salonlar { get; set; } = new();
    public List<Masa> Masalar { get; set; } = new();
    public List<StokKart> StokKartlar { get; set; } = new();
    public List<CariKart> CariKartlar { get; set; } = new();
    public List<Folyo> Folyolar { get; set; } = new();
    public List<FolyoHar> FolyoHarlar { get; set; } = new();

    public void PrintSummary()
    {
        Console.WriteLine("=== Sentetik Veri Özeti ===");
        Console.WriteLine($"Salonlar: {Salonlar.Count}");
        Console.WriteLine($"Masalar: {Masalar.Count}");
        Console.WriteLine($"Ürünler: {StokKartlar.Count}");
        Console.WriteLine($"Müşteriler: {CariKartlar.Count}");
        Console.WriteLine($"Siparişler: {Folyolar.Count}");
        Console.WriteLine($"Sipariş Satırları: {FolyoHarlar.Count}");
        Console.WriteLine($"Toplam Ciro: {Folyolar.Sum(f => f.Tutari):C}");
    }
}
