namespace CoupleChocApi.Models;

// ─── Request / Response DTOs ───────────────────────────────

public class PlayerInfo
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Age { get; set; }
    public string Region { get; set; } = "";
    public List<string> Interests { get; set; } = [];
    public string Vibe { get; set; } = "";
    public string MatchSuccess { get; set; } = "";
}

public class MatchExplainRequest
{
    public PlayerInfo Player1 { get; set; } = new();
    public PlayerInfo Player2 { get; set; } = new();
    public int Score { get; set; }
    public BreakdownDto Breakdown { get; set; } = new();
    public List<string> SharedInterests { get; set; } = [];
}

public class BreakdownDto
{
    public double Ocean { get; set; }
    public double Interests { get; set; }
    public double Behavior { get; set; }
    public double AgeFit { get; set; }
    public double Region { get; set; }
}

public class ChatRequest
{
    public List<ChatMsg> Messages { get; set; } = [];
    public string? Context { get; set; }
}

public class ChatMsg
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = "";
}

public class PairingRequest
{
    public PlayerInfo Player1 { get; set; } = new();
    public PlayerInfo Player2 { get; set; } = new();
}

public class ChallengeRequest
{
    public string Player1Name { get; set; } = "";
    public string Player2Name { get; set; } = "";
    public int Round { get; set; } = 1;
    public string? PreviousChallenges { get; set; }
}

public class QuestRequest
{
    public string Player1Name { get; set; } = "";
    public string Player2Name { get; set; } = "";
    public int QuestNumber { get; set; } = 1;
}

public class GiftRecommendRequest
{
    public string RecipientProfile { get; set; } = "";
    public decimal? Budget { get; set; }
    public string? Occasion { get; set; }
}

public class MemoryCardRequest
{
    public string Player1Name { get; set; } = "";
    public string Player2Name { get; set; } = "";
    public string? Highlights { get; set; }
}

public class FlavorStat
{
    public string Flavor { get; set; } = "";
    public int Qty { get; set; }
}

public class SalesFunFacts
{
    public int TotalTransactions { get; set; }
    public string TotalRevenue { get; set; } = "0.00";
    public string AvgOrderValue { get; set; } = "0.00";
    public string TopCategory { get; set; } = "unknown";
    public string TopBrand { get; set; } = "unknown";
    public int ProductCount { get; set; }
}

public class CoupleResult
{
    public int Rank { get; set; }
    public PlayerInfo Player1 { get; set; } = new();
    public PlayerInfo Player2 { get; set; } = new();
    public int Score { get; set; }
    public BreakdownDto Breakdown { get; set; } = new();
    public List<string> SharedInterests { get; set; } = [];
}

public class ShipGiftsRequest
{
    public PlayerInfo Player1 { get; set; } = new();
    public PlayerInfo Player2 { get; set; } = new();
    public string Pairing { get; set; } = "";
    public string GiftMessage { get; set; } = "";
}

public class ShipmentResult
{
    public string ShipmentId { get; set; } = "";
    public string Status { get; set; } = "";
    public List<RecipientShipment> Recipients { get; set; } = [];
    public DateTime EstimatedDelivery { get; set; }
}

public class RecipientShipment
{
    public string Name { get; set; } = "";
    public string Region { get; set; } = "";
    public string TrackingNumber { get; set; } = "";
    public string Message { get; set; } = "";
}
