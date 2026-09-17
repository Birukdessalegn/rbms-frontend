import api from '../../../services/api';

// =========================================================
// CASHIER SHIFT SERVICES
// =========================================================

export const getCurrentShift = async () => {
  const res = await api('/pos/shifts/current');
  const shift = res?.shift ?? res?.data ?? null;
  return {
    ...res,
    shift,
    data: shift,
  };
};

export const startShift = async (openingCash = 0) => {
  const res = await api('/pos/shifts/start', {
    method: 'POST',
    body: JSON.stringify({
      opening_cash: Number(openingCash) || 0,
      openingCash: Number(openingCash) || 0,
      terminal_id: 1,
    }),
  });
  const shift = res?.shift ?? res?.data ?? null;
  return {
    ...res,
    shift,
    data: shift,
  };
};

export const closeShift = async (actualCashCounted = 0, notes = '') => {
  const numCash = Number(actualCashCounted) || 0;
  const res = await api('/pos/shifts/close', {
    method: 'POST',
    body: JSON.stringify({
      actual_cash: numCash,
      actualCash: numCash,
      actual_cash_counted: numCash,
      actualCashCounted: numCash,
      notes: notes || '',
      closing_notes: notes || '',
      closingNotes: notes || '',
    }),
  });
  const shift = res?.shift ?? res?.data ?? null;
  return {
    ...res,
    shift,
    data: shift,
  };
};

// =========================================================
// POS ORDER & ITEM MODIFICATION SERVICES
// =========================================================

export const getPosOrders = async () => {
  return await api('/pos/orders');
};

export const getOrderDetails = async (orderId) => {
  return await api('/pos/orders/' + orderId);
};

export const addOrderItems = async (orderId, items = []) => {
  return await api('/pos/orders/' + orderId + '/items', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
};

export const updateOrderItem = async (orderId, itemId, quantity, notes = '') => {
  return await api('/pos/orders/' + orderId + '/items/' + itemId, {
    method: 'PUT',
    body: JSON.stringify({
      quantity: Number(quantity),
      notes,
    }),
  });
};

export const removeOrderItem = async (orderId, itemId, reason = 'Customer changed order') => {
  return await api('/pos/orders/' + orderId + '/items/' + itemId, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
};

export default {
  getCurrentShift,
  startShift,
  closeShift,
  getPosOrders,
  getOrderDetails,
  addOrderItems,
  updateOrderItem,
  removeOrderItem,
};
