const CONDITION_ORDERS = {
    1: [1, 2, 3, 4], // PH, PL, NH, NL
    2: [2, 1, 4, 3], // PL, PH, NL, NH
    3: [3, 4, 1, 2], // NH, NL, PH, PL
    4: [4, 3, 2, 1]  // NL, NH, PL, PH
};

const DEFAULT_ORDER_NUMBER = 1;
const CONDITION_ORDER_LABELS = {
    1: 'Order 1: PH, PL, NH, NL',
    2: 'Order 2: PL, PH, NL, NH',
    3: 'Order 3: NH, NL, PH, PL',
    4: 'Order 4: NL, NH, PL, PH'
};

function normalizeOrderNumber(value) {
    const orderNumber = Number(value);
    return CONDITION_ORDERS[orderNumber] ? orderNumber : DEFAULT_ORDER_NUMBER;
}

function getConditionOrder(orderNumber) {
    return CONDITION_ORDERS[normalizeOrderNumber(orderNumber)].slice();
}

function getConditionOrderLabel(orderNumber) {
    return CONDITION_ORDER_LABELS[normalizeOrderNumber(orderNumber)];
}

function resolveConditionOrder(user) {
    if (Array.isArray(user.conditionOrder) && user.conditionOrder.length === 4) {
        return user.conditionOrder.map(Number);
    }

    return getConditionOrder(user.conditionOrderNumber);
}

function getCurrentSession(user) {
    return Number(user.condition) || 1;
}

function getConditionForSession(user, session = getCurrentSession(user)) {
    const order = resolveConditionOrder(user);
    return order[Number(session) - 1] || Number(session);
}

function getConditionSuffix(condition) {
    return {
        1: 'PH',
        2: 'PL',
        3: 'NH',
        4: 'NL'
    }[Number(condition)];
}

module.exports = {
    CONDITION_ORDERS,
    CONDITION_ORDER_LABELS,
    DEFAULT_ORDER_NUMBER,
    normalizeOrderNumber,
    getConditionOrder,
    getConditionOrderLabel,
    resolveConditionOrder,
    getCurrentSession,
    getConditionForSession,
    getConditionSuffix
};
