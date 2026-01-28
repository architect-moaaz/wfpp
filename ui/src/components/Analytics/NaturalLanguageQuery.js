/**
 * NaturalLanguageQuery - Ask Questions in Plain English
 *
 * Provides an intuitive interface for non-technical users to
 * query data using natural language.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  Mic,
  Loader2,
  BarChart3,
  PieChart,
  LineChart,
  Table2,
  Hash,
  Check,
  X,
  Download,
  Share2,
  Plus,
  RefreshCw
} from 'lucide-react';
import './NaturalLanguageQuery.css';

const NaturalLanguageQuery = ({ onBack, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [selectedViz, setSelectedViz] = useState('bar');
  const inputRef = useRef(null);

  // Sample suggestions
  const suggestions = [
    'How many orders did we get last month?',
    'Show me top 10 customers by revenue',
    'Compare sales this year vs last year',
    'What is the average order value by region?',
    'Show me revenue trend over time'
  ];

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // First get explanation
      const explainRes = await fetch('/api/analytics/query/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'default'
        },
        body: JSON.stringify({ naturalLanguage: query })
      });

      if (explainRes.ok) {
        const explainData = await explainRes.json();
        setExplanation(explainData.explanation);
      }

      // Execute query
      const queryRes = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'default'
        },
        body: JSON.stringify({ naturalLanguage: query })
      });

      const queryData = await queryRes.json();

      if (queryData.success) {
        setResult(queryData);
        setSelectedViz(queryData.visualization?.type || 'bar');
      } else {
        setError(queryData.error);
      }
    } catch (err) {
      setError({
        title: 'Connection Error',
        description: 'Could not connect to the analytics service. Please try again.',
        suggestions: ['Check your internet connection', 'Refresh the page']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    // Auto-submit
    setTimeout(() => {
      handleSubmit();
    }, 100);
  };

  const formatValue = (value) => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  const renderVisualization = () => {
    if (!result?.data) return null;

    const data = result.data;
    const maxValue = Math.max(...data.map(d => d.value || 0));

    switch (selectedViz) {
      case 'bar':
        return (
          <div className="viz-bar-chart">
            {data.map((item, index) => {
              const key = Object.keys(item).find(k => k !== 'value' && k !== 'id' && k !== 'date');
              const label = item[key] || item.name || `Item ${index + 1}`;
              const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

              return (
                <div key={index} className="bar-row">
                  <span className="bar-label">{label}</span>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="bar-value">{formatValue(item.value)}</span>
                </div>
              );
            })}
          </div>
        );

      case 'pie':
        const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
        return (
          <div className="viz-pie-chart">
            <div className="pie-legend">
              {data.map((item, index) => {
                const key = Object.keys(item).find(k => k !== 'value' && k !== 'id');
                const label = item[key] || item.name || `Item ${index + 1}`;
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;

                return (
                  <div key={index} className="pie-legend-item">
                    <span
                      className="pie-legend-color"
                      style={{ background: getColor(index) }}
                    />
                    <span className="pie-legend-label">{label}</span>
                    <span className="pie-legend-value">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'table':
        if (data.length === 0) return <p>No data to display</p>;
        const columns = Object.keys(data[0]).filter(k => k !== 'id');

        return (
          <div className="viz-table">
            <table>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col}>{formatColumnName(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index}>
                    {columns.map(col => (
                      <td key={col}>
                        {typeof row[col] === 'number'
                          ? formatValue(row[col])
                          : row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'kpi':
        const kpiValue = data[0]?.value || 0;
        return (
          <div className="viz-kpi">
            <div className="kpi-value">{formatValue(kpiValue)}</div>
            <div className="kpi-label">{result.visualization?.title || 'Total'}</div>
          </div>
        );

      default:
        return renderVisualization('bar');
    }
  };

  return (
    <div className="nlq-container">
      {/* Header */}
      <div className="nlq-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>Ask a Question</h1>
      </div>

      {/* Search Input */}
      <form className="nlq-search-form" onSubmit={handleSubmit}>
        <div className="nlq-search-box">
          <Search className="search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your data..."
          />
          {query && (
            <button
              type="button"
              className="clear-button"
              onClick={() => setQuery('')}
            >
              <X size={18} />
            </button>
          )}
          <button type="button" className="voice-button">
            <Mic size={18} />
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={!query.trim() || loading}
          >
            {loading ? <Loader2 size={18} className="spinner" /> : 'Ask'}
          </button>
        </div>
      </form>

      {/* Initial State - Suggestions */}
      {!result && !loading && !error && (
        <div className="nlq-suggestions">
          <h3>Try asking:</h3>
          <div className="suggestion-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-button"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="nlq-loading">
          <Loader2 size={40} className="spinner" />
          <p>Analyzing your question...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="nlq-error">
          <div className="error-icon">
            <X size={24} />
          </div>
          <h3>{error.title || 'Something went wrong'}</h3>
          <p>{error.description}</p>
          {error.suggestions && (
            <div className="error-suggestions">
              <strong>Try this instead:</strong>
              <ul>
                {error.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <button className="retry-button" onClick={handleSubmit}>
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="nlq-results">
          {/* Explanation */}
          {explanation && (
            <div className="nlq-explanation">
              <div className="explanation-header">
                <Check size={18} className="check-icon" />
                <span>I understood your question as:</span>
              </div>
              <p className="explanation-text">{explanation.summary}</p>
              <div className="explanation-confirm">
                Is this correct?
                <button className="confirm-yes">Yes, show results</button>
                <button className="confirm-no">No, let me adjust</button>
              </div>
            </div>
          )}

          {/* Visualization Selector */}
          <div className="viz-selector">
            <span>View as:</span>
            <div className="viz-options">
              <button
                className={`viz-option ${selectedViz === 'bar' ? 'active' : ''}`}
                onClick={() => setSelectedViz('bar')}
              >
                <BarChart3 size={18} />
                Bar
              </button>
              <button
                className={`viz-option ${selectedViz === 'pie' ? 'active' : ''}`}
                onClick={() => setSelectedViz('pie')}
              >
                <PieChart size={18} />
                Pie
              </button>
              <button
                className={`viz-option ${selectedViz === 'line' ? 'active' : ''}`}
                onClick={() => setSelectedViz('line')}
              >
                <LineChart size={18} />
                Line
              </button>
              <button
                className={`viz-option ${selectedViz === 'table' ? 'active' : ''}`}
                onClick={() => setSelectedViz('table')}
              >
                <Table2 size={18} />
                Table
              </button>
              <button
                className={`viz-option ${selectedViz === 'kpi' ? 'active' : ''}`}
                onClick={() => setSelectedViz('kpi')}
              >
                <Hash size={18} />
                Number
              </button>
            </div>
          </div>

          {/* Visualization */}
          <div className="viz-container">
            {renderVisualization()}
          </div>

          {/* Meta Info */}
          {result.meta && (
            <div className="result-meta">
              <span>{result.meta.rowCount} results</span>
              <span>Query time: {result.meta.executionTime}ms</span>
              {result.meta.cached && <span className="cached-badge">Cached</span>}
            </div>
          )}

          {/* Actions */}
          <div className="result-actions">
            <button className="action-button primary">
              <Plus size={16} />
              Add to Dashboard
            </button>
            <button className="action-button">
              <Download size={16} />
              Download
            </button>
            <button className="action-button">
              <Share2 size={16} />
              Share
            </button>
          </div>

          {/* Follow-up */}
          <div className="follow-up-section">
            <span>Ask a follow-up question:</span>
            <div className="follow-up-suggestions">
              <button className="follow-up-chip">Show me the trend over time</button>
              <button className="follow-up-chip">Break down by product</button>
              <button className="follow-up-chip">Compare to last year</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getColor = (index) => {
  const colors = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  return colors[index % colors.length];
};

const formatColumnName = (name) => {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default NaturalLanguageQuery;
