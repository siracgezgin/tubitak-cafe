using Microsoft.ML;
using Microsoft.ML.Transforms.TimeSeries;

namespace CafeML.Infrastructure.MachineLearning.Models;

/// <summary>
/// SSA modeli için girdi verisi
/// </summary>
public class SalesData
{
    public DateTime Date { get; set; }
    public float TotalSales { get; set; }
}

/// <summary>
/// SSA modeli tahmin çıktısı
/// </summary>
public class SalesPrediction
{
    public float[] ForecastedSales { get; set; } = Array.Empty<float>();
    public float[] LowerBoundSales { get; set; } = Array.Empty<float>();
    public float[] UpperBoundSales { get; set; } = Array.Empty<float>();
}
