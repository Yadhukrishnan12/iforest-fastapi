"""
Test script for data sanitization functionality
Run with: pytest test_sanitization.py -v
"""

import pytest
import pandas as pd
import io
from fastapi import UploadFile, HTTPException
from sanitizer import DataSanitizer


class MockUploadFile:
    """Mock UploadFile for testing"""
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self.file = io.BytesIO(content)
        self.content_type = "text/csv"
    
    async def read(self):
        self.file.seek(0)
        return self.file.read()


@pytest.mark.asyncio
async def test_valid_csv():
    """Test sanitization with valid CSV data"""
    csv_content = b"feature1,feature2,feature3\n1.5,2.3,3.1\n4.2,5.1,6.0\n7.8,8.9,9.2"
    file = MockUploadFile("test.csv", csv_content)
    
    df, metadata = await DataSanitizer.sanitize_dataframe(file)
    
    assert df.shape[0] == 3
    assert df.shape[1] == 3
    assert metadata["cleaned_rows"] == 3
    assert metadata["numeric_columns"] == 3


@pytest.mark.asyncio
async def test_file_too_large():
    """Test file size validation"""
    # Create file larger than max size
    large_content = b"col1\n" + (b"1\n" * (DataSanitizer.MAX_FILE_SIZE_MB * 1024 * 1024 + 1000))
    file = MockUploadFile("large.csv", large_content)
    
    with pytest.raises(HTTPException) as exc_info:
        await DataSanitizer.validate_file(file)
    
    assert exc_info.value.status_code == 413


@pytest.mark.asyncio
async def test_invalid_file_type():
    """Test file extension validation"""
    file = MockUploadFile("test.txt", b"data")
    
    with pytest.raises(HTTPException) as exc_info:
        await DataSanitizer.validate_file(file)
    
    assert exc_info.value.status_code == 400
    assert "CSV" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_csv_injection_prevention():
    """Test prevention of CSV injection attacks"""
    csv_content = b"name,value\n=SUM(A1:A10),100\n+cmd|'calc',200"
    file = MockUploadFile("injection.csv", csv_content)
    
    df, _ = await DataSanitizer.sanitize_dataframe(file)
    
    # Values should be prefixed with quote to neutralize
    assert df.iloc[0, 0].startswith("'")
    assert df.iloc[1, 0].startswith("'")


@pytest.mark.asyncio
async def test_missing_values_handling():
    """Test handling of missing values"""
    csv_content = b"col1,col2,col3\n1,2,3\n4,,6\n7,8,9"
    file = MockUploadFile("missing.csv", csv_content)
    
    df, metadata = await DataSanitizer.sanitize_dataframe(file)
    
    # Row with missing value should be removed
    assert metadata["original_rows"] == 3
    assert metadata["cleaned_rows"] == 2
    assert metadata["rows_removed"] == 1


@pytest.mark.asyncio
async def test_infinite_values_handling():
    """Test handling of infinite values"""
    # Create dataframe with inf
    df_test = pd.DataFrame({
        'col1': [1, float('inf'), 3],
        'col2': [4, 5, float('-inf')]
    })
    
    numeric_cols = ['col1', 'col2']
    df_clean = DataSanitizer._handle_infinite_values(df_test, numeric_cols)
    
    # Inf should be replaced with NaN
    assert pd.isna(df_clean.iloc[1, 0])
    assert pd.isna(df_clean.iloc[2, 1])


@pytest.mark.asyncio
async def test_column_name_sanitization():
    """Test sanitization of dangerous column names"""
    csv_content = b"=formula,col@2,normal_col\n1,2,3\n4,5,6"
    file = MockUploadFile("bad_cols.csv", csv_content)
    
    df, _ = await DataSanitizer.sanitize_dataframe(file)
    
    # Column names should be sanitized
    for col in df.columns:
        assert not col.startswith('=')
        assert '@' not in col


@pytest.mark.asyncio
async def test_too_many_rows():
    """Test row limit enforcement"""
    # Create CSV with more than max rows
    rows = DataSanitizer.MAX_ROWS + 100
    csv_content = b"col1\n" + (b"1\n" * rows)
    file = MockUploadFile("too_many_rows.csv", csv_content)
    
    with pytest.raises(HTTPException) as exc_info:
        await DataSanitizer.sanitize_dataframe(file)
    
    assert exc_info.value.status_code == 413


@pytest.mark.asyncio
async def test_no_numeric_columns():
    """Test error when no numeric columns exist"""
    csv_content = b"name,category\nJohn,A\nJane,B"
    file = MockUploadFile("no_numeric.csv", csv_content)
    
    with pytest.raises(HTTPException) as exc_info:
        await DataSanitizer.sanitize_dataframe(file)
    
    assert exc_info.value.status_code == 400
    assert "numeric" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_empty_file():
    """Test handling of empty file"""
    file = MockUploadFile("empty.csv", b"")
    
    with pytest.raises(HTTPException) as exc_info:
        await DataSanitizer.validate_file(file)
    
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_prepare_features_zero_variance():
    """Test feature preparation with zero variance columns"""
    df = pd.DataFrame({
        'col1': [1, 1, 1],  # Zero variance
        'col2': [1, 2, 3],  # Normal
        'col3': [4, 4, 4],  # Zero variance
    })
    
    X, _ = DataSanitizer.prepare_features(df)
    
    # Only col2 should remain
    assert X.shape[1] == 1
    assert 'col2' in X.columns


def test_sanitize_filename():
    """Test filename sanitization"""
    dangerous_names = [
        "../../../etc/passwd",
        "..\\..\\windows\\system32",
        "file<script>.csv",
        "test|file.csv"
    ]
    
    for name in dangerous_names:
        sanitized = DataSanitizer._sanitize_filename(name)
        assert '../' not in sanitized
        assert '..\\'  not in sanitized
        assert '<' not in sanitized and '>' not in sanitized
        assert '|' not in sanitized


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
