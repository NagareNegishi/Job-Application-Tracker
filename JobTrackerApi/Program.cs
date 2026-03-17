using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text;
using JobTrackerApi.Data;
using JobTrackerApi.Services;
using System.Text.Json.Serialization;
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
// Npgsql Entity Framework
// https://www.npgsql.org/efcore/index.html?tabs=aspnet
// No AddDbContextPool for safety and simplicity
builder.Services.AddDbContext<JobTrackerContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddSingleton<IStorageService, LocalStorageService>();

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
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });


// CORS policy for development, allowing the React app to make API calls to this backend
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()!)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});


// <snippet_UseSwagger>
var app = builder.Build();

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

app.UseHttpsRedirection();

app.UseAuthentication(); // on each request, figure out who is calling, must be before UseAuthorization
app.UseAuthorization();

app.MapControllers();

app.Run();
