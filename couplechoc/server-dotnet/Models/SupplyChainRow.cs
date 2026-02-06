namespace CoupleChocApi.Models;

public class SupplyChainRow
{
    public string ProductId { get; set; } = "";
    public int StockLevel { get; set; }
    public string DelayReason { get; set; } = "";
    public int VendorLeadTimeDays { get; set; }
}
