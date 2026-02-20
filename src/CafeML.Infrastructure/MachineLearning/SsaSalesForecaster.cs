using CafeML.Core.Interfaces;
using CafeML.Infrastructure.Data;
using CafeML.Infrastructure.MachineLearning.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.ML;
using Microsoft.ML.Transforms.TimeSeries;

namespace CafeML.Infrastructure.MachineLearning;

/// <summary>
/// ML.NET SSA (Singular Spectrum Analysis) ile satış tahmini
/// </summary>
public class SsaSalesForecaster : ISalesForecaster
{
    private readonly MLContext _mlContext;
    private readonly CafeDbContext _dbContext;
    private ITransformer? _model;
    private TimeSeriesPredictionEngine<SalesData, SalesPrediction>? _predictionEngine;
    
    // SSA parametreleri
    private const int WindowSize = 7;        // Haftalık döngü
    private const int SeriesLength = 365;    // 1 yıllık veri
    private const int TrainSize = 300;       // Eğitim için kullanılacak gün
    private const int Horizon = 7;           // Kaç gün ilerisi tahmin edilecek
    private const float ConfidenceLevel = 0.95f;

    public SsaSalesForecaster(CafeDbContext dbContext)
    {
        _mlContext = new MLContext(seed: 42);
        _dbContext = dbContext;
    }

    /// <summary>
    /// Gelecek günler için satış tahmini yapar
    /// </summary>
    public async Task<IEnumerable<SalesForecast>> ForecastAsync(int horizonDays = 7)
    {
        // Model yoksa eğit
        if (_predictionEngine == null)
        {
            await TrainModelAsync();
        }

        if (_predictionEngine == null)
        {
            return Enumerable.Empty<SalesForecast>();
        }

        // Tahmin yap
        var prediction = _predictionEngine.Predict();
        var results = new List<SalesForecast>();
        var today = DateTime.UtcNow.Date;

        for (int i = 0; i < Math.Min(horizonDays, prediction.ForecastedSales.Length); i++)
        {
            results.Add(new SalesForecast
            {
                Date = today.AddDays(i + 1),
                PredictedAmount = prediction.ForecastedSales[i],
                LowerBound = prediction.LowerBoundSales[i],
                UpperBound = prediction.UpperBoundSales[i],
                Confidence = ConfidenceLevel
            });
        }

        return results;
    }

    /// <summary>
    /// Belirli bir ürün için talep tahmini (basitleştirilmiş)
    /// </summary>
    public async Task<IEnumerable<SalesForecast>> ForecastProductAsync(int productId, int horizonDays = 7)
    {
        // Ürün bazlı veri çek
        var productSales = await GetProductSalesDataAsync(productId);
        
        if (productSales.Count < 30)
        {
            return Enumerable.Empty<SalesForecast>();
        }

        // Ürün için ayrı model eğit
        var pipeline = CreateSsaPipeline(Math.Min(productSales.Count, SeriesLength));
        var dataView = _mlContext.Data.LoadFromEnumerable(productSales);
        var model = pipeline.Fit(dataView);
        
        var engine = model.CreateTimeSeriesEngine<SalesData, SalesPrediction>(_mlContext);
        var prediction = engine.Predict();
        
        var results = new List<SalesForecast>();
        var today = DateTime.UtcNow.Date;

        for (int i = 0; i < Math.Min(horizonDays, prediction.ForecastedSales.Length); i++)
        {
            results.Add(new SalesForecast
            {
                Date = today.AddDays(i + 1),
                PredictedAmount = prediction.ForecastedSales[i],
                LowerBound = prediction.LowerBoundSales[i],
                UpperBound = prediction.UpperBoundSales[i],
                Confidence = ConfidenceLevel
            });
        }

        return results;
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
    /// Model eğitimi
    /// </summary>
    private async Task TrainModelAsync()
    {
        var salesData = await GetDailySalesDataAsync();
        
        if (salesData.Count < 30)
        {
            Console.WriteLine("[WARN] Yeterli veri yok. En az 30 günlük veri gerekli.");
            return;
        }

        Console.WriteLine($"[INFO] {salesData.Count} günlük veriyle model eğitiliyor...");

        var pipeline = CreateSsaPipeline(salesData.Count);
        var dataView = _mlContext.Data.LoadFromEnumerable(salesData);
        
        _model = pipeline.Fit(dataView);
        _predictionEngine = _model.CreateTimeSeriesEngine<SalesData, SalesPrediction>(_mlContext);
        
        Console.WriteLine("[OK] SSA modeli başarıyla eğitildi!");
    }

    /// <summary>
    /// SSA pipeline oluşturur
    /// </summary>
    private IEstimator<ITransformer> CreateSsaPipeline(int dataLength)
    {
        var windowSize = Math.Min(WindowSize, dataLength / 4);
        var seriesLength = Math.Min(dataLength, SeriesLength);
        var trainSize = Math.Min(dataLength - Horizon, TrainSize);

        return _mlContext.Forecasting.ForecastBySsa(
            outputColumnName: nameof(SalesPrediction.ForecastedSales),
            inputColumnName: nameof(SalesData.TotalSales),
            windowSize: windowSize,
            seriesLength: seriesLength,
            trainSize: trainSize,
            horizon: Horizon,
            confidenceLevel: ConfidenceLevel,
            confidenceLowerBoundColumn: nameof(SalesPrediction.LowerBoundSales),
            confidenceUpperBoundColumn: nameof(SalesPrediction.UpperBoundSales));
    }

    /// <summary>
    /// Günlük satış verilerini veritabanından çeker
    /// </summary>
    private async Task<List<SalesData>> GetDailySalesDataAsync()
    {
        var dailySales = await _dbContext.Folyolar
            .Where(f => f.IsIptal == 0 && f.Tarih != null)
            .GroupBy(f => f.Tarih!.Value.Date)
            .Select(g => new SalesData
            {
                Date = g.Key,
                TotalSales = (float)g.Sum(f => f.Tutari)
            })
            .OrderBy(x => x.Date)
            .ToListAsync();

        return dailySales;
    }

    /// <summary>
    /// Ürün bazlı günlük satış verilerini çeker
    /// </summary>
    private async Task<List<SalesData>> GetProductSalesDataAsync(int productId)
    {
        var productSales = await _dbContext.FolyoHarlar
            .Where(fh => fh.StokKartId == productId && fh.IsIptal == 0)
            .Join(_dbContext.Folyolar, fh => fh.FolyoId, f => f.Id, (fh, f) => new { fh, f })
            .Where(x => x.f.Tarih != null)
            .GroupBy(x => x.f.Tarih!.Value.Date)
            .Select(g => new SalesData
            {
                Date = g.Key,
                TotalSales = (float)g.Sum(x => x.fh.Miktar ?? 0)
            })
            .OrderBy(x => x.Date)
            .ToListAsync();

        return productSales;
    }

    /// <summary>
    /// Modeli dosyaya kaydeder
    /// </summary>
    public void SaveModel(string path)
    {
        if (_model == null)
        {
            throw new InvalidOperationException("Model henüz eğitilmedi.");
        }

        _mlContext.Model.Save(_model, null, path);
        Console.WriteLine($"💾 Model kaydedildi: {path}");
    }

    /// <summary>
    /// Modeli dosyadan yükler
    /// </summary>
    public void LoadModel(string path)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Model dosyası bulunamadı: {path}");
        }

        _model = _mlContext.Model.Load(path, out _);
        _predictionEngine = _model.CreateTimeSeriesEngine<SalesData, SalesPrediction>(_mlContext);
        Console.WriteLine($"📂 Model yüklendi: {path}");
    }
}
