using CoupleChocApi.Models;

namespace CoupleChocApi.Services;

/// <summary>
/// Cupid's Leaderboard — Multi-signal compatibility matching engine.
/// 
/// Combines OCEAN personality traits, shared interests, behavioral graph
/// signals, age-preference fit, and region proximity into a composite
/// compatibility score for every possible couple in the matchmaking data.
/// </summary>
public class MatchingService
{
    private readonly DataService _data;

    // Weights
    private const double WOcean = 0.30;
    private const double WInterests = 0.25;
    private const double WBehavior = 0.20;
    private const double WAgeFit = 0.15;
    private const double WRegion = 0.10;
    private const double DealbreakerPenalty = 0.35;

    // Cached leaderboard
    private List<CoupleResult>? _cachedLeaderboard;

    public MatchingService(DataService data)
    {
        _data = data;
    }

    // ── Public API ─────────────────────────────────────────

    public List<CoupleResult> GetTopCouples(int limit = 20)
    {
        if (_cachedLeaderboard != null)
            return _cachedLeaderboard.Take(limit).ToList();

        var profiles = _data.GetMatchmaking();
        var behaviorMap = BuildBehaviorMap();
        var couples = new List<CoupleResult>();

        // Brute-force all pairs
        for (int i = 0; i < profiles.Count; i++)
        {
            for (int j = i + 1; j < profiles.Count; j++)
            {
                var a = profiles[i];
                var b = profiles[j];
                var (score, breakdown) = ComputeCompatibility(a, b, behaviorMap);

                if (score > 0)
                {
                    var interestsA = ParseList(a.Interests);
                    var interestsB = ParseList(b.Interests);
                    var shared = interestsA.Intersect(interestsB).ToList();

                    couples.Add(new CoupleResult
                    {
                        Player1 = ToPlayerInfo(a, interestsA),
                        Player2 = ToPlayerInfo(b, interestsB),
                        Score = score,
                        Breakdown = breakdown,
                        SharedInterests = shared
                    });
                }
            }
        }

        // Sort and assign ranks
        var sorted = couples.OrderByDescending(c => c.Score).ToList();
        for (int i = 0; i < sorted.Count; i++)
            sorted[i].Rank = i + 1;

        _cachedLeaderboard = sorted;
        return sorted.Take(limit).ToList();
    }

    // ── Helpers ────────────────────────────────────────────

    private static List<string> ParseList(string? s)
    {
        if (string.IsNullOrEmpty(s)) return [];
        return s.Replace("\"", "")
            .Split(',')
            .Select(v => v.Trim().ToLowerInvariant())
            .Where(v => !string.IsNullOrEmpty(v))
            .ToList();
    }

    private static double Jaccard(List<string> a, List<string> b)
    {
        if (a.Count == 0 || b.Count == 0) return 0;
        var setA = a.ToHashSet();
        var setB = b.ToHashSet();
        var intersection = setA.Intersect(setB).Count();
        var union = setA.Union(setB).Count();
        return union == 0 ? 0 : (double)intersection / union;
    }

    private static double OceanScore(MatchmakingProfile a, MatchmakingProfile b)
    {
        // Similar on Agreeableness & Conscientiousness → good
        var agrSim = 1 - Math.Abs(a.Agreeableness - b.Agreeableness);
        var conSim = 1 - Math.Abs(a.Conscientiousness - b.Conscientiousness);

        // Complementary on Extraversion
        var extComp = Math.Abs(a.Extraversion - b.Extraversion);

        // Openness similarity
        var openSim = 1 - Math.Abs(a.Openness - b.Openness);

        // Penalise when both have high Neuroticism
        var avgNeuro = (a.Neuroticism + b.Neuroticism) / 2;
        var neuroPenalty = avgNeuro > 0.6 ? (avgNeuro - 0.6) * 2 : 0;

        var raw = (agrSim * 0.3 + conSim * 0.25 + extComp * 0.2 + openSim * 0.25) - neuroPenalty;
        return Math.Clamp(raw, 0, 1);
    }

    private static double AgeFitScore(MatchmakingProfile a, MatchmakingProfile b)
    {
        var fitsA = b.Age >= a.PrefAgeMin && b.Age <= a.PrefAgeMax ? 1.0 : 0.0;
        var fitsB = a.Age >= b.PrefAgeMin && a.Age <= b.PrefAgeMax ? 1.0 : 0.0;
        return (fitsA + fitsB) / 2;
    }

