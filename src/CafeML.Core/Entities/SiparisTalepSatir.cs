namespace CafeML.Core.Entities;

/// <summary>
/// Sipariş talep satırı - her üründen kaç adet istendiği
/// </summary>
public class SiparisTalepSatir
{
    public int Id { get; set; }
    public int SiparisTalepId { get; set; }
    public int StokKartId { get; set; }
    public int Miktar { get; set; } = 1;
    public string? Not { get; set; }
    
    // Navigation
    public virtual SiparisTalep? SiparisTalep { get; set; }
    public virtual StokKart? StokKart { get; set; }
}
