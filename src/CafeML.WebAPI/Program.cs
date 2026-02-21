using CafeML.Core.Entities;
using CafeML.Core.Interfaces;
using CafeML.Infrastructure.Data;
using CafeML.Infrastructure.DataGeneration;
using CafeML.Infrastructure.MachineLearning;
using CafeML.WebAPI.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

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
    Console.WriteLine("[INFO] In-Memory Database kullanılıyor");
    builder.Services.AddDbContext<CafeDbContext>(options =>
        options.UseInMemoryDatabase("CafeMLDb"));
}
else
{
    Console.WriteLine("[INFO] PostgreSQL Database kullanılıyor");
    builder.Services.AddDbContext<CafeDbContext>(options =>
        options.UseNpgsql(connectionString));
}

// Services
builder.Services.AddTransient<SyntheticDataGenerator>();
builder.Services.AddScoped<ISalesForecaster, SimpleForecaster>();
builder.Services.AddScoped<ICustomerSegmenter, KMeansCustomerSegmenter>();
builder.Services.AddScoped<IProductRecommender, MatrixFactorizationRecommender>();
builder.Services.AddSingleton<IAprioriRecommender, AprioriRecommender>();

// CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "CafeML-Super-Secret-Key-2024-Do-Not-Share!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CafeML";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<OrderHub>("/hubs/orders");

// ========== STARTUP: KULLANICI SEED ==========
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CafeDbContext>();
    db.Database.EnsureCreated();
    if (!db.Users.Any())
    {
        db.Users.AddRange(
            new User { Kullanici = "admin",   SifreHash = BCrypt.Net.BCrypt.HashPassword("admin123"),  Ad = "Sirac",  Soyad = "Yönetici", Rol = "Admin" },
            new User { Kullanici = "ortak1",  SifreHash = BCrypt.Net.BCrypt.HashPassword("ortak123"),  Ad = "Erdem",  Soyad = "Ortak",    Rol = "SubAdmin", OlusturanId = 1 },
            new User { Kullanici = "garson1", SifreHash = BCrypt.Net.BCrypt.HashPassword("garson123"), Ad = "Mehmet", Soyad = "Demir",    Rol = "Garson",   OlusturanId = 1 },
            new User { Kullanici = "garson2", SifreHash = BCrypt.Net.BCrypt.HashPassword("garson123"), Ad = "Ayşe",   Soyad = "Kaya",     Rol = "Garson",   OlusturanId = 2 }
        );
        db.SaveChanges();
        Console.WriteLine("[OK] Varsayılan kullanıcılar oluşturuldu (admin/admin123)");
    }
}

// ========== AUTH ENDPOINTS ==========

app.MapPost("/api/auth/login", async (CafeDbContext db, HttpContext ctx) =>
{
    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);
    var kullanici = json.RootElement.GetProperty("kullanici").GetString() ?? "";
    var sifre = json.RootElement.GetProperty("sifre").GetString() ?? "";

    var user = await db.Users.FirstOrDefaultAsync(u => u.Kullanici == kullanici && u.Enabled);
    if (user == null || !BCrypt.Net.BCrypt.Verify(sifre, user.SifreHash))
        return Results.Unauthorized();

    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Kullanici),
        new Claim(ClaimTypes.GivenName, $"{user.Ad} {user.Soyad}"),
        new Claim(ClaimTypes.Role, user.Rol)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        issuer: jwtIssuer,
        claims: claims,
        expires: DateTime.UtcNow.AddHours(12),
        signingCredentials: creds
    );

    return Results.Ok(new
    {
        Token = new JwtSecurityTokenHandler().WriteToken(token),
        User = new { user.Id, user.Kullanici, user.Ad, user.Soyad, user.Rol }
    });
});

app.MapGet("/api/auth/me", async (CafeDbContext db, HttpContext ctx) =>
{
    var userId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId == null) return Results.Unauthorized();
    
    var user = await db.Users.FindAsync(int.Parse(userId));
    if (user == null) return Results.NotFound();
    
    return Results.Ok(new { user.Id, user.Kullanici, user.Ad, user.Soyad, user.Rol });
}).RequireAuthorization();

// ========== KULLANICI YÖNETİMİ ==========

// Tüm kullanıcıları listele (Admin/SubAdmin)
app.MapGet("/api/kullanicilar", async (CafeDbContext db, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin")
        return Results.Forbid();

    var users = await db.Users
        .OrderBy(u => u.Rol == "Admin" ? 0 : u.Rol == "SubAdmin" ? 1 : 2)
        .ThenBy(u => u.Ad)
        .Select(u => new { u.Id, u.Kullanici, u.Ad, u.Soyad, u.Rol, u.Enabled, u.OlusturanId, u.CreatedAt })
        .ToListAsync();
    return Results.Ok(users);
}).RequireAuthorization();

