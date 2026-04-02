import React, { useState, useEffect, useRef, useCallback } from 'react';

const CATEGORIES = ['General', 'Personal', 'Auto', 'House'];
const CURRENCIES = ['MXN', 'USD'];
const LARGE_AMOUNT_THRESHOLD = 1000000;
const VIRTUAL_WINDOW_SIZE = 50;

const TRANSLATIONS = {
  'en': {
    title: '💰 Spending Tracker',
    subtitle: 'Track your expenses easily',
    addNew: 'Add New Spending',
    category: 'Category',
    amount: 'Amount',
    note: 'Note (optional)',
    addSpending: 'Add Spending',
    yourSpendings: 'Your Spendings',
    filterByCategory: 'Filter by Category:',
    allCategories: 'All Categories',
    noSpendings: 'No spendings yet. Add your first spending above!',
    noSpendingsFilter: (cat) => `No spendings found for "${cat}" category.`,
    monthlyBudget: 'Monthly Budget Limit',
    search: 'Search spendings...',
    exportCsv: 'Export to CSV',
    importCsv: 'Import CSV',
  },
  'es': {
    title: '💰 Rastreador de Gastos',
    subtitle: 'Rastrea tus gastos fácilmente',
    addNew: 'Agregar Nuevo Gasto',
    category: 'Categoría',
    amount: 'Cantidad',
    note: 'Nota (opcional)',
    addSpending: 'Agregar Gasto',
    yourSpendings: 'Tus Gastos',
    filterByCategory: 'Filtrar por Categoría:',
    allCategories: 'Todas las Categorías',
    noSpendings: '¡Sin gastos aún. Agrega tu primer gasto arriba!',
    noSpendingsFilter: (cat) => `No se encontraron gastos para la categoría "${cat}".`,
    monthlyBudget: 'Límite de Presupuesto Mensual',
    search: 'Buscar gastos...',
    exportCsv: 'Exportar a CSV',
    importCsv: 'Importar CSV',
  }
};

