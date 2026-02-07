namespace CafeML.Core.Entities;

/// <summary>
/// Masa bilgileri - NARPOS cfmasa tablosu
/// </summary>
public class Masa
{
    public int Id { get; set; }
    public int SubeId { get; set; }
    public int SalonId { get; set; }
    public int? CariKartId { get; set; }
    public string Kodu { get; set; } = string.Empty;
    public string Baslik { get; set; } = string.Empty;
    public string? Renk { get; set; }
    public int SortOrder { get; set; } = 9999;
    public bool Enabled { get; set; } = true;
    public int CompanyId { get; set; }

    // Navigation properties
    public virtual Salon? Salon { get; set; }
    public virtual ICollection<Folyo> Folyolar { get; set; } = new List<Folyo>();
}
