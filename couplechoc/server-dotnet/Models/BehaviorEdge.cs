namespace CoupleChocApi.Models;

public class BehaviorEdge
{
    public string SourceUserId { get; set; } = "";
    public string TargetUserId { get; set; } = "";
    public string EdgeType { get; set; } = "";
    public double Weight { get; set; }
}
