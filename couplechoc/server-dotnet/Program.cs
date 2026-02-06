using CoupleChocApi.Models;
using CoupleChocApi.Services;
using OpenAI.Chat;

var builder = WebApplication.CreateBuilder(args);

// Load .env file from parent couplechoc folder if it exists
var envPath = Path.Combine(builder.Environment.ContentRootPath, "..", ".env");
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#')) continue;
        var idx = trimmed.IndexOf('=');
        if (idx > 0)
        {
            var key = trimmed[..idx].Trim();
            var value = trimmed[(idx + 1)..].Trim();
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}

// Register services
var dataRoot = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "..", "edition_1_valentines", "data"));

builder.Services.AddSingleton(new DataService(dataRoot));
builder.Services.AddSingleton<MatchingService>();
builder.Services.AddSingleton<OpenAIService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors();

var PORT = Environment.GetEnvironmentVariable("PORT") ?? "3001";
app.Urls.Add($"http://localhost:{PORT}");

// ─── Data endpoints ────────────────────────────────────────

app.MapGet("/api/products", (DataService data) => data.GetProducts());

app.MapGet("/api/products/with-stock", (DataService data) => data.GetProductsWithStock());

app.MapGet("/api/flavors/top", (DataService data, int? limit) =>
    data.GetTopFlavors(limit ?? 10));

app.MapGet("/api/fun-facts", (DataService data) => data.GetSalesFunFacts());

app.MapGet("/api/gifts", (DataService data, string? persona) =>
    data.GetGiftsByPersona(persona ?? "Partner"));

app.MapGet("/api/profiles/random", (DataService data, int? n) =>
    data.GetRandomProfiles(n ?? 2));

// ─── Matching / Leaderboard endpoints ──────────────────────

app.MapGet("/api/matches/top-couples", (MatchingService matching, int? limit) =>
    matching.GetTopCouples(limit ?? 20));

app.MapPost("/api/matches/explain", async (MatchExplainRequest req, OpenAIService openai) =>
{
    var prompt = $"""
        You are Cupid's AI matchmaker for the Cupid Chocolate Company.
        Explain in 2-3 fun, romantic sentences WHY these two people are a great match.

        Player 1: "{req.Player1.Name}" — Age {req.Player1.Age}, from {req.Player1.Region}, interests: {string.Join(", ", req.Player1.Interests)}, vibe: {req.Player1.Vibe}
        Player 2: "{req.Player2.Name}" — Age {req.Player2.Age}, from {req.Player2.Region}, interests: {string.Join(", ", req.Player2.Interests)}, vibe: {req.Player2.Vibe}

        Compatibility score: {req.Score}%
        Signal breakdown — Personality: {Math.Round(req.Breakdown.Ocean * 100)}%, Shared interests: {Math.Round(req.Breakdown.Interests * 100)}%, Chemistry signals: {Math.Round(req.Breakdown.Behavior * 100)}%, Age fit: {Math.Round(req.Breakdown.AgeFit * 100)}%, Location: {Math.Round(req.Breakdown.Region * 100)}%
        {(req.SharedInterests.Count > 0 ? $"They both love: {string.Join(", ", req.SharedInterests)}" : "They have complementary interests")}

        Be playful and use a chocolate metaphor. Keep it SHORT. End with a fun couple nickname.
        """;

    var reply = await openai.GenerateAsync(prompt);
    return Results.Json(new { explanation = reply });
});

// ─── AI Agent endpoints ────────────────────────────────────

