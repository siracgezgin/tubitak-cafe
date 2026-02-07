namespace CafeML.Core.Interfaces;

/// <summary>
/// Satış tahmini servisi interface'i
/// </summary>
public interface ISalesForecaster
{
    /// <summary>
    /// Gelecek günler için satış tahmini yapar
    /// </summary>
    /// <param name="horizonDays">Kaç gün ilerisi tahmin edilecek</param>
    /// <returns>Günlük satış tahminleri</returns>
    Task<IEnumerable<SalesForecast>> ForecastAsync(int horizonDays = 7);
    
    /// <summary>
    /// Belirli bir ürün için talep tahmini yapar
    /// </summary>
    Task<IEnumerable<SalesForecast>> ForecastProductAsync(int productId, int horizonDays = 7);
    
    /// <summary>
    /// Modeli yeniden eğitir
    /// </summary>
    Task RetrainModelAsync();
}

/// <summary>
/// Satış tahmini sonucu
/// </summary>
public class SalesForecast
{
    public DateTime Date { get; set; }
    public float PredictedAmount { get; set; }
    public float LowerBound { get; set; }
    public float UpperBound { get; set; }
    public float Confidence { get; set; }
}
