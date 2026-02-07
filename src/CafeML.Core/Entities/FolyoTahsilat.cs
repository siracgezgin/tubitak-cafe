namespace CafeML.Core.Entities;

/// <summary>
/// Ödeme kayıtları - NARPOS cffolyotahsilat tablosu
/// </summary>
public class FolyoTahsilat
{
    public int Id { get; set; }
    public int? SezonId { get; set; }
    public int BtipiId { get; set; }
    public int FolyoId { get; set; }
    public int FolyoHesapId { get; set; }
    public int? CariHareketId { get; set; }
    public int? CariKartId { get; set; }
    public int? OdemeAraciId { get; set; }
    public DateTime Tarih { get; set; }
    public int BelgeSira { get; set; }
    public decimal DKuru { get; set; } = 1;
    public decimal Carpan { get; set; } = 1;
    public int IsIptal { get; set; } = 0;
    public string Pb { get; set; } = "TRY";
    public decimal DTutari { get; set; } = 0;
    public decimal Tutari { get; set; } = 0;
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? IUserId { get; set; }
    public DateTime? CancelledAt { get; set; }
    public Guid? Guid { get; set; }

    // Navigation properties
    public virtual Folyo? Folyo { get; set; }
}
