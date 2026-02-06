using CoupleChocApi.Models;

namespace CoupleChocApi.Services;

public interface IMatchingService
{
    List<CoupleResult> GetTopCouples(int limit = 20);
}
