using CoupleChocApi.Models;

namespace CoupleChocApi.Services;

public interface IDataService
{
    List<Product> GetProducts();
    List<Sale> GetSales();
    List<Gift> GetGifts();
    List<MatchmakingProfile> GetMatchmaking();
    List<SupplyChainRow> GetSupplyChain();
    List<BehaviorEdge> GetBehaviorEdges();
    List<FlavorStat> GetTopFlavors(int limit = 10);
    List<ProductWithStock> GetProductsWithStock();
    List<MatchmakingProfile> GetRandomProfiles(int n = 2);
    List<Gift> GetGiftsByPersona(string persona = "Partner");
    SalesFunFacts GetSalesFunFacts();
}
