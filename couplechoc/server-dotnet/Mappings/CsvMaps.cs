using CoupleChocApi.Models;
using CsvHelper.Configuration;

namespace CoupleChocApi.Mappings;

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
