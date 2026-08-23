# Company Verification API Reference

Base URL: `https://company-verification.onrender.com`

## GET /verify

Search a country's official business registry for active, legally registered companies.

### Parameters (query string)

| Parameter | Required | Notes |
|---|---|---|
| `name` | Yes | Company name to search. Partial names work. Max 200 characters. No control characters or angle brackets (`<` `>`). |
| `country` | Yes | ISO 3166-1 alpha-2 code. Case-insensitive. |

### Supported countries

| Code | Registry |
|---|---|
| `NZ` | New Zealand Business Register (NZBN) |
| `AU` | Australian Business Register (ABR) |

Any other country code returns `404`.

### Response — 200 OK

JSON array of matching companies. An empty array means no match was found. It is not an error.

```json
[
  {
    "registryId": "9429041249106",
    "name": "Spark New Zealand Trading Limited",
    "country": "NZ",
    "additionalFields": {
      "source_register": "NZBN",
      "searched_at": "2026-06-15T00:00:00+00:00"
    }
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `registryId` | string | Registry-native ID. 13-digit NZBN for NZ; 11-digit ABN for AU. |
| `name` | string | Registered legal name. |
| `country` | string | Uppercase ISO 3166-1 alpha-2 code of the source registry. |
| `additionalFields` | object or null | Registry-specific key-value pairs; `null` if the adapter sets none. AU: `null`. NZ: `source_register` (always `"NZBN"`) and `searched_at` (ISO 8601 timestamp of the search). Future adapters may add their own keys. |

### Error responses

| Status | Cause |
|---|---|
| `400` | Invalid `name` or `country` format. Body is a plain-text error message. |
| `404` | Country not supported. |
| `500` | Upstream registry call failed. |

### Examples

```
GET /verify?name=spark&country=NZ
GET /verify?name=telstra&country=AU
GET /verify?name=Spark New Zealand&country=nz
```