// Yeni kullanıcı oluştur
app.MapPost("/api/kullanicilar", async (CafeDbContext db, HttpContext ctx) =>
{
    var callerRol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    var callerId = int.Parse(ctx.User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    
    if (callerRol != "Admin" && callerRol != "SubAdmin")
        return Results.Forbid();

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);
    
    var kullanici = json.RootElement.GetProperty("kullanici").GetString() ?? "";
    var sifre = json.RootElement.GetProperty("sifre").GetString() ?? "";
    var ad = json.RootElement.GetProperty("ad").GetString() ?? "";
    var soyad = json.RootElement.GetProperty("soyad").GetString() ?? "";
    var yeniRol = json.RootElement.GetProperty("rol").GetString() ?? "Garson";

    // SubAdmin sadece Garson oluşturabilir
    if ((callerRol == "SubAdmin") && yeniRol != "Garson")
        return Results.BadRequest(new { Message = "SubAdmin sadece Garson hesabı oluşturabilir" });
    
    // Admin ise SubAdmin veya Garson oluşturabilir (başka Admin oluşturamaz)
    if (callerRol == "Admin" && yeniRol == "Admin")
        return Results.BadRequest(new { Message = "Yeni Admin hesabı oluşturulamaz" });

    // Kullanıcı adı benzersiz mi?
    if (await db.Users.AnyAsync(u => u.Kullanici == kullanici))
        return Results.BadRequest(new { Message = "Bu kullanıcı adı zaten kullanılıyor" });

    var user = new User
    {
        Kullanici = kullanici,
        SifreHash = BCrypt.Net.BCrypt.HashPassword(sifre),
        Ad = ad,
        Soyad = soyad,
        Rol = yeniRol,
        OlusturanId = callerId,
        Enabled = true
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Kullanıcı oluşturuldu", user.Id, user.Kullanici, user.Rol });
}).RequireAuthorization();

// Kullanıcı güncelle
app.MapPut("/api/kullanicilar/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var callerRol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    var callerId = int.Parse(ctx.User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    
    if (callerRol != "Admin" && callerRol != "SubAdmin")
        return Results.Forbid();

    var user = await db.Users.FindAsync(id);
    if (user == null) return Results.NotFound();

    // SubAdmin, Admin'i düzenleyemez
    if ((callerRol == "SubAdmin") && user.Rol == "Admin")
        return Results.BadRequest(new { Message = "Admin hesabını düzenleyemezsiniz" });

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);
    
    if (json.RootElement.TryGetProperty("ad", out var adProp)) user.Ad = adProp.GetString() ?? user.Ad;
    if (json.RootElement.TryGetProperty("soyad", out var soyadProp)) user.Soyad = soyadProp.GetString() ?? user.Soyad;
    if (json.RootElement.TryGetProperty("enabled", out var enabledProp)) user.Enabled = enabledProp.GetBoolean();
    if (json.RootElement.TryGetProperty("sifre", out var sifreProp))
    {
        var yeniSifre = sifreProp.GetString();
        if (!string.IsNullOrEmpty(yeniSifre))
            user.SifreHash = BCrypt.Net.BCrypt.HashPassword(yeniSifre);
    }
    user.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Kullanıcı güncellendi" });
}).RequireAuthorization();

// Kullanıcı sil
app.MapDelete("/api/kullanicilar/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var callerRol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    
    if (callerRol != "Admin" && callerRol != "SubAdmin")
        return Results.Forbid();

    var user = await db.Users.FindAsync(id);
    if (user == null) return Results.NotFound();

    // SubAdmin, Admin'i silemez
    if ((callerRol == "SubAdmin") && user.Rol == "Admin")
        return Results.BadRequest(new { Message = "Admin hesabını silemezsiniz" });

    // Kendini silme
    var callerId = int.Parse(ctx.User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    if (callerId == id)
        return Results.BadRequest(new { Message = "Kendi hesabınızı silemezsiniz" });

    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Kullanıcı silindi" });
}).RequireAuthorization();

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

    // Kullanıcıları seed et
    if (!await db.Users.AnyAsync())
    {
        var users = new[]
        {
            new User { Kullanici = "admin", SifreHash = BCrypt.Net.BCrypt.HashPassword("admin123"), Ad = "Sirac", Soyad = "Yönetici", Rol = "Admin" },
            new User { Kullanici = "ortak1", SifreHash = BCrypt.Net.BCrypt.HashPassword("ortak123"), Ad = "Erdem", Soyad = "Ortak", Rol = "SubAdmin", OlusturanId = 1 },
            new User { Kullanici = "garson1", SifreHash = BCrypt.Net.BCrypt.HashPassword("garson123"), Ad = "Mehmet", Soyad = "Demir", Rol = "Garson", OlusturanId = 1 },
            new User { Kullanici = "garson2", SifreHash = BCrypt.Net.BCrypt.HashPassword("garson123"), Ad = "Ayşe", Soyad = "Kaya", Rol = "Garson", OlusturanId = 2 }
        };
        await db.Users.AddRangeAsync(users);
    }

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
        ToplamCiro = data.Folyolar.Sum(f => f.Tutari),
        Kullanicilar = 4
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

app.MapGet("/api/sales/hourly", async (CafeDbContext db) =>
{
    var bugun = DateTime.UtcNow.Date;
    var hourly = await db.Folyolar
        .Where(f => f.IsIptal == 0 && f.Tarih >= bugun)
        .GroupBy(f => f.Tarih!.Value.Hour)
        .Select(g => new { Saat = g.Key, ToplamSatis = g.Sum(f => f.Tutari), SiparisSayisi = g.Count() })
        .OrderBy(x => x.Saat)
        .ToListAsync();
    return Results.Ok(hourly);
});

app.MapGet("/api/sales/top-urunler", async (CafeDbContext db, string? baslangic, string? bitis, int? limit) =>
{
    var start = baslangic != null ? DateTime.Parse(baslangic) : DateTime.UtcNow.AddDays(-30);
    var end = bitis != null ? DateTime.Parse(bitis).AddDays(1) : DateTime.UtcNow.AddDays(1);
    var data = await db.FolyoHarlar
        .Include(h => h.StokKart)
        .Include(h => h.Folyo)
        .Where(h => h.IsIptal == 0 && h.Folyo != null && h.Folyo.Tarih >= start && h.Folyo.Tarih <= end && h.Folyo.IsIptal == 0)
        .ToListAsync();
    var result = data
        .GroupBy(h => new { h.StokKartId, Baslik = h.StokKart?.Baslik ?? "Bilinmeyen" })
        .Select(g => new { UrunId = g.Key.StokKartId, UrunAdi = g.Key.Baslik, ToplamAdet = g.Sum(h => h.Miktar), ToplamCiro = g.Sum(h => h.Tutari) })
        .OrderByDescending(x => x.ToplamCiro)
        .Take(limit ?? 10)
        .ToList();
    return Results.Ok(result);
});

app.MapGet("/api/rapor/gun-sonu", async (CafeDbContext db, string? tarih) =>
{
    var gun = tarih != null ? DateTime.Parse(tarih).Date : DateTime.UtcNow.Date;
    var folyolar = await db.Folyolar
        .Where(f => f.Tarih >= gun && f.Tarih < gun.AddDays(1) && f.IsIptal == 0)
        .Select(f => new { f.Tutari, f.Odenen })
        .ToListAsync();
    return Results.Ok(new
    {
        Tarih = gun.ToString("yyyy-MM-dd"),
        ToplamCiro = folyolar.Sum(f => f.Tutari),
        ToplamOdeme = folyolar.Sum(f => f.Odenen),
        AcikHesap = folyolar.Sum(f => Math.Max(0, f.Tutari - f.Odenen)),
        SiparisSayisi = folyolar.Count
    });
});

