namespace CoupleChocApi.Models;

public class Product
{
    public string ProductId { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Category { get; set; } = "";
    public string Flavor { get; set; } = "";
    public decimal UnitPrice { get; set; }
}

public class ProductWithStock
{
    public string ProductId { get; set; } = "";
    public string ProductName { get; set; } = "";
    public string Brand { get; set; } = "";
    public string Category { get; set; } = "";
    public string Flavor { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public StockInfo? Stock { get; set; }
}

public class StockInfo
{
    public int StockLevel { get; set; }
    public string DelayReason { get; set; } = "";
    public int LeadTime { get; set; }
}
