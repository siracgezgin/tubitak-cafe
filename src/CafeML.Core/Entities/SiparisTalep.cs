namespace CafeML.Core.Entities;

/// <summary>
/// Müşteri sipariş talebi - onay bekleyen siparişler
/// </summary>
public class SiparisTalep
{
    public int Id { get; set; }
    public int MasaId { get; set; }
    
    /// <summary>
    /// Bekliyor, Onaylandi, Reddedildi
    /// </summary>
    public string Durum { get; set; } = "Bekliyor";
    
    public int? OnaylayanUserId { get; set; }
    public string? MusteriNotu { get; set; }
    public DateTime OlusturulmaTarihi { get; set; } = DateTime.UtcNow;
    public DateTime? OnayTarihi { get; set; }
    
    // Navigation
    public virtual Masa? Masa { get; set; }
    public virtual User? OnaylayanUser { get; set; }
    public virtual ICollection<SiparisTalepSatir> Satirlar { get; set; } = new List<SiparisTalepSatir>();
}
