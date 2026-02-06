using Azure;
using Azure.AI.OpenAI;
using Azure.Identity;
using OpenAI.Chat;

namespace CoupleChocApi.Services;

public class OpenAIService
{
    private readonly Lazy<AzureOpenAIClient> _client;
    private readonly string _deployment;

    private const string SystemPrompt = """
        You are **CoupleChoc** 🍫 — a witty, warm, and slightly cheeky AI sous‑chef for chocolate experiences.
        You guide couples through a romantic chocolate tasting and gift‑picking journey.

        Personality rules:
        - Playful and romantic, with light humor. Think "charming chocolatier meets game‑show host."
        - Use chocolate metaphors liberally ("you two are like caramel and sea salt — unexpected but perfect").
        - Keep responses SHORT (2–4 sentences max) unless asked for details.
        - Use emojis sparingly but effectively (🍫❤️🎲✨).
        - NEVER break character.

        You have access to real data from Cupid Chocolate Company:
        - 66 chocolate products (bars, pralines, assorted boxes, truffles) across 3 brands (Venus, Apollo, Eros)
        - Flavors: dark, milk, almond, orange, strawberry, matcha, salted caramel, hazelnut, raspberry, coconut, mint, lavender, espresso
        - Customer profiles with personality traits (Big Five / OCEAN)
        - Sales data, gift history, supply chain status

        When recommending chocolates, use REAL product names from the catalog.
        When giving fun facts, use REAL statistics from the sales data.
        When checking availability, reference REAL stock levels.
        """;

    public OpenAIService(IConfiguration config)
    {
        var endpoint = config["AZURE_OPENAI_ENDPOINT"]
            ?? Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")
            ?? throw new InvalidOperationException("Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT.");

        var apiKey = config["AZURE_OPENAI_API_KEY"]
            ?? Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY");

        _deployment = config["AZURE_OPENAI_DEPLOYMENT"]
            ?? Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT")
            ?? "gpt-4.1";

        _client = new Lazy<AzureOpenAIClient>(() =>
        {
            if (!string.IsNullOrEmpty(apiKey) && apiKey != "YOUR-API-KEY-HERE")
            {
                Console.WriteLine("🔑 Using API key authentication for Azure OpenAI");
                return new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
            }
            else
            {
                Console.WriteLine("🔐 Using DefaultAzureCredential (Managed Identity) for Azure OpenAI");
                return new AzureOpenAIClient(new Uri(endpoint), new DefaultAzureCredential());
            }
        });
    }

    /// <summary>
    /// Chat completion with conversation history.
    /// </summary>
    public async Task<string> ChatAsync(List<ChatMessage> messages, string? extraContext = null)
    {
        var client = _client.Value.GetChatClient(_deployment);

        var systemMessages = new List<ChatMessage>
        {
            new SystemChatMessage(SystemPrompt)
        };

        if (!string.IsNullOrEmpty(extraContext))
        {
            systemMessages.Add(new SystemChatMessage(
                $"Here is relevant data context for this interaction:\n{extraContext}"));
        }

        var allMessages = systemMessages.Concat(messages).ToList();

        var options = new ChatCompletionOptions
        {
            Temperature = 0.85f,
            MaxOutputTokenCount = 800
        };

        var response = await client.CompleteChatAsync(allMessages, options);

        return response.Value.Content.FirstOrDefault()?.Text
            ?? "I seem to have melted... try again! 🍫";
    }

    /// <summary>
    /// Generate a specific type of content.
    /// </summary>
    public Task<string> GenerateAsync(string prompt, string? dataContext = null)
    {
        return ChatAsync([new UserChatMessage(prompt)], dataContext);
    }
}
