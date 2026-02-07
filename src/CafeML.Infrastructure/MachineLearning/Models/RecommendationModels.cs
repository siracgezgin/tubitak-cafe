namespace CafeML.Infrastructure.MachineLearning.Models;

/// <summary>
/// Matrix Factorization için satın alma verisi
/// </summary>
public class ProductEntry
{
    public float CustomerId { get; set; }
    public float ProductId { get; set; }
    public float PurchaseCount { get; set; }  // Satın alma sayısı (rating yerine)
}

/// <summary>
/// Ürün tahmini sonucu
/// </summary>
public class ProductPrediction
{
    public float Score { get; set; }
}
