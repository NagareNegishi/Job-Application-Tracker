using JobTrackerApi.Models;
using JobTrackerApi.Data;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobTrackerApi.Controllers;

/// <summary>Content-scoped AI analysis endpoints — takes job text in the body, not a stored job id.</summary>
[ApiController]
[Route("api/analyse")]
[Authorize]
public class AnalysisController : ControllerBase
{
    private readonly JobTrackerContext _context;
    private readonly IAnalysisService _analysis;

    public AnalysisController(JobTrackerContext context, IAnalysisService analysis)
    {
        _context = context;
        _analysis = analysis;
    }
}
