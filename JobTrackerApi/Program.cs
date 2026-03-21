using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text;
using JobTrackerApi.Data;
using JobTrackerApi.Services;
using System.Text.Json.Serialization;
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

app.MapControllers();

app.Run();
