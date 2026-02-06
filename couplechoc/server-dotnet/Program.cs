using CoupleChocApi.Endpoints;
using CoupleChocApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Load .env file from parent couplechoc folder if it exists
var envPath = Path.Combine(builder.Environment.ContentRootPath, "..", ".env");
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        var trimmed = line.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#')) continue;
        var idx = trimmed.IndexOf('=');
        if (idx > 0)
        {
            var key = trimmed[..idx].Trim();
            var value = trimmed[(idx + 1)..].Trim();
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}

// Register services via interfaces (DIP)
var dataRoot = Path.GetFullPath(
    Path.Combine(builder.Environment.ContentRootPath, "..", "..", "edition_1_valentines", "data"));

builder.Services.AddSingleton<IDataService>(new DataService(dataRoot));
builder.Services.AddSingleton<IMatchingService, MatchingService>();
builder.Services.AddSingleton<IOpenAIService, OpenAIService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();
app.UseCors();

var PORT = Environment.GetEnvironmentVariable("PORT") ?? "3001";
app.Urls.Add($"http://localhost:{PORT}");

// ─── Map endpoint groups ───────────────────────────────────
app.MapDataEndpoints();
app.MapMatchEndpoints();
app.MapAiEndpoints();

// ─── Start ─────────────────────────────────────────────────

Console.WriteLine($"\n🍫 CoupleChoc API (.NET) running on http://localhost:{PORT}\n");
app.Run();
