namespace CafeML.Core.Entities;

/// <summary>
/// Menü-Ürün ilişkisi - NARPOS cfmenustokkart tablosu
/// </summary>
public class MenuStokKart
{
    public int MenuGrupId { get; set; }
    public int MenuId { get; set; }
    public int StokKartId { get; set; }
    public string? FisYazici { get; set; }
    public short SortOrder { get; set; } = 9999;
    public bool Enabled { get; set; } = true;

    // Navigation properties
    public virtual MenuGrup? MenuGrup { get; set; }
    public virtual StokKart? StokKart { get; set; }
}
