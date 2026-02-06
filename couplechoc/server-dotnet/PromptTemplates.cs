using CoupleChocApi.Models;

namespace CoupleChocApi;

/// <summary>
/// Centralized prompt templates for all AI interactions.
/// Keeps prompt engineering concerns separate from endpoint logic.
/// </summary>
public static class PromptTemplates
{
    public static string MatchExplain(MatchExplainRequest req) => $"""
        You are Cupid's AI matchmaker for the Cupid Chocolate Company.
        Explain in 2-3 fun, romantic sentences WHY these two people are a great match.

        Player 1: "{req.Player1.Name}" — Age {req.Player1.Age}, from {req.Player1.Region}, interests: {string.Join(", ", req.Player1.Interests)}, vibe: {req.Player1.Vibe}
        Player 2: "{req.Player2.Name}" — Age {req.Player2.Age}, from {req.Player2.Region}, interests: {string.Join(", ", req.Player2.Interests)}, vibe: {req.Player2.Vibe}

        Compatibility score: {req.Score}%
        Signal breakdown — Personality: {Math.Round(req.Breakdown.Ocean * 100)}%, Shared interests: {Math.Round(req.Breakdown.Interests * 100)}%, Chemistry signals: {Math.Round(req.Breakdown.Behavior * 100)}%, Age fit: {Math.Round(req.Breakdown.AgeFit * 100)}%, Location: {Math.Round(req.Breakdown.Region * 100)}%
        {(req.SharedInterests.Count > 0 ? $"They both love: {string.Join(", ", req.SharedInterests)}" : "They have complementary interests")}

        Be playful and use a chocolate metaphor. Keep it SHORT. End with a fun couple nickname.
        """;

    public static string PairingDataContext(List<Product> products, List<FlavorStat> topFlavors, SalesFunFacts funFacts) => $"""
        PRODUCT CATALOG (sample):
        {string.Join("\n", products.Take(20).Select(p => $"- {p.ProductName} | {p.Brand} | {p.Category} | {p.Flavor} | €{p.UnitPrice}"))}

        TOP FLAVORS BY SALES: {string.Join(", ", topFlavors.Select(f => $"{f.Flavor} ({f.Qty} sold)"))}

        FUN FACTS: totalTransactions={funFacts.TotalTransactions}, topCategory={funFacts.TopCategory}, topBrand={funFacts.TopBrand}
        """;

    public static string Pairing(PairingRequest req) => $"""
        Create a personalized chocolate pairing experience for this couple:

        Player 1: "{req.Player1.Name}" — Interests: {string.Join(", ", req.Player1.Interests)}, Vibe: {req.Player1.Vibe}
        Player 2: "{req.Player2.Name}" — Interests: {string.Join(", ", req.Player2.Interests)}, Vibe: {req.Player2.Vibe}

        Recommend 3 chocolates from the REAL catalog above that match their combined personality.
        For each chocolate, explain WHY it fits them as a couple (be romantic and fun).
        Format as a numbered list with the product name in bold.
        """;

    public static string ChallengeDataContext(List<Product> randomProducts) => $"""
        CHOCOLATES FOR THIS ROUND:
        {string.Join("\n", randomProducts.Select(p => $"- {p.ProductName} ({p.Flavor}, {p.Category})"))}
        """;

    public static string Challenge(ChallengeRequest req) => $"""
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

    public static string Quest(QuestRequest req, SalesFunFacts funFacts) => $"""
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

    public static string GiftDataContext(List<ProductWithStock> allProducts, List<ProductWithStock> availableProducts) => $"""
        AVAILABLE PRODUCTS WITH STOCK:
        {string.Join("\n", availableProducts.Take(30).Select(p =>
            $"- {p.ProductName} | {p.Brand} | {p.Flavor} | €{p.UnitPrice} | {(p.Stock != null ? $"Stock: {p.Stock.StockLevel}" : "In stock")}{(p.Stock?.DelayReason != null && p.Stock.DelayReason != "none" ? $" ⚠️ {p.Stock.DelayReason}" : "")}"))}

        OUT OF STOCK (avoid recommending):
        {string.Join(", ", allProducts.Where(p => p.Stock?.StockLevel == 0).Select(p => p.ProductName).Take(10))}
        """;

    public static string GiftRecommend(GiftRecommendRequest req) => $"""
        Recommend a Valentine's chocolate gift:
        Recipient: {req.RecipientProfile}
        Budget: €{req.Budget?.ToString() ?? "no limit"}
        Occasion: {req.Occasion ?? "Valentine's Day"}

        Pick 2-3 products from the AVAILABLE list above.
        Check stock levels — warn if stock is low (<50 units).
        Include a romantic card message suggestion for each gift.
        Format beautifully with emojis.
        """;

    public static string ConversationPrompt(List<FlavorStat> topFlavors, SalesFunFacts funFacts) => $"""
        Generate ONE fun conversation prompt for a couple on a chocolate date.
        Use these real stats: top flavors are {string.Join(", ", topFlavors.Select(f => f.Flavor))}, and Cupid Chocolate has {funFacts.TotalTransactions} transactions.

        The prompt should be either:
        - A "Would you rather" chocolate question
        - An "If your relationship was a chocolate flavor" question  
        - A fun chocolate trivia with a twist
        - A "Rate each other" chocolate challenge

        ONE prompt only, keep it SHORT and playful.
        """;

    public static string MemoryCard(MemoryCardRequest req) => $"""
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

    public static string ShipGiftMessage(string recipientName, string matchName, string giftMessage) => $"""
        Create a SHORT romantic gift card message (2-3 sentences) for {recipientName} receiving chocolates.
        Base it on this conversation prompt: "{giftMessage}"
        Mention their match {matchName} sweetly.
        Make it feel like Valentine's magic. Sign it "With love, Cupid Chocolate Co. 💕"
        """;
}
