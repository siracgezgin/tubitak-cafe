namespace CafeML.Core.Entities;

/// <summary>
/// Sipariş satırları - NARPOS cffolyohar tablosu
/// </summary>
public class FolyoHar
{
    public int Id { get; set; }
    public int? FolyoId { get; set; }
    public int? FolyoHesapId { get; set; }
    public short IslemNo { get; set; } = 1;
    public int? DepoId { get; set; }
    public int? StokKartId { get; set; }
    public decimal? Miktar { get; set; }
    public decimal? Porsiyon { get; set; }
    public decimal BFiyat { get; set; } = 0;
    public string? SipNotu { get; set; }
    public decimal KdvTutari { get; set; } = 0;
    public decimal IndYuzde { get; set; } = 0;
    public decimal IndTutari { get; set; } = 0;
    public decimal KdvOrani { get; set; } = 0;
    public decimal Tutari { get; set; } = 0;
    public decimal SatirNet { get; set; } = 0;
    public string Pb { get; set; } = "TRY";
    public int IsIkram { get; set; } = 0;
    public int IsKapali { get; set; } = 0;
    public int IsIptal { get; set; } = 0;
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? IUserId { get; set; }
    public DateTime? CancelledAt { get; set; }
    public Guid? Guid { get; set; }

    // Navigation properties
    public virtual Folyo? Folyo { get; set; }
    public virtual StokKart? StokKart { get; set; }
}
