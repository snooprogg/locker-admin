export interface User {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  permmissions: string[] | null;
}

export interface JwtPayload extends User {
    iat?: number; // Issued at
    exp?: number; // Expiration time
  }

/** Generic value/label pair for selects and radio groups. */
export interface Option<T = string> {
  value: T;
  label: string;
}

// ---------- Catalog ----------

export type ProductStatus = 'active' | 'draft' | 'inactive';

/** Row shape of catalog.products */
export interface ProductRow {
  id: string;
  product_name: string;
  description: string | null;
  internal_sku: string | null;
  barcode_upc: string | null;
  category: string | null;
  product_image_url: string | null;
  status: ProductStatus;
  selling_unit: string | null;
  selling_price: number | null;
  taxable: boolean;
  vendor_id: string;
  vendor_sku: string | null;
  purchase_unit: string | null;
  quantity_per_purchase_unit: number | null;
  current_purchase_cost: number | null;
  minimum_order_quantity: number | null;
  reorder_url: string | null;
  ordering_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Columns shown in the products manage table. */
export type ProductListRow = Pick<
  ProductRow,
  'id' | 'product_name' | 'internal_sku' | 'category' | 'vendor_sku' | 'status'
>;

export type VendorStatus = 'active' | 'inactive';

/** Row shape of catalog.vendor */
export interface VendorRow {
  id: string;
  name: string;
  contact: string | null;
  phone: number | null;
  email: string | null;
  status: VendorStatus | null;
  notes: string | null;
  created_on: string;
}

/** Columns shown in the vendors manage table. */
export type VendorListRow = Pick<VendorRow, 'id' | 'name' | 'contact' | 'phone' | 'email'>;