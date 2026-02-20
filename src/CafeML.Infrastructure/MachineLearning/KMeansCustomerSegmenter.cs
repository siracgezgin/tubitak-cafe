using CafeML.Core.Interfaces;
using CafeML.Infrastructure.Data;
using CafeML.Infrastructure.MachineLearning.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.ML;

namespace CafeML.Infrastructure.MachineLearning;

/// <summary>
/// K-Means kümeleme ile müşteri segmentasyonu
/// RFM (Recency, Frequency, Monetary) analizi kullanır
/// </summary>
public class KMeansCustomerSegmenter : ICustomerSegmenter
{
    private readonly MLContext _mlContext;
    private readonly CafeDbContext _dbContext;
    private ITransformer? _model;
    private PredictionEngine<CustomerRfmData, CustomerClusterPrediction>? _predictionEngine;
    
    // Segment isimleri
    private static readonly Dictionary<int, string> SegmentNames = new()
    {
        { 0, "En Değerli Müşteriler" },    // Düşük R, Yüksek F, Yüksek M
        { 1, "Sadık Müşteriler" },          // Orta R, Yüksek F, Orta M
        { 2, "Potansiyel Müşteriler" },     // Yüksek R, Düşük F, Düşük M
        { 3, "Risk Altındaki Müşteriler" }  // Yüksek R, Orta F, Orta M
    };

    private const int NumberOfClusters = 4;

    public KMeansCustomerSegmenter(CafeDbContext dbContext)
    {
        _mlContext = new MLContext(seed: 42);
        _dbContext = dbContext;
    }

    /// <summary>
    /// Tüm müşterileri segmentlere ayırır
    /// </summary>
    public async Task<IEnumerable<CustomerSegment>> SegmentCustomersAsync()
    {
        var rfmData = await CalculateRfmScoresAsync();
        
        if (!rfmData.Any())
        {
            return Enumerable.Empty<CustomerSegment>();
        }

        // Model yoksa eğit
        if (_predictionEngine == null)
        {
            await TrainModelAsync(rfmData);
        }

        var results = new List<CustomerSegment>();

        foreach (var customer in rfmData)
        {
            var prediction = _predictionEngine!.Predict(customer);
            var clusterId = (int)prediction.PredictedClusterId;
            
            results.Add(new CustomerSegment
            {
                CustomerId = customer.CustomerId,
                ClusterId = clusterId,
                SegmentName = GetSegmentName(clusterId, customer),
                Recency = customer.Recency,
                Frequency = customer.Frequency,
                Monetary = customer.Monetary,
                Distances = prediction.Distances
            });
        }

        return results.OrderBy(s => s.ClusterId).ThenByDescending(s => s.Monetary);
    }

    /// <summary>
    /// Belirli bir müşterinin segmentini belirler
    /// </summary>
    public async Task<CustomerSegment> GetCustomerSegmentAsync(int customerId)
    {
        var rfmData = await CalculateRfmScoresAsync();
        var customer = rfmData.FirstOrDefault(c => c.CustomerId == customerId);
        
        if (customer == null)
        {
            return new CustomerSegment { CustomerId = customerId, SegmentName = "Bilinmiyor" };
        }

        if (_predictionEngine == null)
        {
            await TrainModelAsync(rfmData);
        }

        var prediction = _predictionEngine!.Predict(customer);
        var clusterId = (int)prediction.PredictedClusterId;
        
        return new CustomerSegment
        {
            CustomerId = customer.CustomerId,
            ClusterId = clusterId,
            SegmentName = GetSegmentName(clusterId, customer),
            Recency = customer.Recency,
            Frequency = customer.Frequency,
            Monetary = customer.Monetary,
            Distances = prediction.Distances
        };
    }

    /// <summary>
    /// Modeli yeniden eğitir
    /// </summary>
    public async Task RetrainModelAsync()
    {
        _predictionEngine = null;
        _model = null;
        var rfmData = await CalculateRfmScoresAsync();
        await TrainModelAsync(rfmData);
    }

