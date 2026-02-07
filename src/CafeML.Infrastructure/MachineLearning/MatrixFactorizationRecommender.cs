using CafeML.Core.Interfaces;
using CafeML.Infrastructure.Data;
using CafeML.Infrastructure.MachineLearning.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.ML;
using Microsoft.ML.Trainers;

namespace CafeML.Infrastructure.MachineLearning;

/// <summary>
/// Matrix Factorization ile ürün öneri sistemi
/// "Bu ürünü alanlar bunları da aldı" mantığı
/// </summary>
public class MatrixFactorizationRecommender : IProductRecommender
{
    private readonly MLContext _mlContext;
    private readonly CafeDbContext _dbContext;
    private ITransformer? _model;
    private PredictionEngine<ProductEntry, ProductPrediction>? _predictionEngine;
    private List<int>? _allProductIds;
    private Dictionary<int, string>? _productNames;

    public MatrixFactorizationRecommender(CafeDbContext dbContext)
    {
        _mlContext = new MLContext(seed: 42);
        _dbContext = dbContext;
    }

    /// <summary>
    /// Müşteriye ürün önerileri verir
    /// </summary>
    public async Task<IEnumerable<ProductRecommendation>> RecommendForCustomerAsync(int customerId, int topN = 5)
    {
        await EnsureModelTrainedAsync();
        
        if (_predictionEngine == null || _allProductIds == null)
            return Enumerable.Empty<ProductRecommendation>();

        // Müşterinin daha önce almadığı ürünleri bul
        var purchasedProducts = await _dbContext.FolyoHarlar
            .Join(_dbContext.Folyolar, fh => fh.FolyoId, f => f.Id, (fh, f) => new { fh, f })
            .Where(x => x.f.CariKartId == customerId)
            .Select(x => x.fh.StokKartId)
            .Distinct()
            .ToListAsync();

        var recommendations = new List<(int ProductId, float Score)>();

        foreach (var productId in _allProductIds.Where(p => !purchasedProducts.Contains(p)))
        {
            var prediction = _predictionEngine.Predict(new ProductEntry
            {
                CustomerId = customerId,
                ProductId = productId
            });

            if (prediction.Score > 0)
            {
                recommendations.Add((productId, prediction.Score));
            }
        }

        return recommendations
            .OrderByDescending(r => r.Score)
            .Take(topN)
            .Select(r => new ProductRecommendation
            {
                ProductId = r.ProductId,
                ProductName = _productNames?.GetValueOrDefault(r.ProductId) ?? $"Ürün #{r.ProductId}",
                Score = Math.Min(r.Score / 10f, 1f)  // Normalize to 0-1
            });
    }

