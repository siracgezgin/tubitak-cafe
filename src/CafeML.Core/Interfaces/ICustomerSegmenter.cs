namespace CafeML.Core.Interfaces;

/// <summary>
/// Müşteri segmentasyonu servisi interface'i
/// </summary>
public interface ICustomerSegmenter
{
    /// <summary>
    /// Tüm müşterileri segmentlere ayırır
    /// </summary>
    Task<IEnumerable<CustomerSegment>> SegmentCustomersAsync();
    
    /// <summary>
    /// Belirli bir müşterinin segmentini belirler
    /// </summary>
    Task<CustomerSegment> GetCustomerSegmentAsync(int customerId);
    
    /// <summary>
    /// Segmentasyon modelini yeniden eğitir
    /// </summary>
    Task RetrainModelAsync();
}

/// <summary>
/// Müşteri segmenti
/// </summary>
public class CustomerSegment
{
    public int CustomerId { get; set; }
    public int ClusterId { get; set; }
    public string SegmentName { get; set; } = string.Empty;
    
    // RFM skorları
    public float Recency { get; set; }     // Son sipariş günü sayısı
    public float Frequency { get; set; }   // Toplam sipariş sayısı
    public float Monetary { get; set; }    // Toplam harcama
    
    public float[] Distances { get; set; } = Array.Empty<float>();
}