    /// <summary>
    /// RFM skorlarını hesaplar
    /// </summary>
    private async Task<List<CustomerRfmData>> CalculateRfmScoresAsync()
    {
        var today = DateTime.UtcNow.Date;

        // Müşteri bazlı sipariş istatistikleri
        var customerStats = await _dbContext.Folyolar
            .Where(f => f.CariKartId != null && f.IsIptal == 0 && f.Tarih != null)
            .GroupBy(f => f.CariKartId!.Value)
            .Select(g => new
            {
                CustomerId = g.Key,
                LastOrderDate = g.Max(f => f.Tarih),
                OrderCount = g.Count(),
                TotalSpent = g.Sum(f => f.Tutari)
            })
            .ToListAsync();

        return customerStats.Select(c => new CustomerRfmData
        {
            CustomerId = c.CustomerId,
            Recency = (float)(today - c.LastOrderDate!.Value.Date).TotalDays,
            Frequency = c.OrderCount,
            Monetary = (float)c.TotalSpent
        }).ToList();
    }

    /// <summary>
    /// K-Means modelini eğitir
    /// </summary>
    private Task TrainModelAsync(List<CustomerRfmData> rfmData)
    {
        Console.WriteLine($"[INFO] {rfmData.Count} müşteri ile K-Means segmentasyonu eğitiliyor...");

        var dataView = _mlContext.Data.LoadFromEnumerable(rfmData);

        // Normalize et ve K-Means uygula
        var pipeline = _mlContext.Transforms.NormalizeMinMax("RecencyNorm", nameof(CustomerRfmData.Recency))
            .Append(_mlContext.Transforms.NormalizeMinMax("FrequencyNorm", nameof(CustomerRfmData.Frequency)))
            .Append(_mlContext.Transforms.NormalizeMinMax("MonetaryNorm", nameof(CustomerRfmData.Monetary)))
            .Append(_mlContext.Transforms.Concatenate("Features", "RecencyNorm", "FrequencyNorm", "MonetaryNorm"))
            .Append(_mlContext.Clustering.Trainers.KMeans(
                featureColumnName: "Features",
                numberOfClusters: NumberOfClusters));

        _model = pipeline.Fit(dataView);
        _predictionEngine = _mlContext.Model.CreatePredictionEngine<CustomerRfmData, CustomerClusterPrediction>(_model);
        
        Console.WriteLine("[OK] K-Means segmentasyonu tamamlandı!");
        
        return Task.CompletedTask;
    }

    /// <summary>
    /// Segment ismi belirler (RFM değerlerine göre)
    /// </summary>
    private string GetSegmentName(int clusterId, CustomerRfmData customer)
    {
        // RFM değerlerine göre anlamlı segment isimleri
        if (customer.Recency <= 30 && customer.Frequency >= 10 && customer.Monetary >= 1000)
            return "VIP - En Değerli";
        
        if (customer.Recency <= 60 && customer.Frequency >= 5)
            return "Sadık Müşteri";
        
        if (customer.Recency > 180)
            return "Uyuyan Müşteri";
        
        if (customer.Recency > 90 && customer.Frequency >= 3)
            return "Risk Altında";
        
        if (customer.Frequency <= 2)
            return "Yeni Müşteri";
        
        return SegmentNames.GetValueOrDefault(clusterId, $"Segment {clusterId}");
    }

    /// <summary>
    /// Segment özetini döndürür
    /// </summary>
    public async Task<Dictionary<string, object>> GetSegmentSummaryAsync()
    {
        var segments = await SegmentCustomersAsync();
        var segmentList = segments.ToList();
        
        var summary = segmentList
            .GroupBy(s => s.SegmentName)
            .ToDictionary(
                g => g.Key,
                g => (object)new
                {
                    MusteriSayisi = g.Count(),
                    OrtalamaRecency = Math.Round(g.Average(s => s.Recency), 1),
                    OrtalamaFrequency = Math.Round(g.Average(s => s.Frequency), 1),
                    OrtalamaMonetary = Math.Round(g.Average(s => (double)s.Monetary), 2),
                    ToplamCiro = Math.Round(g.Sum(s => (double)s.Monetary), 2)
                });

        return summary;
    }
}
