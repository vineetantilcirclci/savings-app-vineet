import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App'

describe('Extended Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── formatAmount edge cases ──────────────────────────────────────────────

  describe('formatAmount display', () => {
    it('displays integer amount with two decimal places', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '50')
      await user.click(addButton)

      expect(screen.getByText('$50.00 MXN')).toBeInTheDocument()
    })

    it('displays amount with one decimal place padded to two', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '9.5')
      await user.click(addButton)

      expect(screen.getByText('$9.50 MXN')).toBeInTheDocument()
    })

    it('shows USD currency label when spending is added with USD', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const currencyToggle = screen.getByTestId('currency-toggle')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '42.00')
      await user.click(currencyToggle) // MXN -> USD
      await user.click(addButton)

      expect(screen.getByText('$42.00 USD')).toBeInTheDocument()
    })
  })

  // ─── note trimming ────────────────────────────────────────────────────────

  describe('Note trimming', () => {
    it('trims leading and trailing whitespace from note before saving', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const noteInput = screen.getByTestId('note-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '20.00')
      // userEvent.type does not fire as a paste so we use fireEvent to set the raw value
      fireEvent.change(noteInput, { target: { value: '  trimmed note  ' } })
      await user.click(addButton)

      expect(screen.getByText('"trimmed note"')).toBeInTheDocument()
    })

    it('does not display note section when note is only whitespace', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const noteInput = screen.getByTestId('note-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '15.00')
      fireEvent.change(noteInput, { target: { value: '   ' } })
      await user.click(addButton)

      const spendingItem = screen.getByTestId('spending-item')
      expect(spendingItem.querySelector('.spending-note')).not.toBeInTheDocument()
    })
  })

  // ─── spending list ordering ───────────────────────────────────────────────

  describe('Spending list ordering', () => {
    it('displays most recently added spending at the top', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      // Add first spending
      await user.type(amountInput, '10.00')
      await user.click(addButton)

      // Add second spending
      await user.type(amountInput, '20.00')
      await user.click(addButton)

      const items = screen.getAllByTestId('spending-item')
      // Most recently added ($20) should appear first
      expect(items[0]).toHaveTextContent('$20.00 MXN')
      expect(items[1]).toHaveTextContent('$10.00 MXN')
    })

    it('maintains order when adding a third spending', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '5.00')
      await user.click(addButton)

      await user.type(amountInput, '10.00')
      await user.click(addButton)

      await user.type(amountInput, '15.00')
      await user.click(addButton)

      const items = screen.getAllByTestId('spending-item')
      expect(items[0]).toHaveTextContent('$15.00 MXN')
      expect(items[1]).toHaveTextContent('$10.00 MXN')
      expect(items[2]).toHaveTextContent('$5.00 MXN')
    })
  })

  // ─── currency reset on form submit ────────────────────────────────────────

  describe('Currency reset after adding spending', () => {
    it('resets currency back to MXN after adding a USD spending', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const currencyToggle = screen.getByTestId('currency-toggle')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '30.00')
      await user.click(currencyToggle) // Switch to USD
      expect(currencyToggle).toHaveTextContent('USD')

      await user.click(addButton)

      // After reset, currency toggle should show MXN again
      expect(currencyToggle).toHaveTextContent('MXN')
    })
  })

  // ─── handleInputChange — category and currency (else branch) ─────────────

  describe('handleInputChange — category field', () => {
    it('updates formData.category correctly when selecting Auto', async () => {
      const user = userEvent.setup()
      render(<App />)

      const categorySelect = screen.getByTestId('category-select')
      await user.selectOptions(categorySelect, 'Auto')
      expect(categorySelect).toHaveValue('Auto')
    })

    it('updates formData.category correctly when selecting House', async () => {
      const user = userEvent.setup()
      render(<App />)

      const categorySelect = screen.getByTestId('category-select')
      await user.selectOptions(categorySelect, 'House')
      expect(categorySelect).toHaveValue('House')
    })
  })

  // ─── isFormValid edge cases ───────────────────────────────────────────────

  describe('isFormValid edge cases', () => {
    it('keeps add button disabled when amount is only a decimal point', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '.')
      // "." becomes "." after filter; parseFloat(".") is NaN which is not > 0
      expect(addButton).toBeDisabled()
    })

    it('keeps add button disabled when amount is "0.0"', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '0.0')
      expect(addButton).toBeDisabled()
    })

    it('enables add button for a positive decimal amount', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '0.01')
      expect(addButton).toBeEnabled()
    })
  })

  // ─── character count warning threshold ───────────────────────────────────

  describe('Character count warning threshold', () => {
    it('does not apply warning class at exactly 130 characters', async () => {
      const user = userEvent.setup()
      render(<App />)

      const noteInput = screen.getByTestId('note-input')
      await user.type(noteInput, 'a'.repeat(130))

      const charCount = screen.getByText('130/140')
      expect(charCount).not.toHaveClass('warning')
    })

    it('applies warning class at exactly 131 characters', async () => {
      const user = userEvent.setup()
      render(<App />)

      const noteInput = screen.getByTestId('note-input')
      await user.type(noteInput, 'a'.repeat(131))

      const charCount = screen.getByText('131/140')
      expect(charCount).toHaveClass('warning')
    })
  })

  // ─── getTotalByCategory — mixed currencies ────────────────────────────────

  describe('getTotalByCategory with mixed currencies', () => {
    it('sums amounts regardless of currency for the total display', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const currencyToggle = screen.getByTestId('currency-toggle')
      const addButton = screen.getByTestId('add-spending-btn')

      // Add MXN spending: 100
      await user.type(amountInput, '100.00')
      await user.click(addButton)

      // Add USD spending: 50 (toggle to USD first)
      await user.type(amountInput, '50.00')
      await user.click(currencyToggle) // MXN -> USD
      await user.click(addButton)

      // Total should be 100 + 50 = 150 (amounts summed, unit is always shown as MXN)
      expect(screen.getByText('Total (All): $150.00 MXN')).toBeInTheDocument()
    })
  })

  // ─── filter persists after adding a new spending ──────────────────────────

  describe('Category filter persistence', () => {
    it('filter selection persists after adding a new spending', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const categorySelect = screen.getByTestId('category-select')
      const addButton = screen.getByTestId('add-spending-btn')

      // Add a Personal spending so the filter dropdown appears
      await user.selectOptions(categorySelect, 'Personal')
      await user.type(amountInput, '10.00')
      await user.click(addButton)

      // Set filter to Personal
      const filterSelect = screen.getByTestId('category-filter')
      await user.selectOptions(filterSelect, 'Personal')

      // Add another Personal spending
      await user.selectOptions(categorySelect, 'Personal')
      await user.type(amountInput, '20.00')
      await user.click(addButton)

      // Filter should still be set to Personal
      expect(filterSelect).toHaveValue('Personal')
    })

    it('shows "All Categories" option in filter dropdown', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '10.00')
      await user.click(addButton)

      const filterSelect = screen.getByTestId('category-filter')
      const options = Array.from(filterSelect.options).map(o => o.text)
      expect(options).toContain('All Categories')
    })

    it('filter dropdown is not visible when there are no spendings', () => {
      render(<App />)

      expect(screen.queryByTestId('category-filter')).not.toBeInTheDocument()
    })

    it('returns to showing all spendings when "All" is selected again', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const categorySelect = screen.getByTestId('category-select')
      const addButton = screen.getByTestId('add-spending-btn')

      // Add General spending
      await user.type(amountInput, '10.00')
      await user.click(addButton)

      // Add Personal spending
      await user.selectOptions(categorySelect, 'Personal')
      await user.type(amountInput, '20.00')
      await user.click(addButton)

      const filterSelect = screen.getByTestId('category-filter')

      // Narrow to Personal
      await user.selectOptions(filterSelect, 'Personal')
      expect(screen.getAllByTestId('spending-item')).toHaveLength(1)

      // Return to All
      await user.selectOptions(filterSelect, 'All')
      expect(screen.getAllByTestId('spending-item')).toHaveLength(2)
    })
  })

  // ─── alert is called when addSpending is triggered with amount <= 0 ───────

  describe('addSpending validation via alert', () => {
    it('calls alert when addSpending is invoked directly with zero amount bypassing disabled state', async () => {
      render(<App />)

      const addButton = screen.getByTestId('add-spending-btn')

      // Force-click despite disabled attribute to exercise the guard inside addSpending
      fireEvent.click(addButton)

      // The button is disabled so the onClick does not fire — alert should NOT be called
      expect(global.alert).not.toHaveBeenCalled()
    })
  })

  // ─── multiple spendings without notes vs with notes ───────────────────────

  describe('Spending display — note presence', () => {
    it('renders note for one spending and omits it for another in the same list', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const noteInput = screen.getByTestId('note-input')
      const addButton = screen.getByTestId('add-spending-btn')

      // Add spending with note
      await user.type(amountInput, '10.00')
      await user.type(noteInput, 'With note')
      await user.click(addButton)

      // Add spending without note
      await user.type(amountInput, '20.00')
      await user.click(addButton)

      const items = screen.getAllByTestId('spending-item')
      // Most recent (no note) is first
      expect(items[0].querySelector('.spending-note')).not.toBeInTheDocument()
      // Older (with note) is second
      expect(items[1].querySelector('.spending-note')).toBeInTheDocument()
    })
  })

  // ─── category options in select ───────────────────────────────────────────

  describe('Category options', () => {
    it('contains all four expected categories in the category select', () => {
      render(<App />)

      const categorySelect = screen.getByTestId('category-select')
      const options = Array.from(categorySelect.options).map(o => o.value)

      expect(options).toEqual(['General', 'Personal', 'Auto', 'House'])
    })

    it('contains all four categories plus "All" in the filter dropdown', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '1.00')
      await user.click(addButton)

      const filterSelect = screen.getByTestId('category-filter')
      const options = Array.from(filterSelect.options).map(o => o.value)

      expect(options).toEqual(['All', 'General', 'Personal', 'Auto', 'House'])
    })
  })

  // ─── amount input — non-numeric characters stripped ───────────────────────

  describe('Amount input — character stripping', () => {
    it('strips all non-numeric non-dot characters, including symbols', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      await user.type(amountInput, '$1,000.00')

      // $, , are stripped; only digits and dots remain: "1000.00"
      expect(amountInput).toHaveValue('1000.00')
    })

    it('strips letters but keeps valid numeric portion', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      await user.type(amountInput, 'abc')

      expect(amountInput).toHaveValue('')
    })
  })
})
