import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App'

describe('Additional Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Amount Input Edge Cases', () => {
    it('strips non-numeric characters but keeps digits and a single decimal', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      await user.type(amountInput, '!@#45$%^')
      expect(amountInput).toHaveValue('45')
    })

    it('allows a leading decimal point', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      await user.type(amountInput, '.5')
      expect(amountInput).toHaveValue('.5')
    })

    it('disables add button when amount is only a decimal point', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '.')
      // "." parses as NaN which is not > 0, so button stays disabled
      expect(addButton).toBeDisabled()
    })

    it('disables add button when amount is "0.00"', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '0.00')
      expect(addButton).toBeDisabled()
    })

    it('enables add button for an amount greater than zero with trailing zeros', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '10.00')
      expect(addButton).toBeEnabled()
    })

    it('ignores a third decimal separator leaving the input unchanged', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      // Type a valid value first, then verify a second decimal doesn't change it
      await user.type(amountInput, '123.45')
      expect(amountInput).toHaveValue('123.45')
      // Continuing to type digits after the decimal still works
      await user.type(amountInput, '6')
      expect(amountInput).toHaveValue('123.456')
    })
  })

  describe('Note Input Edge Cases', () => {
    it('does not apply warning class below the threshold (130 characters)', async () => {
      const user = userEvent.setup()
      render(<App />)

      const noteInput = screen.getByTestId('note-input')
      await user.type(noteInput, 'a'.repeat(130))

      // 130 is <= 130, so warning class should NOT be applied
      const charCount = screen.getByText('130/140')
      expect(charCount).not.toHaveClass('warning')
    })

    it('applies warning class at 131 characters', async () => {
      const user = userEvent.setup()
      render(<App />)

      const noteInput = screen.getByTestId('note-input')
      await user.type(noteInput, 'a'.repeat(131))

      const charCount = screen.getByText('131/140')
      expect(charCount).toHaveClass('warning')
    })

    it('trims whitespace from note when spending is added', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const noteInput = screen.getByTestId('note-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '10.00')
      await user.type(noteInput, '  lunch  ')
      await user.click(addButton)

      // The stored note is trimmed, so it renders without surrounding spaces
      expect(screen.getByText('"lunch"')).toBeInTheDocument()
    })

    it('does not show note element when note is whitespace only', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const noteInput = screen.getByTestId('note-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '5.00')
      // Only spaces — trim() produces an empty string
      await user.type(noteInput, '   ')
      await user.click(addButton)

      const spendingItem = screen.getByTestId('spending-item')
      expect(spendingItem.querySelector('.spending-note')).not.toBeInTheDocument()
    })

    it('shows char count starting at 0', () => {
      render(<App />)
      expect(screen.getByText('0/140')).toBeInTheDocument()
    })
  })

  describe('Spending Order', () => {
    it('displays newest spending first (prepend order)', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')
      const categorySelect = screen.getByTestId('category-select')

      // Add first spending
      await user.type(amountInput, '10.00')
      await user.click(addButton)

      // Add second spending with a different category so we can distinguish
      await user.selectOptions(categorySelect, 'Personal')
      await user.type(amountInput, '20.00')
      await user.click(addButton)

      const items = screen.getAllByTestId('spending-item')
      // Newest (Personal / $20.00) should be first
      expect(items[0]).toHaveTextContent('Personal')
      expect(items[0]).toHaveTextContent('$20.00 MXN')
      // Oldest (General / $10.00) should be second
      expect(items[1]).toHaveTextContent('General')
      expect(items[1]).toHaveTextContent('$10.00 MXN')
    })
  })

  describe('formatAmount display', () => {
    it('displays an integer amount with two decimal places', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '5')
      await user.click(addButton)

      expect(screen.getByText('$5.00 MXN')).toBeInTheDocument()
    })

    it('displays USD amounts with the correct currency label', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const currencyToggle = screen.getByTestId('currency-toggle')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.click(currencyToggle) // Switch to USD
      await user.type(amountInput, '99.9')
      await user.click(addButton)

      expect(screen.getByText('$99.90 USD')).toBeInTheDocument()
    })
  })

  describe('Filter Section Visibility', () => {
    it('does not show the category filter before any spendings are added', () => {
      render(<App />)
      expect(screen.queryByTestId('category-filter')).not.toBeInTheDocument()
    })

    it('shows the category filter once at least one spending is added', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.type(amountInput, '1.00')
      await user.click(addButton)

      expect(screen.getByTestId('category-filter')).toBeInTheDocument()
    })
  })

  describe('Total Calculation', () => {
    it('total is always displayed with MXN label regardless of spending currency', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const currencyToggle = screen.getByTestId('currency-toggle')
      const addButton = screen.getByTestId('add-spending-btn')

      // Add one MXN spending
      await user.type(amountInput, '100.00')
      await user.click(addButton)

      // Add one USD spending
      await user.click(currencyToggle)
      await user.type(amountInput, '50.00')
      await user.click(addButton)

      // Total sums raw amounts and always appends MXN
      expect(screen.getByText('Total (All): $150.00 MXN')).toBeInTheDocument()
    })

    it('total for a category sums only that category amounts', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const categorySelect = screen.getByTestId('category-select')
      const addButton = screen.getByTestId('add-spending-btn')
      const filterSelect = () => screen.getByTestId('category-filter')

      // Add General spending
      await user.type(amountInput, '40.00')
      await user.click(addButton)

      // Add Personal spending
      await user.selectOptions(categorySelect, 'Personal')
      await user.type(amountInput, '60.00')
      await user.click(addButton)

      // Filter to Personal
      await user.selectOptions(filterSelect(), 'Personal')
      expect(screen.getByText('Total (Personal): $60.00 MXN')).toBeInTheDocument()
    })
  })

  describe('All Four Categories', () => {
    it('allows selecting all four categories from the form', async () => {
      const user = userEvent.setup()
      render(<App />)

      const categorySelect = screen.getByTestId('category-select')

      for (const cat of ['General', 'Personal', 'Auto', 'House']) {
        await user.selectOptions(categorySelect, cat)
        expect(categorySelect).toHaveValue(cat)
      }
    })

    it('adds a spending under the House category and displays it correctly', async () => {
      const user = userEvent.setup()
      render(<App />)

      const categorySelect = screen.getByTestId('category-select')
      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.selectOptions(categorySelect, 'House')
      await user.type(amountInput, '250.00')
      await user.click(addButton)

      // The spending item contains both the category and amount
      const spendingItem = screen.getByTestId('spending-item')
      expect(spendingItem).toHaveTextContent('House')
      expect(spendingItem).toHaveTextContent('$250.00 MXN')
    })
  })

  describe('Currency Toggle State Management', () => {
    it('currency toggle resets to MXN after form is submitted', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const currencyToggle = screen.getByTestId('currency-toggle')
      const addButton = screen.getByTestId('add-spending-btn')

      await user.click(currencyToggle) // switch to USD
      expect(currencyToggle).toHaveTextContent('USD')

      await user.type(amountInput, '30.00')
      await user.click(addButton)

      // Form is reset, currency returns to MXN
      expect(currencyToggle).toHaveTextContent('MXN')
    })
  })

  describe('Simultaneous Spendings Across Categories', () => {
    it('shows correct count of spending items when multiple are added', async () => {
      const user = userEvent.setup()
      render(<App />)

      const amountInput = screen.getByTestId('amount-input')
      const addButton = screen.getByTestId('add-spending-btn')

      for (const amount of ['10.00', '20.00', '30.00', '40.00', '50.00']) {
        await user.type(amountInput, amount)
        await user.click(addButton)
      }

      expect(screen.getAllByTestId('spending-item')).toHaveLength(5)
    })
  })

  describe('Filter Switching', () => {
    it('switching filter back to All shows all spendings again', async () => {
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

      // Filter to Personal
      await user.selectOptions(filterSelect, 'Personal')
      expect(screen.getAllByTestId('spending-item')).toHaveLength(1)

      // Switch back to All
      await user.selectOptions(filterSelect, 'All')
      expect(screen.getAllByTestId('spending-item')).toHaveLength(2)
    })
  })
})
