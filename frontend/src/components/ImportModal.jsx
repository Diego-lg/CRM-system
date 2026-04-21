import React, { useState, useRef, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import Modal from "./Modal";
import {
  parseCSV,
  validateImportData,
  applyDefaults,
  importSchemas,
  downloadTemplate,
} from "../lib/csvImport";

export default function ImportModal({
  isOpen,
  onClose,
  entityType,
  onImportComplete,
}) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [importStatus, setImportStatus] = useState("idle"); // idle, importing, complete, error
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const schema = importSchemas[entityType] || {
    required: [],
    optional: [],
    defaults: {},
  };

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParsedData(null);
      setValidationResult(null);
      setImportStatus("idle");
      setProgress(0);
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleFile = useCallback(
    (selectedFile) => {
      if (!selectedFile) return;

      if (!selectedFile.name.endsWith(".csv")) {
        setErrorMessage("Please select a CSV file");
        return;
      }

      setFile(selectedFile);
      setErrorMessage("");

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const data = parseCSV(content);

          if (data.length === 0) {
            setErrorMessage("No data found in CSV file");
            setParsedData(null);
            setValidationResult(null);
            return;
          }

          setParsedData(data);

          // Validate the data
          const validation = validateImportData(data, schema);
          setValidationResult(validation);
        } catch (err) {
          setErrorMessage("Failed to parse CSV file: " + err.message);
          setParsedData(null);
          setValidationResult(null);
        }
      };
      reader.readAsText(selectedFile);
    },
    [schema],
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!parsedData || !validationResult?.valid) return;

    setImportStatus("importing");
    setProgress(0);
    setErrorMessage("");

    try {
      // Apply defaults to the data
      const dataWithDefaults = applyDefaults(parsedData, schema);

      // Simulate progress for better UX
      const totalRows = dataWithDefaults.length;
      let processedRows = 0;

      // Process each row with a small delay for progress updates
      for (const row of dataWithDefaults) {
        // Here you would typically send each row to your backend
        // For now, we simulate the import process
        await new Promise((resolve) => setTimeout(resolve, 50));
        processedRows++;
        setProgress(Math.round((processedRows / totalRows) * 100));
      }

      setImportStatus("complete");
      setProgress(100);

      if (onImportComplete) {
        onImportComplete(totalRows);
      }
    } catch (err) {
      setImportStatus("error");
      setErrorMessage("Import failed: " + err.message);
    }
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(entityType);
  };

  const getHeaders = () => {
    if (!parsedData || parsedData.length === 0) return [];
    return Object.keys(parsedData[0]);
  };

  const previewData = parsedData ? parsedData.slice(0, 5) : [];
  const validCount = validationResult?.valid ? parsedData.length : 0;
  const invalidCount = validationResult?.errors?.length || 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Import ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle size={18} />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Success Message */}
        {importStatus === "complete" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle size={18} />
            <span className="text-sm">
              Successfully imported {parsedData?.length} {entityType}!
            </span>
          </div>
        )}

        {/* File Upload Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </h3>
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
              ${file ? "border-green-400 bg-green-50" : ""}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={40} className="text-green-600" />
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-500">Click to change file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={40} className="text-gray-400" />
                <p className="text-sm text-gray-600">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  Only .csv files are accepted
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        {parsedData && parsedData.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Preview</h3>
              <span className="text-xs text-gray-500">
                Showing first 5 of {parsedData.length} rows
              </span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {getHeaders().map((header) => (
                      <th
                        key={header}
                        className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {getHeaders().map((header) => (
                        <td
                          key={header}
                          className="px-3 py-2 text-gray-700 whitespace-nowrap"
                        >
                          {row[header] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Validation Section */}
        {parsedData && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Validation
            </h3>

            <div className="space-y-3">
              {/* Required Fields Status */}
              <div className="flex flex-wrap gap-2">
                {schema.required.map((field) => {
                  const hasField =
                    parsedData.length > 0 && field in parsedData[0];
                  return (
                    <span
                      key={field}
                      className={`
                        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        ${
                          hasField
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      `}
                    >
                      {hasField ? (
                        <CheckCircle size={12} />
                      ) : (
                        <AlertCircle size={12} />
                      )}
                      {field}
                    </span>
                  );
                })}
              </div>

              {/* Validation Summary */}
              {validationResult && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-gray-700">
                        Valid rows:{" "}
                        <span className="font-medium">{validCount}</span>
                      </span>
                    </div>
                    {invalidCount > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-gray-700">
                          Errors:{" "}
                          <span className="font-medium">{invalidCount}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Error List */}
                  {validationResult.errors &&
                    validationResult.errors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-red-600 mb-1">
                          Errors:
                        </p>
                        <ul className="text-xs text-red-600 space-y-1 max-h-24 overflow-y-auto">
                          {validationResult.errors
                            .slice(0, 10)
                            .map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          {validationResult.errors.length > 10 && (
                            <li>
                              ...and {validationResult.errors.length - 10} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Section */}
        {importStatus === "importing" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Importing...
              </span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FileText size={16} />
            Download Template
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <X size={16} />
              Cancel
            </button>

            {importStatus !== "complete" && (
              <button
                onClick={handleImport}
                disabled={
                  !parsedData ||
                  !validationResult?.valid ||
                  importStatus === "importing"
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                Import
              </button>
            )}

            {importStatus === "complete" && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