// ========== RESTORAN ENDPOINTS ===========

app.MapGet("/api/salonlar", async (CafeDbContext db) =>
{
    var salonlar = await db.Salonlar
        .Where(s => s.Enabled)
        .Select(s => new { s.Id, Ad = s.Baslik, s.Kodu, s.Renk })
        .ToListAsync();
    return Results.Ok(salonlar);
});

app.MapGet("/api/masalar", async (CafeDbContext db) =>
{
    var bugun = DateTime.UtcNow.Date;
    var aktivFolyolar = await db.Folyolar
        .Where(f => f.IsKapali == 0 && f.Tarih >= bugun)
        .Select(f => new { f.MasaId, f.Tutari })
        .ToListAsync();

    var masalar = await db.Masalar
        .Where(m => m.Enabled)
        .Select(m => new { 
            m.Id, 
            m.SalonId, 
            MasaNo = m.SortOrder, 
            KoltukSayisi = 4
        })
        .ToListAsync();

    var result = masalar.Select(m => {
        var folyo = aktivFolyolar.FirstOrDefault(f => f.MasaId == m.Id);
        return new {
            m.Id,
            m.SalonId,
            m.MasaNo,
            m.KoltukSayisi,
            Durum = folyo != null ? "Dolu" : "Boş",
            Tutar = folyo?.Tutari ?? 0
        };
    });
    return Results.Ok(result);
});

// ========== SALON / MASA CRUD ==========

app.MapPost("/api/salonlar", async (CafeDbContext db, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();
    using var reader = new StreamReader(ctx.Request.Body);
    var json = System.Text.Json.JsonDocument.Parse(await reader.ReadToEndAsync());
    var baslik = json.RootElement.GetProperty("baslik").GetString() ?? "Yeni Salon";
    var salon = new Salon
    {
        Kodu = json.RootElement.TryGetProperty("kodu", out var kp) ? kp.GetString() ?? $"S{DateTime.UtcNow.Ticks % 100}" : $"S{DateTime.UtcNow.Ticks % 100}",
        Baslik = baslik, Enabled = true, SubeId = 1, CompanyId = 1,
        SortOrder = await db.Salonlar.CountAsync() + 1
    };
    db.Salonlar.Add(salon);
    await db.SaveChangesAsync();
    return Results.Ok(new { salon.Id, salon.Baslik, salon.Kodu });
}).RequireAuthorization();

app.MapPut("/api/salonlar/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();
    var salon = await db.Salonlar.FindAsync(id);
    if (salon == null) return Results.NotFound();
    using var reader = new StreamReader(ctx.Request.Body);
    var json = System.Text.Json.JsonDocument.Parse(await reader.ReadToEndAsync());
    if (json.RootElement.TryGetProperty("baslik", out var b)) salon.Baslik = b.GetString() ?? salon.Baslik;
    if (json.RootElement.TryGetProperty("renk", out var r)) salon.Renk = r.GetString();
    await db.SaveChangesAsync();
    return Results.Ok(new { salon.Id, salon.Baslik });
}).RequireAuthorization();

app.MapDelete("/api/salonlar/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();
    var salon = await db.Salonlar.FindAsync(id);
    if (salon == null) return Results.NotFound();
    var masaSayisi = await db.Masalar.CountAsync(m => m.SalonId == id && m.Enabled);
    if (masaSayisi > 0) return Results.BadRequest(new { Message = $"Salonda {masaSayisi} masa var. Önce masaları silin." });
    salon.Enabled = false;
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Salon silindi" });
}).RequireAuthorization();

app.MapPost("/api/masalar", async (CafeDbContext db, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();
    using var reader = new StreamReader(ctx.Request.Body);
    var json = System.Text.Json.JsonDocument.Parse(await reader.ReadToEndAsync());
    var salonId = json.RootElement.GetProperty("salonId").GetInt32();
    var baslik = json.RootElement.GetProperty("baslik").GetString() ?? "Yeni Masa";
    var salon = await db.Salonlar.FindAsync(salonId);
    if (salon == null) return Results.BadRequest(new { Message = "Salon bulunamadı" });
    var masaCount = await db.Masalar.CountAsync(m => m.SalonId == salonId && m.Enabled);
    var masa = new Masa
    {
        SalonId = salonId, Baslik = baslik,
        Kodu = $"M{DateTime.UtcNow.Ticks % 10000:D4}",
        QrKod = $"QR-{salon.Kodu}-{masaCount + 1:D2}",
        SortOrder = masaCount + 1, Enabled = true, SubeId = 1, CompanyId = 1
    };
    db.Masalar.Add(masa);
    await db.SaveChangesAsync();
    return Results.Ok(new { masa.Id, masa.Baslik, masa.QrKod });
}).RequireAuthorization();

app.MapPut("/api/masalar/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();
    var masa = await db.Masalar.FindAsync(id);
    if (masa == null) return Results.NotFound();
    using var reader = new StreamReader(ctx.Request.Body);
    var json = System.Text.Json.JsonDocument.Parse(await reader.ReadToEndAsync());
    if (json.RootElement.TryGetProperty("baslik", out var b)) masa.Baslik = b.GetString() ?? masa.Baslik;
    await db.SaveChangesAsync();
    return Results.Ok(new { masa.Id, masa.Baslik });
}).RequireAuthorization();

app.MapDelete("/api/masalar/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();
    var masa = await db.Masalar.FindAsync(id);
    if (masa == null) return Results.NotFound();
    if (await db.Folyolar.AnyAsync(f => f.MasaId == id && f.IsKapali == 0))
        return Results.BadRequest(new { Message = "Açık hesap var. Önce kapatın." });
    masa.Enabled = false;
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Masa silindi" });
}).RequireAuthorization();

app.MapPost("/api/masalar/{id}/yeni-qr", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();
    var masa = await db.Masalar.Include(m => m.Salon).FirstOrDefaultAsync(m => m.Id == id);
    if (masa == null) return Results.NotFound();
    masa.QrKod = $"QR-{masa.Salon?.Kodu ?? "M"}-{id}-{DateTime.UtcNow.Ticks % 9999}";
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "QR kod yenilendi", YeniQrKod = masa.QrKod });
}).RequireAuthorization();

