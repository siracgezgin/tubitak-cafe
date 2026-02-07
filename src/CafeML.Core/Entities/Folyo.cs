namespace CafeML.Core.Entities;

/// <summary>
/// Adisyon/Fiş bilgisi - NARPOS cffolyo tablosu
/// </summary>
public class Folyo
{
    public int Id { get; set; }
    public int MasaId { get; set; }
    public string? FolyoTipi { get; set; } = "STD";
    public int? CariKartId { get; set; }
    public int? GunsonuId { get; set; }
    public string? OdaNo { get; set; }
    public int? BtipiId { get; set; }
    public DateTime? Tarih { get; set; }
    public int? BelgeSira { get; set; }
    public decimal Tutari { get; set; } = 0;
    public decimal Odenen { get; set; } = 0;
    public decimal Bakiye => Tutari - Odenen;
    public int IsHesapKapali { get; set; } = 0;
    public int IsKapali { get; set; } = 0;
    public int IsIptal { get; set; } = 0;
    public DateTime? SonSiparis { get; set; }
    public string? Aciklama { get; set; }
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? IUserId { get; set; }
    public DateTime? CancelledAt { get; set; }
    public Guid? Guid { get; set; }

    // Navigation properties
    public virtual Masa? Masa { get; set; }
    public virtual CariKart? CariKart { get; set; }
    public virtual ICollection<FolyoHar> FolyoHarlar { get; set; } = new List<FolyoHar>();
    public virtual ICollection<FolyoTahsilat> Tahsilatlar { get; set; } = new List<FolyoTahsilat>();
}
