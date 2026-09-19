import { useState, useEffect } from 'react';
import { X, ArrowRight, Package, AlertCircle, CheckCircle2, Wine, UtensilsCrossed, Apple } from 'lucide-react';
import api from '../../../services/api';

export default function StockTransferModal({ isOpen, onClose, onSuccess, initialProduct = null, initialDepartment = 'bar' }) {
  const [department, setDepartment] = useState(initialDepartment);
  const [productList, setProductList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSuccessMsg('');
    setQuantity('');
    setNotes('');

    const fetchCentralProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api('/inventory/multi-location');
        const items = res.inventory || res.data || [];
        setProductList(items);

        if (initialProduct) {
          setSelectedProductId(String(initialProduct.product_id || initialProduct.id));
        } else if (items.length > 0) {
          let preferred = null;
          if (initialDepartment === 'fruit') {
            preferred = items.find((p) => ((p.category_name || '').toLowerCase().includes('fruit') || (p.category_type || '').toLowerCase().includes('fruit')) && Number(p.main_quantity || 0) > 0)
              || items.find((p) => (p.category_name || '').toLowerCase().includes('fruit') || (p.category_type || '').toLowerCase().includes('fruit'));
          }
          if (!preferred) {
            preferred = items.find((p) => Number(p.main_quantity || 0) > 0) || items[0];
          }
          setSelectedProductId(String(preferred.product_id));
        }
      } catch (err) {
        console.error('Failed to load inventory for transfer:', err);
        setError('Failed to load central warehouse products.');
      } finally {
        setLoadingProducts(false);
      }
    };
  
    fetchCentralProducts();
  }, [isOpen, initialProduct, initialDepartment]);

  const handleDepartmentChange = (dept) => {
    setDepartment(dept);
    if (!initialProduct && productList.length > 0) {
      if (dept === 'fruit') {
        const fruitProd = productList.find((p) => ((p.category_name || '').toLowerCase().includes('fruit') || (p.category_type || '').toLowerCase().includes('fruit')) && Number(p.main_quantity || 0) > 0)
          || productList.find((p) => (p.category_name || '').toLowerCase().includes('fruit') || (p.category_type || '').toLowerCase().includes('fruit'));
        if (fruitProd) setSelectedProductId(String(fruitProd.product_id));
      } else if (dept === 'bar') {
        const barProd = productList.find((p) => (p.category_type === 'bar' || p.category_type === 'beverage') && Number(p.main_quantity || 0) > 0)
          || productList.find((p) => p.category_type === 'bar' || p.category_type === 'beverage');
        if (barProd) setSelectedProductId(String(barProd.product_id));
      } else if (dept === 'kitchen') {
        const kitProd = productList.find((p) => p.category_type === 'food' && !(p.category_name || '').toLowerCase().includes('fruit') && Number(p.main_quantity || 0) > 0)
          || productList.find((p) => p.category_type === 'food');
        if (kitProd) setSelectedProductId(String(kitProd.product_id));
      }
    }
  };

  if (!isOpen) return null;

  const selectedProduct = productList.find((p) => String(p.product_id) === String(selectedProductId));
  const availableCentralStock = Number(selectedProduct?.main_quantity || 0);
  const unit = selectedProduct?.unit || 'pcs';
  const currentOutletStock =
    department === 'bar'
      ? Number(selectedProduct?.bar_quantity || 0)
      : department === 'fruit'
      ? Number(selectedProduct?.fruit_quantity || 0)
      : Number(selectedProduct?.kitchen_quantity || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const transferQty = Number(quantity);
    if (!selectedProductId) {
      setError('Please select a product to transfer.');
      return;
    }
    if (isNaN(transferQty) || transferQty <= 0) {
      setError('Please enter a valid positive quantity to transfer.');
      return;
    }
    if (transferQty > availableCentralStock) {
      setError('Cannot transfer more than available in Central Store.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        fromLocation: 'main',
        toLocation: department,
        items: [
          {
            productId: Number(selectedProductId),
            quantity: transferQty,
            notes: notes || 'Transfer to ' + department.toUpperCase(),
          },
        ],
        notes: notes || 'Restock transfer to ' + department.toUpperCase(),
      };

      const res = await api('/inventory/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMsg(`Dispatched to ${department.toUpperCase()}! Staff can now verify & accept.`);

      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err.message || 'Failed to complete stock transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs'
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl transition-all'
      >
        <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600'>
              <Package className='h-5 w-5' />
            </div>
            <div>
              <h2 className='text-base font-bold text-slate-900'>Transfer Stock to Outlet</h2>
              <p className='text-xs text-slate-500'>Dispatch items from Central Warehouse to Bar, Kitchen, or Fruit</p>
            </div>
          </div>
          <button
            type='button'
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className='rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-5'>
          {error && (
            <div className='flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-100'>
              <AlertCircle className='h-4 w-4 shrink-0' />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className='flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700 border border-emerald-100'>
              <CheckCircle2 className='h-4 w-4 shrink-0' />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2'>
              Destination Department
            </label>
            <div className='grid grid-cols-3 gap-2 sm:gap-3'>
              <button
                type='button'
                onClick={() => handleDepartmentChange('bar')}
                className={'flex items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition ' + (department === 'bar' ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs ring-2 ring-amber-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
              >
                <Wine className='h-4 w-4 text-amber-600' />
                Bar Sub-Store
              </button>
              <button
                type='button'
                onClick={() => handleDepartmentChange('kitchen')}
                className={'flex items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition ' + (department === 'kitchen' ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs ring-2 ring-amber-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
              >
                <UtensilsCrossed className='h-4 w-4 text-amber-600' />
                Kitchen Sub-Store
              </button>
              <button
                type='button'
                onClick={() => handleDepartmentChange('fruit')}
                className={'flex items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition ' + (department === 'fruit' ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs ring-2 ring-amber-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
              >
                <Apple className='h-4 w-4 text-amber-600' />
                Fruit Sub-Store
              </button>
            </div>
          </div>

          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5'>
              Select Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={loadingProducts || submitting}
              className='w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15'
            >
              {productList
                .slice()
                .sort((a, b) => {
                  if (department === 'fruit') {
                    const aIsFruit = (a.category_name || '').toLowerCase().includes('fruit') ? 1 : 0;
                    const bIsFruit = (b.category_name || '').toLowerCase().includes('fruit') ? 1 : 0;
                    return bIsFruit - aIsFruit;
                  }
                  return 0;
                })
                .map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} — Central: {p.main_quantity} {p.unit} ({p.category_name || 'General'})
                  </option>
                ))}
            </select>
          </div>

          {selectedProduct && (
            <div className='rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2 text-xs'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-slate-500'>Central Warehouse On-Hand:</span>
                <span className={'font-black ' + (availableCentralStock > 0 ? 'text-slate-900' : 'text-rose-600')}>
                  {availableCentralStock} {unit}
                </span>
              </div>
              <div className='flex items-center justify-between border-t border-slate-200/50 pt-2'>
                <span className='font-semibold text-slate-500'>Current {department.toUpperCase()} On-Hand:</span>
                <span className='font-bold text-amber-700'>
                  {currentOutletStock} {unit}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5'>
              Transfer Quantity ({unit})
            </label>
            <input
              type='number'
              step='any'
              min='0.001'
              max={availableCentralStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={'Enter amount (max: ' + availableCentralStock + ')'}
              disabled={submitting || availableCentralStock <= 0}
              className='w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15'
            />
          </div>

          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5'>
              Transfer Notes (Optional)
            </label>
            <input
              type='text'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='e.g. Morning restock, weekend buffer'
              disabled={submitting}
              className='w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:border-amber-500'
            />
          </div>

          <div className='flex items-center justify-end gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              disabled={submitting}
              className='rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={submitting || availableCentralStock <= 0}
              className='flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 disabled:opacity-50 transition'
            >
              {submitting ? 'Dispatching...' : 'Dispatch Transfer'}
              <ArrowRight className='h-4 w-4' />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