// ========== ÖDEME / ADİSYON SİSTEMİ ==========

// Masanın aktif adisyonunu getir (sipariş kalemleri + ödeme geçmişi)
app.MapGet("/api/masalar/{masaId}/adisyon", async (CafeDbContext db, int masaId) =>
{
    var bugun = DateTime.UtcNow.Date;
    var folyo = await db.Folyolar
        .Include(f => f.FolyoHarlar).ThenInclude(h => h.StokKart)
        .Include(f => f.Tahsilatlar)
        .Where(f => f.MasaId == masaId && f.IsKapali == 0 && f.Tarih >= bugun)
        .FirstOrDefaultAsync();

    if (folyo == null)
        return Results.Ok(new { aktif = false });

    var kalemler = folyo.FolyoHarlar
        .Where(h => h.IsIptal == 0)
        .Select(h => new {
            h.Id,
            Urun = h.StokKart != null ? h.StokKart.Baslik : "Bilinmeyen",
            h.Miktar,
            BirimFiyat = h.BFiyat,
            h.Tutari,
            h.SipNotu,
            h.IsKapali,
            h.CreatedAt
        })
        .OrderBy(h => h.CreatedAt)
        .ToList();

    var odemeler = folyo.Tahsilatlar
        .Where(t => t.IsIptal == 0)
        .Select(t => new {
            t.Id,
            t.Tutari,
            Tip = t.OdemeAraciId == 1 ? "Nakit" : "Kredi Kartı",
            t.Tarih
        })
        .OrderBy(t => t.Tarih)
        .ToList();

    return Results.Ok(new {
        aktif = true,
        folyoId = folyo.Id,
        toplam = folyo.Tutari,
        odenen = folyo.Odenen,
        kalan = folyo.Bakiye,
        kalemler,
        odemeler,
        aciklama = folyo.Aciklama,
        acilisSaati = folyo.Tarih
    });
});

// Ödeme al (parçalı veya tam)
app.MapPost("/api/masalar/{masaId}/odeme", async (CafeDbContext db, int masaId, HttpContext ctx) =>
{
    var bugun = DateTime.UtcNow.Date;
    var folyo = await db.Folyolar
        .Where(f => f.MasaId == masaId && f.IsKapali == 0 && f.Tarih >= bugun)
        .FirstOrDefaultAsync();

    if (folyo == null)
        return Results.NotFound(new { Message = "Aktif adisyon bulunamadı" });

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);
    
    var tutar = json.RootElement.GetProperty("tutar").GetDecimal();
    var tip = json.RootElement.TryGetProperty("tip", out var tipProp) ? tipProp.GetString() : "Nakit";

    if (tutar <= 0)
        return Results.BadRequest(new { Message = "Geçersiz tutar" });

    if (tutar > folyo.Bakiye)
        return Results.BadRequest(new { Message = $"Kalan bakiye ₺{folyo.Bakiye:F2}, bu tutardan fazla ödeme yapılamaz" });

    // FolyoTahsilat kaydı oluştur
    var tahsilat = new FolyoTahsilat
    {
        FolyoId = folyo.Id,
        FolyoHesapId = folyo.Id,
        BtipiId = 1,
        Tarih = DateTime.UtcNow,
        BelgeSira = 1,
        Tutari = tutar,
        DTutari = tutar,
        OdemeAraciId = tip == "Nakit" ? 1 : 2,
        Pb = "TRY"
    };
    db.Set<FolyoTahsilat>().Add(tahsilat);

    // Folyo'daki ödenen tutarı güncelle
    folyo.Odenen += tutar;
    folyo.UpdatedAt = DateTime.UtcNow;

    // Tam ödeme yapıldıysa otomatik kapat
    if (folyo.Bakiye <= 0)
    {
        folyo.IsKapali = 1;
        folyo.IsHesapKapali = 1;
        // Sipariş satırlarını da kapat
        var harlar = await db.FolyoHarlar.Where(h => h.FolyoId == folyo.Id).ToListAsync();
        foreach (var har in harlar)
            har.IsKapali = 1;
    }

    await db.SaveChangesAsync();

    return Results.Ok(new { 
        Message = folyo.Bakiye <= 0 ? "Ödeme alındı, masa kapatıldı" : "Parçalı ödeme alındı",
        Odenen = folyo.Odenen,
        Kalan = folyo.Bakiye,
        MasaKapandi = folyo.Bakiye <= 0
    });
});

// Masayı kapat (bakiye 0 ise)
app.MapPost("/api/masalar/{masaId}/kapat", async (CafeDbContext db, int masaId) =>
{
    var bugun = DateTime.UtcNow.Date;
    var folyo = await db.Folyolar
        .Where(f => f.MasaId == masaId && f.IsKapali == 0 && f.Tarih >= bugun)
        .FirstOrDefaultAsync();

    if (folyo == null)
        return Results.NotFound(new { Message = "Aktif adisyon bulunamadı" });

    if (folyo.Bakiye > 0)
        return Results.BadRequest(new { Message = $"Kalan bakiye var: ₺{folyo.Bakiye:F2}. Önce ödeme alınmalı." });

    folyo.IsKapali = 1;
    folyo.IsHesapKapali = 1;
    folyo.UpdatedAt = DateTime.UtcNow;

    var harlar = await db.FolyoHarlar.Where(h => h.FolyoId == folyo.Id).ToListAsync();
    foreach (var har in harlar)
        har.IsKapali = 1;

    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Masa kapatıldı" });
});

