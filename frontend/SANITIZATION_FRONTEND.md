# Data Sanitization Frontend

## Overview

The frontend now includes **comprehensive data sanitization visualization** that displays all security checks, data cleaning operations, and validation results performed on uploaded CSV files.

## Features

### 🔐 Two Modes

1. **Anomaly Detection** (Main Page)
   - Upload CSV and detect anomalies
   - View sanitization report alongside results
   - See SHAP explanations for anomalies

2. **Sanitization Test** (Dedicated Page)
   - Test only the sanitization features
   - View detailed validation results
   - No anomaly detection performed

### 📊 Sanitization Report Components

#### 1. **Summary Statistics**
- Original Rows Count
- Clean Rows Count  
- Rows Removed Count
- Cleaning Rate Percentage

#### 2. **Column Information**
- Total columns in dataset
- Number of numeric columns
- List of all column names (sanitized)
- List of numeric column names used for analysis

#### 3. **Security Validations**
Shows which security checks passed:
- ✅ File Type Validation - CSV format verified
- ✅ CSV Injection Prevention - Dangerous patterns (=, +, -, @) neutralized
- ✅ File Size Check - Within acceptable limits (max 200MB)
- ✅ Column Name Sanitization - Special characters removed
- ✅ Infinite Value Handling - Replaced with NaN
- ✅ Missing Value Cleanup - Rows with missing data removed

#### 4. **Processing Flow**
Visual pipeline showing:
1. File Upload → Received and validated
2. Security Scan → CSV injection check
3. Data Cleaning → N rows removed
4. Ready → N clean rows available

#### 5. **Data Cleaning Alert**
Yellow warning banner if data was cleaned:
- Shows number of rows removed
- Explains why (missing values, invalid data)
- Confirms number of clean rows remaining

## How to Use

### Starting the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

### Using the Application

1. **Navigate Between Modes**
   - Use the navigation buttons in the top-right corner
   - Switch between "Anomaly Detection" and "Sanitization Test"

2. **Upload a CSV File**
   - Drag and drop or click to browse
   - Supports files up to 200MB
   - Supports up to 1,500,000 rows

3. **View Results**
   - **Anomaly Detection Mode**: See both sanitization report and anomaly results
   - **Sanitization Test Mode**: See only validation and cleaning details

## Backend API Integration

The frontend connects to: `http://localhost:8000/detect`

### Expected Response Format

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
    "numeric_column_names": ["price", "quantity", "rating"],
    "column_names": ["id", "name", "price", "quantity", ...],
    "contamination_rate": 4.7,
    "features_used": ["price", "quantity", "rating"]
  }
}
```

### Error Handling

The frontend handles these error scenarios:
- **400**: Invalid file type, no numeric columns, or malformed CSV
- **413**: File too large or too many rows
- **500**: Server error

## File Structure

```
frontend/src/
├── App.jsx                    # Main anomaly detection page
├── SanitizationTest.jsx      # Dedicated sanitization test page
├── SanitizationReport.jsx    # Reusable sanitization report component
├── AppRouter.jsx             # Navigation between pages
├── main.jsx                  # Entry point
└── index.css                 # Styles including sanitization components
```

## Styling

All components use:
- **Glassmorphism** design
- **Dark theme** with gradient accents
- **Smooth animations** with Framer Motion
- **Responsive grid layouts**
- **Color-coded status indicators**:
  - 🟢 Green: Success, clean data
  - 🔴 Red: Removed data, anomalies
  - 🟡 Yellow: Warnings, cleaning performed
  - 🔵 Blue: Information, features

## Color Palette

```css
--bg-color: #0f172a;           /* Dark background */
--text-color: #f8fafc;         /* White text */
--glass-bg: rgba(30, 41, 59, 0.7); /* Glass panels */
--accent-color: #6366f1;       /* Primary blue */
--danger-color: #ef4444;       /* Red for warnings */
--success-color: #10b981;      /* Green for success */
```

## Dependencies

```json
{
  "react": "^18.3.1",
  "axios": "^1.7.9",
  "framer-motion": "^11.18.0",
  "lucide-react": "^0.469.0"
}
```

## Customization

### Changing Validation Limits Display

Edit the upload zone in `App.jsx` or `SanitizationTest.jsx`:

```javascript
<p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
  Max size: 200MB • Max rows: 1,500,000
</p>
```

### Modifying Security Checks

Edit the security checks section in `SanitizationReport.jsx`:

```javascript
<SecurityCheck 
  label="Your Custom Check"
  passed={true}
  description="Your description"
/>
```

### Adjusting Colors

Update CSS variables in `index.css`:

```css
:root {
  --your-custom-color: #hexcode;
}
```

## Testing Examples

### Valid CSV
Upload a well-formatted CSV with numeric columns:
- ✅ All security checks pass
- ✅ Minimal or no rows removed
- ✅ Ready for anomaly detection

### CSV with Missing Values
Upload a CSV with some NaN values:
- ⚠️ Data cleaning warning appears
- 📊 Shows count of removed rows
- ✅ Clean rows ready for analysis

### Invalid File
Try uploading a .txt or .pdf file:
- ❌ Error: "Invalid file type. Only CSV files allowed"
- 🔴 Red error message displayed

### Oversized File
Upload a file larger than 200MB:
- ❌ Error: "File too large. Maximum size: 200MB"
- 🔴 File rejected before processing

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Mobile Responsive

The interface is fully responsive:
- Grid layouts collapse to single column on mobile
- Navigation buttons stack vertically
- Tables scroll horizontally when needed
- Touch-friendly buttons and interactions

## Performance

- **Animations**: Hardware accelerated with Framer Motion
- **Large files**: Shows loading indicator during processing
- **Lazy rendering**: Only renders visible anomalies (first 100)
- **Optimized re-renders**: Uses React.memo where appropriate

## Screenshots

The sanitization report includes:
1. **Header** with validation status badge
2. **Summary cards** with animated counters
3. **Cleaning alert** (if applicable)
4. **Column information** with tags
5. **Security checklist** with green checkmarks
6. **Processing pipeline** with step indicators

## Future Enhancements

Potential additions:
- Download sanitized CSV
- Preview of removed rows
- Column-by-column sanitization details
- Real-time validation as file is selected
- Batch file processing
- Custom sanitization rules

## Troubleshooting

### Sanitization report not showing
- Ensure backend returns `metadata` object in response
- Check browser console for errors
- Verify API response format matches expected structure

### Styles not applying
- Clear browser cache
- Restart dev server
- Check `index.css` is imported in `main.jsx`

### Navigation not working
- Ensure `AppRouter.jsx` is set as root component in `main.jsx`
- Check for JavaScript errors in console

---

**Made with ❤️ for secure and transparent data processing**
