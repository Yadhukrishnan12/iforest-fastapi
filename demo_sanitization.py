"""
Demo script to show data sanitization in action
Run with: python demo_sanitization.py
"""

import pandas as pd
import io
from sanitizer import DataSanitizer


class MockUploadFile:
    """Mock UploadFile for demonstration"""
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self.file = io.BytesIO(content)
        self.content_type = "text/csv"
    
    async def read(self):
        self.file.seek(0)
        return self.file.read()


async def demo_valid_csv():
    """Demonstrate normal CSV processing"""
    print("\n" + "="*60)
    print("DEMO 1: Valid CSV with mixed data")
    print("="*60)
    
    csv_content = b"""product_id,price,quantity,category
1,29.99,15,Electronics
2,49.50,8,Books
3,99.99,3,Electronics
4,12.99,25,Books
5,1500.00,1,Electronics"""
    
    file = MockUploadFile("products.csv", csv_content)
    
    try:
        await DataSanitizer.validate_file(file)
        df, metadata = await DataSanitizer.sanitize_dataframe(file)
        
        print(f"✅ File validated successfully")
        print(f"📊 Rows: {metadata['cleaned_rows']}")
        print(f"📊 Columns: {metadata['total_columns']}")
        print(f"🔢 Numeric columns: {metadata['numeric_columns']}")
        print(f"📝 Numeric columns: {metadata['numeric_column_names']}")
        print(f"\nFirst few rows:")
        print(df.head())
        
    except Exception as e:
        print(f"❌ Error: {e}")


async def demo_csv_injection():
    """Demonstrate CSV injection prevention"""
    print("\n" + "="*60)
    print("DEMO 2: CSV Injection Attack Prevention")
    print("="*60)
    
    csv_content = b"""name,formula,value
John,=SUM(A1:A10),100
Jane,+cmd|' /C calc',200
Bob,-2+5,300
Alice,@SUM(1+1),400"""
    
    file = MockUploadFile("injection.csv", csv_content)
    
    try:
        await DataSanitizer.validate_file(file)
        df, metadata = await DataSanitizer.sanitize_dataframe(file)
        
        print(f"✅ File sanitized successfully")
        print(f"\nOriginal dangerous formulas are now safe:")
        print(df[['name', 'formula']])
        print(f"\nNote: Dangerous formulas starting with =, +, -, @ are prefixed with '")
        
    except Exception as e:
        print(f"❌ Error: {e}")


async def demo_missing_values():
    """Demonstrate missing value handling"""
    print("\n" + "="*60)
    print("DEMO 3: Missing Value Handling")
    print("="*60)
    
    csv_content = b"""id,score1,score2,score3
1,85,90,88
2,92,,95
3,78,82,
4,88,91,93
5,,,"""
    
    file = MockUploadFile("missing.csv", csv_content)
    
    try:
        await DataSanitizer.validate_file(file)
        df, metadata = await DataSanitizer.sanitize_dataframe(file)
        
        print(f"✅ File processed successfully")
        print(f"📊 Original rows: {metadata['original_rows']}")
        print(f"📊 Cleaned rows: {metadata['cleaned_rows']}")
        print(f"🗑️  Rows removed: {metadata['rows_removed']}")
        print(f"\nRows with missing values were removed:")
        print(df)
        
    except Exception as e:
        print(f"❌ Error: {e}")


async def demo_file_too_large():
    """Demonstrate file size validation"""
    print("\n" + "="*60)
    print("DEMO 4: File Size Validation")
    print("="*60)
    
    # Simulate a large file (make it report as larger than limit)
    original_max = DataSanitizer.MAX_FILE_SIZE_MB
    DataSanitizer.MAX_FILE_SIZE_MB = 0.001  # Set to very small for demo
    
    csv_content = b"col1,col2,col3\n" + (b"1,2,3\n" * 1000)
    file = MockUploadFile("large.csv", csv_content)
    
    try:
        await DataSanitizer.validate_file(file)
        print(f"✅ File accepted")
        
    except Exception as e:
        print(f"❌ File rejected: {e.detail}")
        print(f"📏 Current limit: {DataSanitizer.MAX_FILE_SIZE_MB}MB")
    
    finally:
        # Restore original value
        DataSanitizer.MAX_FILE_SIZE_MB = original_max


async def demo_no_numeric_columns():
    """Demonstrate validation when no numeric columns exist"""
    print("\n" + "="*60)
    print("DEMO 5: No Numeric Columns Error")
    print("="*60)
    
    csv_content = b"""name,category,description
Product A,Electronics,Great product
Product B,Books,Bestseller
Product C,Clothing,New arrival"""
    
    file = MockUploadFile("text_only.csv", csv_content)
    
    try:
        await DataSanitizer.validate_file(file)
        df, metadata = await DataSanitizer.sanitize_dataframe(file)
        print(f"✅ File sanitized")
        
        # This will fail:
        X, df_clean = DataSanitizer.prepare_features(df)
        
    except Exception as e:
        print(f"❌ Validation failed: {e.detail}")
        print(f"💡 Tip: CSV must contain at least one numeric column")


async def demo_special_characters():
    """Demonstrate column name sanitization"""
    print("\n" + "="*60)
    print("DEMO 6: Column Name Sanitization")
    print("="*60)
    
    csv_content = b"""product@id,price$,quantity!,rating%
1,29.99,15,4.5
2,49.50,8,4.8
3,99.99,3,4.2"""
    
    file = MockUploadFile("special_chars.csv", csv_content)
    
    try:
        await DataSanitizer.validate_file(file)
        df, metadata = await DataSanitizer.sanitize_dataframe(file)
        
        print(f"✅ File sanitized successfully")
        print(f"\nOriginal columns had special characters (@, $, !, %)")
        print(f"Sanitized column names: {list(df.columns)}")
        print(f"\nNote: Special characters are replaced with underscores")
        
    except Exception as e:
        print(f"❌ Error: {e}")


async def main():
    """Run all demos"""
    print("\n" + "🔐" * 30)
    print("DATA SANITIZATION DEMONSTRATION")
    print("🔐" * 30)
    
    await demo_valid_csv()
    await demo_csv_injection()
    await demo_missing_values()
    await demo_file_too_large()
    await demo_no_numeric_columns()
    await demo_special_characters()
    
    print("\n" + "="*60)
    print("✨ All demos complete!")
    print("="*60)
    print("\nKey takeaways:")
    print("  ✅ File size and type validation")
    print("  ✅ CSV injection prevention")
    print("  ✅ Missing value handling")
    print("  ✅ Column name sanitization")
    print("  ✅ Data type validation")
    print("  ✅ Clear error messages")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