app.MapGet("/api/menu", async (CafeDbContext db) =>
{
    var menuItems = await db.StokKartlar
        .Where(s => s.Enabled == true)
        .GroupBy(s => s.OzelKod1 ?? "Diğer")
        .Select(g => new { 
            Kategori = g.Key, 
            Urunler = g.Select(s => new { s.Id, s.Baslik, Fiyat = s.BFSatis1 }).ToList()
        })
        .ToListAsync();
    return Results.Ok(menuItems);
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

// ========== APRİORİ / MARKET BASKET ENDPOINTS ==========

// En güçlü birliktelik kuralları
app.MapGet("/api/recommendations/rules", async (IAprioriRecommender apriori, int? top) =>
{
    try
    {
        var rules = await apriori.GetTopRulesAsync(top ?? 20);
        return Results.Ok(new
        {
            ToplamKural = rules.Count(),
            Kurallar = rules.Select(r => new
            {
                r.Antecedent,
                r.Consequent,
                Support    = Math.Round(r.Support    * 100, 1),
                Confidence = Math.Round(r.Confidence * 100, 1),
                r.Lift,
                r.ActionText
            })
        });
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
});

// Sepet bazlı öneri: ?urunler=1,2,3
app.MapGet("/api/recommendations/basket", async (IAprioriRecommender apriori, string? urunler, int? top) =>
{
    try
    {
        var ids = (urunler ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => int.TryParse(s.Trim(), out var v) ? v : 0)
            .Where(v => v > 0)
            .ToList();

        if (!ids.Any())
            return Results.BadRequest(new { Error = "urunler parametresi gerekli. Örn: ?urunler=1,3,7" });

        var recs = await apriori.RecommendFromBasketAsync(ids, top ?? 5);
        return Results.Ok(new
        {
            SepetUrunleri = ids,
            Oneriler = recs.Select(r => new
            {
                r.ProductId,
                r.ProductName,
                Confidence = Math.Round(r.Confidence * 100, 1),
                r.Lift,
                r.Reason
            })
        });
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
});

// En sık birlikte satılan çiftler
app.MapGet("/api/recommendations/pairs", async (IAprioriRecommender apriori, int? top) =>
{
    try
    {
        var pairs = await apriori.GetTopPairsAsync(top ?? 15);
        return Results.Ok(pairs.Select(p => new
        {
            p.ProductAName,
            p.ProductBName,
            p.Count,
            Support = Math.Round(p.Support * 100, 1)
        }));
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
});

// Apriori modelini yeniden eğit
app.MapPost("/api/recommendations/rules/retrain", async (IAprioriRecommender apriori) =>
{
    await apriori.RetrainAsync();
    return Results.Ok(new { Message = "Apriori modeli yeniden eğitildi." });
});

Console.WriteLine("[INFO] CafeML API başlatılıyor...");
Console.WriteLine("[INFO] ML Servisleri: Satış Tahmini + Segmentasyon + Öneri Sistemi + Apriori");
Console.WriteLine("[INFO] SignalR Hub: /hubs/orders");

// ========== QR KOD YÖNETIM ENDPOINTS ==========

// QR kodu ile masayı bul ve menüyü getir (Public)
app.MapGet("/api/qr/kod/{qrKod}", async (CafeDbContext db, string qrKod) =>
{
    var masa = await db.Masalar
        .Include(m => m.Salon)
        .FirstOrDefaultAsync(m => m.QrKod == qrKod);
    if (masa == null) return Results.NotFound(new { Error = "Geçersiz QR kodu" });

    var menuItems = await db.StokKartlar
        .Where(s => s.Enabled == true)
        .Select(s => new { s.Id, s.Baslik, Kategori = s.OzelKod1 ?? "Diğer", Fiyat = s.BFSatis1, s.Resim })
        .ToListAsync();

    var kategoriler = menuItems.GroupBy(m => m.Kategori)
        .Select(g => new { Kategori = g.Key, Urunler = g.ToList() })
        .ToList();

    return Results.Ok(new
    {
        Masa = new { masa.Id, masa.Baslik, Salon = masa.Salon?.Baslik, masa.QrKod },
        Kategoriler = kategoriler
    });
});

// Tüm masaların QR kodlarını listele (Yönetici)
app.MapGet("/api/masalar/qr", async (CafeDbContext db) =>
{
    var masalar = await db.Masalar
        .Include(m => m.Salon)
        .OrderBy(m => m.SalonId).ThenBy(m => m.SortOrder)
        .Select(m => new
        {
            m.Id,
            m.Baslik,
            Salon = m.Salon!.Baslik,
            m.QrKod,
            QrMenuUrl = $"/qr/{m.Id}"
        })
        .ToListAsync();
    return Results.Ok(masalar);
}).RequireAuthorization();

// ========== MENÜ CRUD ENDPOINTS (Yönetici yetkisi) ==========

app.MapPost("/api/urunler", async (CafeDbContext db, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);

    var urun = new StokKart
    {
        Kodu = json.RootElement.TryGetProperty("kodu", out var koduProp) ? koduProp.GetString() ?? "" : $"URN{DateTime.UtcNow.Ticks % 10000}",
        Baslik = json.RootElement.GetProperty("baslik").GetString() ?? "",
        KartTipi = "ürün",
        Birim = "Adet",
        KdvOrani = json.RootElement.TryGetProperty("kdvOrani", out var kdvProp) ? kdvProp.GetDecimal() : 10,
        BFSatis1 = json.RootElement.GetProperty("fiyat").GetDecimal(),
        OzelKod1 = json.RootElement.TryGetProperty("kategori", out var katProp) ? katProp.GetString() : "Diğer",
        Enabled = true
    };

    db.StokKartlar.Add(urun);
    await db.SaveChangesAsync();

    return Results.Ok(new { Message = "Ürün eklendi", urun.Id, urun.Baslik, urun.BFSatis1, Kategori = urun.OzelKod1 });
}).RequireAuthorization();

app.MapPut("/api/urunler/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();

    var urun = await db.StokKartlar.FindAsync(id);
    if (urun == null) return Results.NotFound();

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);

    if (json.RootElement.TryGetProperty("baslik", out var baslikProp))
        urun.Baslik = baslikProp.GetString() ?? urun.Baslik;
    if (json.RootElement.TryGetProperty("fiyat", out var fiyatProp))
        urun.BFSatis1 = fiyatProp.GetDecimal();
    if (json.RootElement.TryGetProperty("kategori", out var kategoriProp))
        urun.OzelKod1 = kategoriProp.GetString();
    if (json.RootElement.TryGetProperty("enabled", out var enabledProp))
        urun.Enabled = enabledProp.GetBoolean();
    if (json.RootElement.TryGetProperty("resim", out var resimProp))
        urun.Resim = resimProp.GetString();
    if (json.RootElement.TryGetProperty("sortOrder", out var sortProp))
        urun.SortOrder = sortProp.GetInt32();
    if (json.RootElement.TryGetProperty("aciklama", out var acikProp))
        urun.DetayAciklama = acikProp.GetString();

    urun.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Ürün güncellendi", urun.Id, urun.Baslik, urun.BFSatis1, Kategori = urun.OzelKod1, urun.Enabled, urun.Resim, urun.SortOrder });
}).RequireAuthorization();

app.MapDelete("/api/urunler/{id}", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();

    var urun = await db.StokKartlar.FindAsync(id);
    if (urun == null) return Results.NotFound();

    urun.Enabled = false; // Soft delete
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Ürün devre dışı bırakıldı" });
}).RequireAuthorization();

// Resim Upload Endpoint
app.MapPost("/api/urunler/{id}/resim", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();

    var urun = await db.StokKartlar.FindAsync(id);
    if (urun == null) return Results.NotFound();

    var form = await ctx.Request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file == null) return Results.BadRequest("Dosya seçilmedi");

    // wwwroot/images/menu/ klasörüne kaydet
    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "menu");
    Directory.CreateDirectory(uploadsDir);

    var ext = Path.GetExtension(file.FileName).ToLower();
    var fileName = $"urun_{id}_{DateTime.UtcNow.Ticks}{ext}";
    var filePath = Path.Combine(uploadsDir, fileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    urun.Resim = $"/images/menu/{fileName}";
    urun.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    return Results.Ok(new { Message = "Resim yüklendi", ResimUrl = urun.Resim });
}).RequireAuthorization().DisableAntiforgery();