    /// <summary>
    /// "Bunu alanlar bunları da aldı" önerileri
    /// </summary>
    public async Task<IEnumerable<ProductRecommendation>> GetRelatedProductsAsync(int productId, int topN = 5)
    {
        // Bu ürünü alan müşterilerin sipariş verilerini çek
        var ordersWithProduct = await _dbContext.FolyoHarlar
            .Where(fh => fh.StokKartId == productId)
            .Select(fh => fh.FolyoId)
            .Distinct()
            .ToListAsync();

        if (!ordersWithProduct.Any())
            return Enumerable.Empty<ProductRecommendation>();

        // Bu siparişlerdeki diğer ürünleri bul
        var relatedItems = await _dbContext.FolyoHarlar
            .Where(fh => ordersWithProduct.Contains(fh.FolyoId) && fh.StokKartId != null && fh.StokKartId != productId)
            .ToListAsync();  // Client-side'a çek

        if (!relatedItems.Any())
            return Enumerable.Empty<ProductRecommendation>();

        var relatedProducts = relatedItems
            .GroupBy(fh => fh.StokKartId!.Value)
            .Select(g => new { ProductId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(topN)
            .ToList();

        // Ürün isimlerini çek
        var productIds = relatedProducts.Select(r => r.ProductId).ToList();
        var names = await _dbContext.StokKartlar
            .Where(s => productIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Baslik ?? $"Ürün #{s.Id}");

        var maxCount = relatedProducts.Max(r => r.Count);

        return relatedProducts.Select(r => new ProductRecommendation
        {
            ProductId = r.ProductId,
            ProductName = names.GetValueOrDefault(r.ProductId) ?? $"Ürün #{r.ProductId}",
            Score = (float)r.Count / maxCount
        });
    }

    /// <summary>
    /// Modeli yeniden eğitir
    /// </summary>
    public async Task RetrainModelAsync()
    {
        _predictionEngine = null;
        _model = null;
        await TrainModelAsync();
    }

    /// <summary>
    /// Model eğitilmemişse eğitir
    /// </summary>
    private async Task EnsureModelTrainedAsync()
    {
        if (_predictionEngine == null)
        {
            await TrainModelAsync();
        }
    }

    /// <summary>
    /// Matrix Factorization modeli eğitir
    /// </summary>
    private async Task TrainModelAsync()
    {
        Console.WriteLine("📊 Ürün öneri modeli eğitiliyor (Matrix Factorization)...");

        // Müşteri-ürün satın alma matrisini oluştur
        var purchaseData = await _dbContext.FolyoHarlar
            .Join(_dbContext.Folyolar, fh => fh.FolyoId, f => f.Id, (fh, f) => new { fh, f })
            .Where(x => x.f.CariKartId != null && x.fh.StokKartId != null)
            .GroupBy(x => new { CustomerId = x.f.CariKartId!.Value, ProductId = x.fh.StokKartId!.Value })
            .Select(g => new ProductEntry
            {
                CustomerId = g.Key.CustomerId,
                ProductId = g.Key.ProductId,
                PurchaseCount = g.Count()
            })
            .ToListAsync();

        if (purchaseData.Count < 10)
        {
            Console.WriteLine("⚠️ Yeterli satın alma verisi yok.");
            return;
        }

        // Tüm ürün ID'lerini cache'le
        _allProductIds = purchaseData.Select(p => (int)p.ProductId).Distinct().ToList();
        
        // Ürün isimlerini cache'le
        _productNames = await _dbContext.StokKartlar
            .ToDictionaryAsync(s => s.Id, s => s.Baslik ?? $"Ürün #{s.Id}");

        var dataView = _mlContext.Data.LoadFromEnumerable(purchaseData);

        // Matrix Factorization pipeline
        var options = new MatrixFactorizationTrainer.Options
        {
            MatrixColumnIndexColumnName = nameof(ProductEntry.CustomerId),
            MatrixRowIndexColumnName = nameof(ProductEntry.ProductId),
            LabelColumnName = nameof(ProductEntry.PurchaseCount),
            NumberOfIterations = 20,
            ApproximationRank = 10,
            Quiet = true
        };

        var pipeline = _mlContext.Transforms.Conversion. MapValueToKey(
                outputColumnName: "CustomerIdEncoded",
                inputColumnName: nameof(ProductEntry.CustomerId))
            .Append(_mlContext.Transforms.Conversion.MapValueToKey(
                outputColumnName: "ProductIdEncoded",
                inputColumnName: nameof(ProductEntry.ProductId)))
            .Append(_mlContext.Recommendation().Trainers.MatrixFactorization(
                labelColumnName: nameof(ProductEntry.PurchaseCount),
                matrixColumnIndexColumnName: "CustomerIdEncoded",
                matrixRowIndexColumnName: "ProductIdEncoded",
                numberOfIterations: 20,
                approximationRank: 10));

        _model = pipeline.Fit(dataView);
        _predictionEngine = _mlContext.Model.CreatePredictionEngine<ProductEntry, ProductPrediction>(_model);

        Console.WriteLine($"✅ Öneri modeli eğitildi ({purchaseData.Count} satın alma kaydı)");
    }
}
