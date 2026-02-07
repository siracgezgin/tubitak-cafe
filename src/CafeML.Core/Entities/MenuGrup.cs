namespace CafeML.Core.Entities;

/// <summary>
/// Menü grupları - NARPOS cfmenugrup tablosu
/// </summary>
public class MenuGrup
{
    public int Id { get; set; }
    public int CompanyId { get; set; } = 1;
    public int? MenuId { get; set; }
    public string? AnaGrup { get; set; }
    public string? AltGrup { get; set; }
    public int SortOrder { get; set; } = 9999;
    public bool Enabled { get; set; } = true;
    public Guid? Guid { get; set; }

    // Navigation properties
    public virtual Menu? Menu { get; set; }
    public virtual ICollection<MenuStokKart> MenuStokKartlar { get; set; } = new List<MenuStokKart>();
}