// Toplu Sıralama Güncelleme
app.MapPost("/api/urunler/siralama", async (CafeDbContext db, HttpContext ctx) =>
{
    var rol = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
    if (rol != "Admin" && rol != "SubAdmin") return Results.Forbid();

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);

    foreach (var item in json.RootElement.GetProperty("siralama").EnumerateArray())
    {
        var urunId = item.GetProperty("id").GetInt32();
        var sortOrder = item.GetProperty("sortOrder").GetInt32();
        var urun = await db.StokKartlar.FindAsync(urunId);
        if (urun != null) urun.SortOrder = sortOrder;
    }
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Sıralama güncellendi" });
}).RequireAuthorization();

app.MapGet("/api/qr/{masaId}", async (CafeDbContext db, int masaId) =>
{
    var masa = await db.Masalar
        .Include(m => m.Salon)
        .FirstOrDefaultAsync(m => m.Id == masaId);
    if (masa == null) return Results.NotFound(new { Error = "Masa bulunamadı" });

    var menuItems = await db.StokKartlar
        .Where(s => s.Enabled == true)
        .Select(s => new { s.Id, s.Baslik, Kategori = s.OzelKod1 ?? "Diğer", Fiyat = s.BFSatis1, s.Resim })
        .ToListAsync();

    var kategoriler = menuItems.GroupBy(m => m.Kategori)
        .Select(g => new { Kategori = g.Key, Urunler = g.ToList() })
        .ToList();

    return Results.Ok(new
    {
        Masa = new { masa.Id, masa.Baslik, Salon = masa.Salon?.Baslik },
        Kategoriler = kategoriler
    });
});

app.MapPost("/api/qr/{masaId}/talep", async (CafeDbContext db, IHubContext<OrderHub> hub, int masaId, HttpContext ctx) =>
{
    var masa = await db.Masalar.FindAsync(masaId);
    if (masa == null) return Results.NotFound(new { Error = "Masa bulunamadı" });

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);

    var talep = new SiparisTalep
    {
        MasaId = masaId,
        MusteriNotu = json.RootElement.TryGetProperty("not", out var notProp) ? notProp.GetString() : null
    };
    db.SiparisTalepler.Add(talep);
    await db.SaveChangesAsync();

    if (json.RootElement.TryGetProperty("urunler", out var urunlerProp))
    {
        foreach (var urun in urunlerProp.EnumerateArray())
        {
            var satir = new SiparisTalepSatir
            {
                SiparisTalepId = talep.Id,
                StokKartId = urun.GetProperty("urunId").GetInt32(),
                Miktar = urun.TryGetProperty("miktar", out var miktarProp) ? miktarProp.GetInt32() : 1,
                Not = urun.TryGetProperty("not", out var satirNotProp) ? satirNotProp.GetString() : null
            };
            db.SiparisTalepSatirlar.Add(satir);
        }
        await db.SaveChangesAsync();
    }

    // SignalR ile garsonlara bildirim
    var talepDetay = await db.SiparisTalepler
        .Include(t => t.Satirlar).ThenInclude(s => s.StokKart)
        .Include(t => t.Masa).ThenInclude(m => m.Salon)
        .FirstAsync(t => t.Id == talep.Id);

    var bildirim = new
    {
        TalepId = talepDetay.Id,
        Masa = talepDetay.Masa?.Baslik,
        Salon = talepDetay.Masa?.Salon?.Baslik,
        Durum = talepDetay.Durum,
        Tarih = talepDetay.OlusturulmaTarihi,
        Not = talepDetay.MusteriNotu,
        Urunler = talepDetay.Satirlar.Select(s => new
        {
            Urun = s.StokKart?.Baslik,
            s.Miktar,
            s.Not
        })
    };
    await hub.Clients.Group("garsonlar").SendAsync("YeniTalep", bildirim);
    await hub.Clients.Group("dashboard").SendAsync("YeniTalep", bildirim);

    return Results.Ok(new { Message = "Sipariş talebi oluşturuldu", TalepId = talep.Id });
});

// ========== SİPARİŞ TALEP ENDPOINTS (Garson/Kasa/Yönetici) ==========

