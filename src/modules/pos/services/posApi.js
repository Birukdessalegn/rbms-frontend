import api from '../../../services/api';

// =========================================================
// CASHIER SHIFT SERVICES
// =========================================================

export const getCurrentShift = async () => {
  return await api('/pos/shifts/current');
};

export const startShift = async (openingCash = 0) => {
  return await api('/pos/shifts/start', {
    method: 'POST',
    body: JSON.stringify({
      opening_cash: Number(openingCash) || 0,
      openingCash: Number(openingCash) || 0,
    }),
  });
};

export const closeShift = async (actualCashCounted = 0, notes = '') => {
  return await api('/pos/shifts/close', {
    method: 'POST',
    body: JSON.stringify({
      actual_cash_counted: Number(actualCashCounted) || 0,
      actualCashCounted: Number(actualCashCounted) || 0,
      notes,
    }),
  });
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

export const removeOrderItem = async (orderId, itemId) => {
  return await api('/pos/orders/' + orderId + '/items/' + itemId, {
    method: 'DELETE',
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
