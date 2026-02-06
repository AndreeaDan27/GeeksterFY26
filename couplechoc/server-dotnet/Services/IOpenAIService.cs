using OpenAI.Chat;

namespace CoupleChocApi.Services;

public interface IOpenAIService
{
    Task<string> ChatAsync(List<ChatMessage> messages, string? extraContext = null);
    Task<string> GenerateAsync(string prompt, string? dataContext = null);
}
