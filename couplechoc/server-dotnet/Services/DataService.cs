using System.Globalization;
using CoupleChocApi.Models;
using CsvHelper;
using CsvHelper.Configuration;

namespace CoupleChocApi.Services;

public class DataService
{
    private readonly string _dataRoot;

    // Lazy caches
    private List<Product>? _products;
    private List<Sale>? _sales;
    private List<Gift>? _gifts;
    private List<MatchmakingProfile>? _matchmaking;
    private List<SupplyChainRow>? _supplyChain;
    private List<BehaviorEdge>? _behaviorEdges;

    public DataService(string dataRoot)
    {
        _dataRoot = dataRoot;
    }

    // ── CSV loading ────────────────────────────────────────

    private List<T> LoadCsv<T>(string relPath, ClassMap<T>? map = null)
    {
        var fullPath = Path.Combine(_dataRoot, relPath);
        using var reader = new StreamReader(fullPath);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        if (map != null)
            csv.Context.RegisterClassMap(map);

        return csv.GetRecords<T>().ToList();
    }

    // ── Accessors ──────────────────────────────────────────

    public List<Product> GetProducts()
    {
        _products ??= LoadCsv<Product>("cupid_chocolate_global/data/DimProduct.csv",
            new ProductMap());
        return _products;
    }

    public List<Sale> GetSales()
    {
        _sales ??= LoadCsv<Sale>("cupid_chocolate_global/data/FactSales.csv",
            new SaleMap());
        return _sales;
    }

    public List<Gift> GetGifts()
    {
        _gifts ??= LoadCsv<Gift>("gifts/data/GiftRecommender.csv",
            new GiftMap());
        return _gifts;
    }

    public List<MatchmakingProfile> GetMatchmaking()
    {
        _matchmaking ??= LoadCsv<MatchmakingProfile>(
            "cupid_matchmaking/data/dataset_cupid_matchmaking.csv",
            new MatchmakingProfileMap());
        return _matchmaking;
    }

    public List<SupplyChainRow> GetSupplyChain()
    {
        _supplyChain ??= LoadCsv<SupplyChainRow>(
            "cupid_supply_chain/data/dataset_cupid_supply_chain.csv",
            new SupplyChainRowMap());
        return _supplyChain;
    }

    public List<BehaviorEdge> GetBehaviorEdges()
    {
        _behaviorEdges ??= LoadCsv<BehaviorEdge>(
            "cupid_behavior_graph_edges/data/dataset_cupid_behavior_graph_edges.csv",
            new BehaviorEdgeMap());
        return _behaviorEdges;
    }

    // ── Derived helpers ────────────────────────────────────

    public List<FlavorStat> GetTopFlavors(int limit = 10)
    {
        var products = GetProducts();
        var sales = GetSales();
        var prodMap = products.ToDictionary(p => p.ProductId, p => p);

        var flavorSales = new Dictionary<string, int>();
        foreach (var s in sales)
        {
            if (!prodMap.TryGetValue(s.ProductId, out var prod)) continue;
            var flavor = prod.Flavor;
            flavorSales.TryGetValue(flavor, out var count);
            flavorSales[flavor] = count + (s.QuantitySold > 0 ? s.QuantitySold : 1);
        }

        return flavorSales
            .OrderByDescending(kvp => kvp.Value)
            .Take(limit)
            .Select(kvp => new FlavorStat { Flavor = kvp.Key, Qty = kvp.Value })
            .ToList();
    }

    public List<ProductWithStock> GetProductsWithStock()
    {
        var products = GetProducts();
        var sc = GetSupplyChain();
        var stockMap = sc.ToDictionary(
            r => r.ProductId,
            r => new StockInfo
            {
                StockLevel = r.StockLevel,
                DelayReason = r.DelayReason,
                LeadTime = r.VendorLeadTimeDays
            });

        return products.Select(p => new ProductWithStock
        {
            ProductId = p.ProductId,
            ProductName = p.ProductName,
            Brand = p.Brand,
            Category = p.Category,
            Flavor = p.Flavor,
            UnitPrice = p.UnitPrice,
            Stock = stockMap.GetValueOrDefault(p.ProductId)
        }).ToList();
    }

    public List<MatchmakingProfile> GetRandomProfiles(int n = 2)
    {
        var all = GetMatchmaking();
        return all.OrderBy(_ => Random.Shared.Next()).Take(n).ToList();
    }

