namespace CoupleChocApi.Models;

public class Sale
{
    public string ProductId { get; set; } = "";
    public int QuantitySold { get; set; }
    public decimal TotalAmount { get; set; }
}
