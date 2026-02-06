namespace CoupleChocApi.Models;

public class MatchmakingProfile
{
    public string UserId { get; set; } = "";
    public int Age { get; set; }
    public string LocationRegion { get; set; } = "";
    public string Interests { get; set; } = "";
    public double Openness { get; set; }
    public double Conscientiousness { get; set; }
    public double Extraversion { get; set; }
    public double Agreeableness { get; set; }
    public double Neuroticism { get; set; }
    public int PrefAgeMin { get; set; }
    public int PrefAgeMax { get; set; }
    public string Dealbreakers { get; set; } = "";
    public int MatchesSuccess { get; set; }
    public int MatchesAttempted { get; set; }
}
