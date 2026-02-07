namespace CafeML.Core.Entities;

/// <summary>
/// Ürün/Stok kartı - NARPOS stokkart tablosu
/// </summary>
public class StokKart
{
    public int Id { get; set; }
    public string? Birim { get; set; }
    public decimal? BCarpan2 { get; set; }
    public string? Birim2 { get; set; }
    public decimal? BCarpan3 { get; set; }
    public string? Birim3 { get; set; }
    public decimal KdvOrani { get; set; } = 0;
    public decimal BFDahilIptali { get; set; } = 0;
    public decimal BFOpsiyonluSatis { get; set; } = 0;
    public decimal MinAlisMiktari { get; set; } = 1;
    public int? RStokKartId { get; set; }
    public int? PerBransId { get; set; }
    public int? SozlesmeDeyazdir { get; set; }
    public string? KartTipi { get; set; } = "ürün";
    public string? Kodu { get; set; }
    public string? Baslik { get; set; }
    public char? HesapSekli { get; set; } = 'S';
    public string? DetayAciklama { get; set; }
    
    // Satış fiyatları
    public decimal BFSatis1 { get; set; } = 0;
    public decimal BFSatis2 { get; set; } = 0;
    public decimal BFSatis3 { get; set; } = 0;
    public decimal BFSatis4 { get; set; } = 0;
    public decimal BFSatis5 { get; set; } = 0;
    
    // Özel kodlar
    public string? OzelKod1 { get; set; }
    public string? OzelKod2 { get; set; }
    public string? OzelKod3 { get; set; }
    
    public int? StokGrupId { get; set; }
    public int? MarkaId { get; set; }
    public string? Resim { get; set; }
    public string? OemNo { get; set; }
    public string? Marka { get; set; }
    public string? Model { get; set; }
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int SortOrder { get; set; } = 9999;
    public string? Barkod { get; set; }
    public bool? Enabled { get; set; } = true;

    // Navigation properties
    public virtual ICollection<FolyoHar> FolyoHarlar { get; set; } = new List<FolyoHar>();
    public virtual ICollection<MenuStokKart> MenuStokKartlar { get; set; } = new List<MenuStokKart>();
}
