import React, { useState, useRef, useEffect } from 'react';
import './FormComponentRenderer.css';

// Form component styles - matching PageBuilderPro design system
const shadcnStyles = {
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  button: {
    default: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '10px 16px',
      transition: 'all 0.2s',
      cursor: 'pointer',
      border: 'none',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif'
    },
    secondary: {
      backgroundColor: '#f1f5f9',
      color: '#1e293b'
    },
    destructive: {
      backgroundColor: '#ef4444',
      color: '#ffffff'
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid #d1d5db',
      color: '#1e293b'
    }
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  progress: {
    track: {
      position: 'relative',
      height: '8px',
      width: '100%',
      overflow: 'hidden',
      borderRadius: '9999px',
      backgroundColor: '#e5e7eb'
    },
    indicator: {
      height: '100%',
      backgroundColor: '#4f46e5',
      transition: 'width 0.3s ease'
    }
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '9999px',
    backgroundColor: '#e5e7eb',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#4f46e5'
  },
  radio: {
    accentColor: '#4f46e5'
  },
  fieldWrapper: {
    marginBottom: '16px'
  },
  required: {
    color: '#ef4444',
    marginLeft: '4px'
  }
};

const FormComponentRenderer = ({ component, previewMode, onFileUpload, onDataChange }) => {
  const { type, fieldName, processVariable, required, properties } = component;

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // E-signature state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [lastPoint, setLastPoint] = useState(null);

  // Data grid state
  const [gridData, setGridData] = useState([]);
  const [gridColumns, setGridColumns] = useState([]);
  const [editingCell, setEditingCell] = useState(null);

  // QR/Barcode canvas refs
  const qrCanvasRef = useRef(null);
  const barcodeCanvasRef = useRef(null);

  // Create empty row for data grid
  const createEmptyRow = (cols) => {
    const row = {};
    (cols || []).forEach(col => {
      row[col.key || col.name] = '';
    });
    return row;
  };

  // Initialize grid data from properties
  useEffect(() => {
    if (type === 'dataGrid' && properties?.columns) {
      setGridColumns(properties.columns);
      setGridData(properties.data || [createEmptyRow(properties.columns)]);
    }
  }, [type, properties?.columns, properties?.data]);

  // Initialize e-signature canvas
  useEffect(() => {
    if (type === 'esign' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = properties?.strokeColor || '#000000';
      ctx.lineWidth = properties?.strokeWidth || 2;
    }
  }, [type, properties?.strokeColor, properties?.strokeWidth]);

  // Draw QR code when component mounts or value changes
  useEffect(() => {
    if (type === 'qrcode' && qrCanvasRef.current) {
      drawQRCode(qrCanvasRef.current);
    }
  }, [type, properties?.value, properties?.defaultValue]);

  // Draw barcode when component mounts or value changes
  useEffect(() => {
    if (type === 'barcode' && barcodeCanvasRef.current) {
      drawBarcode(barcodeCanvasRef.current);
    }
  }, [type, properties?.value, properties?.defaultValue]);

  // QR Code drawing function
  const drawQRCode = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const qrValue = properties?.value || properties?.defaultValue || 'https://example.com';
    const qrSize = properties?.size || 150;
    const qrForeground = properties?.foregroundColor || '#000000';
    const qrBackground = properties?.backgroundColor || '#ffffff';

    const valueHash = qrValue.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const moduleCount = 25;
    const moduleSize = qrSize / moduleCount;

    ctx.fillStyle = qrBackground;
    ctx.fillRect(0, 0, qrSize, qrSize);
    ctx.fillStyle = qrForeground;

    // Draw finder patterns
    const drawFinderPattern = (x, y) => {
      ctx.fillStyle = qrForeground;
      ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize);
      ctx.fillStyle = qrBackground;
      ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
      ctx.fillStyle = qrForeground;
      ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    drawFinderPattern(0, 0);
    drawFinderPattern(moduleCount - 7, 0);
    drawFinderPattern(0, moduleCount - 7);

    // Draw timing patterns
    ctx.fillStyle = qrForeground;
    for (let i = 8; i < moduleCount - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize);
        ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize);
      }
    }

    // Generate data modules based on value hash
    const seed = valueHash;
    for (let y = 9; y < moduleCount - 9; y++) {
      for (let x = 9; x < moduleCount - 9; x++) {
        const shouldFill = ((x * y + seed) % 3 === 0) || ((x + y + seed) % 5 === 0);
        if (shouldFill) {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    for (let i = 0; i < qrValue.length; i++) {
      const char = qrValue.charCodeAt(i);
      const x = 9 + (char % (moduleCount - 18));
      const y = 9 + ((char * (i + 1)) % (moduleCount - 18));
      ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
    }
  };

  // Barcode drawing function
  const drawBarcode = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const barcodeValue = properties?.value || properties?.defaultValue || '123456789';
    const barcodeWidth = properties?.width || 200;
    const barcodeHeight = properties?.height || 80;
    const barcodeForeground = properties?.foregroundColor || '#000000';
    const barcodeBackground = properties?.backgroundColor || '#ffffff';
    const showBarcodeText = properties?.displayValue !== false;
    const textHeight = showBarcodeText ? 20 : 0;

    ctx.fillStyle = barcodeBackground;
    ctx.fillRect(0, 0, barcodeWidth, barcodeHeight + textHeight);

    const patterns = {
      '0': '11011001100', '1': '11001101100', '2': '11001100110',
      '3': '10010011000', '4': '10010001100', '5': '10001001100',
      '6': '10011001000', '7': '10011000100', '8': '10001100100',
      '9': '11001001000', 'A': '11011000100', 'B': '11001011000',
      'C': '11001000110', 'D': '11000110100', 'E': '11010001100',
      'F': '11000100110', 'G': '10110011100', 'H': '10011011100',
      'I': '10011001110', 'J': '10111001100', 'K': '10011101100',
      'L': '10011100110', 'M': '11001110010', 'N': '11001011100',
      'O': '11001001110', 'P': '11011100100', 'Q': '11001110100',
      'R': '11101101110', 'S': '11101001100', 'T': '11100101100',
      'U': '11100100110', 'V': '11101100100', 'W': '11100110100',
      'X': '11100110010', 'Y': '11011011000', 'Z': '11011000110',
      ' ': '11000110110', '-': '10100110000', '.': '10100001100'
    };

    let binaryString = '11010000100';
    for (const char of barcodeValue.toUpperCase()) {
      const pattern = patterns[char];
      if (pattern) {
        binaryString += pattern;
      } else {
        binaryString += '10010110000';
      }
    }
    binaryString += '1100011101011';

    const barWidth = Math.max(1, Math.floor((barcodeWidth - 20) / binaryString.length));
    const startX = Math.floor((barcodeWidth - binaryString.length * barWidth) / 2);

    ctx.fillStyle = barcodeForeground;
    let x = startX;
    for (const bit of binaryString) {
      if (bit === '1') {
        ctx.fillRect(x, 5, barWidth, barcodeHeight - 10);
      }
      x += barWidth;
    }

    if (showBarcodeText) {
      ctx.fillStyle = barcodeForeground;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(barcodeValue, barcodeWidth / 2, barcodeHeight + 15);
    }
  };

  // E-signature handlers
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!previewMode) return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setLastPoint(coords);
  };

  const draw = (e) => {
    if (!isDrawing || !previewMode) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setLastPoint(coords);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        setSignatureData(dataUrl);
        if (onDataChange) {
          onDataChange(processVariable, dataUrl);
        }
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
      if (onDataChange) {
        onDataChange(processVariable, null);
      }
    }
  };

  // File upload handlers
  const maxFiles = properties?.maxFiles || 1;
  const maxSize = properties?.maxSize || 10;
  const acceptedTypes = type === 'image' ? 'image/*' : properties?.acceptedTypes || '*/*';

  const validateFile = (file) => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File "${file.name}" exceeds ${maxSize}MB limit`;
    }
    if (type === 'image' && !file.type.startsWith('image/')) {
      return `File "${file.name}" is not an image`;
    }
    return null;
  };

  const handleFileSelect = (files) => {
    setUploadError(null);
    const fileArray = Array.from(files);

    if (uploadedFiles.length + fileArray.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} file(s) allowed`);
      return;
    }

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }
    }

    const newFiles = fileArray.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      preview: type === 'image' ? URL.createObjectURL(file) : null
    }));

    const allFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(allFiles);

    if (onFileUpload) {
      onFileUpload(processVariable, allFiles);
    }
    if (onDataChange) {
      onDataChange(processVariable, allFiles);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (previewMode && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (previewMode) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (fileId) => {
    const newFiles = uploadedFiles.filter(f => f.id !== fileId);
    const removedFile = uploadedFiles.find(f => f.id === fileId);
    if (removedFile?.preview) {
      URL.revokeObjectURL(removedFile.preview);
    }
    setUploadedFiles(newFiles);
    if (onDataChange) {
      onDataChange(processVariable, newFiles);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Data grid handlers
  const columns = gridColumns.length > 0 ? gridColumns : (properties?.columns || [
    { key: 'col1', name: 'Column 1', type: 'text' },
    { key: 'col2', name: 'Column 2', type: 'text' },
    { key: 'col3', name: 'Column 3', type: 'text' }
  ]);

  const data = gridData.length > 0 ? gridData : (properties?.data || [
    { col1: '', col2: '', col3: '' }
  ]);

  const handleCellEdit = (rowIndex, colKey, value) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
    setGridData(newData);
    if (onDataChange) {
      onDataChange(processVariable, newData);
    }
  };

  const handleCellClick = (rowIndex, colKey) => {
    if (previewMode) {
      setEditingCell({ rowIndex, colKey });
    }
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const addRow = () => {
    const newRow = {};
    columns.forEach(col => {
      newRow[col.key || col.name] = '';
    });
    const newData = [...data, newRow];
    setGridData(newData);
    if (onDataChange) {
      onDataChange(processVariable, newData);
    }
  };

  const deleteRow = (rowIndex) => {
    if (data.length <= 1) return;
    const newData = data.filter((_, idx) => idx !== rowIndex);
    setGridData(newData);
    if (onDataChange) {
      onDataChange(processVariable, newData);
    }
  };

  const renderCell = (row, col, rowIndex) => {
    const colKey = col.key || col.name;
    const value = row[colKey] || '';
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.colKey === colKey;

    if (isEditing && previewMode) {
      return (
        <input
          type={col.type === 'number' ? 'number' : 'text'}
          className="datagrid-cell-input"
          value={value}
          onChange={(e) => handleCellEdit(rowIndex, colKey, e.target.value)}
          onBlur={handleCellBlur}
          autoFocus
        />
      );
    }

    return (
      <span
        className="datagrid-cell-value"
        onClick={() => handleCellClick(rowIndex, colKey)}
      >
        {value || <span className="cell-placeholder">-</span>}
      </span>
    );
  };

  // Render label for most components using Shadcn style
  const renderLabel = () => {
    // Skip label for certain types or when using floating labels
    if (type === 'label' || type === 'button') return null;
    if (properties?.labelPosition === 'floating') return null; // Floating label rendered inside input

    const labelText = properties?.label || fieldName;
    return (
      <label className="component-field-label" style={shadcnStyles.label}>
        {labelText}
        {required && <span className="required-indicator" style={shadcnStyles.required}>*</span>}
        {properties?.tooltip && (
          <span className="field-tooltip" title={properties.tooltip} style={{ marginLeft: '4px', color: '#6b7280', cursor: 'help' }}> i</span>
        )}
      </label>
    );
  };

  // Check if component uses floating label
  const isFloatingLabel = properties?.labelPosition === 'floating';
  const labelText = properties?.label || fieldName;

  // Render based on component type
  const renderComponent = () => {
    switch (type) {
      case 'label':
        return (
          <div
            className="rendered-label"
            style={{
              fontSize: properties?.fontSize || '14px',
              fontWeight: properties?.fontWeight || 'normal',
              color: properties?.color || '#000000',
              textAlign: properties?.alignment || 'left'
            }}
          >
            {properties?.text || fieldName}
          </div>
        );

      case 'text':
        if (isFloatingLabel) {
          return (
            <div className="form-field-floating">
              <input
                type="text"
                className="floating-input"
                style={shadcnStyles.input}
                placeholder=" "
                disabled={!previewMode}
              />
              <label className="floating-label">
                {labelText}
                {required && <span className="required-indicator">*</span>}
              </label>
            </div>
          );
        }
        return (
          <input
            type="text"
            className="rendered-textbox"
            style={shadcnStyles.input}
            placeholder={properties?.placeholder || 'Enter text'}
            disabled={!previewMode}
          />
        );

      case 'number':
        return (
          <div className="number-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {properties?.prefix && <span className="input-prefix" style={{ fontSize: '14px', color: 'hsl(215.4, 16.3%, 46.9%)' }}>{properties.prefix}</span>}
            <input
              type="number"
              className="rendered-number"
              style={{ ...shadcnStyles.input, flex: 1 }}
              placeholder={properties?.placeholder || 'Enter number'}
              min={properties?.min}
              max={properties?.max}
              disabled={!previewMode}
            />
            {properties?.suffix && <span className="input-suffix" style={{ fontSize: '14px', color: 'hsl(215.4, 16.3%, 46.9%)' }}>{properties.suffix}</span>}
          </div>
        );

      case 'date':
        return (
          <input
            type={properties?.includeTime ? 'datetime-local' : 'date'}
            className="rendered-date"
            style={shadcnStyles.input}
            disabled={!previewMode}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="rendered-textarea"
            style={shadcnStyles.textarea}
            placeholder={properties?.placeholder || 'Enter text'}
            rows={properties?.rows || 4}
            disabled={!previewMode}
          />
        );

      case 'dropdown':
        return (
          <select className="rendered-dropdown" style={shadcnStyles.select} disabled={!previewMode}>
            <option value="">{properties?.placeholder || 'Select an option'}</option>
            {properties?.options?.map((opt, idx) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={idx} value={optValue}>{optLabel}</option>
              );
            })}
          </select>
        );

      case 'radio':
        return (
          <div className={`radio-group radio-${properties?.layout || 'vertical'}`} style={{ display: 'flex', flexDirection: properties?.layout === 'horizontal' ? 'row' : 'column', gap: '8px' }}>
            {(properties?.options || [{ label: 'Option 1' }, { label: 'Option 2' }]).map((opt, idx) => {
              const optionValue = typeof opt === 'object' ? opt.value : opt;
              const optionLabel = typeof opt === 'object' ? opt.label : opt;
              return (
                <label key={idx} className="radio-option" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', fontFamily: 'Inter, system-ui, sans-serif', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={processVariable}
                    value={optionValue}
                    disabled={!previewMode}
                    style={shadcnStyles.radio}
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
        return (
          <div className={`checkbox-group checkbox-${properties?.layout || 'vertical'}`} style={{ display: 'flex', flexDirection: properties?.layout === 'horizontal' ? 'row' : 'column', gap: '8px' }}>
            {(properties?.options || [{ label: 'Option 1' }]).map((opt, idx) => {
              const optionValue = typeof opt === 'object' ? opt.value : opt;
              const optionLabel = typeof opt === 'object' ? opt.label : opt;
              return (
                <label key={idx} className="checkbox-option" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', fontFamily: 'Inter, system-ui, sans-serif', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    value={optionValue}
                    disabled={!previewMode}
                    style={shadcnStyles.checkbox}
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'rating':
        return (
          <div className="rating-component">
            {[...Array(properties?.maxRating || 5)].map((_, idx) => (
              <span key={idx} className="rating-item">
                {properties?.ratingType === 'heart' ? '♥' :
                 properties?.ratingType === 'thumbs' ? '👍' : '★'}
              </span>
            ))}
          </div>
        );

      case 'file':
      case 'image':
        return (
          <div className="file-upload-component">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              multiple={maxFiles > 1}
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
              disabled={!previewMode}
            />
            <div
              className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${!previewMode ? 'disabled' : ''}`}
              onClick={() => previewMode && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <span className="upload-icon">{type === 'image' ? '🖼' : '📁'}</span>
              <span className="upload-text">
                {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
              </span>
              <span className="upload-hint">
                {maxFiles > 1 ? `Max ${maxFiles} files` : 'Single file'}
                {` | Max ${maxSize}MB`}
                {type === 'image' && ' | Images only'}
              </span>
            </div>

            {uploadError && (
              <div className="upload-error">{uploadError}</div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="uploaded-files-list">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="uploaded-file-item">
                    {file.preview && (
                      <img src={file.preview} alt={file.name} className="file-preview-thumb" />
                    )}
                    {!file.preview && <span className="file-icon">📄</span>}
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                    {previewMode && (
                      <button
                        className="remove-file-btn"
                        onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'button':
        // Use Shadcn-style button with variant support
        const buttonVariant = properties?.color || 'primary';
        const buttonVariantStyle = buttonVariant === 'secondary' ? shadcnStyles.button.secondary :
                                   buttonVariant === 'destructive' ? shadcnStyles.button.destructive :
                                   buttonVariant === 'outline' ? shadcnStyles.button.outline : {};
        return (
          <button
            className={`rendered-button btn-${buttonVariant} btn-${properties?.size || 'medium'}`}
            style={{ ...shadcnStyles.button.default, ...buttonVariantStyle }}
            disabled={!previewMode}
          >
            {properties?.buttonText || fieldName}
          </button>
        );

      case 'slider':
        return (
          <div className="slider-component">
            <input
              type="range"
              className="rendered-slider"
              min={properties?.min || 0}
              max={properties?.max || 100}
              step={properties?.step || 1}
              disabled={!previewMode}
            />
            {properties?.showValue && (
              <span className="slider-value">{properties?.min || 0}</span>
            )}
          </div>
        );

      case 'currency':
        return (
          <div className="currency-input-wrapper">
            <span className="currency-symbol">{properties?.currencySymbol || '$'}</span>
            <input
              type="number"
              className="rendered-currency"
              placeholder="0.00"
              step="0.01"
              disabled={!previewMode}
            />
          </div>
        );

      case 'Progress Bar':
        // Use Shadcn-style progress bar
        const progressPercent = Math.round(((properties?.currentValue || 0) / (properties?.maxValue || 100)) * 100);
        return (
          <div className="progress-bar-component" style={{ position: 'relative' }}>
            <div style={shadcnStyles.progress.track}>
              <div
                style={{
                  ...shadcnStyles.progress.indicator,
                  width: `${progressPercent}%`
                }}
              />
            </div>
            {properties?.showPercentage && (
              <span className="progress-percentage" style={{ fontSize: '12px', color: 'hsl(215.4, 16.3%, 46.9%)', marginTop: '4px', display: 'block' }}>
                {progressPercent}%
              </span>
            )}
          </div>
        );

      case 'esign':
        return (
          <div className="esign-component">
            <canvas
              ref={canvasRef}
              width={properties?.canvasWidth || 400}
              height={properties?.canvasHeight || 200}
              className={`esign-canvas-element ${!previewMode ? 'disabled' : ''}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!signatureData && !isDrawing && (
              <div className="esign-placeholder-overlay">
                Sign here
              </div>
            )}
            <div className="esign-actions">
              {previewMode && (
                <button
                  type="button"
                  className="esign-clear-btn"
                  onClick={clearSignature}
                >
                  Clear
                </button>
              )}
              {signatureData && (
                <span className="esign-status">Signed</span>
              )}
            </div>
          </div>
        );

      case 'phoneInput':
        return (
          <div className="phone-input-wrapper">
            <select className="country-code" disabled={!previewMode}>
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+91">+91</option>
            </select>
            <input
              type="tel"
              className="rendered-phone"
              placeholder="Enter phone number"
              disabled={!previewMode}
            />
          </div>
        );

      case 'dataGrid':
        return (
          <div className="datagrid-component">
            <div className="datagrid-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx}>{col.name || col.key}</th>
                    ))}
                    {previewMode && properties?.allowDelete !== false && <th className="action-col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {columns.map((col, colIdx) => (
                        <td key={colIdx}>
                          {renderCell(row, col, rowIdx)}
                        </td>
                      ))}
                      {previewMode && properties?.allowDelete !== false && (
                        <td className="action-col">
                          <button
                            type="button"
                            className="datagrid-delete-btn"
                            onClick={() => deleteRow(rowIdx)}
                            disabled={data.length <= 1}
                          >
                            x
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewMode && properties?.allowAdd !== false && (
              <button type="button" className="datagrid-add-btn" onClick={addRow}>
                + Add Row
              </button>
            )}
          </div>
        );

      case 'section':
      case 'card':
        return (
          <div
            className="section-component"
            style={{
              backgroundColor: properties?.backgroundColor || '#ffffff',
              borderColor: properties?.borderColor || '#e5e7eb',
              borderRadius: properties?.borderRadius || '8px',
              padding: properties?.padding || '16px'
            }}
          >
            {properties?.headerText && (
              <h3 className="section-header">{properties.headerText}</h3>
            )}
            <div className="section-content">
              Drop components here
            </div>
          </div>
        );

      case 'tab':
        return (
          <div className="tabs-component">
            <div className="tabs-header">
              {properties?.tabs?.map((tab, idx) => (
                <button key={idx} className={`tab-button ${idx === 0 ? 'active' : ''}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="tabs-content">
              Tab content area
            </div>
          </div>
        );

      case 'qrcode':
        return (
          <div className="qrcode-component">
            <canvas
              ref={qrCanvasRef}
              width={properties?.size || 150}
              height={properties?.size || 150}
              className="qrcode-canvas"
            />
            {previewMode && (
              <div className="qrcode-value-input">
                <input
                  type="text"
                  className="qrcode-input"
                  placeholder="Enter QR value"
                  defaultValue={properties?.value || properties?.defaultValue || 'https://example.com'}
                  onChange={(e) => {
                    if (onDataChange) {
                      onDataChange(processVariable, e.target.value);
                    }
                    // Redraw QR code
                    if (qrCanvasRef.current) {
                      drawQRCode(qrCanvasRef.current);
                    }
                  }}
                />
              </div>
            )}
          </div>
        );

      case 'barcode':
        return (
          <div className="barcode-component">
            <canvas
              ref={barcodeCanvasRef}
              width={properties?.width || 200}
              height={(properties?.height || 80) + (properties?.displayValue !== false ? 20 : 0)}
              className="barcode-canvas"
            />
            {previewMode && (
              <div className="barcode-value-input">
                <input
                  type="text"
                  className="barcode-input"
                  placeholder="Enter barcode value"
                  defaultValue={properties?.value || properties?.defaultValue || '123456789'}
                  onChange={(e) => {
                    if (onDataChange) {
                      onDataChange(processVariable, e.target.value);
                    }
                    // Redraw barcode
                    if (barcodeCanvasRef.current) {
                      drawBarcode(barcodeCanvasRef.current);
                    }
                  }}
                />
              </div>
            )}
          </div>
        );

      // Default renderer for unsupported types
      default:
        return (
          <div className="component-placeholder">
            <span className="placeholder-icon">?</span>
            <span className="placeholder-text">{type}</span>
          </div>
        );
    }
  };

  return (
    <div className="form-component-renderer">
      {renderLabel()}
      {renderComponent()}
      {component.tooltip && !previewMode && (
        <div className="component-tooltip">Tip: {component.tooltip}</div>
      )}
    </div>
  );
};

export default FormComponentRenderer;
