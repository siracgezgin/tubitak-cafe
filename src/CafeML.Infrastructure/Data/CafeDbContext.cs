using CafeML.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace CafeML.Infrastructure.Data;

/// <summary>
/// Entity Framework Core DbContext - NARPOS veritabanı ile uyumlu
/// </summary>
public class CafeDbContext : DbContext
{
    public CafeDbContext(DbContextOptions<CafeDbContext> options) : base(options)
    {
    }

    // DbSets
    public DbSet<Folyo> Folyolar => Set<Folyo>();
    public DbSet<FolyoHar> FolyoHarlar => Set<FolyoHar>();
    public DbSet<FolyoTahsilat> FolyoTahsilatlar => Set<FolyoTahsilat>();
    public DbSet<Masa> Masalar => Set<Masa>();
    public DbSet<Salon> Salonlar => Set<Salon>();
    public DbSet<StokKart> StokKartlar => Set<StokKart>();
    public DbSet<CariKart> CariKartlar => Set<CariKart>();
    public DbSet<Menu> Menuler => Set<Menu>();
    public DbSet<MenuGrup> MenuGruplar => Set<MenuGrup>();
    public DbSet<MenuStokKart> MenuStokKartlar => Set<MenuStokKart>();
    public DbSet<User> Users => Set<User>();
    public DbSet<SiparisTalep> SiparisTalepler => Set<SiparisTalep>();
    public DbSet<SiparisTalepSatir> SiparisTalepSatirlar => Set<SiparisTalepSatir>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Folyo konfigürasyonu
        modelBuilder.Entity<Folyo>(entity =>
        {
            entity.ToTable("cffolyo");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MasaId).HasColumnName("masa_id");
            entity.Property(e => e.CariKartId).HasColumnName("carikart_id");
            entity.Property(e => e.Tarih).HasColumnName("tarih");
            entity.Property(e => e.Tutari).HasColumnName("tutari").HasColumnType("decimal(12,4)");
            entity.Property(e => e.Odenen).HasColumnName("odenen").HasColumnType("decimal(12,4)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Ignore(e => e.Bakiye);

            entity.HasOne(e => e.Masa).WithMany(m => m.Folyolar).HasForeignKey(e => e.MasaId);
            entity.HasOne(e => e.CariKart).WithMany(c => c.Folyolar).HasForeignKey(e => e.CariKartId);
        });

        // FolyoHar konfigürasyonu
        modelBuilder.Entity<FolyoHar>(entity =>
        {
            entity.ToTable("cffolyohar");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FolyoId).HasColumnName("folyo_id");
            entity.Property(e => e.StokKartId).HasColumnName("stokkart_id");
            entity.Property(e => e.Miktar).HasColumnName("miktar").HasColumnType("decimal(12,4)");
            entity.Property(e => e.Tutari).HasColumnName("tutari").HasColumnType("decimal(12,4)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Folyo).WithMany(f => f.FolyoHarlar).HasForeignKey(e => e.FolyoId);
            entity.HasOne(e => e.StokKart).WithMany(s => s.FolyoHarlar).HasForeignKey(e => e.StokKartId);
        });

