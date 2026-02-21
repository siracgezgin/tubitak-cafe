using CafeML.Core.Interfaces;
using CafeML.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CafeML.Infrastructure.MachineLearning;

/// <summary>
/// Apriori / Market Basket Analysis — gerçek FolyoHar verisinden
/// birliktelik kuralları üretir ve önbellekte tutar.
/// Singleton servis olduğu için DbContext'e IServiceScopeFactory ile erişir.
/// </summary>
public class AprioriRecommender : IAprioriRecommender
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AprioriRecommender> _logger;

    // ── Önbellek ──────────────────────────────────
    private List<AssociationRule>?      _cachedRules;
    private List<ProductPairFrequency>? _cachedPairs;
    private Dictionary<int, string>?    _productNames;
    private int _totalTransactions;
    private DateTime _lastTrained = DateTime.MinValue;
    private readonly TimeSpan _cacheTtl = TimeSpan.FromMinutes(30);

    // ── Eşikler ───────────────────────────────────
    private const double MIN_SUPPORT    = 0.005;  // En az %0.5 siparişte geçsin
    private const double MIN_CONFIDENCE = 0.10;   // En az %10 güven
    private const double MIN_LIFT       = 1.0;    // Lift > 1.0 (bağımsızlıktan daha iyi)

    public AprioriRecommender(IServiceScopeFactory scopeFactory, ILogger<AprioriRecommender> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    // ────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ────────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<BasketRecommendation>> RecommendFromBasketAsync(
        IEnumerable<int> basketProductIds, int topN = 5)
    {
        await EnsureTrainedAsync();
        if (_cachedRules == null) return [];

        var basket = basketProductIds.ToHashSet();
        var scores = new Dictionary<int, (double Confidence, double Lift, string Reason)>();

        foreach (var rule in _cachedRules)
        {
            // Antecedent tamamen sepette varsa, consequent öner
            if (rule.AntecedentIds.All(id => basket.Contains(id)))
            {
                foreach (var cid in rule.ConsequentIds.Where(id => !basket.Contains(id)))
                {
                    var existing = scores.GetValueOrDefault(cid, (0, 0, ""));
                    if (rule.Confidence > existing.Confidence)
                        scores[cid] = (rule.Confidence, rule.Lift,
                            $"{rule.Antecedent} ile birlikte %{(int)(rule.Confidence * 100)} oranında alınıyor");
                }
            }
        }

        return scores
            .OrderByDescending(x => x.Value.Lift)
            .Take(topN)
            .Select(x => new BasketRecommendation
            {
                ProductId   = x.Key,
                ProductName = _productNames!.GetValueOrDefault(x.Key, $"Ürün #{x.Key}"),
                Confidence  = Math.Round(x.Value.Confidence, 3),
                Lift        = Math.Round(x.Value.Lift, 3),
                Reason      = x.Value.Reason
            });
    }

    public async Task<IEnumerable<AssociationRule>> GetTopRulesAsync(int topN = 20)
    {
        await EnsureTrainedAsync();
        return (_cachedRules ?? [])
            .OrderByDescending(r => r.Lift)
            .Take(topN);
    }

    public async Task<IEnumerable<ProductPairFrequency>> GetTopPairsAsync(int topN = 15)
    {
        await EnsureTrainedAsync();
        return (_cachedPairs ?? [])
            .OrderByDescending(p => p.Count)
            .Take(topN);
    }

    public async Task RetrainAsync()
    {
        _cachedRules = null;
        _cachedPairs = null;
        _lastTrained = DateTime.MinValue;
        await EnsureTrainedAsync();
    }

    // ────────────────────────────────────────────────────────────────────
    // CORE ALGORİTMA
    // ────────────────────────────────────────────────────────────────────

    private async Task EnsureTrainedAsync()
    {
        if (_cachedRules != null && DateTime.UtcNow - _lastTrained < _cacheTtl)
            return;

        _logger.LogInformation("[Apriori] Eğitim başlıyor…");
        var sw = System.Diagnostics.Stopwatch.StartNew();

        using var scope = _scopeFactory.CreateScope();
        var _db = scope.ServiceProvider.GetRequiredService<CafeDbContext>();

        // 1. İşlemleri yükle: her FolyoId için ürün id listesi
        var transactions = await _db.FolyoHarlar
            .AsNoTracking()
            .Where(fh => fh.Tutari > 0 && fh.FolyoId != null && fh.StokKartId != null)
            .GroupBy(fh => fh.FolyoId!.Value)
            .Select(g => g.Select(fh => fh.StokKartId!.Value).Distinct().ToList())
            .ToListAsync();

        // Aynı zamanda SiparisTalepSatir'dan da ekle (eğer veri varsa)
        var talepTransactions = await _db.SiparisTalepSatirlar
            .AsNoTracking()
            .GroupBy(s => s.SiparisTalepId)
            .Select(g => g.Select(s => s.StokKartId).Distinct().ToList())
            .ToListAsync();

        transactions.AddRange(talepTransactions);

        // Ürün adlarını yükle
        _productNames = await _db.StokKartlar
            .AsNoTracking()
            .Where(s => s.Enabled == true)
            .ToDictionaryAsync(s => s.Id, s => s.Baslik ?? $"#{s.Id}");

        _totalTransactions = transactions.Count;
        int multiItemTx = transactions.Count(t => t.Count > 1);
        _logger.LogInformation("[Apriori] Toplam transaction: {Total}, Çok-ürünlü: {Multi}", _totalTransactions, multiItemTx);
        if (_totalTransactions == 0)
        {
            _logger.LogWarning("[Apriori] Hiç işlem yok — önce /api/seed çağırın.");
            _cachedRules = [];
            _cachedPairs = [];
            return;
        }

        // 2. Tekil ürün frekansları
        var itemFreq = new Dictionary<int, int>();
        foreach (var tx in transactions)
            foreach (var id in tx)
                itemFreq[id] = itemFreq.GetValueOrDefault(id, 0) + 1;

        // Min-support filtresi
        int minCount = (int)Math.Ceiling(MIN_SUPPORT * _totalTransactions);
        var freqItems = itemFreq.Where(kv => kv.Value >= minCount)
                                .Select(kv => kv.Key).ToHashSet();

        // 3. Çift co-occurrence (2-itemset)
        var pairFreq = new Dictionary<(int, int), int>();
        foreach (var tx in transactions)
        {
            var items = tx.Where(i => freqItems.Contains(i)).OrderBy(i => i).ToList();
            for (int i = 0; i < items.Count; i++)
            for (int j = i + 1; j < items.Count; j++)
            {
                var key = (items[i], items[j]);
                pairFreq[key] = pairFreq.GetValueOrDefault(key, 0) + 1;
            }
        }

        // En sık çiftler
        _cachedPairs = pairFreq
            .Where(kv => kv.Value >= minCount)
            .Select(kv => new ProductPairFrequency
            {
                ProductAId   = kv.Key.Item1,
                ProductBId   = kv.Key.Item2,
                ProductAName = _productNames.GetValueOrDefault(kv.Key.Item1, $"#{kv.Key.Item1}"),
                ProductBName = _productNames.GetValueOrDefault(kv.Key.Item2, $"#{kv.Key.Item2}"),
                Count   = kv.Value,
                Support = Math.Round((double)kv.Value / _totalTransactions, 4)
            })
            .OrderByDescending(p => p.Count)
            .ToList();

        // 4. Birliktelik kuralları (A→B ve B→A)
        var rules = new List<AssociationRule>();
        foreach (var (pair, coCount) in pairFreq.Where(kv => kv.Value >= minCount))
        {
            double support = (double)coCount / _totalTransactions;

            // A → B
            double confAB = (double)coCount / itemFreq[pair.Item1];
            double liftAB = confAB / ((double)itemFreq[pair.Item2] / _totalTransactions);
            if (confAB >= MIN_CONFIDENCE && liftAB >= MIN_LIFT)
                rules.Add(BuildRule([pair.Item1], [pair.Item2], support, confAB, liftAB));

            // B → A
            double confBA = (double)coCount / itemFreq[pair.Item2];
            double liftBA = confBA / ((double)itemFreq[pair.Item1] / _totalTransactions);
            if (confBA >= MIN_CONFIDENCE && liftBA >= MIN_LIFT)
                rules.Add(BuildRule([pair.Item2], [pair.Item1], support, confBA, liftBA));
        }

        // 5. 3-itemset (opsiyonel — en fazla ilk 30 sık item kombinasyonu)
        var freqItemList = freqItems
            .OrderByDescending(id => itemFreq[id])
            .Take(30)   // Performans için sınır
            .ToList();
        for (int i = 0; i < freqItemList.Count; i++)
        for (int j = i + 1; j < freqItemList.Count; j++)
        for (int k = j + 1; k < freqItemList.Count; k++)
        {
            int a = freqItemList[i], b = freqItemList[j], c = freqItemList[k];
            // AB içeren tx'lerde C var mı?
            int abcCount = transactions.Count(tx =>
                tx.Contains(a) && tx.Contains(b) && tx.Contains(c));
            if (abcCount < minCount) continue;

            var abKey = (Math.Min(a, b), Math.Max(a, b));
            int abCount = pairFreq.GetValueOrDefault(abKey, 0);
            if (abCount == 0) continue;

            double sup3  = (double)abcCount / _totalTransactions;
            double conf3 = (double)abcCount / abCount;
            double lift3 = conf3 / ((double)itemFreq[c] / _totalTransactions);

            if (conf3 >= MIN_CONFIDENCE && lift3 >= MIN_LIFT)
                rules.Add(BuildRule([a, b], [c], sup3, conf3, lift3));
        }

        _cachedRules = rules
            .OrderByDescending(r => r.Lift)
            .ToList();

        sw.Stop();
        _logger.LogInformation("[Apriori] Eğitim tamamlandı: {RuleCount} kural, {PairCount} çift, {ElapsedMs}ms",
            _cachedRules.Count, _cachedPairs.Count, sw.ElapsedMilliseconds);
        _lastTrained = DateTime.UtcNow;
    }

    private AssociationRule BuildRule(
        List<int> ant, List<int> con,
        double support, double confidence, double lift)
    {
        string antName = string.Join(" + ", ant.Select(id => _productNames!.GetValueOrDefault(id, $"#{id}")));
        string conName = string.Join(" + ", con.Select(id => _productNames!.GetValueOrDefault(id, $"#{id}")));

        return new AssociationRule
        {
            AntecedentIds = ant,
            ConsequentIds = con,
            Antecedent    = antName,
            Consequent    = conName,
            Support       = Math.Round(support, 4),
            Confidence    = Math.Round(confidence, 4),
            Lift          = Math.Round(lift, 4),
            ActionText    = $"{antName} ile birlikte %{(int)(confidence * 100)} oranında {conName} de sipariş edildi"
        };
    }
}