app.MapPost("/api/chat", async (ChatRequest req, OpenAIService openai) =>
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

app.MapPost("/api/pairing", async (PairingRequest req, DataService data, OpenAIService openai) =>
{
    var products = data.GetProducts();
    var topFlavors = data.GetTopFlavors(5);
    var funFacts = data.GetSalesFunFacts();

    var dataContext = $"""
        PRODUCT CATALOG (sample):
        {string.Join("\n", products.Take(20).Select(p => $"- {p.ProductName} | {p.Brand} | {p.Category} | {p.Flavor} | €{p.UnitPrice}"))}

        TOP FLAVORS BY SALES: {string.Join(", ", topFlavors.Select(f => $"{f.Flavor} ({f.Qty} sold)"))}

        FUN FACTS: totalTransactions={funFacts.TotalTransactions}, topCategory={funFacts.TopCategory}, topBrand={funFacts.TopBrand}
        """;

    var prompt = $"""
        Create a personalized chocolate pairing experience for this couple:

        Player 1: "{req.Player1.Name}" — Interests: {string.Join(", ", req.Player1.Interests)}, Vibe: {req.Player1.Vibe}
        Player 2: "{req.Player2.Name}" — Interests: {string.Join(", ", req.Player2.Interests)}, Vibe: {req.Player2.Vibe}

        Recommend 3 chocolates from the REAL catalog above that match their combined personality.
        For each chocolate, explain WHY it fits them as a couple (be romantic and fun).
        Format as a numbered list with the product name in bold.
        """;

    var reply = await openai.GenerateAsync(prompt, dataContext);
    return Results.Json(new { pairing = reply });
});

app.MapPost("/api/challenge", async (ChallengeRequest req, DataService data, OpenAIService openai) =>
{
    var products = data.GetProducts();
    var randomProducts = products.OrderBy(_ => Random.Shared.Next()).Take(5).ToList();

    var dataContext = $"""
        CHOCOLATES FOR THIS ROUND:
        {string.Join("\n", randomProducts.Select(p => $"- {p.ProductName} ({p.Flavor}, {p.Category})"))}
        """;

    var prompt = $"""
        Create a fun duo tasting challenge for round {req.Round}.
        Players: "{req.Player1Name}" and "{req.Player2Name}".
        {(req.PreviousChallenges != null ? $"Previous challenges (don't repeat): {req.PreviousChallenges}" : "")}

        The challenge should:
        1. Assign different but complementary tasks to each player
        2. Involve the chocolates listed in the data
        3. Include a playful wager or scoring element
        4. Be completable in 2-3 minutes

        Format:
        🎲 **Challenge Name**: [creative name]
        👤 **{req.Player1Name}**: [their task]
        👤 **{req.Player2Name}**: [their task]
        ⏱️ **Time**: [duration]
        🏆 **Winner gets**: [fun romantic reward]
        """;

    var reply = await openai.GenerateAsync(prompt, dataContext);
    return Results.Json(new { challenge = reply });
});

app.MapPost("/api/quest", async (QuestRequest req, DataService data, OpenAIService openai) =>
{
    var funFacts = data.GetSalesFunFacts();

    var prompt = $"""
        Generate romantic side-quest #{req.QuestNumber} for "{req.Player1Name}" and "{req.Player2Name}".

        Use this real data for a fun-fact tie-in: totalTransactions={funFacts.TotalTransactions}, topCategory={funFacts.TopCategory}, topBrand={funFacts.TopBrand}

        The quest should be one of these types (pick randomly):
        - "Feed your partner" challenge
        - "Guess the ingredient" game
        - "Chocolate compliment" (say something sweet using a chocolate metaphor)
        - "Rate your partner" (rate them on a chocolate scale)
        - "Photo moment" (strike a chocolate-themed pose)

        Keep it SHORT (3-4 lines max), playful, and romantic.
        """;

    var reply = await openai.GenerateAsync(prompt);
    return Results.Json(new { quest = reply });
});

app.MapPost("/api/gift-recommend", async (GiftRecommendRequest req, DataService data, OpenAIService openai) =>
{
    var products = data.GetProductsWithStock();
    var availableProducts = products.Where(p => p.Stock == null || p.Stock.StockLevel > 0).ToList();

    var dataContext = $"""
        AVAILABLE PRODUCTS WITH STOCK:
        {string.Join("\n", availableProducts.Take(30).Select(p =>
            $"- {p.ProductName} | {p.Brand} | {p.Flavor} | €{p.UnitPrice} | {(p.Stock != null ? $"Stock: {p.Stock.StockLevel}" : "In stock")}{(p.Stock?.DelayReason != null && p.Stock.DelayReason != "none" ? $" ⚠️ {p.Stock.DelayReason}" : "")}"))}

        OUT OF STOCK (avoid recommending):
        {string.Join(", ", products.Where(p => p.Stock?.StockLevel == 0).Select(p => p.ProductName).Take(10))}
        """;

    var prompt = $"""
        Recommend a Valentine's chocolate gift:
        Recipient: {req.RecipientProfile}
        Budget: €{req.Budget?.ToString() ?? "no limit"}
        Occasion: {req.Occasion ?? "Valentine's Day"}

        Pick 2-3 products from the AVAILABLE list above.
        Check stock levels — warn if stock is low (<50 units).
        Include a romantic card message suggestion for each gift.
        Format beautifully with emojis.
        """;

    var reply = await openai.GenerateAsync(prompt, dataContext);
    return Results.Json(new { recommendation = reply });
});

app.MapPost("/api/conversation-prompt", async (DataService data, OpenAIService openai) =>
{
    var funFacts = data.GetSalesFunFacts();
    var topFlavors = data.GetTopFlavors(5);

    var prompt = $"""
        Generate ONE fun conversation prompt for a couple on a chocolate date.
        Use these real stats: top flavors are {string.Join(", ", topFlavors.Select(f => f.Flavor))}, and Cupid Chocolate has {funFacts.TotalTransactions} transactions.

        The prompt should be either:
        - A "Would you rather" chocolate question
        - An "If your relationship was a chocolate flavor" question  
        - A fun chocolate trivia with a twist
        - A "Rate each other" chocolate challenge

        ONE prompt only, keep it SHORT and playful.
        """;

    var reply = await openai.GenerateAsync(prompt);
    return Results.Json(new { prompt = reply });
});

app.MapPost("/api/memory-card", async (MemoryCardRequest req, OpenAIService openai) =>
{
    var prompt = $"""
        Create a beautiful "Chocolate Date Memory Card" summary for "{req.Player1Name}" and "{req.Player2Name}".

        Their date highlights: {req.Highlights ?? "A wonderful chocolate tasting experience together"}

        Include:
        - A cute couple title (e.g., "The Caramel & Sea Salt Duo")
        - A short poem or rhyme about their experience (4 lines max)
        - A "Compatibility Flavor" (the chocolate flavor that represents them)
        - A "Next Date Suggestion" involving chocolate
        - Date: February 6, 2026

        Make it heartwarming and memorable. Use emojis tastefully.
        """;

    var reply = await openai.GenerateAsync(prompt);
    return Results.Json(new { card = reply });
});

app.MapPost("/api/ship-gifts", async (ShipGiftsRequest req, DataService data, OpenAIService openai) =>
{
    // Generate unique tracking numbers
    var shipmentId = $"CUPID-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(10000, 99999)}";
    var tracking1 = $"TRK{Random.Shared.Next(100000000, 999999999)}";
    var tracking2 = $"TRK{Random.Shared.Next(100000000, 999999999)}";

    // Create personalized messages for each recipient
    var prompt1 = $"""
        Create a SHORT romantic gift card message (2-3 sentences) for {req.Player1.Name} receiving chocolates.
        Base it on this conversation prompt: "{req.GiftMessage}"
        Mention their match {req.Player2.Name} sweetly.
        Make it feel like Valentine's magic. Sign it "With love, Cupid Chocolate Co. 💕"
        """;

    var prompt2 = $"""
        Create a SHORT romantic gift card message (2-3 sentences) for {req.Player2.Name} receiving chocolates.
        Base it on this conversation prompt: "{req.GiftMessage}"
        Mention their match {req.Player1.Name} sweetly.
        Make it feel like Valentine's magic. Sign it "With love, Cupid Chocolate Co. 💕"
        """;

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

// ─── Start ─────────────────────────────────────────────────

Console.WriteLine($"\n🍫 CoupleChoc API (.NET) running on http://localhost:{PORT}\n");
app.Run();
