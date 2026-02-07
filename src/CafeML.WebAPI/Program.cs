using CafeML.Core.Interfaces;
using CafeML.Infrastructure.Data;
using CafeML.Infrastructure.DataGeneration;
using CafeML.Infrastructure.MachineLearning;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var useInMemory = string.IsNullOrEmpty(connectionString) || 
                  builder.Configuration.GetValue<bool>("UseInMemoryDatabase", false) ||
                  Environment.GetEnvironmentVariable("USE_INMEMORY") == "true";

if (useInMemory)
{
    Console.WriteLine("📦 In-Memory Database kullanılıyor");
    builder.Services.AddDbContext<CafeDbContext>(options =>
        options.UseInMemoryDatabase("CafeMLDb"));
}
else
{
    Console.WriteLine("🐘 PostgreSQL Database kullanılıyor");
    builder.Services.AddDbContext<CafeDbContext>(options =>
        options.UseNpgsql(connectionString));
}

// Services
builder.Services.AddTransient<SyntheticDataGenerator>();
builder.Services.AddScoped<ISalesForecaster, SimpleForecaster>();
builder.Services.AddScoped<ICustomerSegmenter, KMeansCustomerSegmenter>();
builder.Services.AddScoped<IProductRecommender, MatrixFactorizationRecommender>();

// CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.MapControllers();

// ========== ADMIN ENDPOINTS ==========

app.MapPost("/api/seed", async (CafeDbContext db, SyntheticDataGenerator generator) =>
{
    if (await db.Salonlar.AnyAsync())
        return Results.BadRequest(new { Error = "Veritabanı zaten dolu. Önce /api/reset çağırın." });

    var stopwatch = System.Diagnostics.Stopwatch.StartNew();
    var data = generator.GenerateAll(salonCount: 3, masaPerSalon: 8, musteriCount: 500, siparisCount: 10000);

    await db.Salonlar.AddRangeAsync(data.Salonlar);
    await db.Masalar.AddRangeAsync(data.Masalar);
    await db.StokKartlar.AddRangeAsync(data.StokKartlar);
    await db.CariKartlar.AddRangeAsync(data.CariKartlar);
    await db.Folyolar.AddRangeAsync(data.Folyolar);
    await db.FolyoHarlar.AddRangeAsync(data.FolyoHarlar);
    await db.SaveChangesAsync();
    stopwatch.Stop();

    return Results.Ok(new
    {
        Message = "Sentetik veri oluşturuldu!",
        Sure = $"{stopwatch.ElapsedMilliseconds}ms",
        Salonlar = data.Salonlar.Count,
        Masalar = data.Masalar.Count,
        Urunler = data.StokKartlar.Count,
        Musteriler = data.CariKartlar.Count,
        Siparisler = data.Folyolar.Count,
        SiparisSatirlari = data.FolyoHarlar.Count,
        ToplamCiro = data.Folyolar.Sum(f => f.Tutari)
    });
});

app.MapDelete("/api/reset", async (CafeDbContext db) =>
{
    db.FolyoHarlar.RemoveRange(db.FolyoHarlar);
    db.Folyolar.RemoveRange(db.Folyolar);
    db.CariKartlar.RemoveRange(db.CariKartlar);
    db.StokKartlar.RemoveRange(db.StokKartlar);
    db.Masalar.RemoveRange(db.Masalar);
    db.Salonlar.RemoveRange(db.Salonlar);
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Veritabanı temizlendi!" });
});

// ========== DASHBOARD ENDPOINTS ==========

