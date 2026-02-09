"""
Configuration file for data sanitization limits
Adjust these values based on your system resources and requirements
"""

# File Upload Limits
MAX_FILE_SIZE_MB = 200  # Maximum file size in megabytes
MAX_ROWS = 1_000_000    # Maximum number of rows to process
MAX_COLUMNS = 200       # Maximum number of columns

# Data Quality Requirements
MIN_NUMERIC_COLUMNS = 1  # Minimum numeric columns required for analysis

# Performance Settings
# For very large files (>100MB or >200k rows), consider:
# - Increasing server memory
# - Using sampling (analyze subset of data)
# - Processing in batches

# Memory Usage Estimates:
# - 50MB CSV  ≈ 150-250MB RAM during processing
# - 100MB CSV ≈ 300-500MB RAM during processing
# - 200MB CSV ≈ 600MB-1GB RAM during processing

# Tips for handling very large files:
# 1. Ensure your server has enough RAM (recommended: 3-5x file size)
# 2. Close other applications to free memory
# 3. Consider using file sampling for initial analysis
# 4. Monitor server resources during processing
