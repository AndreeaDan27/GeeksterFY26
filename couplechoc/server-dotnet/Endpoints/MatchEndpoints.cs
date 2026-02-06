using CoupleChocApi.Models;
using CoupleChocApi.Services;

namespace CoupleChocApi.Endpoints;

public static class MatchEndpoints
{
    public static RouteGroupBuilder MapMatchEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/matches");

        group.MapGet("/top-couples", (IMatchingService matching, int? limit) =>
            matching.GetTopCouples(limit ?? 20));

        group.MapPost("/explain", async (MatchExplainRequest req, IOpenAIService openai) =>
        {
            var prompt = PromptTemplates.MatchExplain(req);
            var reply = await openai.GenerateAsync(prompt);
            return Results.Json(new { explanation = reply });
        });

        return group;
    }
}