app.MapGet("/api/dashboard", async (CafeDbContext db) =>
{
    var toplamSiparis = await db.Folyolar.CountAsync();
    if (toplamSiparis == 0)
        return Results.Ok(new { Message = "Veri yok. POST /api/seed çağırın.", ToplamSiparis = 0 });

    var bugun = DateTime.UtcNow.Date;
    var buHafta = bugun.AddDays(-(int)bugun.DayOfWeek);
    var buAy = new DateTime(bugun.Year, bugun.Month, 1);

    return Results.Ok(new
    {
        ToplamSiparis = toplamSiparis,
        ToplamMusteri = await db.CariKartlar.CountAsync(),
        ToplamUrun = await db.StokKartlar.CountAsync(),
        ToplamCiro = await db.Folyolar.SumAsync(f => f.Tutari),
        BugunSiparis = await db.Folyolar.CountAsync(f => f.Tarih >= bugun),
        BuHaftaSiparis = await db.Folyolar.CountAsync(f => f.Tarih >= buHafta),
        BuAySiparis = await db.Folyolar.CountAsync(f => f.Tarih >= buAy),
        OrtalamaSepet = await db.Folyolar.AverageAsync(f => (double?)f.Tutari) ?? 0
    });
});

app.MapGet("/api/products", async (CafeDbContext db) =>
{
    var products = await db.StokKartlar
        .Where(s => s.Enabled == true)
        .Select(s => new { s.Id, s.Kodu, s.Baslik, Kategori = s.OzelKod1, Fiyat = s.BFSatis1 })
        .ToListAsync();
    return Results.Ok(products);
});

app.MapGet("/api/sales/daily", async (CafeDbContext db) =>
{
    var dailySales = await db.Folyolar
        .Where(f => f.IsIptal == 0)
        .GroupBy(f => f.Tarih!.Value.Date)
        .Select(g => new { Tarih = g.Key, ToplamSatis = g.Sum(f => f.Tutari), SiparisSayisi = g.Count() })
        .OrderBy(x => x.Tarih)
        .ToListAsync();
    return Results.Ok(dailySales);
});

// ========== ML FORECAST ENDPOINTS ==========