    public List<Gift> GetGiftsByPersona(string persona = "Partner")
    {
        return GetGifts()
            .Where(g => g.GiftPersona == persona && g.EventType == "purchase")
            .OrderByDescending(g => g.Rating)
            .Take(20)
            .ToList();
    }

    public SalesFunFacts GetSalesFunFacts()
    {
        var sales = GetSales();
        var products = GetProducts();
        var prodMap = products.ToDictionary(p => p.ProductId, p => p);

        var totalRevenue = sales.Sum(s => s.TotalAmount);
        var avgOrder = sales.Count > 0 ? totalRevenue / sales.Count : 0;

        // Most popular category
        var catCount = new Dictionary<string, int>();
        var brandCount = new Dictionary<string, int>();
        foreach (var s in sales)
        {
            if (!prodMap.TryGetValue(s.ProductId, out var p)) continue;
            catCount.TryGetValue(p.Category, out var cc);
            catCount[p.Category] = cc + 1;
            brandCount.TryGetValue(p.Brand, out var bc);
            brandCount[p.Brand] = bc + 1;
        }

        var topCategory = catCount.OrderByDescending(kvp => kvp.Value).FirstOrDefault();
        var topBrand = brandCount.OrderByDescending(kvp => kvp.Value).FirstOrDefault();

        return new SalesFunFacts
        {
            TotalTransactions = sales.Count,
            TotalRevenue = totalRevenue.ToString("F2"),
            AvgOrderValue = avgOrder.ToString("F2"),
            TopCategory = topCategory.Key ?? "unknown",
            TopBrand = topBrand.Key ?? "unknown",
            ProductCount = products.Count
        };
    }
}

// ── CsvHelper class maps ───────────────────────────────────

public sealed class ProductMap : ClassMap<Product>
{
    public ProductMap()
    {
        Map(m => m.ProductId).Name("product_id");
        Map(m => m.ProductName).Name("product_name");
        Map(m => m.Brand).Name("brand");
        Map(m => m.Category).Name("category");
        Map(m => m.Flavor).Name("flavor");
        Map(m => m.UnitPrice).Name("unit_price");
    }
}

public sealed class SaleMap : ClassMap<Sale>
{
    public SaleMap()
    {
        Map(m => m.ProductId).Name("product_id");
        Map(m => m.QuantitySold).Name("quantity_sold");
        Map(m => m.TotalAmount).Name("total_amount");
    }
}

public sealed class GiftMap : ClassMap<Gift>
{
    public GiftMap()
    {
        Map(m => m.GiftPersona).Name("gift_persona");
        Map(m => m.EventType).Name("event_type");
        Map(m => m.Rating).Name("rating");
    }
}

public sealed class MatchmakingProfileMap : ClassMap<MatchmakingProfile>
{
    public MatchmakingProfileMap()
    {
        Map(m => m.UserId).Name("user_id");
        Map(m => m.Age).Name("age");
        Map(m => m.LocationRegion).Name("location_region");
        Map(m => m.Interests).Name("interests");
        Map(m => m.Openness).Name("openness");
        Map(m => m.Conscientiousness).Name("conscientiousness");
        Map(m => m.Extraversion).Name("extraversion");
        Map(m => m.Agreeableness).Name("agreeableness");
        Map(m => m.Neuroticism).Name("neuroticism");
        Map(m => m.PrefAgeMin).Name("pref_age_min");
        Map(m => m.PrefAgeMax).Name("pref_age_max");
        Map(m => m.Dealbreakers).Name("dealbreakers");
        Map(m => m.MatchesSuccess).Name("matches_success");
        Map(m => m.MatchesAttempted).Name("matches_attempted");
    }
}

public sealed class SupplyChainRowMap : ClassMap<SupplyChainRow>
{
    public SupplyChainRowMap()
    {
        Map(m => m.ProductId).Name("product_id");
        Map(m => m.StockLevel).Name("stock_level");
        Map(m => m.DelayReason).Name("delay_reason");
        Map(m => m.VendorLeadTimeDays).Name("vendor_lead_time_days");
    }
}

public sealed class BehaviorEdgeMap : ClassMap<BehaviorEdge>
{
    public BehaviorEdgeMap()
    {
        Map(m => m.SourceUserId).Name("source_user_id");
        Map(m => m.TargetUserId).Name("target_user_id");
        Map(m => m.EdgeType).Name("edge_type");
        Map(m => m.Weight).Name("weight");
    }
}
