type FixtureMap = Record<string, any[]>;

const DEFAULT_TENANT = '820dcb0a-79fd-4565-be2a-2752d2a04e6c';

const OFFLINE_FIXTURES: FixtureMap = {
  customers: [
    {
      id: 'offline-cust-001',
      tenant_id: DEFAULT_TENANT,
      name: 'Summit Roofing Co.',
      email: 'info@summitroofing.test',
      phone: '(719) 555-1001',
      address: '123 Peak View Dr',
      city: 'Colorado Springs',
      state: 'CO',
      status: 'active',
      job_count: 12,
      total_revenue: 185000,
      created_at: '2024-01-05T00:00:00Z',
    },
    {
      id: 'offline-cust-002',
      tenant_id: DEFAULT_TENANT,
      name: 'Front Range Builders',
      email: 'office@frontrange.test',
      phone: '(719) 555-2044',
      address: '8408 Platte Ave',
      city: 'Denver',
      state: 'CO',
      status: 'prospect',
      job_count: 4,
      total_revenue: 42000,
      created_at: '2024-02-18T00:00:00Z',
    },
    {
      id: 'offline-cust-003',
      tenant_id: DEFAULT_TENANT,
      name: 'Garden of the Gods HOA',
      email: 'board@goghoa.test',
      phone: '(719) 555-8890',
      address: '710 Vista Rd',
      city: 'Colorado Springs',
      state: 'CO',
      status: 'inactive',
      job_count: 2,
      total_revenue: 21500,
      created_at: '2023-11-12T00:00:00Z',
    },
  ],
  invoices: [
    {
      id: 'offline-invoice-1001',
      tenant_id: DEFAULT_TENANT,
      number: 'INV-1001',
      status: 'sent',
      total: 18500,
      balance_due: 18500,
      due_date: '2024-02-05',
      created_at: '2024-01-22T00:00:00Z',
    },
    {
      id: 'offline-invoice-1002',
      tenant_id: DEFAULT_TENANT,
      number: 'INV-1002',
      status: 'paid',
      total: 42000,
      balance_due: 0,
      due_date: '2024-02-12',
      created_at: '2024-01-30T00:00:00Z',
    },
  ],
};

export const getOfflineRowsForTable = (name: string): any[] | null => {
  if (!name) return null;
  return OFFLINE_FIXTURES[name.toLowerCase()] ?? null;
};
