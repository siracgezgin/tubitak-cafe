namespace CafeML.Core.Interfaces;

/// <summary>
/// Ürün öneri sistemi interface'i
/// </summary>
public interface IProductRecommender
{
    /// <summary>
    /// Müşteriye ürün önerileri verir
    /// </summary>
    /// <param name="customerId">Müşteri ID</param>
    /// <param name="topN">Kaç öneri</param>
    Task<IEnumerable<ProductRecommendation>> RecommendForCustomerAsync(int customerId, int topN = 5);
    
    /// <summary>
    /// Ürün bazlı "bunu alanlar bunları da aldı" önerileri
    /// </summary>
    Task<IEnumerable<ProductRecommendation>> GetRelatedProductsAsync(int productId, int topN = 5);
    
    /// <summary>
    /// Öneri modelini yeniden eğitir
    /// </summary>
    Task RetrainModelAsync();
}

/// <summary>
/// Ürün önerisi
/// </summary>
public class ProductRecommendation
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public float Score { get; set; }
    public float ConfidencePercentage => Score * 100;
}
