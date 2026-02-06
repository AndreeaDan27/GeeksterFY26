using CoupleChocApi.Services;

namespace CoupleChocApi.Endpoints;

public static class DataEndpoints
{
    public static RouteGroupBuilder MapDataEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api");

        group.MapGet("/products", (IDataService data) =>
            data.GetProducts());

        group.MapGet("/products/with-stock", (IDataService data) =>
            data.GetProductsWithStock());

        group.MapGet("/flavors/top", (IDataService data, int? limit) =>
            data.GetTopFlavors(limit ?? 10));

        group.MapGet("/fun-facts", (IDataService data) =>
            data.GetSalesFunFacts());

        group.MapGet("/gifts", (IDataService data, string? persona) =>
            data.GetGiftsByPersona(persona ?? "Partner"));

        group.MapGet("/profiles/random", (IDataService data, int? n) =>
            data.GetRandomProfiles(n ?? 2));

        return group;
    }
}