        // FolyoTahsilat konfigürasyonu
        modelBuilder.Entity<FolyoTahsilat>(entity =>
        {
            entity.ToTable("cffolyotahsilat");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FolyoId).HasColumnName("folyo_id");
            entity.Property(e => e.Tutari).HasColumnName("tutari").HasColumnType("decimal(12,4)");
            entity.Property(e => e.Tarih).HasColumnName("tarih");

            entity.HasOne(e => e.Folyo).WithMany(f => f.Tahsilatlar).HasForeignKey(e => e.FolyoId);
        });

        // Masa konfigürasyonu
        modelBuilder.Entity<Masa>(entity =>
        {
            entity.ToTable("cfmasa");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SalonId).HasColumnName("salon_id");
            entity.Property(e => e.Kodu).HasColumnName("kodu");
            entity.Property(e => e.Baslik).HasColumnName("baslik");
            entity.Property(e => e.QrKod).HasColumnName("qr_kod").HasMaxLength(50);
            entity.HasIndex(e => e.QrKod).IsUnique();

            entity.HasOne(e => e.Salon).WithMany(s => s.Masalar).HasForeignKey(e => e.SalonId);
        });

        // Salon konfigürasyonu
        modelBuilder.Entity<Salon>(entity =>
        {
            entity.ToTable("cfsalon");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Kodu).HasColumnName("kodu");
            entity.Property(e => e.Baslik).HasColumnName("baslik");
        });

        // StokKart konfigürasyonu
        modelBuilder.Entity<StokKart>(entity =>
        {
            entity.ToTable("stokkart");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Kodu).HasColumnName("kodu");
            entity.Property(e => e.Baslik).HasColumnName("baslik");
            entity.Property(e => e.KdvOrani).HasColumnName("kdvorani").HasColumnType("decimal(12,4)");
            entity.Property(e => e.BFSatis1).HasColumnName("bfsatis1").HasColumnType("decimal(12,4)");
        });

        // CariKart konfigürasyonu
        modelBuilder.Entity<CariKart>(entity =>
        {
            entity.ToTable("carikart");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
        });

        // Menu konfigürasyonu
        modelBuilder.Entity<Menu>(entity =>
        {
            entity.ToTable("cfmenu");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
        });

        // MenuGrup konfigürasyonu
        modelBuilder.Entity<MenuGrup>(entity =>
        {
            entity.ToTable("cfmenugrup");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MenuId).HasColumnName("menu_id");

            entity.HasOne(e => e.Menu).WithMany(m => m.MenuGruplar).HasForeignKey(e => e.MenuId);
        });

        // MenuStokKart konfigürasyonu (composite key)
        modelBuilder.Entity<MenuStokKart>(entity =>
        {
            entity.ToTable("cfmenustokkart");
            entity.HasKey(e => new { e.MenuGrupId, e.MenuId, e.StokKartId });
            entity.Property(e => e.MenuGrupId).HasColumnName("menugrup_id");
            entity.Property(e => e.MenuId).HasColumnName("menu_id");
            entity.Property(e => e.StokKartId).HasColumnName("stokkart_id");

            entity.HasOne(e => e.MenuGrup).WithMany(m => m.MenuStokKartlar).HasForeignKey(e => e.MenuGrupId);
            entity.HasOne(e => e.StokKart).WithMany(s => s.MenuStokKartlar).HasForeignKey(e => e.StokKartId);
        });

        // User konfigürasyonu
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Kullanici).HasColumnName("kullanici").HasMaxLength(50);
            entity.Property(e => e.SifreHash).HasColumnName("sifre_hash").HasMaxLength(256);
            entity.Property(e => e.Ad).HasColumnName("ad").HasMaxLength(100);
            entity.Property(e => e.Soyad).HasColumnName("soyad").HasMaxLength(100);
            entity.Property(e => e.Rol).HasColumnName("rol").HasMaxLength(20);
            entity.HasIndex(e => e.Kullanici).IsUnique();
        });

        // SiparisTalep konfigürasyonu
        modelBuilder.Entity<SiparisTalep>(entity =>
        {
            entity.ToTable("siparis_talepler");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MasaId).HasColumnName("masa_id");
            entity.Property(e => e.Durum).HasColumnName("durum").HasMaxLength(20);
            entity.Property(e => e.OnaylayanUserId).HasColumnName("onaylayan_user_id");
            entity.Property(e => e.OlusturulmaTarihi).HasColumnName("olusturulma_tarihi");
            entity.HasOne(e => e.Masa).WithMany().HasForeignKey(e => e.MasaId);
            entity.HasOne(e => e.OnaylayanUser).WithMany().HasForeignKey(e => e.OnaylayanUserId);
        });

        // SiparisTalepSatir konfigürasyonu
        modelBuilder.Entity<SiparisTalepSatir>(entity =>
        {
            entity.ToTable("siparis_talep_satirlar");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SiparisTalepId).HasColumnName("siparis_talep_id");
            entity.Property(e => e.StokKartId).HasColumnName("stokkart_id");
            entity.HasOne(e => e.SiparisTalep).WithMany(t => t.Satirlar).HasForeignKey(e => e.SiparisTalepId);
            entity.HasOne(e => e.StokKart).WithMany().HasForeignKey(e => e.StokKartId);
        });
    }
}