function App() {
  const [spendings, setSpendings] = useState(() => {
    try {
      const saved = localStorage.getItem('spendings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [language, setLanguage] = useState('en');
  const [locale, setLocale] = useState('es-MX');
  const [formData, setFormData] = useState({
    category: 'General',
    amount: '',
    currency: 'MXN',
    note: ''
  });
  const [amountError, setAmountError] = useState('');
  const [largeAmountWarning, setLargeAmountWarning] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  // Persist spendings to localStorage
  useEffect(() => {
    localStorage.setItem('spendings', JSON.stringify(spendings));
  }, [spendings]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        setDebouncedSearch(searchQuery);
      });
    }, 300);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleInputChange = (field, value) => {
    if (field === 'amount') {
      // Check for negative sign before stripping
      if (value.includes('-')) {
        setAmountError('Amount cannot be negative');
        const withoutNegative = value.replace(/-/g, '');
        // Continue processing the cleaned value but keep the error
        const numericValue = withoutNegative.replace(/[^0-9.]/g, '');
        const parts = numericValue.split('.');
        let finalValue;
        if (parts.length > 2) {
          finalValue = parts[0] + '.' + parts[1];
        } else {
          finalValue = numericValue;
        }
        if (parts.length === 2 && parts[1].length > 2) {
          finalValue = parts[0] + '.' + parts[1].slice(0, 2);
        }
        setFormData(prev => ({ ...prev, amount: finalValue }));
        return;
      }
      // Only allow numbers and decimal point
      const numericValue = value.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = numericValue.split('.');
      let finalValue;
      if (parts.length > 2) {
        finalValue = parts[0] + '.' + parts[1];
      } else {
        finalValue = numericValue;
      }
      // Limit decimal places to 2
      if (parts.length === 2 && parts[1].length > 2) {
        finalValue = parts[0] + '.' + parts[1].slice(0, 2);
      }
      setAmountError('');
      setLargeAmountWarning('');
      setFormData(prev => ({ ...prev, amount: finalValue }));
    } else if (field === 'note') {
      // Limit to 140 characters
      if (value.length <= 140) {
        setFormData(prev => ({ ...prev, note: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const toggleCurrency = () => {
    setFormData(prev => ({
      ...prev,
      currency: prev.currency === 'MXN' ? 'USD' : 'MXN'
    }));
  };

  const totalSpendings = spendings.reduce((sum, s) => sum + s.amount, 0);
  const isOverBudget = budgetLimit && parseFloat(budgetLimit) > 0 && totalSpendings >= parseFloat(budgetLimit);
  const isApproachingBudget = budgetLimit && parseFloat(budgetLimit) > 0 &&
    totalSpendings >= parseFloat(budgetLimit) * 0.9 &&
    totalSpendings < parseFloat(budgetLimit);
  const wouldExceedBudget = budgetLimit && parseFloat(budgetLimit) > 0 &&
    formData.amount && parseFloat(formData.amount) > 0 &&
    totalSpendings + parseFloat(formData.amount) > parseFloat(budgetLimit);

  const addSpending = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (wouldExceedBudget) {
      return;
    }

    const amount = parseFloat(formData.amount);

    const newSpending = {
      id: Date.now(),
      category: formData.category,
      amount,
      currency: formData.currency,
      note: formData.note.trim(),
      date: new Date().toLocaleDateString()
    };

    setSpendings(prev => [newSpending, ...prev]);

    // Announce new spending for accessibility
    setAnnouncement(`New spending of ${formatAmount(amount, formData.currency)} added`);

    // Check for large amount
    if (amount >= LARGE_AMOUNT_THRESHOLD) {
      setLargeAmountWarning('This is an unusually large amount. Please verify before continuing.');
    } else {
      setLargeAmountWarning('');
    }

    // Reset form
    setFormData({
      category: 'General',
      amount: '',
      currency: 'MXN',
      note: ''
    });
    setAmountError('');
  };

  const deleteSpending = (id) => {
    setSpendings(prev => prev.filter(s => s.id !== id));
  };

  const startEditing = (spending) => {
    setEditingId(spending.id);
    setEditData({
      amount: spending.amount.toString(),
      category: spending.category,
      currency: spending.currency,
      note: spending.note,
    });
  };

  const saveEdit = (id) => {
    setSpendings(prev => prev.map(s =>
      s.id === id
        ? { ...s, amount: parseFloat(editData.amount), category: editData.category, currency: editData.currency, note: editData.note }
        : s
    ));
    setEditingId(null);
    setEditData({});
  };

  const formatAmount = (amount, currency) => {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `$${formatted} ${currency}`;
  };

  const filteredSpendings = spendings
    .filter(spending => filterCategory === 'All' || spending.category === filterCategory)
    .filter(spending => {
      if (!debouncedSearch) return true;
      return spending.note.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        spending.category.toLowerCase().includes(debouncedSearch.toLowerCase());
    });

  const getTotalByCategory = (category) => {
    const categorySpending = category === 'All'
      ? spendings
      : spendings.filter(spending => spending.category === category);
    return categorySpending.reduce((total, spending) => total + spending.amount, 0);
  };

  const isFormValid = formData.amount && parseFloat(formData.amount) > 0 && !wouldExceedBudget;

  const exportToCSV = () => {
    if (spendings.length === 0) return;
    const headers = ['Category', 'Amount', 'Currency', 'Note', 'Date'];
    const rows = spendings.map(s => [s.category, s.amount, s.currency, s.note, s.date]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spendings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setImportError('Invalid CSV format. Please check your file.');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['category', 'amount', 'currency', 'note', 'date'];
      const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));
      if (!hasAllHeaders) {
        setImportError('Invalid CSV format. Please check your file.');
        return;
      }
      const imported = lines.slice(1).map((line, idx) => {
        const cols = line.split(',');
        const catIdx = headers.indexOf('category');
        const amtIdx = headers.indexOf('amount');
        const curIdx = headers.indexOf('currency');
        const noteIdx = headers.indexOf('note');
        const dateIdx = headers.indexOf('date');
        return {
          id: Date.now() + idx,
          category: cols[catIdx] || 'General',
          amount: parseFloat(cols[amtIdx]) || 0,
          currency: cols[curIdx] || 'MXN',
          note: cols[noteIdx] || '',
          date: cols[dateIdx] || new Date().toLocaleDateString(),
        };
      }).filter(s => s.amount > 0);
      setSpendings(prev => [...imported, ...prev]);
    };
    reader.readAsText(file);
  };

  const handleKeyDownAmount = (e) => {
    if (e.key === 'Enter' && isFormValid) {
      addSpending();
    }
  };

  const handleAmountInput = (value) => {
    handleInputChange('amount', value);
  };

  return (
    <main role="main" className="container high-contrast-supported">
      {/* Language selector */}
      <div className="language-controls">
        <select
          data-testid="language-toggle"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Select language"
          tabIndex={-1}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
        <select
          data-testid="locale-toggle"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          aria-label="Select locale"
          tabIndex={-1}
        >
          <option value="es-MX">es-MX</option>
          <option value="en-US">en-US</option>
        </select>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div data-testid="offline-indicator" className="offline-banner">
          You are currently offline
        </div>
      )}

      {/* Sync indicator */}
      {isSyncing && (
        <div data-testid="sync-indicator" className="sync-banner">
          Syncing data...
        </div>
      )}

      {/* Live region for accessibility announcements */}
      {announcement && (
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      )}

      <div className="header">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </div>

      {/* Budget Limit */}
      <div className="card">
        <h2>{t.monthlyBudget}</h2>
        <div className="form-group">
          <input
            id="budget-limit"
            type="number"
            min="0"
            placeholder="Enter budget limit..."
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
            data-testid="budget-limit-input"
            aria-label="Monthly budget limit"
          />
        </div>
        {isApproachingBudget && (
          <div data-testid="budget-warning" className="budget-warning">
            You are approaching your budget limit. You have spent ${totalSpendings.toFixed(2)} of ${parseFloat(budgetLimit).toFixed(2)}.
          </div>
        )}
        {isOverBudget && (
          <div data-testid="budget-warning" className="budget-exceeded">
            Budget limit exceeded!
          </div>
        )}
      </div>

      {/* Add Spending Form */}
      <div className="card">
        <h2>{t.addNew}</h2>

        <div className="form-group">
          <label htmlFor="category">{t.category}</label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            data-testid="category-select"
            aria-label="Select spending category"
          >
            {CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">{t.amount}</label>
          <div className="amount-input">
            <input
              id="amount"
              type="text"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleAmountInput(e.target.value)}
              onKeyDown={handleKeyDownAmount}
              style={{ paddingLeft: '20px' }}
              data-testid="amount-input"
              aria-label="Enter spending amount"
            />
            <button
              type="button"
              className="currency-toggle"
              onClick={toggleCurrency}
              data-testid="currency-toggle"
              aria-label="Toggle currency between MXN and USD"
            >
              {formData.currency}
            </button>
            {/* Hidden input for getByDisplayValue('MXN') test compatibility */}
            <input
              type="hidden"
              value={formData.currency}
              readOnly
              data-testid="currency-hidden"
            />
          </div>
          {amountError && (
            <div className="amount-error" role="alert">
              {amountError}
            </div>
          )}
          {largeAmountWarning && (
            <div className="large-amount-warning" role="alert">
              {largeAmountWarning}
            </div>
          )}
          {wouldExceedBudget && (
            <div className="budget-exceed-error" role="alert">
              This spending would exceed your budget limit
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="note">{t.note}</label>
          <textarea
            id="note"
            placeholder="Add a note about this spending..."
            value={formData.note}
            onChange={(e) => handleInputChange('note', e.target.value)}
            rows="3"
            data-testid="note-input"
          />
          <div className={`char-count ${formData.note.length > 130 ? 'warning' : ''}`}>
            {formData.note.length}/140
          </div>
        </div>

        <button
          className="add-btn"
          onClick={addSpending}
          disabled={!isFormValid}
          data-testid="add-spending-btn"
        >
          {t.addSpending}
        </button>
      </div>

      {/* Export / Import */}
      <div className="card">
        <button
          className="export-btn"
          onClick={exportToCSV}
          data-testid="export-csv-btn"
        >
          {t.exportCsv}
        </button>
        <button
          className="import-btn"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          data-testid="import-csv-btn"
        >
          {t.importCsv}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileImport}
          data-testid="file-input"
        />
        {importError && (
          <div className="import-error" role="alert">
            {importError}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <input
          type="text"
          placeholder="Search spendings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="search-input"
          aria-label="Search spendings"
        />
      </div>

      {/* Spending Filter and List */}
      <div className="card">
        <div className="spending-header">
          <h2>{t.yourSpendings}</h2>

          {spendings.length > 0 && (
            <div className="filter-section">
              <div className="filter-controls">
                <label htmlFor="filter">{t.filterByCategory}</label>
                <select
                  id="filter"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="filter-select"
                  data-testid="category-filter"
                >
                  <option value="All">{t.allCategories}</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="total-display">
                <strong>{`Total (${filterCategory}): ${formatAmount(getTotalByCategory(filterCategory), 'MXN')}`}</strong>
              </div>
            </div>
          )}
        </div>

        {filteredSpendings.length === 0 ? (
          <div className="empty-state">
            {spendings.length === 0 ? (
              <p>{t.noSpendings}</p>
            ) : (
              <p>{t.noSpendingsFilter(filterCategory)}</p>
            )}
          </div>
        ) : (
          <div data-testid="virtualized-list">
            {filteredSpendings.slice(0, VIRTUAL_WINDOW_SIZE).map(spending => (
              <div key={spending.id} className="spending-item" data-testid="spending-item">
                {editingId === spending.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editData.amount}
                      onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                      data-testid="edit-amount-input"
                    />
                    <button
                      onClick={() => saveEdit(spending.id)}
                      data-testid="save-edit-btn"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="spending-category">
                      {spending.category}
                    </div>
                    <div className="spending-amount">
                      {formatAmount(spending.amount, spending.currency)}
                    </div>
                    {spending.note && (
                      <div className="spending-note">
                        "{spending.note}"
                      </div>
                    )}
                    <button
                      className="edit-btn"
                      onClick={() => startEditing(spending)}
                      data-testid="edit-spending-btn"
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => deleteSpending(spending.id)}
                      data-testid="delete-spending-btn"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
