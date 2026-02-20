namespace CafeML.Core.Entities;

/// <summary>
/// Kullanıcı bilgileri - Rol bazlı erişim kontrolü
/// Roller: Admin, SubAdmin, Garson
/// </summary>
public class User
{
    public int Id { get; set; }
    public string Kullanici { get; set; } = string.Empty;
    public string SifreHash { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Soyad { get; set; } = string.Empty;
    
    /// <summary>
    /// Rol: Admin, SubAdmin, Garson
    /// Admin: Tüm yetkiler, SubAdmin+Garson oluşturabilir
    /// SubAdmin: Admin ile aynı görünüm, sadece Garson oluşturabilir, Admin'i silemez
    /// Garson: Sadece sipariş alabilir
    /// </summary>
    public string Rol { get; set; } = "Garson";
    
    /// <summary>
    /// Bu hesabı kim oluşturdu (Admin/SubAdmin Id)
    /// </summary>
    public int? OlusturanId { get; set; }
    
    public bool Enabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
