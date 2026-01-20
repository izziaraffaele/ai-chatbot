/**
 * Selected Invoice Store
 *
 * Simple module-level store for tracking the currently selected invoice.
 * This allows the chat transport to access the selected invoice synchronously
 * when building request payloads.
 *
 * Usage:
 * - Call setSelectedInvoice() when user selects an invoice
 * - Call getSelectedInvoice() in prepareSendMessagesRequest
 * - Call clearSelectedInvoice() to clear the selection
 */

type SelectedInvoiceState = {
  /** The canonical recordId of the selected invoice (e.g., "sibac-shared:path/to/file.xml") */
  recordId: string | null;
  /** When the invoice was selected */
  selectedAt: number | null;
};

/**
 * Module-level state for selected invoice.
 * This is a simple store that doesn't require React context.
 */
let selectedInvoiceState: SelectedInvoiceState = {
  recordId: null,
  selectedAt: null,
};

/**
 * Subscribers for state changes.
 */
const subscribers: Set<(state: SelectedInvoiceState) => void> = new Set();

/**
 * Notify all subscribers of state changes.
 */
function notifySubscribers() {
  for (const callback of subscribers) {
    callback(selectedInvoiceState);
  }
}

/**
 * Set the currently selected invoice.
 *
 * @param recordId - The canonical recordId of the invoice (e.g., "sibac-shared:path/to/file.xml")
 */
export function setSelectedInvoice(recordId: string): void {
  selectedInvoiceState = {
    recordId,
    selectedAt: Date.now(),
  };
  notifySubscribers();
}

/**
 * Get the currently selected invoice recordId.
 *
 * @returns The recordId or null if no invoice is selected
 */
export function getSelectedInvoice(): string | null {
  return selectedInvoiceState.recordId;
}

/**
 * Get the full selected invoice state.
 *
 * @returns The full state including selection timestamp
 */
export function getSelectedInvoiceState(): SelectedInvoiceState {
  return { ...selectedInvoiceState };
}

/**
 * Clear the selected invoice.
 */
export function clearSelectedInvoice(): void {
  selectedInvoiceState = {
    recordId: null,
    selectedAt: null,
  };
  notifySubscribers();
}

/**
 * Subscribe to selected invoice changes.
 *
 * @param callback - Function to call when selection changes
 * @returns Unsubscribe function
 */
export function subscribeToSelectedInvoice(
  callback: (state: SelectedInvoiceState) => void
): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}
