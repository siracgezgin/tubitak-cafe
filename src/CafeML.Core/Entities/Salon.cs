namespace CafeML.Core.Entities;

/// <summary>
/// Salon bilgileri - NARPOS cfsalon tablosu
/// </summary>
public class Salon
{
    public int Id { get; set; }
    public int SubeId { get; set; }
    public string Kodu { get; set; } = string.Empty;
    public string Baslik { get; set; } = string.Empty;
    public string? Renk { get; set; }
    public int SortOrder { get; set; } = 9999;
    public bool Enabled { get; set; } = true;
    public int CompanyId { get; set; }

    // Navigation properties
    public virtual ICollection<Masa> Masalar { get; set; } = new List<Masa>();
}
