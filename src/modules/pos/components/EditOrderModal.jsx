import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  Search, 
  ShoppingBag, 
  Utensils, 
  Wine, 
  Coffee, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Loader2 
} from 'lucide-react';
import { getOrderDetails, addOrderItems, updateOrderItem, removeOrderItem, cancelOrder } from '../services/posApi';
import DrinkPortionModal from './DrinkPortionModal';
import { formatImageUrl, getCustomShotsMap } from '../../products/ProductsPage';
import api from '../../../services/api';

// Helper to determine if product is a spirit/liquor that can be served in shots/portions
export const isSpiritOrLiquorProduct = (product) => {
  if (!product) return false;
  const localMap = getCustomShotsMap ? getCustomShotsMap() : {};
  const localData = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];

  // Strictly check if portion/shot options are enabled for this product
  const isShotItem = product.is_shot_item === true || product.isShotItem === true || localData?.isShotItem === true;
  const capacity = Number(product.shots_capacity || product.shotsCapacity || localData?.shots || 0);

  return Boolean(isShotItem && capacity > 0);
};

function EditOrderModal({ 
  isOpen = true, 
  onClose, 
  order, 
  onOrderUpdated, 
  onSuccess 
}) {
  const [currentOrder, setCurrentOrder] = useState(order);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [portionModalProduct, setPortionModalProduct] = useState(null);
  const [mobileTab, setMobileTab] = useState('add'); // 'items' | 'add' for smartphones

  const notifyChange = () => {
    if (onOrderUpdated) onOrderUpdated();
    if (onSuccess) onSuccess();
  };

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const orderId = currentOrder?.order_id || currentOrder?.id || currentOrder?.order_number;

  // 1. Fetch live full details of this order to ensure fresh items list
  useEffect(() => {
    if (isOpen === false || !orderId) return;

    const refreshOrder = async () => {
      try {
        const res = await getOrderDetails(orderId);
        const fresh = res?.order || res?.data || res;
        if (fresh && (fresh.id || fresh.order_number)) {
          setCurrentOrder(fresh);
        }
      } catch (err) {
        console.warn('Could not refresh full order details:', err);
      }
    };

    refreshOrder();
  }, [isOpen, orderId]);

  // 2. Fetch products and menu categories
  useEffect(() => {
    if (isOpen === false) return;

    const loadMenuData = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          api('/products').catch(() => ({ products: [] })),
          api('/products/categories').catch(() => ({ categories: [] })),
        ]);

        const pList = pRes.products || pRes.data || (Array.isArray(pRes) ? pRes : []);
        setProducts(pList);

        const cList = cRes.categories || cRes.data || (Array.isArray(cRes) ? cRes : []);
        setCategories(cList);
      } catch (err) {
        console.warn('Failed to load menu products for order editing:', err);
      }
    };

    loadMenuData();
  }, [isOpen]);

  if (isOpen === false || !currentOrder) return null;

  const rawItems = currentOrder.items || currentOrder.order_items || [];
  const orderItems = Array.isArray(rawItems)
    ? rawItems
    : typeof rawItems === 'string'
    ? JSON.parse(rawItems)
    : [];

  // Update item quantity
  const handleUpdateQty = async (item, newQty) => {
    if (newQty < 1) {
      handleRemoveItem(item);
      return;
    }

    try {
      setLoadingAction(true);
      setStatusMessage('');
      setErrorMessage('');
      const itemId = item.order_item_id || item.id;
      const res = await updateOrderItem(orderId, itemId, newQty);

      const updatedOrder = res.data || res.order;
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      } else {
        setCurrentOrder((prev) => ({
          ...prev,
          items: orderItems.map((it) => ((it.order_item_id || it.id) === itemId ? { ...it, quantity: newQty } : it)),
        }));
      }

      setStatusMessage('Quantity updated successfully.');
      notifyChange();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update item quantity.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Remove / Void item
  const handleRemoveItem = async (item) => {
    const itemName = item.product_name || item.name || 'this item';
    if (!window.confirm(`Are you sure you want to void "${itemName}"? Inventory stock will be automatically restored.`)) {
      return;
    }

    try {
      setLoadingAction(true);
      setStatusMessage('');
      setErrorMessage('');
      const itemId = item.order_item_id || item.id;
      const res = await removeOrderItem(orderId, itemId);

      const updatedOrder = res.data || res.order;
      const remainingItems = updatedOrder?.items || orderItems.filter((it) => (it.order_item_id || it.id) !== itemId);
      const isNowCancelled = updatedOrder?.status === 'cancelled' || remainingItems.length === 0;

      if (isNowCancelled) {
        setStatusMessage(`All items voided. Order has been cancelled and table released.`);
        notifyChange();
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } else {
        if (updatedOrder) {
          setCurrentOrder(updatedOrder);
        } else {
          setCurrentOrder((prev) => ({
            ...prev,
            items: remainingItems,
          }));
        }
        setStatusMessage(`"${itemName}" voided and inventory stock restored.`);
        notifyChange();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove item.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Cancel entire order (void all items & restore stock)
  const handleCancelEntireOrder = async () => {
    const orderNum = currentOrder?.order_number || currentOrder?.orderNumber || orderId;
    if (!window.confirm(`Are you sure you want to cancel Order #${orderNum}? All items will be cancelled, stock will be returned to inventory, and the table will be freed.`)) {
      return;
    }

    try {
      setLoadingAction(true);
      setStatusMessage('');
      setErrorMessage('');

      await cancelOrder(orderId, 'Order cancelled by staff');
      setStatusMessage(`Order #${orderNum} cancelled and inventory stock restored.`);
      notifyChange();
      setTimeout(() => {
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel order.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Add Product to active order
  const handleAddProduct = async (product) => {
    // Check if it's liquor/spirit needing portion selection
    if (isSpiritOrLiquorProduct(product)) {
      setPortionModalProduct(product);
      return;
    }

    await executeAddProductPayload(product, 1, product.name, product.price, '');
  };

  // Execute actual payload submission to backend
  const executeAddProductPayload = async (product, quantity, itemName, price, notes = '', shotsDeduction = null) => {
    try {
      setLoadingAction(true);
      setStatusMessage('');
      setErrorMessage('');

      const itemPayload = [
        {
          productId: product.id,
          product_id: product.id,
          name: itemName,
          product_name: itemName,
          price: Number(price) || 0,
          unit_price: Number(price) || 0,
          quantity: quantity || 1,
          notes: notes || '',
          shotsDeduction: shotsDeduction,
        },
      ];

      const res = await addOrderItems(orderId, itemPayload);
      const updatedOrder = res.data || res.order;
      if (updatedOrder) {
        setCurrentOrder(updatedOrder);
      }

      setStatusMessage(`Added "${itemName}" to order.`);
      notifyChange();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to add item to order.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle portion selection from DrinkPortionModal
  const handleSelectPortion = async (portionOption) => {
    if (!portionModalProduct) return;

    const prod = portionModalProduct;
    const itemUniqueId = `${prod.id}_${portionOption.id}`;
    const formattedName = `${prod.name} (${portionOption.title})`;
    const noteText = `${portionOption.title} (${portionOption.shots} Shots)`;

    setPortionModalProduct(null);

    await executeAddProductPayload(
      { ...prod, id: itemUniqueId },
      1,
      formattedName,
      portionOption.price,
      noteText,
      portionOption.shots
    );
  };

  // Filtered menu items
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Exclude disabled items
      if (p.is_active === false) return false;

      // Exclude pure inventory raw items (e.g. flour, cooking oil)
      const applicableFor = String(p.applicable_for || p.applicableFor || 'both').toLowerCase();
      if (applicableFor === 'inventory') return false;

      const selCat = String(activeCategory || 'all').toLowerCase().trim();
      const pCatId = String(p.category_id || p.categoryId || '');
      const pCatName = String(p.category_name || p.category || '').toLowerCase();
      const pCatType = String(p.category_type || p.categoryType || '').toLowerCase();
      const pTags = String(p.tags || p.tag || '').toLowerCase();

      const matchesCategory =
        selCat === 'all' ||
        pCatId === selCat ||
        pCatName === selCat ||
        pTags.includes(selCat) ||
        (selCat === 'food' && (pCatType === 'food' || pCatName.includes('food') || pCatName.includes('kitchen'))) ||
        (selCat === 'drinks' && (pCatType === 'beverage' || pCatType === 'bar' || pCatName.includes('drink') || pCatName.includes('beer') || pCatName.includes('wine') || pCatName.includes('liquor')));

      const matchesSearch =
        !searchTerm.trim() ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(searchTerm.toLowerCase());

      if (searchTerm.trim()) {
        return matchesSearch;
      }

      return matchesCategory;
    });
  }, [products, activeCategory, searchTerm]);

  // Dynamic category pills list
  const categoryPills = useMemo(() => {
    const list = [
      { id: 'all', name: 'All' },
      { id: 'food', name: 'Food' },
      { id: 'drinks', name: 'Drinks' },
    ];

    if (Array.isArray(categories)) {
      categories.forEach((c) => {
        const cId = String(c.id);
        if (!list.some((it) => it.id === cId || it.name.toLowerCase() === c.name.toLowerCase())) {
          list.push({ id: cId, name: c.name });
        }
      });
    }

    return list;
  }, [categories]);

  // Compute live total
  const orderTotal = useMemo(() => {
    return orderItems.reduce(
      (sum, it) => sum + Number(it.unit_price || it.price || 0) * Number(it.quantity || 1),
      0
    );
  }, [orderItems]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-1.5 sm:p-4 backdrop-blur-xs">
        <div className="flex h-[96vh] sm:h-[90vh] w-full max-w-5xl flex-col rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:py-4 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-600 text-white font-black shadow-xs text-sm sm:text-base">
                ✏️
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h2 className="text-xs sm:text-base font-black text-slate-900 truncate">
                    Edit #{currentOrder.order_number || orderId}
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-blue-800">
                    Table {currentOrder.table_number || currentOrder.table_id || 'N/A'}
                  </span>
                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-slate-700 uppercase">
                    {currentOrder.status || 'Active'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">
                  Append new items or adjust quantities. Updates automatically sync with Kitchen, Bar, and Inventory.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition shrink-0 ml-2"
              title="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Status / Error Banner */}
          {statusMessage && (
            <div className="bg-emerald-50 px-3 py-1.5 sm:px-6 sm:py-2 text-xs font-semibold text-emerald-800 border-b border-emerald-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 truncate">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">{statusMessage}</span>
              </div>
              <button onClick={() => setStatusMessage('')} className="text-emerald-700 hover:text-emerald-900 p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 px-3 py-1.5 sm:px-6 sm:py-2 text-xs font-semibold text-rose-800 border-b border-rose-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 truncate">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage('')} className="text-rose-700 hover:text-rose-900 p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Tab Switcher (visible only on small screens) */}
          <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-100/90 p-1 md:hidden shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('add')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                mobileTab === 'add'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Items ({filteredProducts.length})
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('items')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
                mobileTab === 'items'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Current Items ({orderItems.length})
            </button>
          </div>

          {/* Main Body: Responsive Layout */}
          <div className="flex-1 md:grid md:grid-cols-12 overflow-hidden">
            
            {/* Left Column: Current Order Items (5 cols on desktop, full height on mobile when active) */}
            <div className={`
              ${mobileTab === 'items' ? 'flex' : 'hidden md:flex'}
              md:col-span-5 flex-col border-r border-slate-200 bg-white p-3 sm:p-5 overflow-y-auto h-full
            `}>
              <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-slate-600" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-800">Current Items</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-slate-600">
                  {orderItems.length} line item{orderItems.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Items List */}
              <div className="mt-2 sm:mt-3 divide-y divide-slate-100 flex-1 overflow-y-auto pr-1">
                {orderItems.length === 0 ? (
                  <div className="py-12 sm:py-16 text-center text-xs text-slate-400">
                    No items in this order yet.<br />
                    <button
                      type="button"
                      onClick={() => setMobileTab('add')}
                      className="mt-2 text-xs font-bold text-blue-600 md:hidden"
                    >
                      + Tap here to add menu items
                    </button>
                  </div>
                ) : (
                  orderItems.map((item, idx) => {
                    const qty = Number(item.quantity || 1);
                    const price = Number(item.unit_price || item.price || 0);
                    const name = item.product_name || item.name || 'Item';
                    const notes = item.notes || '';

                    return (
                      <div key={item.id || idx} className="flex items-center justify-between py-2.5 sm:py-3">
                        <div className="min-w-0 pr-2 sm:pr-3">
                          <p className="truncate text-xs font-bold text-slate-800" title={name}>
                            {name}
                          </p>
                          {notes && (
                            <p className="text-[10px] text-amber-700 font-medium line-clamp-1">
                              {notes}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {price.toFixed(2)} ETB &times; {qty} = <span className="font-bold text-slate-700">{(price * qty).toFixed(2)} ETB</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleUpdateQty(item, qty - 1)}
                            className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition"
                            title="Decrease quantity"
                          >
                            <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <span className="w-5 sm:w-6 text-center text-xs font-black text-slate-900">{qty}</span>
                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleUpdateQty(item, qty + 1)}
                            className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition"
                            title="Increase quantity"
                          >
                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleRemoveItem(item)}
                            className="ml-0.5 sm:ml-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 active:scale-95 disabled:opacity-40 transition"
                            title="Void / Remove Item"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Order Total Footer */}
              <div className="mt-auto border-t border-slate-200 pt-3 sm:pt-4 bg-white shrink-0">
                <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-900">
                  <span>Current Bill Total:</span>
                  <span className="text-sm sm:text-base text-blue-700">
                    {orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </span>
                </div>
                {mobileTab === 'items' && (
                  <button
                    type="button"
                    onClick={() => setMobileTab('add')}
                    className="mt-2.5 w-full md:hidden flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add More Menu Items
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Menu Selector (7 cols on desktop, full height on mobile when active) */}
            <div className={`
              ${mobileTab === 'add' ? 'flex' : 'hidden md:flex'}
              md:col-span-7 flex-col p-3 sm:p-5 overflow-hidden bg-slate-50/60 h-full
            `}>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2 shrink-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-800">Add Menu Items</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
                    Select any food, drink, or liquor to instantly add to this ticket.
                  </p>
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
                  {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Search Box */}
              <div className="relative mb-2 sm:mb-3 shrink-0">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 sm:py-2 pl-8 sm:pl-9 pr-7 sm:pr-8 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Floating Dropdown */}
                {searchTerm.trim() && (
                  <div className="absolute left-0 top-full mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl z-50 p-1 divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">No matching products found</div>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleAddProduct(p);
                            setSearchTerm('');
                          }}
                          className="w-full flex items-center justify-between p-2 text-left hover:bg-blue-50 rounded-lg transition group cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate transition">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.category_name || p.category || 'Item'}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {Number(p.price || 0).toLocaleString()} ETB
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1.5 mb-1.5 scrollbar-none shrink-0">
                {categoryPills.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`shrink-0 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 overflow-y-auto flex-1 pr-0.5 sm:pr-1">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full py-12 sm:py-16 text-center text-xs text-slate-400">
                    No products found matching your search or category.<br />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory('all');
                        setSearchTerm('');
                      }}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isLiquor = isSpiritOrLiquorProduct(product);
                    const price = Number(product.price || 0);
                    const stock = product.current_stock !== undefined ? Number(product.current_stock) : null;
                    const isOutOfStock = stock !== null && !isNaN(stock) && stock <= 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={loadingAction}
                        onClick={() => handleAddProduct(product)}
                        className="group flex flex-col justify-between rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 text-left shadow-2xs hover:border-blue-500 hover:shadow-md hover:bg-blue-50/20 active:scale-[0.98] transition disabled:opacity-50"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="line-clamp-2 text-[11px] sm:text-xs font-bold text-slate-800 group-hover:text-blue-700">
                              {product.name}
                            </span>
                            {isLiquor && (
                              <span className="shrink-0 rounded bg-amber-50 border border-amber-200 px-1 py-0.2 text-[8px] sm:text-[9px] font-bold text-amber-700" title="Supports Shots & Portions">
                                🥃 Shot
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 block truncate">
                            {product.category_name || product.category || 'Menu'}
                          </span>
                        </div>

                        <div className="mt-2 sm:mt-3 flex items-center justify-between border-t border-slate-100 pt-1.5 sm:pt-2">
                          <span className="text-[11px] sm:text-xs font-black text-blue-700">
                            {price.toFixed(2)} <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">ETB</span>
                          </span>
                          <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md sm:rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </span>
                        </div>

                        {isOutOfStock && (
                          <span className="mt-1 text-[8px] sm:text-[9px] font-bold text-rose-600">
                            ⚠️ Low/Out
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 sm:px-6 sm:py-3 shrink-0">
            <div className="text-[11px] sm:text-xs text-slate-500 truncate mr-2">
              {loadingAction ? (
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating ticket...
                </span>
              ) : (
                <span className="hidden sm:inline">All additions immediately sync with Kitchen and Bar displays.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {orderItems.length > 0 && (
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleCancelEntireOrder}
                  className="rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 sm:py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 disabled:opacity-40 transition whitespace-nowrap"
                  title="Cancel this order and return all items to stock"
                >
                  Cancel Order
                </button>
              )}

              {mobileTab === 'add' && orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileTab('items')}
                  className="md:hidden rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700 flex items-center gap-1"
                >
                  <ShoppingBag className="h-3 w-3" />
                  Bill ({orderTotal.toFixed(0)} ETB)
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg sm:rounded-xl bg-slate-900 px-4 sm:px-6 py-1.5 sm:py-2 text-xs font-black text-white shadow-xs hover:bg-slate-800 active:scale-95 transition whitespace-nowrap"
              >
                Done
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Drink Portion Modal for Spirits/Liquors */}
      {portionModalProduct && (
        <DrinkPortionModal
          product={portionModalProduct}
          onClose={() => setPortionModalProduct(null)}
          onSelectPortion={handleSelectPortion}
        />
      )}
    </>
  );
}

export default EditOrderModal;
