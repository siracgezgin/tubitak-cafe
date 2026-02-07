namespace CafeML.Infrastructure.MachineLearning.Models;

/// <summary>
/// RFM analizi için müşteri verisi
/// </summary>
public class CustomerRfmData
{
    public int CustomerId { get; set; }
    
    /// <summary>Son alışverişten bu yana geçen gün sayısı</summary>
    public float Recency { get; set; }
    
    /// <summary>Toplam alışveriş sayısı</summary>
    public float Frequency { get; set; }
    
    /// <summary>Toplam harcama tutarı</summary>
    public float Monetary { get; set; }
}

/// <summary>
/// K-Means kümeleme sonucu
/// </summary>
public class CustomerClusterPrediction
{
    public uint PredictedClusterId { get; set; }
    public float[] Distances { get; set; } = Array.Empty<float>();
}
