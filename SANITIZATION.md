# Data Sanitization Documentation

## Overview

This FastAPI application now includes comprehensive **data sanitization** to ensure security, reliability, and data quality when processing CSV files for anomaly detection.

## Features Implemented

### 🔒 Security Features

1. **CSV Injection Prevention**
   - Detects and neutralizes formula injection attempts (`=`, `+`, `-`, `@`, etc.)
   - Prefixes dangerous values with single quote to prevent execution
   - Sanitizes both column names and cell values

2. **File Validation**
   - File type checking (only `.csv` allowed)
   - File size limits (default: 50MB)
   - Filename sanitization (prevents path traversal attacks)
   - Empty file detection

3. **Input Size Constraints**
   - Maximum rows: 100,000
   - Maximum columns: 100
   - Prevents resource exhaustion attacks

### 🧹 Data Cleaning

1. **Missing Value Handling**
   - Automatically removes rows with missing values in numeric columns
   - Reports number of rows removed
   - Ensures clean data for model training

2. **Infinite Value Handling**
   - Replaces `inf` and `-inf` with `NaN`
   - Prevents mathematical errors during model training

3. **Column Sanitization**
   - Removes special characters from column names
   - Prevents duplicate column names
   - Ensures valid Python identifiers

4. **Zero Variance Detection**
   - Removes columns where all values are identical
   - Prevents model training issues
   - Reports which features are used

### 📊 Data Validation

1. **Type Validation**
   - Ensures at least 1 numeric column exists
   - Reports number of numeric vs. non-numeric columns
   - Validates data types are suitable for anomaly detection

2. **Encoding Handling**
   - Attempts UTF-8 first, falls back to Latin-1
   - Skips malformed rows rather than failing
   - Provides clear error messages

## Configuration

You can adjust sanitization parameters in `sanitizer.py`:

```python
class DataSanitizer:
    MAX_FILE_SIZE_MB = 50      # Maximum file size in MB
    MAX_ROWS = 100_000         # Maximum rows to process
    MAX_COLUMNS = 100          # Maximum columns
    MIN_NUMERIC_COLUMNS = 1    # Minimum numeric columns required
```

## API Response Changes

The `/detect` endpoint now returns additional metadata:

```json
{
  "total_rows": 1000,
  "anomalies_found": 47,
  "anomalies": [...],
  "metadata": {
    "original_rows": 1020,
    "cleaned_rows": 1000,
    "rows_removed": 20,
    "total_columns": 15,
    "numeric_columns": 12,
    "numeric_column_names": ["col1", "col2", ...],
    "column_names": ["col1", "col2", ...],
    "contamination_rate": 4.7,
    "features_used": ["col1", "col2", ...]
  }
}
```

### Metadata Fields

- **original_rows**: Number of rows in uploaded file
- **cleaned_rows**: Number of rows after sanitization
- **rows_removed**: Number of rows removed during cleaning
- **total_columns**: Total number of columns
- **numeric_columns**: Number of numeric columns
- **numeric_column_names**: List of numeric column names
- **column_names**: List of all column names
- **contamination_rate**: Percentage of anomalies detected
- **features_used**: Columns used for anomaly detection

## Error Responses

The API now returns detailed HTTP error responses:

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Invalid File | Wrong file type, empty file, or malformed CSV |
| 400 | Invalid Data | No numeric columns, all rows invalid, etc. |
| 413 | File Too Large | File size or row/column count exceeds limits |

Example error response:
```json
{
  "detail": "File too large. Maximum size: 50MB"
}
```

## Usage Examples

### Valid CSV Upload

```python
import requests

with open('data.csv', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/detect',
        files={'file': ('data.csv', f, 'text/csv')}
    )
    
result = response.json()
print(f"Processed {result['metadata']['cleaned_rows']} rows")
print(f"Found {result['anomalies_found']} anomalies")
```

### Handling Errors

