## JobTrackerApi/Services/LocalStorageService.cs
- Mocks: temp directory via `Path.GetTempPath()`; `IConfiguration` stub returning temp path; `IFormFile` mock via Moq
- [ ] Constructor_MissingConfig_ThrowsInvalidOperationException
- [ ] Constructor_ValidConfig_CreatesUploadsDirectory
- [ ] SaveAsync_ValidFile_ReturnsStoredName
- [ ] SaveAsync_ValidFile_WritesContentToDisk
- [ ] DeleteAsync_ExistingFile_RemovesFile
- [ ] DeleteAsync_MissingFile_DoesNotThrow
- [ ] GetAsync_ExistingFile_ReturnsReadableStream
- [ ] GetAsync_MissingFile_ThrowsFileNotFoundException
- [ ] GetDownloadUrlAsync_AnyKey_ReturnsNull

## JobTrackerApi/Services/LogEmailService.cs
- Mocks: `Mock<ILogger<LogEmailService>>` (Moq); verify LogInformation called with correct structured args
- [ ] SendEmailAsync_ValidInput_LogsEmailDetails
- [ ] SendEmailAsync_ValidInput_ReturnsCompletedTask
- [ ] SendEmailAsync_EmptyStrings_DoesNotThrow

## job-tracker-ui/src/lib/auth.ts
- Mocks: none — pure module-level state; `beforeEach` calls `clearToken()` to reset
- Helper: `makeJwt(payload)` — builds `header.<b64url(JSON)>.sig` string for test tokens
- [ ] getToken_initially_returnsNull
- [ ] setToken_andGetToken_returnsSetValue
- [ ] clearToken_afterSet_returnsNull
- [ ] getEmail_noToken_returnsNull
- [ ] getEmail_validJwtWithEmailClaim_returnsEmail
- [ ] getEmail_malformedJwt_returnsNull
- [ ] getRoles_noToken_returnsEmptyArray
- [ ] getRoles_jwtWithSingleRoleString_returnsArrayWithOneRole
- [ ] getRoles_jwtWithMultipleRolesArray_returnsArray
- [ ] getRoles_jwtWithNoRoleClaim_returnsEmptyArray
- [ ] getRoles_malformedJwt_returnsEmptyArray
- [ ] hasRole_rolePresent_returnsTrue
- [ ] hasRole_roleAbsent_returnsFalse

## job-tracker-ui/src/lib/api.ts
- Mocks: `vi.stubGlobal('fetch', vi.fn())` for all fetch calls; `vi.useFakeTimers()` for maintenance window tests
- Note: test file needs `// @vitest-environment jsdom` at top (for `window.location.href` in the redirect path)
- Helper: `makeResponse(status, body?)` — builds a `Response`-like object
- [ ] ApiError_constructor_setsStatusAndMessage
- [ ] MaintenanceError_defaultConstructor_setsDefaultMessage
- [ ] handleResponse_okResponse_returnsJson
- [ ] handleResponse_errorResponseWithMessageField_throwsApiErrorWithBodyMessage
- [ ] handleResponse_errorResponseWithIdentityErrors_joinsDescriptions
- [ ] handleResponse_errorResponseWithStringBody_usesStringAsMessage
- [ ] handleResponse_errorResponseWithNoBody_throwsWithUnknownError
- [ ] handleEmptyResponse_okResponse_resolves
- [ ] handleEmptyResponse_errorResponse_throwsApiError
- [ ] apiFetch_attachesAuthorizationHeaderWhenTokenSet
- [ ] apiFetch_omitsAuthorizationHeaderWhenNoToken
- [ ] apiFetch_nonErrorResponse_returnsResponseDirectly
- [ ] apiFetch_401fromAuthEndpoint_returnsResponseWithoutRefresh
- [ ] apiFetch_401nonAuth_retriesWithNewTokenAfterSilentRefresh
- [ ] apiFetch_401withRefreshFailure_clearsTokenAndRedirects
- [ ] apiFetch_503outsideMaintenanceWindow_throwsApiError
- [ ] apiFetch_503insideMaintenanceWindow_throwsMaintenanceError
- [ ] silentRefresh_concurrentCalls_shareOneRequest

## job-tracker-ui/src/hooks/useJobFilters.ts — BLOCKED
- Hook uses `useState`/`useMemo` and must run inside a React component; `renderHook` from `@testing-library/react` is required but not in devDependencies — ask user before adding it
