export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'void';
  lineItems: LineItem[];
  createdAt: Date;
  dueDate: Date;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export function createInvoice(
  customerId: string,
  lineItems: LineItem[],
  currency = 'usd',
): Invoice {
  const amount = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return {
    id: crypto.randomUUID(),
    customerId,
    amount,
    currency,
    status: 'draft',
    lineItems,
    createdAt: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}

export function chargeInvoice(invoice: Invoice): Invoice {
  if (invoice.status !== 'pending') {
    throw new Error(`Cannot charge invoice in ${invoice.status} state`);
  }
  return { ...invoice, status: 'paid' };
}

export function voidInvoice(invoice: Invoice): Invoice {
  if (invoice.status === 'paid') {
    throw new Error('Cannot void a paid invoice');
  }
  return { ...invoice, status: 'void' };
}
