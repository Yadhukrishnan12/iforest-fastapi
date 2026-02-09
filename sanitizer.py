"""
Data Sanitization Module for Anomaly Detection API
Provides validation, cleaning, and security measures for uploaded CSV files.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any
from fastapi import HTTPException, UploadFile
import re
import io
import config  # Import configuration settings


class DataSanitizer:
    """Handles all data sanitization and validation"""
    
    # Load configuration from config.py (can be easily modified)
    MAX_FILE_SIZE_MB = config.MAX_FILE_SIZE_MB
    MAX_ROWS = config.MAX_ROWS
    MAX_COLUMNS = config.MAX_COLUMNS
    MIN_NUMERIC_COLUMNS = config.MIN_NUMERIC_COLUMNS
    
    # Dangerous patterns for CSV injection
    DANGEROUS_PATTERNS = [
        r'^=',  # Formula injection
        r'^\+',
        r'^-',
        r'^@',
        r'^\t',
        r'^\r',
    ]
    
    @staticmethod
    async def validate_file(file: UploadFile) -> None:
        """
        Validate uploaded file before processing.
        
        Args:
            file: The uploaded file
            
        Raises:
            HTTPException: If validation fails
        """
        # Check file exists
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check filename
        if not file.filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        # Sanitize filename (remove path traversal attempts)
        sanitized_filename = DataSanitizer._sanitize_filename(file.filename)
        
        # Check file extension
        if not sanitized_filename.lower().endswith('.csv'):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Only CSV files are allowed."
            )
        
        # Check file size. Use seek/tell when available, otherwise read safely and preserve content.
        max_size_bytes = DataSanitizer.MAX_FILE_SIZE_MB * 1024 * 1024
        try:
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()  # Get position (file size)
            file.file.seek(0)  # Reset to beginning
        except Exception:
            # Some file-like objects may not support seek/tell; read then reattach the bytes
            content = await file.read()
            file_size = len(content)
            # store the content so later reads can reuse it without loss
            setattr(file, "_saved_content", content)
            file.file = io.BytesIO(content)

        if file_size > max_size_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {DataSanitizer.MAX_FILE_SIZE_MB}MB"
            )

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
    
    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """Remove path traversal and dangerous characters from filename"""
        # Remove path components
        filename = filename.split('/')[-1].split('\\')[-1]
        
        # Remove or replace dangerous characters
        filename = re.sub(r'[^\w\s\-\.]', '_', filename)
        
        return filename
    
    @staticmethod
    async def sanitize_dataframe(file: UploadFile) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Read and sanitize CSV data.
        
        Args:
            file: The uploaded CSV file
            
        Returns:
            Tuple of (sanitized_dataframe, metadata_dict)
            
        Raises:
            HTTPException: If data validation fails
        """
        # Read CSV with multiple robust fallbacks for encoding and pandas parameter compatibility
        content = None
        if hasattr(file, "_saved_content"):
            content = getattr(file, "_saved_content")
        else:
            content = await file.read()

        last_exc = None
        df = None

        read_attempts = [
            {"encoding": "utf-8", "on_bad_lines": "warn", "engine": "c"},
            {"encoding": "utf-8", "engine": "c"},
            {"encoding": "utf-8", "engine": "python"},
            {"encoding": "latin-1", "on_bad_lines": "warn", "engine": "c"},
            {"encoding": "latin-1", "engine": "python"},
            {"encoding": "utf-8"},
        ]

        for params in read_attempts:
            try:
                # Use a fresh buffer for each attempt
                buf = io.BytesIO(content)
                df = pd.read_csv(buf, **params)
                break
            except UnicodeDecodeError as e:
                last_exc = e
                continue
            except TypeError as e:
                # Older/newer pandas versions may not support some kwargs; try next set
                last_exc = e
                continue
            except pd.errors.EmptyDataError:
                raise HTTPException(status_code=400, detail="CSV file is empty")
            except Exception as e:
                last_exc = e
                continue

        if df is None:
            detail = f"Failed to parse CSV file: {str(last_exc)}" if last_exc is not None else "Failed to parse CSV file"
            raise HTTPException(status_code=400, detail=detail)
        
        # Validate dataframe dimensions
        if df.shape[0] == 0:
            raise HTTPException(status_code=400, detail="CSV contains no data rows")
        
        if df.shape[0] > DataSanitizer.MAX_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"Too many rows. Maximum: {DataSanitizer.MAX_ROWS:,}"
            )
        
        if df.shape[1] > DataSanitizer.MAX_COLUMNS:
            raise HTTPException(
                status_code=413,
                detail=f"Too many columns. Maximum: {DataSanitizer.MAX_COLUMNS}"
            )
        
        # Sanitize column names
        df.columns = DataSanitizer._sanitize_column_names(df.columns)
        
        # Check for duplicate column names
        if df.columns.duplicated().any():
            raise HTTPException(
                status_code=400,
                detail="Duplicate column names detected after sanitization"
            )
        
        # Sanitize cell values (prevent CSV injection)
        df = DataSanitizer._sanitize_cell_values(df)
        
        # Clean numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < DataSanitizer.MIN_NUMERIC_COLUMNS:
            raise HTTPException(
                status_code=400,
                detail=f"At least {DataSanitizer.MIN_NUMERIC_COLUMNS} numeric column(s) required for anomaly detection"
            )
        
        # Handle infinite values
        df = DataSanitizer._handle_infinite_values(df, numeric_cols)
        
        # Handle missing values
        original_rows = len(df)
        df = DataSanitizer._handle_missing_values(df, numeric_cols)
        rows_after_cleaning = len(df)
        
        if rows_after_cleaning == 0:
            raise HTTPException(
                status_code=400,
                detail="All rows were invalid after data cleaning"
            )
        
        # Collect metadata
        metadata = {
            "original_rows": original_rows,
            "cleaned_rows": rows_after_cleaning,
            "rows_removed": original_rows - rows_after_cleaning,
            "total_columns": df.shape[1],
            "numeric_columns": len(numeric_cols),
            "numeric_column_names": numeric_cols,
            "column_names": df.columns.tolist()
        }
        
        return df, metadata
    
    @staticmethod
    def _sanitize_column_names(columns: pd.Index) -> list:
        """Sanitize column names to prevent injection and ensure validity"""
        sanitized = []
        for col in columns:
            # Convert to string
            col_str = str(col).strip()
            
            # Remove dangerous characters
            col_str = re.sub(r'[^\w\s\-]', '_', col_str)
            
            # Ensure it doesn't start with dangerous patterns
            for pattern in DataSanitizer.DANGEROUS_PATTERNS:
                col_str = re.sub(pattern, '', col_str)
            
            # Ensure non-empty
            if not col_str:
                col_str = f"column_{len(sanitized)}"
            
            # Limit length
            col_str = col_str[:100]
            
            sanitized.append(col_str)
        
        return sanitized
    
    @staticmethod
    def _sanitize_cell_values(df: pd.DataFrame) -> pd.DataFrame:
        """Sanitize cell values to prevent CSV injection attacks"""
        df_copy = df.copy()
        
        for col in df_copy.select_dtypes(include=['object']).columns:
            # Check for dangerous patterns in string cells
            df_copy[col] = df_copy[col].apply(
                lambda x: DataSanitizer._sanitize_string(x) if isinstance(x, str) else x
            )
        
        return df_copy
    
    @staticmethod
    def _sanitize_string(value: str) -> str:
        """Sanitize a string value"""
        if not value:
            return value
        
        # Check if starts with dangerous character
        for pattern in DataSanitizer.DANGEROUS_PATTERNS:
            if re.match(pattern, value):
                # Prefix with single quote to neutralize
                return "'" + value
        
        return value
    
    @staticmethod
    def _handle_infinite_values(df: pd.DataFrame, numeric_cols: list) -> pd.DataFrame:
        """Replace infinite values with NaN"""
        df_copy = df.copy()
        
        for col in numeric_cols:
            df_copy[col] = df_copy[col].replace([np.inf, -np.inf], np.nan)
        
        return df_copy
    
    @staticmethod
    def _handle_missing_values(df: pd.DataFrame, numeric_cols: list) -> pd.DataFrame:
        """
        Handle missing values in numeric columns.
        Strategy: Drop rows with any NaN in numeric columns (conservative approach)
        Alternative strategies could include imputation.
        """
        # Drop rows where ANY numeric column has NaN
        df_clean = df.dropna(subset=numeric_cols)
        
        return df_clean
    
    @staticmethod
    def prepare_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Prepare feature matrix for anomaly detection.
        
        Args:
            df: Sanitized dataframe
            
        Returns:
            Tuple of (feature_matrix, original_dataframe)
        """
        # Select only numeric columns for modeling
        X = df.select_dtypes(include=[np.number])
        
        if X.shape[1] == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid numeric columns found after sanitization"
            )
        
        # Check for columns with zero variance (all same value)
        zero_var_cols = X.columns[X.std() == 0].tolist()
        if zero_var_cols:
            # Remove zero variance columns
            X = X.drop(columns=zero_var_cols)
            
            if X.shape[1] == 0:
                raise HTTPException(
                    status_code=400,
                    detail="All numeric columns have zero variance"
                )
        
        return X, df
