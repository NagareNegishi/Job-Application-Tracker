using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text;
using JobTrackerApi.Data;
using JobTrackerApi.Models;
using JobTrackerApi.Services;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Serilog;
using Serilog.Formatting.Json;
// using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Control Kestrel's minimum request body data rate
builder.WebHost.ConfigureKestrel(options =>
    {
    // options.Limits.MinRequestBodyDataRate = null; // disable rate limit entirely for dev
    options.Limits.MinRequestBodyDataRate =
        new MinDataRate(
            bytesPerSecond: 100,
            gracePeriod: TimeSpan.FromSeconds(10)
        );
    });


// Replace default ASP.NET logger with Serilog
builder.Services.AddSerilog((services, lc) =>
{
    if (builder.Environment.IsDevelopment())
    {
        // Human-readable output for local development
        lc.MinimumLevel.Information()
          .WriteTo.Console();
    }
    else
    {
        // Structured JSON to stdout — Docker captures it; compatible with any log aggregator (Loki, Datadog, etc.)
        lc.MinimumLevel.Warning()
          .WriteTo.Console(new JsonFormatter());
    }
});

// Add services to the container.
builder.Services.AddControllers().
    AddJsonOptions(options =>
    {
        // Input formatters:
        // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/model-binding?view=aspnetcore-10.0

        // Add enum converter to serialize enums as strings
        options.JsonSerializerOptions.Converters.Add(
            // Enums as strings:
            // https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties
            new JsonStringEnumConverter(
                allowIntegerValues: false // Not allowing integer values for enums
            )
        );

        // JSON returned by API will be pretty-printed
        options.JsonSerializerOptions.WriteIndented = true;
        // Allow case-insensitive property names
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;

        // Configure property naming policy, but be strict for consistency
        // options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });


// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();


// GetConnectionString method looks for a configuration value
// https://learn.microsoft.com/en-us/ef/core/miscellaneous/connection-strings?tabs=dotnet-core-cli
// appsettings.json is not appropriate for secret values, keep them in .env
// .env -> Docker -> OS environment variables -> Configuration in .NET
var connectionString = builder.Configuration.GetConnectionString("JobTrackerContext")
    ?? throw new InvalidOperationException("Connection string 'JobTrackerContext' not found.");

// Fail-fast: validate required env vars at startup rather than crashing mid-request.
// ?? throw means: if the config key is missing or null, crash immediately with a clear message.
// In production these come from environment variables via compose.prod.yml (see .env.example).
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured. Set JWT_SECRET environment variable.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer is not configured. Set JWT_ISSUER environment variable.");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience is not configured. Set JWT_AUDIENCE environment variable.");
// S3 bucket only required in production — dev uses LocalStorageService instead
if (!builder.Environment.IsDevelopment())
    _ = builder.Configuration["Storage:S3BucketName"]
        ?? throw new InvalidOperationException("Storage:S3BucketName is not configured. Set S3_BUCKET_NAME environment variable.");

// Npgsql Entity Framework
// https://www.npgsql.org/efcore/index.html?tabs=aspnet
// No AddDbContextPool for safety and simplicity
builder.Services.AddDbContext<JobTrackerContext>(options =>
    options.UseNpgsql(connectionString));

// Health check: GET /health — returns 200 (Healthy) or 503 (Unhealthy); includes DB connectivity check
builder.Services.AddHealthChecks()
    .AddDbContextCheck<JobTrackerContext>();

// Register IAmazonS3 — reads credentials + AWS_REGION from environment automatically
builder.Services.AddAWSService<IAmazonS3>();

// Use LocalStorageService in dev, S3StorageService in production
if (builder.Environment.IsDevelopment())
    builder.Services.AddSingleton<IStorageService, LocalStorageService>();
else
    builder.Services.AddSingleton<IStorageService, S3StorageService>();

// Registers Identity's core services
builder.Services.AddIdentityCore<IdentityUser>()
    .AddEntityFrameworkStores<JobTrackerContext>();

// JWT Bearer authentication — validates the token on every request
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };
    });


// Rate limiting — fixed window per IP, applied to auth endpoints only via [EnableRateLimiting("auth")]
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429; // Too Many Requests — returned immediately when limit is exceeded

    options.AddFixedWindowLimiter("auth", config =>
    {
        config.Window = TimeSpan.FromMinutes(1);  // counter resets every 1 minute
        config.PermitLimit = 5;                   // max 5 requests per window per IP
        config.QueueLimit = 0;                    // reject immediately — don't queue excess requests
        config.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
    });
});

// CORS only needed in dev — in production, Nginx proxies /api/* so frontend and backend share one origin
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("DevCors", policy =>
        {
            // NOTE: AllowCredentials() only works when the origin is explicitly listed,
            // it's incompatible with AllowAnyOrigin(), but we uses WithOrigins()
            policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()!)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // Required for browser to send httpOnly cookies cross-origin
        });
    });
}


// <snippet_UseSwagger>
var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseCors("DevCors"); // Apply CORS policy

// Catch all unhandled exceptions — logs full details server-side, returns a safe generic JSON 500 to the client
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        // Resolve logger from DI — backed by Serilog at this point
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        // ASP.NET puts the caught exception here after intercepting it
        var error = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();

        if (error != null)
            // Logs full exception with stack trace — visible server-side only
            logger.LogError(error.Error, "Unhandled exception");

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        // Generic message to client — no stack trace or internal details exposed
        await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
    });
});

app.UseSerilogRequestLogging(); // Emits one structured log event per request (method, path, status, duration)

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Enable the Swagger UI for API testing, run with:
    // dotnet run --launch-profile https
    // NOTE: if Migration in the DB is not running:
    // dotnet ef database update
    app.UseSwaggerUi(options =>
    {
        options.DocumentPath = "/openapi/v1.json";
    });
}
// <snippet_UseSwagger>

// In production the backend is behind Nginx (HTTP only) — Nginx handles SSL termination
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication(); // on each request, figure out who is calling, must be before UseAuthorization
app.UseAuthorization();
app.UseRateLimiter(); // must be after UseAuthorization so rate limit policies can inspect auth state if needed

app.MapControllers();

// Health check endpoint — anonymous (no JWT), JSON response showing per-check status
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            status = report.Status.ToString(),
            results = report.Entries.ToDictionary(
                e => e.Key,
                e => new { status = e.Value.Status.ToString(), duration = e.Value.Duration }
            )
        });
    }
}).AllowAnonymous();

// Seed demo user on startup — idempotent, skips if already exists
// UserManager is a scoped service so it must be resolved inside a manually created scope.
// This is the standard pattern for using scoped DI services outside of a request.
// https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection#scope-validation
using (var scope = app.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
    if (await userManager.FindByEmailAsync(DemoUser.Email) == null)
    {
        var demo = new IdentityUser { UserName = DemoUser.Email, Email = DemoUser.Email };
        // Password is never used — demo endpoint bypasses auth entirely.
        // Random GUID + fixed suffix satisfies Identity's complexity rules (upper, digit, special char).
        await userManager.CreateAsync(demo, Guid.NewGuid().ToString() + "Aa1!");
    }
}

app.Run();
