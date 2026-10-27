import { Option,ProductStatus} from '../models/site';

export const CATEGORIES: Option[] = [
  { value: 'locker-units', label: 'Locker Units' },
  { value: 'accessories',  label: 'Accessories' },
  { value: 'spare-parts',  label: 'Spare Parts' },
  { value: 'consumables',  label: 'Consumables' },
  { value: 'software',     label: 'Software' },
];

export const STATUSES: Option<ProductStatus>[] = [
  { value: 'active',      label: 'Active' },
  { value: 'draft',       label: 'Draft' },
  { value: 'inactive',    label: 'Inactive' },
];

export const SELLING_UNITS: Option[] = ['Each', 'Box', 'Pack', 'Pair', 'Set', 'Kit', 'Bundle'].map(
  (l) => ({ value: l.toLowerCase(), label: l }),
);

export const PURCHASE_UNITS: Option[] = ['Case', 'Box', 'Each', 'Pallet', 'Carton'].map((l) => ({
  value: l.toLowerCase(),
  label: l,
}));

export const NEW_VENDOR = '__new__'; 