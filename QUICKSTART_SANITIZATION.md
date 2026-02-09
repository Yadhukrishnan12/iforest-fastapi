# Quick Start: Data Sanitization

## What Changed?

Your anomaly detection API now has **automatic data sanitization** that:
- ✅ Validates file uploads
- ✅ Prevents CSV injection attacks  
- ✅ Cleans messy data
- ✅ Provides detailed metadata
- ✅ Returns helpful error messages

## Try It Now!

### 1. Run the Demo

```bash
python demo_sanitization.py
```

This will show you 6 examples of sanitization in action.

### 2. Test with Real Data

Start your server:
```bash
uvicorn app:app --reload
```

Upload a CSV through your frontend or use curl:
```bash
curl -X POST "http://localhost:8000/detect" \
  -F "file=@your_data.csv"
```

### 3. See the Enhanced Response

Before, you got:
```json
{
  "total_rows": 100,
  "anomalies_found": 10,
  "anomalies": [...]
}
```

Now, you get:
```json
{
  "total_rows": 100,
  "anomalies_found": 10,
  "anomalies": [...],
  "metadata": {
    "original_rows": 105,
    "cleaned_rows": 100,
    "rows_removed": 5,
    "numeric_columns": 8,
    "contamination_rate": 10.0,
    "features_used": ["price", "quantity", ...]
  }
}
```

## Protected Against

❌ **Uploading .exe or .txt files** → Rejected  
❌ **CSV formulas like `=SUM(A1:A10)`** → Neutralized  
❌ **Files >50MB** → Rejected  
❌ **Data with missing values** → Cleaned automatically  
❌ **Malicious filenames** → Sanitized  
❌ **CSVs with no numeric data** → Clear error message

## Files You Need

1. **`sanitizer.py`** ← The sanitization module
2. **`app.py`** ← Updated to use sanitizer
3. **`demo_sanitization.py`** ← Try this to see it work!
4. **`SANITIZATION.md`** ← Full documentation

## Configuration

Want to change limits? Edit `sanitizer.py`:

```python
class DataSanitizer:
    MAX_FILE_SIZE_MB = 50      # Change this for bigger files
    MAX_ROWS = 100_000         # Change for more rows
    MAX_COLUMNS = 100          # Change for wider data
```

## Examples

### Valid Upload
```bash
# Works perfectly!
curl -F "file=@good_data.csv" http://localhost:8000/detect
```

### Too Large
```bash
# Returns 413 error
curl -F "file=@huge_file.csv" http://localhost:8000/detect
# {"detail": "File too large. Maximum size: 50MB"}
```

### Wrong Type  
```bash
# Returns 400 error
curl -F "file=@document.pdf" http://localhost:8000/detect
# {"detail": "Invalid file type. Only CSV files are allowed."}
```

### No Numeric Columns
```bash
# Returns 400 error
curl -F "file=@text_only.csv" http://localhost:8000/detect
# {"detail": "At least 1 numeric column(s) required for anomaly detection"}
```

## Need Help?

- **Full docs**: See `SANITIZATION.md`
- **Summary**: See `SANITIZATION_SUMMARY.md`
- **Tests**: Run `pytest test_sanitization.py -v` (after `pip install pytest pytest-asyncio`)
- **Demo**: Run `python demo_sanitization.py`

---

**You're all set! Your API is now secure and reliable. 🎉**
