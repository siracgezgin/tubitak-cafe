using CafeML.Core.Interfaces;
using CafeML.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CafeML.Infrastructure.MachineLearning;

/// <summary>
/// Basit hareketli ortalama ve trend bazlı satış tahmini
/// MKL bağımlılığı gerektirmez - production için SSA/ARIMA ile değiştirilebilir
/// </summary>
public class SimpleForecaster : ISalesForecaster
{
    private readonly CafeDbContext _dbContext;
    private const int MovingAverageWindow = 7;  // 7 günlük hareketli ortalama
    private const float ConfidenceLevel = 0.90f;

    public SimpleForecaster(CafeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Gelecek günler için satış tahmini yapar
    /// </summary>
    public async Task<IEnumerable<SalesForecast>> ForecastAsync(int horizonDays = 7)
    {
        var salesData = await GetDailySalesAsync();
        
        if (salesData.Count < MovingAverageWindow)
        {
            return Enumerable.Empty<SalesForecast>();
        }

        // Son N günün ortalaması ve standart sapması
        var recentSales = salesData.TakeLast(MovingAverageWindow).Select(x => x.Total).ToList();
        var average = recentSales.Average();
        var stdDev = CalculateStdDev(recentSales, average);
        
        // Haftalık trend hesapla
        var weeklyTrend = CalculateWeeklyTrend(salesData);
        
        // Hafta içi/sonu düzeltme faktörleri
        var dayFactors = CalculateDayOfWeekFactors(salesData);

        var results = new List<SalesForecast>();
        var today = DateTime.UtcNow.Date;

        for (int i = 0; i < horizonDays; i++)
        {
            var forecastDate = today.AddDays(i + 1);
            var dayOfWeek = (int)forecastDate.DayOfWeek;
            
            // Temel tahmin = Ortalama * Gün faktörü * Trend
            var basePrediction = average * dayFactors[dayOfWeek] * (1 + weeklyTrend);
            
            // Güven aralığı (1.5 sigma)
            var margin = (float)(stdDev * 1.5);

            results.Add(new SalesForecast
            {
                Date = forecastDate,
                PredictedAmount = (float)basePrediction,
                LowerBound = (float)Math.Max(0, basePrediction - margin),
                UpperBound = (float)(basePrediction + margin),
                Confidence = ConfidenceLevel
            });
        }

        return results;
    }

    /// <summary>
    /// Ürün bazlı talep tahmini
    /// </summary>
    public async Task<IEnumerable<SalesForecast>> ForecastProductAsync(int productId, int horizonDays = 7)
    {
        var productSales = await GetProductDailySalesAsync(productId);
        
        if (productSales.Count < 7)
        {
            return Enumerable.Empty<SalesForecast>();
        }

        var recentSales = productSales.TakeLast(7).Select(x => x.Total).ToList();
        var average = recentSales.Average();
        var stdDev = CalculateStdDev(recentSales, average);

        var results = new List<SalesForecast>();
        var today = DateTime.UtcNow.Date;

        for (int i = 0; i < horizonDays; i++)
        {
            var forecastDate = today.AddDays(i + 1);
            var margin = (float)(stdDev * 1.5);

            results.Add(new SalesForecast
            {
                Date = forecastDate,
                PredictedAmount = (float)average,
                LowerBound = (float)Math.Max(0, average - margin),
                UpperBound = (float)(average + margin),
                Confidence = ConfidenceLevel
            });
        }

        return results;
    }

    /// <summary>
    /// Modeli yeniden eğitir (bu implementasyonda cache temizler)
    /// </summary>
    public Task RetrainModelAsync()
    {
        // Simple forecaster stateless olduğu için eğitim gerektirmez
        Console.WriteLine("[OK] Model güncellendi (SimpleForecaster)");
        return Task.CompletedTask;
    }

    /// <summary>
    /// Günlük satış verilerini veritabanından çeker
    /// </summary>
    private async Task<List<(DateTime Date, double Total)>> GetDailySalesAsync()
    {
        return await _dbContext.Folyolar
            .Where(f => f.IsIptal == 0 && f.Tarih != null)
            .GroupBy(f => f.Tarih!.Value.Date)
            .Select(g => new { Date = g.Key, Total = g.Sum(f => (double)f.Tutari) })
            .OrderBy(x => x.Date)
            .Select(x => ValueTuple.Create(x.Date, x.Total))
            .ToListAsync();
    }

    /// <summary>
    /// Ürün bazlı günlük satış verilerini çeker
    /// </summary>
    private async Task<List<(DateTime Date, double Total)>> GetProductDailySalesAsync(int productId)
    {
        return await _dbContext.FolyoHarlar
            .Where(fh => fh.StokKartId == productId && fh.IsIptal == 0)
            .Join(_dbContext.Folyolar, fh => fh.FolyoId, f => f.Id, (fh, f) => new { fh, f })
            .Where(x => x.f.Tarih != null)
            .GroupBy(x => x.f.Tarih!.Value.Date)
            .Select(g => new { Date = g.Key, Total = g.Sum(x => (double)(x.fh.Miktar ?? 0)) })
            .OrderBy(x => x.Date)
            .Select(x => ValueTuple.Create(x.Date, x.Total))
            .ToListAsync();
    }

    /// <summary>
    /// Haftalık trend hesaplar (son hafta vs önceki hafta)
    /// </summary>
    private double CalculateWeeklyTrend(List<(DateTime Date, double Total)> data)
    {
        if (data.Count < 14) return 0;

        var lastWeek = data.TakeLast(7).Average(x => x.Total);
        var previousWeek = data.Skip(data.Count - 14).Take(7).Average(x => x.Total);

        if (previousWeek == 0) return 0;
        return (lastWeek - previousWeek) / previousWeek;
    }

    /// <summary>
    /// Hafta günlerine göre satış faktörleri hesaplar
    /// </summary>
    private double[] CalculateDayOfWeekFactors(List<(DateTime Date, double Total)> data)
    {
        var factors = new double[7];
        var counts = new int[7];
        var totals = new double[7];

        foreach (var item in data)
        {
            var dayIndex = (int)item.Date.DayOfWeek;
            totals[dayIndex] += item.Total;
            counts[dayIndex]++;
        }

        var overallAvg = data.Average(x => x.Total);
        
        for (int i = 0; i < 7; i++)
        {
            if (counts[i] > 0)
            {
                var dayAvg = totals[i] / counts[i];
                factors[i] = overallAvg > 0 ? dayAvg / overallAvg : 1.0;
            }
            else
            {
                factors[i] = 1.0;
            }
        }

        return factors;
    }

    /// <summary>
    /// Standart sapma hesaplar
    /// </summary>
    private double CalculateStdDev(List<double> values, double mean)
    {
        if (values.Count < 2) return 0;
        var sumOfSquares = values.Sum(v => Math.Pow(v - mean, 2));
        return Math.Sqrt(sumOfSquares / (values.Count - 1));
    }
}
