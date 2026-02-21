namespace CafeML.Core.Interfaces;

/// <summary>
/// Apriori / Market Basket Analysis tabanlı ürün öneri servisi.
/// Gerçek sipariş verilerinden birliktelik kuralları üretir.
/// </summary>
public interface IAprioriRecommender
{
    /// <summary>
    /// Sepetteki ürünlere göre "şunu da ekle" önerisi döner.
    /// </summary>
    Task<IEnumerable<BasketRecommendation>> RecommendFromBasketAsync(
        IEnumerable<int> basketProductIds, int topN = 5);

    /// <summary>
    /// En güçlü birliktelik kurallarını listeler.
    /// </summary>
    Task<IEnumerable<AssociationRule>> GetTopRulesAsync(int topN = 20);

    /// <summary>
    /// En sık birlikte satılan ürün çiftlerini listeler.
    /// </summary>
    Task<IEnumerable<ProductPairFrequency>> GetTopPairsAsync(int topN = 15);

    /// <summary>
    /// Modeli yeniden eğitir (önbelleği temizler).
    /// </summary>
    Task RetrainAsync();
}

public class AssociationRule
{
    public string Antecedent    { get; set; } = "";   // X
    public string Consequent    { get; set; } = "";   // Y
    public List<int> AntecedentIds { get; set; } = [];
    public List<int> ConsequentIds { get; set; } = [];
    public double Support    { get; set; }
    public double Confidence { get; set; }
    public double Lift       { get; set; }
    public string ActionText { get; set; } = "";
}

public class BasketRecommendation
{
    public int    ProductId   { get; set; }
    public string ProductName { get; set; } = "";
    public double Confidence  { get; set; }
    public double Lift        { get; set; }
    public string Reason      { get; set; } = "";  // "Adana Kebap ile birlikte %85 alınıyor"
}

public class ProductPairFrequency
{
    public int    ProductAId   { get; set; }
    public int    ProductBId   { get; set; }
    public string ProductAName { get; set; } = "";
    public string ProductBName { get; set; } = "";
    public int    Count        { get; set; }
    public double Support      { get; set; }
}