app.MapGet("/api/talepler", async (CafeDbContext db, string? durum) =>
{
    var query = db.SiparisTalepler
        .Include(t => t.Satirlar).ThenInclude(s => s.StokKart)
        .Include(t => t.Masa).ThenInclude(m => m.Salon)
        .Include(t => t.OnaylayanUser)
        .OrderByDescending(t => t.OlusturulmaTarihi)
        .AsQueryable();

    if (!string.IsNullOrEmpty(durum))
        query = query.Where(t => t.Durum == durum);
    else
        query = query.Where(t => t.Durum == "Bekliyor");

    var talepler = await query.Take(50).ToListAsync();

    return Results.Ok(talepler.Select(t => new
    {
        t.Id,
        Masa = t.Masa?.Baslik,
        Salon = t.Masa?.Salon?.Baslik,
        MasaId = t.MasaId,
        t.Durum,
        t.MusteriNotu,
        Tarih = t.OlusturulmaTarihi,
        t.OnayTarihi,
        Onaylayan = t.OnaylayanUser != null ? $"{t.OnaylayanUser.Ad} {t.OnaylayanUser.Soyad}" : null,
        Urunler = t.Satirlar.Select(s => new
        {
            s.Id,
            UrunId = s.StokKartId,
            Urun = s.StokKart?.Baslik,
            s.Miktar,
            Fiyat = s.StokKart?.BFSatis1 ?? 0,
            s.Not
        })
    }));
}).RequireAuthorization();

app.MapPost("/api/talepler/{id}/onayla", async (CafeDbContext db, IHubContext<OrderHub> hub, int id, HttpContext ctx) =>
{
    var talep = await db.SiparisTalepler
        .Include(t => t.Satirlar).ThenInclude(s => s.StokKart)
        .Include(t => t.Masa)
        .FirstOrDefaultAsync(t => t.Id == id);
    if (talep == null) return Results.NotFound();
    if (talep.Durum != "Bekliyor") return Results.BadRequest(new { Error = "Bu talep zaten işlendi" });

    var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var userId = userIdStr != null ? int.Parse(userIdStr) : (int?)null;

    // Talep onayla
    talep.Durum = "Onaylandi";
    talep.OnaylayanUserId = userId;
    talep.OnayTarihi = DateTime.UtcNow;

    // Folyo + FolyoHar oluştur
    var folyo = new Folyo
    {
        MasaId = talep.MasaId,
        Tarih = DateTime.UtcNow,
        UserId = userId,
        Aciklama = $"QR Sipariş Talebi #{talep.Id}"
    };
    db.Folyolar.Add(folyo);
    await db.SaveChangesAsync();

    decimal toplamTutar = 0;
    var mutfakItems = new List<object>();
    var barItems = new List<object>();

    foreach (var satir in talep.Satirlar)
    {
        var fiyat = satir.StokKart?.BFSatis1 ?? 0;
        var tutar = fiyat * satir.Miktar;
        toplamTutar += tutar;

        var har = new FolyoHar
        {
            FolyoId = folyo.Id,
            StokKartId = satir.StokKartId,
            Miktar = satir.Miktar,
            BFiyat = fiyat,
            Tutari = tutar,
            SipNotu = satir.Not
        };
        db.FolyoHarlar.Add(har);

        var kategori = satir.StokKart?.OzelKod1?.ToLower() ?? "";
        var item = new { Urun = satir.StokKart?.Baslik, satir.Miktar, satir.Not, Masa = talep.Masa?.Baslik };
        if (kategori.Contains("içecek") || kategori.Contains("bar"))
            barItems.Add(item);
        else
            mutfakItems.Add(item);
    }

    folyo.Tutari = toplamTutar;
    folyo.SonSiparis = DateTime.UtcNow;
    await db.SaveChangesAsync();

    // SignalR ile mutfak/bar'a bildirim
    if (mutfakItems.Any())
        await hub.Clients.Group("mutfak").SendAsync("YeniSiparis", new { Masa = talep.Masa?.Baslik, Urunler = mutfakItems });
    if (barItems.Any())
        await hub.Clients.Group("bar").SendAsync("YeniSiparis", new { Masa = talep.Masa?.Baslik, Urunler = barItems });
    await hub.Clients.Group("dashboard").SendAsync("SiparisOnaylandi", new { FolyoId = folyo.Id, Tutar = toplamTutar });

    return Results.Ok(new { Message = "Talep onaylandı, sipariş oluşturuldu", FolyoId = folyo.Id, Tutar = toplamTutar });
}).RequireAuthorization();

app.MapPost("/api/talepler/{id}/reddet", async (CafeDbContext db, IHubContext<OrderHub> hub, int id, HttpContext ctx) =>
{
    var talep = await db.SiparisTalepler.FindAsync(id);
    if (talep == null) return Results.NotFound();
    if (talep.Durum != "Bekliyor") return Results.BadRequest(new { Error = "Bu talep zaten işlendi" });

    var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    talep.Durum = "Reddedildi";
    talep.OnaylayanUserId = userIdStr != null ? int.Parse(userIdStr) : null;
    talep.OnayTarihi = DateTime.UtcNow;
    await db.SaveChangesAsync();

    await hub.Clients.Group("dashboard").SendAsync("TalepReddedildi", new { TalepId = id });
    return Results.Ok(new { Message = "Talep reddedildi" });
}).RequireAuthorization();

// ========== GARSON SİPARİŞ ENDPOINTS ==========