```python
try:
    response = requests.post(
        'http://localhost:8000/detect',
        files={'file': ('data.csv', f, 'text/csv')}
    )
    response.raise_for_status()
    result = response.json()
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 400:
        print(f"Invalid data: {e.response.json()['detail']}")
    elif e.response.status_code == 413:
        print(f"File too large: {e.response.json()['detail']}")
```

## Testing

Run the test suite to verify sanitization:

```bash
# Install test dependencies
pip install -r requirements.txt

# Run all sanitization tests
pytest test_sanitization.py -v

# Run specific test
pytest test_sanitization.py::test_csv_injection_prevention -v

# Show detailed output
pytest test_sanitization.py -v --tb=short
```

### Test Coverage

The test suite covers:
- ✅ Valid CSV processing
- ✅ File size validation
- ✅ File type validation
- ✅ CSV injection prevention
- ✅ Missing value handling
- ✅ Infinite value handling
- ✅ Column name sanitization
- ✅ Row limit enforcement
- ✅ No numeric columns error
- ✅ Empty file handling
- ✅ Zero variance column removal
- ✅ Filename sanitization

## Security Best Practices

### What's Protected

✅ **CSV Injection** - Formula injection attempts are neutralized
✅ **Path Traversal** - Malicious filenames are sanitized  
✅ **Resource Exhaustion** - File size and row limits prevent DoS
✅ **Code Injection** - Column names are sanitized
✅ **Data Validation** - Invalid data is rejected with clear errors

### Additional Recommendations

For production deployment:

1. **Rate Limiting**: Add rate limiting middleware to prevent abuse
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   ```

2. **Authentication**: Add API key or OAuth authentication
   ```python
   from fastapi.security import APIKeyHeader
   ```

3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Restrict CORS origins (currently set to `*`)
   ```python
   allow_origins=["https://yourdomain.com"]
   ```

5. **Logging**: Add request logging for security monitoring
6. **File Storage**: Don't store uploaded files permanently

## Troubleshooting

### Common Issues

**Issue**: "No numeric columns found after sanitization"
- **Solution**: Ensure your CSV has at least one numeric column with valid numbers

**Issue**: "Too many rows. Maximum: 100,000"
- **Solution**: Split your dataset or increase `MAX_ROWS` in `sanitizer.py`

**Issue**: "All rows were invalid after data cleaning"
- **Solution**: Check for missing values, ensure numeric columns contain valid numbers

**Issue**: File upload fails silently
- **Solution**: Check file size is under 50MB, verify it's a valid CSV

## Integration with Frontend

The frontend should handle metadata in responses:

```javascript
const response = await axios.post('http://localhost:8000/detect', formData);

const { total_rows, anomalies_found, metadata } = response.data;

// Display data quality info
console.log(`Processed ${metadata.cleaned_rows} of ${metadata.original_rows} rows`);
if (metadata.rows_removed > 0) {
  console.warn(`${metadata.rows_removed} rows removed during cleaning`);
}

// Display features used
console.log(`Features used: ${metadata.features_used.join(', ')}`);
```

## Performance Considerations

- **File Size**: Larger files take longer to process (linear with size)
- **SHAP Calculations**: Most expensive operation, scales with anomaly count
- **Memory Usage**: ~3-5x the file size during processing
- **Recommended**: For files >10MB, consider implementing progress indicators

## Migration from Previous Version

If you were using the old `app.py` without sanitization:

1. No changes needed to frontend code
2. API responses now include `metadata` field
3. Error responses are now structured JSON instead of `{"error": "..."}`
4. Empty or invalid files now return proper HTTP status codes

## Future Enhancements

Potential improvements for data sanitization:

- [ ] Configurable contamination rate per request
- [ ] Data imputation strategies (currently just removes rows)
- [ ] Custom column type hints from user
- [ ] File preview before processing
- [ ] Batch processing for very large files
- [ ] Caching for repeated uploads of same file
- [ ] Advanced outlier detection in input data
- [ ] Data profiling reports