app.MapGet("/api/forecast/sales", async (ISalesForecaster forecaster, int? days) =>
{
    try
    {
        var horizon = days ?? 7;
        var forecasts = await forecaster.ForecastAsync(horizon);
        
        if (!forecasts.Any())
            return Results.BadRequest(new { Error = "Tahmin yapılamadı. Yeterli veri yok." });

        return Results.Ok(new
        {
            Message = $"{horizon} günlük satış tahmini",
            Tahminler = forecasts.Select(f => new
            {
                Tarih = f.Date.ToString("yyyy-MM-dd"),
                TahminedilenSatis = Math.Round(f.PredictedAmount, 2),
                AltSinir = Math.Round(f.LowerBound, 2),
                UstSinir = Math.Round(f.UpperBound, 2),
                GuvenSeviyesi = $"{f.Confidence * 100}%"
            })
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Tahmin hatası: {ex.Message}");
    }
});

app.MapGet("/api/forecast/product/{productId}", async (ISalesForecaster forecaster, int productId, int? days) =>
{
    try
    {
        var horizon = days ?? 7;
        var forecasts = await forecaster.ForecastProductAsync(productId, horizon);
        
        if (!forecasts.Any())
            return Results.BadRequest(new { Error = "Ürün için yeterli veri yok." });

        return Results.Ok(new
        {
            UrunId = productId,
            Message = $"{horizon} günlük talep tahmini",
            Tahminler = forecasts.Select(f => new
            {
                Tarih = f.Date.ToString("yyyy-MM-dd"),
                TahminedilenMiktar = Math.Round(f.PredictedAmount, 2),
                AltSinir = Math.Round(f.LowerBound, 2),
                UstSinir = Math.Round(f.UpperBound, 2)
            })
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Tahmin hatası: {ex.Message}");
    }
});

app.MapPost("/api/forecast/retrain", async (ISalesForecaster forecaster) =>
{
    try
    {
        await forecaster.RetrainModelAsync();
        return Results.Ok(new { Message = "Model yeniden eğitildi!" });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Eğitim hatası: {ex.Message}");
    }
});

// ========== SEGMENTATION ENDPOINTS ==========

app.MapGet("/api/segments", async (ICustomerSegmenter segmenter) =>
{
    try
    {
        var segments = await segmenter.SegmentCustomersAsync();
        var segmentList = segments.ToList();
        
        // Segment bazlı özet
        var summary = segmentList
            .GroupBy(s => s.SegmentName)
            .Select(g => new
            {
                Segment = g.Key,
                MusteriSayisi = g.Count(),
                OrtRecency = Math.Round(g.Average(x => x.Recency), 1),
                OrtFrequency = Math.Round(g.Average(x => x.Frequency), 1),
                OrtMonetary = Math.Round(g.Average(x => (double)x.Monetary), 2),
                ToplamCiro = Math.Round(g.Sum(x => (double)x.Monetary), 2)
            })
            .OrderByDescending(x => x.ToplamCiro);

        return Results.Ok(new
        {
            ToplamMusteri = segmentList.Count,
            SegmentOzeti = summary
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Segmentasyon hatası: {ex.Message}");
    }
});

app.MapGet("/api/segments/{customerId}", async (ICustomerSegmenter segmenter, int customerId) =>
{
    try
    {
        var segment = await segmenter.GetCustomerSegmentAsync(customerId);
        return Results.Ok(new
        {
            MusteriId = segment.CustomerId,
            Segment = segment.SegmentName,
            RFM = new
            {
                Recency = Math.Round(segment.Recency, 1),
                Frequency = Math.Round(segment.Frequency, 1),
                Monetary = Math.Round((double)segment.Monetary, 2)
            }
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Segment sorgulama hatası: {ex.Message}");
    }
});

app.MapGet("/api/segments/customers", async (ICustomerSegmenter segmenter, string? segment, int? limit) =>
{
    try
    {
        var segments = await segmenter.SegmentCustomersAsync();
        var query = segments.AsQueryable();
        
        if (!string.IsNullOrEmpty(segment))
            query = query.Where(s => s.SegmentName.Contains(segment, StringComparison.OrdinalIgnoreCase));
        
        var result = query
            .Take(limit ?? 50)
            .Select(s => new
            {
                s.CustomerId,
                s.SegmentName,
                s.Recency,
                s.Frequency,
                Monetary = Math.Round((double)s.Monetary, 2)
            });

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Müşteri listesi hatası: {ex.Message}");
    }
});

// ========== RECOMMENDATION ENDPOINTS ==========

app.MapGet("/api/recommendations/customer/{customerId}", async (IProductRecommender recommender, int customerId, int? top) =>
{
    try
    {
        var recommendations = await recommender.RecommendForCustomerAsync(customerId, top ?? 5);
        
        if (!recommendations.Any())
            return Results.Ok(new { MusteriId = customerId, Message = "Öneri bulunamadı.", Oneriler = Array.Empty<object>() });

        return Results.Ok(new
        {
            MusteriId = customerId,
            Oneriler = recommendations.Select(r => new
            {
                UrunId = r.ProductId,
                UrunAdi = r.ProductName,
                Skor = Math.Round(r.Score * 100, 1)
            })
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Öneri hatası: {ex.Message}");
    }
});

app.MapGet("/api/recommendations/product/{productId}", async (IProductRecommender recommender, int productId, int? top) =>
{
    try
    {
        var related = await recommender.GetRelatedProductsAsync(productId, top ?? 5);
        
        if (!related.Any())
            return Results.Ok(new { UrunId = productId, Message = "İlişkili ürün bulunamadı.", IliskiliUrunler = Array.Empty<object>() });

        return Results.Ok(new
        {
            UrunId = productId,
            Baslik = "Bunu Alanlar Bunları da Aldı",
            IliskiliUrunler = related.Select(r => new
            {
                UrunId = r.ProductId,
                UrunAdi = r.ProductName,
                Skor = Math.Round(r.Score * 100, 1)
            })
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"İlişkili ürün hatası: {ex.Message}");
    }
});

Console.WriteLine("🚀 CafeML API başlatılıyor...");
Console.WriteLine("🤖 ML Servisleri: Satış Tahmini + Segmentasyon + Öneri Sistemi");
app.Run();
