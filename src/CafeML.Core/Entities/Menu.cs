namespace CafeML.Core.Entities;

/// <summary>
/// Menü bilgileri - NARPOS cfmenu tablosu
/// </summary>
public class Menu
{
    public int Id { get; set; }
    public int SubeId { get; set; }
    public string? Baslik { get; set; }
    public string? MenuCode { get; set; }
    public bool Enabled { get; set; } = true;
    public int CompanyId { get; set; }

    // Navigation properties
    public virtual ICollection<MenuGrup> MenuGruplar { get; set; } = new List<MenuGrup>();
}
