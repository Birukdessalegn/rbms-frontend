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
import { getOrderDetails, addOrderItems, updateOrderItem, removeOrderItem } from '../services/posApi';
import DrinkPortionModal from './DrinkPortionModal';
import { formatImageUrl, getCustomShotsMap } from '../../products/ProductsPage';
import api from '../../../services/api';

// Helper to determine if product is a spirit/liquor that can be served in shots/portions
export const isSpiritOrLiquorProduct = (product) => {
  if (!product) return false;
  const cat = String(product.category_name || product.category || product.category_type || '').toLowerCase();
  const pName = String(product.name || '').toLowerCase();

  const localMap = getCustomShotsMap ? getCustomShotsMap() : {};
  const localData = localMap[String(product.id)] || localMap[String(product.product_code || product.productCode)];
  const hasCustomShots = Number(product.shots_capacity || product.shotsCapacity || localData?.shots || 0) > 0 || localData?.isShotItem === true;

  const isShotItem = product.is_shot_item === true || product.isShotItem === true || product.shots_capacity > 0 || product.shotsCapacity > 0 || hasCustomShots;

  const isSpiritCat =
    cat.includes('whiskey') ||
    cat.includes('spirit') ||
    cat.includes('liquor') ||
    cat.includes('vodka') ||
    cat.includes('gin') ||
    cat.includes('rum') ||
    cat.includes('tequila') ||
    cat.includes('brandy') ||
    cat.includes('cognac');

  const isSpiritName =
    pName.includes('whiskey') ||
    pName.includes('red label') ||
    pName.includes('black label') ||
    pName.includes('jack daniel') ||
    pName.includes('jameson') ||
    pName.includes('vodka') ||
    pName.includes('gin') ||
    pName.includes('rum') ||
    pName.includes('tequila');

  const isBeerOrSoft =
    cat.includes('beer') ||
    cat.includes('soft') ||
    cat.includes('water') ||
    pName.includes('beer') ||
    pName.includes('coca') ||
    pName.includes('water');

  if (isBeerOrSoft) return false;
  return isShotItem || isSpiritCat || isSpiritName;
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

  const notifyChange = () => {
    if (onOrderUpdated) onOrderUpdated();
    if (onSuccess) onSuccess();
  };

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const orderId = currentOrder?.id || currentOrder?.order_id;

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

      setStatusMessage(`"${itemName}" voided and inventory stock restored.`);
      notifyChange();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove item.');
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
  const executeAddProductPayload = async (product, quantity, itemName, price, notes = '') => {
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
      noteText
    );
  };

  // Filtered menu items
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
        !searchTerm ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
        <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-black shadow-md">
                ✏️
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-black text-slate-900">
                    Modify Order #{currentOrder.order_number || orderId}
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                    Table {currentOrder.table_number || currentOrder.table_id || 'N/A'}
                  </span>
                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700 uppercase">
                    {currentOrder.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append new items or adjust quantities. Updates automatically sync with Kitchen, Bar, and Inventory.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status / Error Banner */}
          {statusMessage && (
            <div className="bg-emerald-50 px-6 py-2 text-xs font-semibold text-emerald-800 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
              <button onClick={() => setStatusMessage('')} className="text-emerald-700 hover:text-emerald-900">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 px-6 py-2 text-xs font-semibold text-rose-800 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage('')} className="text-rose-700 hover:text-rose-900">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Main Body: Two Column Layout */}
          <div className="grid flex-1 grid-cols-1 md:grid-cols-12 overflow-hidden">
            
            {/* Left Column: Current Order Items (5 cols) */}
            <div className="md:col-span-5 flex flex-col border-r border-slate-200 bg-white p-5 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-black text-slate-800">Current Items</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {orderItems.length} line item{orderItems.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Items List */}
              <div className="mt-3 divide-y divide-slate-100 flex-1 overflow-y-auto pr-1">
                {orderItems.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    No items in this order yet.<br />Click any item from the menu on the right to add it.
                  </div>
                ) : (
                  orderItems.map((item, idx) => {
                    const qty = Number(item.quantity || 1);
                    const price = Number(item.unit_price || item.price || 0);
                    const name = item.product_name || item.name || 'Item';
                    const notes = item.notes || '';

                    return (
                      <div key={item.id || idx} className="flex items-center justify-between py-3">
                        <div className="min-w-0 pr-3">
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

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleUpdateQty(item, qty - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition"
                            title="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-slate-900">{qty}</span>
                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleUpdateQty(item, qty + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition"
                            title="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={() => handleRemoveItem(item)}
                            className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 active:scale-95 disabled:opacity-40 transition"
                            title="Void / Remove Item (Restores Stock)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Order Total Footer */}
              <div className="mt-auto border-t border-slate-200 pt-4 bg-white">
                <div className="flex items-center justify-between text-sm font-black text-slate-900">
                  <span>Current Bill Total:</span>
                  <span className="text-base text-blue-700">
                    {orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Menu Selector (7 cols) */}
            <div className="md:col-span-7 flex flex-col p-5 overflow-hidden bg-slate-50/60">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Add Menu Items</h3>
                  <p className="text-xs text-slate-500">
                    Select any food, drink, or liquor to instantly add to this ticket.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Search Box */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by product name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                {categoryPills.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto flex-1 pr-1">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-xs text-slate-400">
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
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-2xs hover:border-blue-500 hover:shadow-md hover:bg-blue-50/20 active:scale-[0.98] transition disabled:opacity-50"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="line-clamp-2 text-xs font-bold text-slate-800 group-hover:text-blue-700">
                              {product.name}
                            </span>
                            {isLiquor && (
                              <span className="shrink-0 rounded-md bg-amber-50 border border-amber-200 px-1 py-0.5 text-[9px] font-bold text-amber-700" title="Supports Shots & Portions">
                                🥃 Shot
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {product.category_name || product.category || 'Menu'}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                          <span className="text-xs font-black text-blue-700">
                            {price.toFixed(2)} <span className="text-[10px] font-semibold text-slate-400">ETB</span>
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                        </div>

                        {isOutOfStock && (
                          <span className="mt-1 text-[9px] font-bold text-rose-600">
                            ⚠️ Low/Out of Stock
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
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
            <div className="text-xs text-slate-500">
              {loadingAction ? (
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating ticket...
                </span>
              ) : (
                <span>All additions immediately sync with Kitchen and Bar displays.</span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black text-white shadow-xs hover:bg-slate-800 active:scale-95 transition"
            >
              Done Editing
            </button>
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