app.MapPost("/api/siparisler", async (CafeDbContext db, IHubContext<OrderHub> hub, HttpContext ctx) =>
{
    var userIdStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userIdStr == null) return Results.Unauthorized();
    var userId = int.Parse(userIdStr);
    var userName = ctx.User.FindFirst(ClaimTypes.Name)?.Value ?? "Garson";

    using var reader = new StreamReader(ctx.Request.Body);
    var body = await reader.ReadToEndAsync();
    var json = System.Text.Json.JsonDocument.Parse(body);

    var masaId = json.RootElement.GetProperty("masaId").GetInt32();

    // Garson siparişi de önce talep olarak oluştur
    var talep = new SiparisTalep
    {
        MasaId = masaId,
        MusteriNotu = $"Garson: {userName}"
    };
    db.SiparisTalepler.Add(talep);
    await db.SaveChangesAsync();

    decimal toplamTutar = 0;

    foreach (var urun in json.RootElement.GetProperty("urunler").EnumerateArray())
    {
        var stokKartId = urun.GetProperty("urunId").GetInt32();
        var miktar = urun.TryGetProperty("miktar", out var miktarProp) ? miktarProp.GetInt32() : 1;
        var not = urun.TryGetProperty("not", out var notProp) ? notProp.GetString() : null;

        var stokKart = await db.StokKartlar.FindAsync(stokKartId);
        var fiyat = stokKart?.BFSatis1 ?? 0;
        toplamTutar += fiyat * miktar;

        var satir = new SiparisTalepSatir
        {
            SiparisTalepId = talep.Id,
            StokKartId = stokKartId,
            Miktar = miktar,
            Not = not
        };
        db.SiparisTalepSatirlar.Add(satir);
    }
    await db.SaveChangesAsync();

    // SignalR ile talepler ekranına bildirim
    var talepDetay = await db.SiparisTalepler
        .Include(t => t.Satirlar).ThenInclude(s => s.StokKart)
        .Include(t => t.Masa).ThenInclude(m => m.Salon)
        .FirstAsync(t => t.Id == talep.Id);

    var bildirim = new
    {
        TalepId = talepDetay.Id,
        Masa = talepDetay.Masa?.Baslik,
        Salon = talepDetay.Masa?.Salon?.Baslik,
        Durum = talepDetay.Durum,
        Tarih = talepDetay.OlusturulmaTarihi,
        Kaynak = "Garson",
        Garson = userName,
        Not = talepDetay.MusteriNotu,
        Urunler = talepDetay.Satirlar.Select(s => new
        {
            Urun = s.StokKart?.Baslik,
            s.Miktar,
            s.Not
        }),
        Tutar = toplamTutar
    };
    await hub.Clients.Group("garsonlar").SendAsync("YeniTalep", bildirim);
    await hub.Clients.Group("dashboard").SendAsync("YeniTalep", bildirim);

    return Results.Ok(new { Message = "Sipariş talebi oluşturuldu. Onay bekliyor.", TalepId = talep.Id, Tutar = toplamTutar });
}).RequireAuthorization();

// ========== MUTFAK / BAR EKRANI ENDPOINTS ==========

app.MapGet("/api/mutfak", async (CafeDbContext db) =>
{
    var bugun = DateTime.UtcNow.Date;
    var siparisler = await db.FolyoHarlar
        .Include(h => h.StokKart)
        .Include(h => h.Folyo).ThenInclude(f => f.Masa)
        .Where(h => h.CreatedAt >= bugun && h.IsIptal == 0 && h.IsKapali == 0)
        .Where(h => h.StokKart != null && !(h.StokKart.OzelKod1 ?? "").ToLower().Contains("içecek"))
        .OrderByDescending(h => h.CreatedAt)
        .Take(50)
        .Select(h => new
        {
            h.Id,
            Urun = h.StokKart!.Baslik,
            h.Miktar,
            h.SipNotu,
            Masa = h.Folyo!.Masa!.Baslik,
            Tarih = h.CreatedAt
        })
        .ToListAsync();
    return Results.Ok(siparisler);
}).RequireAuthorization();

app.MapGet("/api/bar", async (CafeDbContext db) =>
{
    var bugun = DateTime.UtcNow.Date;
    var siparisler = await db.FolyoHarlar
        .Include(h => h.StokKart)
        .Include(h => h.Folyo).ThenInclude(f => f.Masa)
        .Where(h => h.CreatedAt >= bugun && h.IsIptal == 0 && h.IsKapali == 0)
        .Where(h => h.StokKart != null && (h.StokKart.OzelKod1 ?? "").ToLower().Contains("içecek"))
        .OrderByDescending(h => h.CreatedAt)
        .Take(50)
        .Select(h => new
        {
            h.Id,
            Urun = h.StokKart!.Baslik,
            h.Miktar,
            h.SipNotu,
            Masa = h.Folyo!.Masa!.Baslik,
            Tarih = h.CreatedAt
        })
        .ToListAsync();
    return Results.Ok(siparisler);
}).RequireAuthorization();

// Sipariş Tamamla (Mutfak/Bar)
app.MapPost("/api/siparisler/{id}/tamamla", async (CafeDbContext db, int id, HttpContext ctx) =>
{
    var har = await db.FolyoHarlar.FindAsync(id);
    if (har == null) return Results.NotFound();

    har.IsKapali = 1;
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Sipariş tamamlandı" });
}).RequireAuthorization();

// Sipariş Satırı İptal
app.MapPost("/api/siparisler/{id}/iptal", async (CafeDbContext db, int id) =>
{
    var har = await db.FolyoHarlar
        .Include(h => h.Folyo)
        .FirstOrDefaultAsync(h => h.Id == id);
    if (har == null) return Results.NotFound();
    if (har.IsKapali == 1) return Results.BadRequest(new { Message = "Bu kalem zaten kapatılmış" });
    var iptalTutar = har.Tutari;
    har.IsIptal = 1;
    har.IsKapali = 1;
    if (har.Folyo != null)
    {
        har.Folyo.Tutari = Math.Max(0, har.Folyo.Tutari - iptalTutar);
        har.Folyo.UpdatedAt = DateTime.UtcNow;
    }
    await db.SaveChangesAsync();
    return Results.Ok(new { Message = "Kalem iptal edildi", IptalTutar = iptalTutar });
}).RequireAuthorization();

app.MapGet("/api/siparisler/aktif", async (CafeDbContext db) =>
{
    var aktifler = await db.Folyolar
        .Include(f => f.Masa).ThenInclude(m => m.Salon)
        .Include(f => f.FolyoHarlar).ThenInclude(h => h.StokKart)
        .Where(f => f.IsHesapKapali == 0 && f.IsIptal == 0)
        .OrderByDescending(f => f.SonSiparis ?? f.Tarih)
        .Take(50)
        .ToListAsync();

    return Results.Ok(aktifler.Select(f => new
    {
        f.Id,
        Masa = f.Masa?.Baslik,
        Salon = f.Masa?.Salon?.Baslik,
        f.Tutari,
        f.Odenen,
        Bakiye = f.Tutari - f.Odenen,
        SonSiparis = f.SonSiparis,
        Urunler = f.FolyoHarlar.Where(h => h.IsIptal == 0).Select(h => new
        {
            h.Id,
            Urun = h.StokKart?.Baslik,
            h.Miktar,
            h.Tutari,
            h.SipNotu
        })
    }));
}).RequireAuthorization();

app.Run();
