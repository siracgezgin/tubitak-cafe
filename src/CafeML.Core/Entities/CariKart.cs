namespace CafeML.Core.Entities;

/// <summary>
/// Müşteri bilgileri - Cari kart
/// </summary>
public class CariKart
{
    public int Id { get; set; }
    public string? Kodu { get; set; }
    public string? Unvan { get; set; }
    public string? Ad { get; set; }
    public string? Soyad { get; set; }
    public string? Telefon { get; set; }
    public string? Email { get; set; }
    public string? Adres { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool Enabled { get; set; } = true;
    
    // Navigation properties
    public virtual ICollection<Folyo> Folyolar { get; set; } = new List<Folyo>();
}