    private static double RegionScore(MatchmakingProfile a, MatchmakingProfile b)
    {
        var ra = (a.LocationRegion ?? "").ToLowerInvariant();
        var rb = (b.LocationRegion ?? "").ToLowerInvariant();
        if (ra == rb) return 1;

        string ContinentOf(string r)
        {
            if (r.Contains("europe")) return "europe";
            if (r.Contains("us") || r.Contains("america")) return "americas";
            if (r.Contains("asia")) return "asia";
            if (r.Contains("australia") || r.Contains("oceania")) return "oceania";
            if (r.Contains("africa")) return "africa";
            return r;
        }

        return ContinentOf(ra) == ContinentOf(rb) ? 0.5 : 0;
    }

    // ── Behavior map ───────────────────────────────────────

    private Dictionary<string, (int Liked, int Matched, int Blocked, int SameInterest, double TotalWeight)> BuildBehaviorMap()
    {
        var edges = _data.GetBehaviorEdges();
        var map = new Dictionary<string, (int, int, int, int, double)>();

        foreach (var e in edges)
        {
            var ids = new[] { e.SourceUserId, e.TargetUserId };
            Array.Sort(ids);
            var pair = $"{ids[0]}|{ids[1]}";

            if (!map.TryGetValue(pair, out var val))
                val = (0, 0, 0, 0, 0.0);

            var t = (e.EdgeType ?? "").ToLowerInvariant();
            if (t == "liked") val.Item1++;
            else if (t == "matched") val.Item2++;
            else if (t == "blocked") val.Item3++;
            else if (t == "same_interest") val.Item4++;
            val.Item5 += e.Weight;

            map[pair] = val;
        }

        return map;
    }

    private static double BehaviorScore(
        Dictionary<string, (int Liked, int Matched, int Blocked, int SameInterest, double TotalWeight)> map,
        string idA, string idB)
    {
        var ids = new[] { idA, idB };
        Array.Sort(ids);
        var key = $"{ids[0]}|{ids[1]}";

        if (!map.TryGetValue(key, out var b))
            return 0.5; // neutral

        if (b.Blocked > 0)
            return 0; // hard red flag

        var score = 0.5;
        if (b.Matched > 0) score += 0.35;
        if (b.Liked > 0) score += 0.15 * Math.Min(b.Liked, 2);
        if (b.SameInterest > 0) score += 0.1;

        var edgeCount = b.Liked + b.Matched + b.SameInterest;
        if (edgeCount > 0)
            score += (b.TotalWeight / edgeCount) * 0.1;

        return Math.Clamp(score, 0, 1);
    }

    // ── Compatibility computation ──────────────────────────

    private (int Score, BreakdownDto Breakdown) ComputeCompatibility(
        MatchmakingProfile a, MatchmakingProfile b,
        Dictionary<string, (int, int, int, int, double)> behaviorMap)
    {
        var interestsA = ParseList(a.Interests);
        var interestsB = ParseList(b.Interests);

        var breakdown = new BreakdownDto
        {
            Ocean = OceanScore(a, b),
            Interests = Jaccard(interestsA, interestsB),
            Behavior = BehaviorScore(behaviorMap, a.UserId, b.UserId),
            AgeFit = AgeFitScore(a, b),
            Region = RegionScore(a, b)
        };

        var composite =
            breakdown.Ocean * WOcean +
            breakdown.Interests * WInterests +
            breakdown.Behavior * WBehavior +
            breakdown.AgeFit * WAgeFit +
            breakdown.Region * WRegion;

        // Behaviour hard-block
        if (breakdown.Behavior == 0)
            composite = 0;

        composite = Math.Clamp(composite, 0, 1);

        return ((int)Math.Round(composite * 100), breakdown);
    }

    // ── PlayerInfo builder ─────────────────────────────────

    private static PlayerInfo ToPlayerInfo(MatchmakingProfile p, List<string> interests)
    {
        var vibe = p.Extraversion > 0.5 ? "adventurous"
            : p.Openness > 0.5 ? "creative"
            : "cozy";

        return new PlayerInfo
        {
            Id = p.UserId,
            Name = $"Cupid #{p.UserId.Replace("U", "")}",
            Age = p.Age,
            Region = p.LocationRegion,
            Interests = interests,
            Vibe = vibe,
            MatchSuccess = $"{p.MatchesSuccess}/{p.MatchesAttempted}"
        };
    }
}
