import { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, X, Search, ShoppingBag, Utensils, Wine, AlertCircle, Check } from 'lucide-react';
import { addOrderItems, updateOrderItem, removeOrderItem } from '../services/posApi';
import api from '../../../services/api';

function EditOrderModal({ isOpen, onClose, order, onOrderUpdated }) {
  const [currentOrder, setCurrentOrder] = useState(order);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Load products to allow adding to order
  useEffect(() => {
    if (!isOpen) return;

    const loadProducts = async () => {
      try {
        const pRes = await api('/products');
        const pList = pRes.data || pRes.products || (Array.isArray(pRes) ? pRes : []);
        setProducts(pList);

        const cRes = await api('/categories').catch(() => ({}));
        const cList = cRes.data || cRes.categories || (Array.isArray(cRes) ? cRes : []);
        setCategories(cList);
      } catch (err) {
        console.warn('Failed to load menu products for order editing:', err);
      }
    };

    loadProducts();
  }, [isOpen]);

  if (!isOpen || !currentOrder) return null;

  const orderId = currentOrder.id || currentOrder.order_id;
  const rawItems = currentOrder.items || currentOrder.order_items || [];
  const orderItems = Array.isArray(rawItems)
    ? rawItems
    : typeof rawItems === 'string'
    ? JSON.parse(rawItems)
    : [];

  const handleUpdateQty = async (item, newQty) => {
    if (newQty < 1) {
      handleRemoveItem(item);
      return;
    }

    try {
      setLoadingAction(true);
      setStatusMessage('');
      const itemId = item.id || item.order_item_id;
      const res = await updateOrderItem(orderId, itemId, newQty);
      
      const updatedOrder = res.data || res.order;
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      } else {
        setCurrentOrder((prev) => ({
          ...prev,
          items: orderItems.map((it) => (it.id === itemId ? { ...it, quantity: newQty } : it)),
        }));
      }

      setStatusMessage('Quantity updated.');
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      alert(err.message || 'Failed to update item quantity.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveItem = async (item) => {
    const itemName = item.product_name || item.name || 'this item';
    if (!window.confirm(`Are you sure you want to remove "${itemName}"? Inventory stock will be restored.`)) {
      return;
    }

    try {
      setLoadingAction(true);
      setStatusMessage('');
      const itemId = item.id || item.order_item_id;
      const res = await removeOrderItem(orderId, itemId);
      
      const updatedOrder = res.data || res.order;
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      } else {
        setCurrentOrder((prev) => ({
          ...prev,
          items: orderItems.filter((it) => it.id !== itemId),
        }));
      }

      setStatusMessage('Item removed and inventory restored.');
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      alert(err.message || 'Failed to remove item.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddProduct = async (product) => {
    try {
      setLoadingAction(true);
      setStatusMessage('');

      const itemPayload = [
        {
          productId: product.id,
          product_id: product.id,
          name: product.name,
          product_name: product.name,
          price: Number(product.price) || 0,
          unit_price: Number(product.price) || 0,
          quantity: 1,
          notes: '',
        },
      ];

      const res = await addOrderItems(orderId, itemPayload);
      const updatedOrder = res.data || res.order;
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      }

      setStatusMessage(`Added ${product.name} to order.`);
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      alert(err.message || 'Failed to add item to order.');
    } finally {
      setLoadingAction(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === 'all' ||
      String(p.category_id) === String(activeCategory) ||
      p.category?.toLowerCase() === activeCategory.toLowerCase();

    const matchesSearch =
      !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Modify Order #{currentOrder.order_number || orderId}
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                Table {currentOrder.table_number || currentOrder.table_id || 'N/A'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Add food/bar items or adjust quantities without duplicate orders.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="bg-emerald-50 px-6 py-2 text-xs font-semibold text-emerald-800 border-b border-emerald-100 flex items-center gap-2">
            <Check className="h-3.5 w-3.5" />
            {statusMessage}
          </div>
        )}

        {/* Main Body: Two Columns */}
        <div className="grid flex-1 grid-cols-1 md:grid-cols-2 overflow-hidden">
          {/* Left Column: Current Order Items */}
          <div className="flex flex-col border-r border-slate-200 p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Current Items in Order</h3>
              <span className="text-xs font-semibold text-slate-500">
                {orderItems.length} item{orderItems.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-3 divide-y divide-slate-100 flex-1 overflow-y-auto">
              {orderItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No items in this order. Add items from the menu.
                </div>
              ) : (
                orderItems.map((item, idx) => {
                  const qty = Number(item.quantity || 1);
                  const price = Number(item.unit_price || item.price || 0);
                  const name = item.product_name || item.name || 'Item';

                  return (
                    <div key={item.id || idx} className="flex items-center justify-between py-3">
                      <div className="min-w-0 pr-2">
                        <p className="truncate text-xs font-bold text-slate-800">{name}</p>
                        <p className="text-[11px] text-slate-500">
                          {price.toFixed(2)} ETB each &bull; Total: {(price * qty).toFixed(2)} ETB
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={loadingAction}
                          onClick={() => handleUpdateQty(item, qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-900">{qty}</span>
                        <button
                          type="button"
                          disabled={loadingAction}
                          onClick={() => handleUpdateQty(item, qty + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={loadingAction}
                          onClick={() => handleRemoveItem(item)}
                          className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 active:scale-95 disabled:opacity-40"
                          title="Void / Remove Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-auto border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Total Amount:</span>
                <span>
                  {orderItems
                    .reduce(
                      (sum, it) =>
                        sum + Number(it.unit_price || it.price || 0) * Number(it.quantity || 1),
                      0
                    )
                    .toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  ETB
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Menu Selector to Add Products */}
          <div className="flex flex-col p-5 overflow-y-auto bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Add Menu Items</h3>
            <p className="text-xs text-slate-500 mb-3">
              Click any food or bar item to instantly append to this order.
            </p>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search food or drinks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
              {filteredProducts.slice(0, 30).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={loadingAction}
                  onClick={() => handleAddProduct(product)}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xs hover:border-blue-500 hover:bg-blue-50/30 active:scale-[0.98] transition disabled:opacity-40"
                >
                  <div>
                    <span className="line-clamp-1 text-xs font-bold text-slate-800">{product.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {product.category_name || product.category || 'Menu'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-black text-blue-700">
                      {Number(product.price).toFixed(2)} ETB
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition"
          >
            Done Editing
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditOrderModal;
