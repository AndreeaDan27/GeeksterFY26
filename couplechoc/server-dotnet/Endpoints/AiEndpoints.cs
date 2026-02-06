using CoupleChocApi.Models;
using CoupleChocApi.Services;
using OpenAI.Chat;

namespace CoupleChocApi.Endpoints;

public static class AiEndpoints
{
    public static RouteGroupBuilder MapAiEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api");

        group.MapPost("/chat", async (ChatRequest req, IOpenAIService openai) =>
        {
            var messages = req.Messages.Select<ChatMsg, ChatMessage>(m =>
                m.Role.ToLowerInvariant() switch
                {
                    "assistant" => new AssistantChatMessage(m.Content),
                    "system" => new SystemChatMessage(m.Content),
                    _ => new UserChatMessage(m.Content)
                }).ToList();

            var reply = await openai.ChatAsync(messages, req.Context);
            return Results.Json(new { reply });
        });

        group.MapPost("/pairing", async (PairingRequest req, IDataService data, IOpenAIService openai) =>
        {
            var products = data.GetProducts();
            var topFlavors = data.GetTopFlavors(5);
            var funFacts = data.GetSalesFunFacts();

            var dataContext = PromptTemplates.PairingDataContext(products, topFlavors, funFacts);
            var prompt = PromptTemplates.Pairing(req);
            var reply = await openai.GenerateAsync(prompt, dataContext);
            return Results.Json(new { pairing = reply });
        });

        group.MapPost("/challenge", async (ChallengeRequest req, IDataService data, IOpenAIService openai) =>
        {
            var products = data.GetProducts();
            var randomProducts = products.OrderBy(_ => Random.Shared.Next()).Take(5).ToList();

            var dataContext = PromptTemplates.ChallengeDataContext(randomProducts);
            var prompt = PromptTemplates.Challenge(req);
            var reply = await openai.GenerateAsync(prompt, dataContext);
            return Results.Json(new { challenge = reply });
        });

        group.MapPost("/quest", async (QuestRequest req, IDataService data, IOpenAIService openai) =>
        {
            var funFacts = data.GetSalesFunFacts();
            var prompt = PromptTemplates.Quest(req, funFacts);
            var reply = await openai.GenerateAsync(prompt);
            return Results.Json(new { quest = reply });
        });

        group.MapPost("/gift-recommend", async (GiftRecommendRequest req, IDataService data, IOpenAIService openai) =>
        {
            var products = data.GetProductsWithStock();
            var availableProducts = products.Where(p => p.Stock == null || p.Stock.StockLevel > 0).ToList();

            var dataContext = PromptTemplates.GiftDataContext(products, availableProducts);
            var prompt = PromptTemplates.GiftRecommend(req);
            var reply = await openai.GenerateAsync(prompt, dataContext);
            return Results.Json(new { recommendation = reply });
        });

        group.MapPost("/conversation-prompt", async (IDataService data, IOpenAIService openai) =>
        {
            var funFacts = data.GetSalesFunFacts();
            var topFlavors = data.GetTopFlavors(5);
            var prompt = PromptTemplates.ConversationPrompt(topFlavors, funFacts);
            var reply = await openai.GenerateAsync(prompt);
            return Results.Json(new { prompt = reply });
        });

        group.MapPost("/memory-card", async (MemoryCardRequest req, IOpenAIService openai) =>
        {
            var prompt = PromptTemplates.MemoryCard(req);
            var reply = await openai.GenerateAsync(prompt);
            return Results.Json(new { card = reply });
        });

        group.MapPost("/ship-gifts", async (ShipGiftsRequest req, IOpenAIService openai) =>
        {
            var shipmentId = $"CUPID-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(10000, 99999)}";
            var tracking1 = $"TRK{Random.Shared.Next(100000000, 999999999)}";
            var tracking2 = $"TRK{Random.Shared.Next(100000000, 999999999)}";

            var prompt1 = PromptTemplates.ShipGiftMessage(req.Player1.Name, req.Player2.Name, req.GiftMessage);
            var prompt2 = PromptTemplates.ShipGiftMessage(req.Player2.Name, req.Player1.Name, req.GiftMessage);

            var message1 = await openai.GenerateAsync(prompt1);
            var message2 = await openai.GenerateAsync(prompt2);

            var result = new ShipmentResult
            {
                ShipmentId = shipmentId,
                Status = "Processing",
                EstimatedDelivery = DateTime.UtcNow.AddDays(3),
                Recipients =
                [
                    new RecipientShipment
                    {
                        Name = req.Player1.Name,
                        Region = req.Player1.Region,
                        TrackingNumber = tracking1,
                        Message = message1
                    },
                    new RecipientShipment
                    {
                        Name = req.Player2.Name,
                        Region = req.Player2.Region,
                        TrackingNumber = tracking2,
                        Message = message2
                    }
                ]
            };

            Console.WriteLine($"\n📦 SHIPMENT CREATED: {shipmentId}");
            Console.WriteLine($"   → {req.Player1.Name} ({req.Player1.Region}): {tracking1}");
            Console.WriteLine($"   → {req.Player2.Name} ({req.Player2.Region}): {tracking2}\n");

            return Results.Json(result);
        });

        return group;
    }
}
