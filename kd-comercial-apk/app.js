const STORAGE_KEY = 'kd-comercial-mobile-records-v1';
const STORAGE_BACKUP_KEY = 'kd-comercial-mobile-records-backup-v1';
const STORAGE_META_KEY = 'kd-comercial-mobile-records-meta-v1';
const SUPABASE_CONFIG_KEY = 'kd-comercial-supabase-config-v1';
const DELETED_RECORDS_KEY = 'kd-comercial-deleted-records-v1';
const SUPABASE_TABLE = 'kd_records';
const DEFAULT_SUPABASE_CONFIG = {
    url: 'https://ixnlonpywqxkfbqolilt.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bmxvbnB5d3F4a2ZicW9saWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTQ4MzUsImV4cCI6MjA4OTQzMDgzNX0.4aanRI5EEavExlN7hSlkJ8COlROt6INWLKhSfhJSYCs'
};

const SUPPLIER_COST_TABLE = {
    sacolas: {
        'Sacola P': { 100: 1.10, 250: 1.10, 500: 1.10, 1000: 1.10 },
        'Sacola M': { 100: 1.30, 250: 1.30, 500: 1.30, 1000: 1.30 },
        'Sacola G': { 100: 1.35, 250: 1.35, 500: 1.35, 1000: 1.35 },
        'Sacola GG': { 100: 1.40, 250: 1.40, 500: 1.40, 1000: 1.40 }
    },
    salgados: {
        'Salgado PP': { 100: 1.09, 250: 1.09, 500: 1.09, 1000: 1.09 },
        'Salgado P': { 100: 1.27, 250: 1.27, 500: 1.27, 1000: 1.27 },
        'Salgado M': { 100: 1.50, 250: 1.50, 500: 1.50, 1000: 1.50 },
        'Salgado G': { 100: 1.72, 250: 1.72, 500: 1.72, 1000: 1.72 }
    },
    pizzas: {
        'Pizza 25cm': { 100: 1.27, 250: 1.27, 500: 1.27, 1000: 1.27 },
        'Pizza 30cm': { 100: 1.60, 250: 1.60, 500: 1.60, 1000: 1.60 },
        'Pizza 35cm': { 100: 1.72, 250: 1.72, 500: 1.72, 1000: 1.72 },
        'Pizza 40cm': { 100: 2.00, 250: 2.00, 500: 2.00, 1000: 2.00 },
        'Pizza 40cm Quadrada': { 100: 2.00, 250: 2.00, 500: 2.00, 1000: 2.00 }
    },
    especiais: {
        'Caixa Peixe': { 100: 1.77, 250: 1.77, 500: 1.77, 1000: 1.77 },
        'Caixa Frango': { 100: 1.72, 250: 1.72, 500: 1.72, 1000: 1.72 },
        'Caixa Tenis': { 100: 1.86, 250: 1.86, 500: 1.86, 1000: 1.86 }
    }
};

const CATEGORY_LABELS = {
    sacolas: 'Sacolas Kraft',
    salgados: 'Caixas para Salgados',
    pizzas: 'Caixas de Pizza',
    especiais: 'Caixas Especiais'
};

const PROFIT_PER_UNIT_BY_TIER = {
    100: 0.40,
    250: 0.30,
    500: 0.25,
    1000: 0.20
};

const QUOTE_TABLE = Object.fromEntries(
    Object.entries(SUPPLIER_COST_TABLE).map(([categoryKey, models]) => [
        categoryKey,
        {
            label: CATEGORY_LABELS[categoryKey],
            models: Object.fromEntries(
                Object.entries(models).map(([modelKey, tiers]) => [
                    modelKey,
                    Object.fromEntries(
                        Object.entries(tiers).map(([tierKey, supplierCost]) => [
                            tierKey,
                            Number((supplierCost + PROFIT_PER_UNIT_BY_TIER[tierKey]).toFixed(2))
                        ])
                    )
                ])
            )
        }
    ])
);

const SCREEN_FEE = 90;

const state = {
    quoteItems: [],
    records: loadRecords(),
    deletedRecords: loadDeletedRecords(),
    supabaseConfig: loadSupabaseConfig(),
    lastQuote: null,
    editingId: null,
    recordSearch: '',
    recordStatusFilter: 'todos',
    syncInFlight: false,
    autoSyncTimer: null
};

const elements = {
    tabs: Array.from(document.querySelectorAll('[data-tab-target]')),
    panels: Array.from(document.querySelectorAll('[data-tab]')),
    customerName: document.getElementById('customerName'),
    customerPhone: document.getElementById('customerPhone'),
    category: document.getElementById('category'),
    model: document.getElementById('model'),
    customModelName: document.getElementById('customModelName'),
    customUnitPrice: document.getElementById('customUnitPrice'),
    quantity: document.getElementById('quantity'),
    deliveryMode: document.getElementById('deliveryMode'),
    freightValue: document.getElementById('freightValue'),
    freeFreightManaus: document.getElementById('freeFreightManaus'),
    chargeScreenFee: document.getElementById('chargeScreenFee'),
    hasExistingScreen: document.getElementById('hasExistingScreen'),
    addItem: document.getElementById('addItem'),
    clearItems: document.getElementById('clearItems'),
    generateQuote: document.getElementById('generateQuote'),
    items: document.getElementById('items'),
    supplierCost: document.getElementById('supplierCost'),
    autoSupplierCost: document.getElementById('autoSupplierCost'),
    receivedAmount: document.getElementById('receivedAmount'),
    customerPaymentStatus: document.getElementById('customerPaymentStatus'),
    repassedAmount: document.getElementById('repassedAmount'),
    supplierPaid: document.getElementById('supplierPaid'),
    paymentMethod: document.getElementById('paymentMethod'),
    pixKey: document.getElementById('pixKey'),
    leadSource: document.getElementById('leadSource'),
    supplierName: document.getElementById('supplierName'),
    supplierPhone: document.getElementById('supplierPhone'),
    status: document.getElementById('status'),
    nextFollowUpAt: document.getElementById('nextFollowUpAt'),
    lastContactAt: document.getElementById('lastContactAt'),
    notes: document.getElementById('notes'),
    saveRecord: document.getElementById('saveRecord'),
    sendQuoteWhatsapp: document.getElementById('sendQuoteWhatsapp'),
    sendSupplierWhatsapp: document.getElementById('sendSupplierWhatsapp'),
    downloadQuotePdf: document.getElementById('downloadQuotePdf'),
    sendChargeWhatsapp: document.getElementById('sendChargeWhatsapp'),
    generateReceipt: document.getElementById('generateReceipt'),
    downloadReceiptPdf: document.getElementById('downloadReceiptPdf'),
    duplicateQuote: document.getElementById('duplicateQuote'),
    cancelEditing: document.getElementById('cancelEditing'),
    quoteOutput: document.getElementById('quoteOutput'),
    receiptOutput: document.getElementById('receiptOutput'),
    recordsList: document.getElementById('recordsList'),
    recordSearch: document.getElementById('recordSearch'),
    recordStatusFilter: document.getElementById('recordStatusFilter'),
    importJson: document.getElementById('importJson'),
    importJsonFile: document.getElementById('importJsonFile'),
    exportJson: document.getElementById('exportJson'),
    restoreBackup: document.getElementById('restoreBackup'),
    backupStatus: document.getElementById('backupStatus'),
    supabaseUrl: document.getElementById('supabaseUrl'),
    supabaseAnonKey: document.getElementById('supabaseAnonKey'),
    saveSupabaseConfig: document.getElementById('saveSupabaseConfig'),
    testSupabaseConnection: document.getElementById('testSupabaseConnection'),
    syncSupabaseNow: document.getElementById('syncSupabaseNow'),
    cloudStatus: document.getElementById('cloudStatus'),
    metricRevenue: document.getElementById('metricRevenue'),
    metricProfit: document.getElementById('metricProfit'),
    metricCustomerPending: document.getElementById('metricCustomerPending'),
    metricSupplierPending: document.getElementById('metricSupplierPending'),
    metricOrders: document.getElementById('metricOrders'),
    metricAverage: document.getElementById('metricAverage'),
    metricMargin: document.getElementById('metricMargin'),
    metricFollowUp: document.getElementById('metricFollowUp'),
    metricTodayRevenue: document.getElementById('metricTodayRevenue'),
    metricTodayProfit: document.getElementById('metricTodayProfit'),
    metricMonthRevenue: document.getElementById('metricMonthRevenue'),
    metricMonthProfit: document.getElementById('metricMonthProfit'),
    topProducts: document.getElementById('topProducts'),
    profitByProduct: document.getElementById('profitByProduct'),
    customerBalances: document.getElementById('customerBalances'),
    productionPaid50Orders: document.getElementById('productionPaid50Orders'),
    productionPaid100Orders: document.getElementById('productionPaid100Orders'),
    readyToDeliverOrders: document.getElementById('readyToDeliverOrders'),
    topCustomers: document.getElementById('topCustomers'),
    profitByCustomer: document.getElementById('profitByCustomer'),
    recurringCustomers: document.getElementById('recurringCustomers'),
    closingSummary: document.getElementById('closingSummary'),
    editingBanner: document.getElementById('editingBanner')
};

function money(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number(value) || 0);
}

function safeJsonParse(rawValue) {
    if (!rawValue) return null;
    try {
        return JSON.parse(rawValue);
    } catch {
        return null;
    }
}

function isValidRecordArray(value) {
    return Array.isArray(value);
}

function loadDeletedRecords() {
    const parsed = safeJsonParse(localStorage.getItem(DELETED_RECORDS_KEY));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function persistDeletedRecords() {
    localStorage.setItem(DELETED_RECORDS_KEY, JSON.stringify(state.deletedRecords || {}));
}

function loadSupabaseConfig() {
    const parsed = safeJsonParse(localStorage.getItem(SUPABASE_CONFIG_KEY));
    if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_SUPABASE_CONFIG };
    }
    return {
        url: String(parsed.url || DEFAULT_SUPABASE_CONFIG.url).trim(),
        anonKey: String(parsed.anonKey || DEFAULT_SUPABASE_CONFIG.anonKey).trim()
    };
}

function saveSupabaseConfigLocal() {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(state.supabaseConfig));
}

function getRecordTimestamp(record) {
    return String(record?.updatedAt || record?.createdAt || '');
}

function getDeletedTimestamp(recordId) {
    return String(state.deletedRecords?.[recordId] || '');
}

function isSupabaseConfigured() {
    return Boolean(state.supabaseConfig?.url && state.supabaseConfig?.anonKey);
}

function normalizeSupabaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

function getSupabaseHeaders(extra = {}) {
    return {
        apikey: state.supabaseConfig.anonKey,
        Authorization: `Bearer ${state.supabaseConfig.anonKey}`,
        'Content-Type': 'application/json',
        ...extra
    };
}

function setCloudStatus(message, tone = 'neutral') {
    if (!elements.cloudStatus) return;
    elements.cloudStatus.textContent = message;
    elements.cloudStatus.dataset.tone = tone;
}

function renderSupabaseConfig() {
    if (elements.supabaseUrl) elements.supabaseUrl.value = state.supabaseConfig.url || '';
    if (elements.supabaseAnonKey) elements.supabaseAnonKey.value = state.supabaseConfig.anonKey || '';
    if (!isSupabaseConfigured()) {
        setCloudStatus('Supabase nao configurado.', 'neutral');
        return;
    }
    setCloudStatus('Supabase configurado. Pronto para sincronizar.', 'ok');
}

function loadRecords() {
    const primaryRaw = localStorage.getItem(STORAGE_KEY);
    const backupRaw = localStorage.getItem(STORAGE_BACKUP_KEY);
    const primaryParsed = safeJsonParse(primaryRaw);
    const backupParsed = safeJsonParse(backupRaw);

    if (isValidRecordArray(primaryParsed)) {
        return primaryParsed.map(recalculateRecord);
    }

    if (isValidRecordArray(backupParsed)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backupParsed));
        return backupParsed.map(recalculateRecord);
    }

    return [];
}

function recalculateRecord(record) {
    if (!record?.quote?.items) return record;
    const items = record.quote.items.map((item) => {
        const supplierUnitCost = item.hasCustomModel
            ? (item.supplierUnitCost || 0)
            : (SUPPLIER_COST_TABLE[item.categoryKey]?.[item.modelKey]?.[item.tierBase] || item.supplierUnitCost || 0);
        const supplierSubtotal = Number((supplierUnitCost * item.quantity).toFixed(2));
        return {
            ...item,
            supplierUnitCost,
            supplierSubtotal
        };
    });
    const autoSupplierCost = Number(items.reduce((sum, item) => sum + item.supplierSubtotal, 0).toFixed(2));
    const supplierCost = autoSupplierCost;
    const profit = Number((record.quote.total - supplierCost).toFixed(2));
    const marginPercent = record.quote.total > 0
        ? Number(((profit / record.quote.total) * 100).toFixed(2))
        : 0;
    const receivedAmount = Number(record.receivedAmount) || 0;
    const repassedAmount = Number(record.repassedAmount) || 0;
    return {
        ...record,
        quote: {
            ...record.quote,
            items
        },
        autoSupplierCost,
        supplierCost,
        manualSupplierCost: supplierCost,
        profit,
        marginPercent,
        customerPendingAmount: Number((record.quote.total - receivedAmount).toFixed(2)),
        supplierPendingAmount: Number((supplierCost - repassedAmount).toFixed(2))
    };
}

function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
}

function getPaymentLabel(record) {
    if (record.customerPaymentStatus === '100') return 'Pago 100%';
    if (record.customerPaymentStatus === '50') return 'Pago 50%';
    return 'Nao pago';
}

function isFullyPaid(record) {
    return record.customerPaymentStatus === '100' || (Number(record.receivedAmount || 0) >= Number(record.quote?.total || 0));
}

function applyQuickUpdate(recordId, updates) {
    const current = state.records.find((item) => item.id === recordId);
    if (!current) return;

    const quoteTotal = Number(current.quote?.total || 0);
    const nextReceivedAmount = updates.receivedAmount !== undefined
        ? Number(updates.receivedAmount || 0)
        : Number(current.receivedAmount || 0);
    const nextSupplierCost = Number(current.supplierCost || current.autoSupplierCost || current.quote?.autoSupplierCost || 0);

    const next = recalculateRecord({
        ...current,
        ...updates,
        receivedAmount: nextReceivedAmount,
        customerPendingAmount: Number((quoteTotal - nextReceivedAmount).toFixed(2)),
        supplierPendingAmount: Number((nextSupplierCost - Number(current.repassedAmount || 0)).toFixed(2)),
        updatedAt: new Date().toISOString()
    });

    state.records = state.records.map((item) => item.id === recordId ? next : item);
    persistRecords();
    renderRecords();
    renderDashboard();
}

function openWhatsApp(phone, text) {
    const cleanPhone = normalizePhone(phone);
    const base = cleanPhone
        ? `https://wa.me/${cleanPhone}`
        : 'https://wa.me/';
    const url = `${base}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function persistRecords() {
    if (!isValidRecordArray(state.records)) return;

    const currentPrimary = localStorage.getItem(STORAGE_KEY);
    const parsedCurrentPrimary = safeJsonParse(currentPrimary);

    if (isValidRecordArray(parsedCurrentPrimary) && parsedCurrentPrimary.length) {
        localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(parsedCurrentPrimary));
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        updatedAt: new Date().toISOString(),
        totalRecords: state.records.length
    }));
    renderBackupStatus();
    scheduleAutoSync();
}

function syncBackupFromCurrentState() {
    if (!isValidRecordArray(state.records) || !state.records.length) return;
    localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(state.records));
    renderBackupStatus();
}

function restoreFromBackup() {
    const backupParsed = safeJsonParse(localStorage.getItem(STORAGE_BACKUP_KEY));
    if (!isValidRecordArray(backupParsed) || !backupParsed.length) return false;

    state.records = backupParsed.map(recalculateRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
        updatedAt: new Date().toISOString(),
        totalRecords: state.records.length,
        restoredFromBackup: true
    }));
    return true;
}

function renderBackupStatus() {
    if (!elements.backupStatus) return;
    const currentParsed = safeJsonParse(localStorage.getItem(STORAGE_KEY));
    const backupParsed = safeJsonParse(localStorage.getItem(STORAGE_BACKUP_KEY));
    const currentCount = Array.isArray(currentParsed) ? currentParsed.length : 0;
    const backupCount = Array.isArray(backupParsed) ? backupParsed.length : 0;
    elements.backupStatus.textContent = `Neste app: ${currentCount} registros | Backup local: ${backupCount} registros`;
}

function buildRemoteRows() {
    const activeRows = state.records.map((record) => ({
        id: record.id,
        payload: record,
        updated_at: getRecordTimestamp(record) || new Date().toISOString(),
        deleted: false
    }));

    const deletedRows = Object.entries(state.deletedRecords || {}).map(([id, deletedAt]) => ({
        id,
        payload: null,
        updated_at: deletedAt || new Date().toISOString(),
        deleted: true
    }));

    return [...activeRows, ...deletedRows];
}

async function uploadRecordsToSupabase() {
    if (!isSupabaseConfigured()) throw new Error('Supabase nao configurado.');
    const rows = buildRemoteRows();
    const response = await fetch(`${normalizeSupabaseUrl(state.supabaseConfig.url)}/rest/v1/${SUPABASE_TABLE}?on_conflict=id`, {
        method: 'POST',
        headers: getSupabaseHeaders({
            Prefer: 'resolution=merge-duplicates,return=minimal'
        }),
        body: JSON.stringify(rows)
    });
    if (!response.ok) {
        throw new Error(`Falha ao enviar registros: ${response.status}`);
    }
}

async function downloadRecordsFromSupabase() {
    if (!isSupabaseConfigured()) throw new Error('Supabase nao configurado.');
    const response = await fetch(`${normalizeSupabaseUrl(state.supabaseConfig.url)}/rest/v1/${SUPABASE_TABLE}?select=id,payload,updated_at,deleted&order=updated_at.asc`, {
        headers: getSupabaseHeaders()
    });
    if (!response.ok) {
        throw new Error(`Falha ao baixar registros: ${response.status}`);
    }
    return response.json();
}

function mergeRemoteRows(remoteRows) {
    let changed = false;
    const localMap = new Map(state.records.map((record) => [record.id, record]));

    remoteRows.forEach((row) => {
        const remoteStamp = String(row.updated_at || '');
        const localRecord = localMap.get(row.id);
        const localStamp = getRecordTimestamp(localRecord);
        const deletedStamp = getDeletedTimestamp(row.id);
        const latestLocalStamp = [localStamp, deletedStamp].sort().slice(-1)[0] || '';

        if (row.deleted) {
            if (remoteStamp >= latestLocalStamp) {
                if (localMap.has(row.id)) {
                    localMap.delete(row.id);
                    changed = true;
                }
                if ((state.deletedRecords[row.id] || '') !== remoteStamp) {
                    state.deletedRecords[row.id] = remoteStamp;
                    changed = true;
                }
            }
            return;
        }

        if (!row.payload) return;
        if (!latestLocalStamp || remoteStamp >= latestLocalStamp) {
            localMap.set(row.id, recalculateRecord(row.payload));
            delete state.deletedRecords[row.id];
            changed = true;
        }
    });

    state.records = Array.from(localMap.values());
    persistDeletedRecords();
    if (changed) {
        persistRecords();
        syncBackupFromCurrentState();
        renderRecords();
        renderDashboard();
    }
}

function scheduleAutoSync() {
    if (!isSupabaseConfigured()) return;
    clearTimeout(state.autoSyncTimer);
    state.autoSyncTimer = setTimeout(() => {
        syncSupabaseNow(false);
    }, 1200);
}

async function testSupabaseConnection() {
    if (!isSupabaseConfigured()) {
        setCloudStatus('Preencha URL e anon key do Supabase.', 'error');
        return false;
    }
    setCloudStatus('Testando conexao com Supabase...', 'neutral');
    try {
        await downloadRecordsFromSupabase();
        setCloudStatus('Conexao com Supabase OK.', 'ok');
        return true;
    } catch (error) {
        setCloudStatus(error.message || 'Falha ao conectar com Supabase.', 'error');
        return false;
    }
}

async function syncSupabaseNow(showAlert = true) {
    if (!isSupabaseConfigured()) {
        setCloudStatus('Preencha URL e anon key do Supabase.', 'error');
        if (showAlert) alert('Configure o Supabase primeiro.');
        return false;
    }
    if (state.syncInFlight) return false;
    state.syncInFlight = true;
    setCloudStatus('Sincronizando com a nuvem...', 'neutral');
    try {
        await uploadRecordsToSupabase();
        const remoteRows = await downloadRecordsFromSupabase();
        mergeRemoteRows(remoteRows);
        setCloudStatus(`Sincronizacao concluida. ${state.records.length} registros locais.`, 'ok');
        if (showAlert) alert('Sincronizacao concluida.');
        return true;
    } catch (error) {
        setCloudStatus(error.message || 'Erro na sincronizacao.', 'error');
        if (showAlert) alert(error.message || 'Erro na sincronizacao.');
        return false;
    } finally {
        state.syncInFlight = false;
    }
}

function getTierBase(quantity) {
    if (quantity >= 1000) return 1000;
    if (quantity > 250) return 500;
    if (quantity > 100) return 250;
    return 100;
}

function populateCategories() {
    elements.category.innerHTML = Object.entries(QUOTE_TABLE)
        .map(([key, category]) => `<option value="${key}">${category.label}</option>`)
        .join('');
    populateModels();
}

function populateModels() {
    const category = QUOTE_TABLE[elements.category.value];
    if (!category) return;
    elements.model.innerHTML = Object.keys(category.models)
        .map((model) => `<option value="${model}">${model}</option>`)
        .join('');
}

function normalizeItem(rawItem, forcedTier = null) {
    const categoryKey = rawItem.categoryKey;
    const category = QUOTE_TABLE[categoryKey];
    const modelKey = (rawItem.customModelName || rawItem.modelKey || '').trim();
    const quantity = Number(rawItem.quantity) || 0;
    const customUnitPrice = Number(rawItem.customUnitPrice) || 0;
    if (!category || !modelKey || quantity <= 0) return null;

    const tier = forcedTier || getTierBase(quantity);
    const unitPrice = rawItem.customModelName
        ? customUnitPrice
        : category.models[modelKey]?.[tier];
    if (!unitPrice) return null;

    const supplierUnitCost = SUPPLIER_COST_TABLE[categoryKey]?.[modelKey]?.[tier] || 0;
    return {
        categoryKey,
        categoryLabel: category.label,
        modelKey,
        quantity,
        tierBase: tier,
        unitPrice,
        subtotal: Number((unitPrice * quantity).toFixed(2)),
        supplierUnitCost,
        supplierSubtotal: Number((supplierUnitCost * quantity).toFixed(2)),
        hasCustomModel: Boolean(rawItem.customModelName)
    };
}

function buildQuote() {
    const rawItems = state.quoteItems.length ? state.quoteItems : [{
        categoryKey: elements.category.value,
        modelKey: elements.model.value,
        customModelName: elements.customModelName.value.trim(),
        customUnitPrice: Number(elements.customUnitPrice.value),
        quantity: Number(elements.quantity.value)
    }];
    const totalQuantity = rawItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const forcedTier = rawItems.length > 1 ? getTierBase(totalQuantity) : null;
    const items = rawItems.map((item) => normalizeItem(item, forcedTier)).filter(Boolean);
    if (!elements.customerName.value.trim() || !items.length) return null;

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const hasBoxes = items.some((item) => item.categoryKey !== 'sacolas');
    const totalBoxQuantity = items
        .filter((item) => item.categoryKey !== 'sacolas')
        .reduce((sum, item) => sum + item.quantity, 0);
    const hasExistingScreen = elements.hasExistingScreen.checked;
    const chargeScreenFee = elements.chargeScreenFee.checked;
    const shouldChargeScreenFee = hasBoxes && totalBoxQuantity < 250 && chargeScreenFee && !hasExistingScreen;
    const screenFee = shouldChargeScreenFee ? SCREEN_FEE : 0;
    const deliveryMode = elements.deliveryMode.value;
    const freeFreightManaus = elements.freeFreightManaus.checked;
    const manualFreight = Number(elements.freightValue.value) || 0;
    const freight = deliveryMode === 'retirada'
        ? 0
        : (freeFreightManaus && totalQuantity >= 250 ? 0 : manualFreight);
    const total = Number((subtotal + screenFee + freight).toFixed(2));
    const autoSupplierCost = Number(items.reduce((sum, item) => sum + item.supplierSubtotal, 0).toFixed(2));
    const freightLabel = deliveryMode === 'retirada'
        ? 'retirada pelo cliente'
        : (freight > 0 ? money(freight) : 'gratis');

    let screenLabel = 'nao aplicada';
    if (shouldChargeScreenFee) {
        screenLabel = money(screenFee);
    } else if (hasExistingScreen) {
        screenLabel = 'cliente ja possui tela/logo';
    } else if (hasBoxes && totalBoxQuantity >= 250) {
        screenLabel = 'gratis a partir de 250 un';
    }

    const lines = [
        'KD Embalagens',
        'Orcamento comercial',
        `Cliente: ${elements.customerName.value.trim()}`,
        '',
        'ITENS',
        ...items.map((item, index) => `${index + 1}. ${item.modelKey} | ${item.quantity} un | ${money(item.subtotal)}`),
        '',
        `Subtotal: ${money(subtotal)}`,
        `Tela: ${screenLabel}`,
        `Entrega: ${deliveryMode === 'retirada' ? 'retirada pelo cliente' : 'entrega'}`,
        `Frete: ${freightLabel}`,
        `Total: ${money(total)}`,
        `Entrada 50%: ${money(total / 2)}`,
        '',
        'Prazo de producao: 7 dias uteis apos confirmacao do pagamento.'
    ];

    return {
        customerName: elements.customerName.value.trim(),
        customerPhone: normalizePhone(elements.customerPhone.value),
        deliveryMode,
        freeFreightManaus,
        chargeScreenFee,
        hasExistingScreen,
        freight,
        total,
        depositAmount: Number((total / 2).toFixed(2)),
        autoSupplierCost,
        items,
        text: lines.join('\n')
    };
}

function refreshQuotePreview() {
    const quote = buildQuote();
    if (!quote) return;
    state.lastQuote = quote;
    elements.autoSupplierCost.value = money(quote.autoSupplierCost);
    elements.quoteOutput.textContent = quote.text;
}

function syncDeliveryModeUI() {
    const isPickup = elements.deliveryMode.value === 'retirada';
    if (isPickup) {
        elements.freightValue.value = '';
        elements.freightValue.disabled = true;
    } else {
        elements.freightValue.disabled = false;
    }
}

function syncScreenFeeUI() {
    const hasExistingScreen = elements.hasExistingScreen.checked;
    if (hasExistingScreen) {
        elements.chargeScreenFee.checked = false;
        elements.chargeScreenFee.disabled = true;
    } else {
        elements.chargeScreenFee.disabled = false;
    }
}

function syncCustomerPaymentUI() {
    if (!state.lastQuote) return;

    const status = elements.customerPaymentStatus.value;
    if (status === '50') {
        elements.receivedAmount.value = state.lastQuote.depositAmount.toFixed(2);
    } else if (status === '100') {
        elements.receivedAmount.value = state.lastQuote.total.toFixed(2);
    } else {
        elements.receivedAmount.value = '';
    }
}

function renderItems() {
    if (!state.quoteItems.length) {
        elements.items.innerHTML = '<div class="item"><strong>Nenhum item</strong><div class="meta">Adicione produtos para montar o pedido.</div></div>';
        return;
    }

    elements.items.innerHTML = state.quoteItems.map((item, index) => `
        <div class="item">
            <strong>${item.customModelName || item.modelKey}</strong>
            <div class="meta">${QUOTE_TABLE[item.categoryKey]?.label || ''} | ${item.quantity} un</div>
            <button type="button" data-remove-item="${index}">Remover</button>
        </div>
    `).join('');

    elements.items.querySelectorAll('[data-remove-item]').forEach((button) => {
        button.addEventListener('click', () => {
            state.quoteItems.splice(Number(button.dataset.removeItem), 1);
            renderItems();
            refreshQuotePreview();
        });
    });
}

function renderRecords() {
    if (!state.records.length) {
        elements.recordsList.innerHTML = '<div class="item"><strong>Sem registros</strong><div class="meta">Salve o primeiro pedido para começar.</div></div>';
        return;
    }

    const filtered = state.records.filter((record) => {
        const matchSearch = !state.recordSearch || record.customerName.toLowerCase().includes(state.recordSearch);
        const matchStatus = state.recordStatusFilter === 'todos' || record.status === state.recordStatusFilter;
        return matchSearch && matchStatus;
    });
    const sorted = [...filtered].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
    if (!sorted.length) {
        elements.recordsList.innerHTML = '<div class="item"><strong>Nenhum resultado</strong><div class="meta">Ajuste a busca ou o filtro de status.</div></div>';
        return;
    }
    elements.recordsList.innerHTML = sorted.map((record) => `
        <div class="item">
            <strong>${record.customerName}</strong>
            <div class="meta">${record.status} | Venda ${money(record.quote.total)} | Lucro ${money(record.profit)}</div>
            <div class="meta">${getPaymentLabel(record)} | Recebido ${money(record.receivedAmount || 0)}</div>
            <div class="meta">Receber ${money(record.customerPendingAmount)} | Fornecedor ${money(record.supplierPendingAmount)}</div>
            <div class="meta">Repassado ${money(record.repassedAmount || 0)} | ${record.supplierPaid ? 'Fornecedor pago' : 'Fornecedor pendente'}</div>
            <div class="meta">${record.customerPhone || 'Sem WhatsApp'}${record.nextFollowUpAt ? ` | Follow-up ${record.nextFollowUpAt}` : ''}</div>
            <div class="record-inline-grid">
                <label class="record-inline-field">
                    Pagamento
                    <select data-inline-payment="${record.id}">
                        <option value="nenhum" ${record.customerPaymentStatus === 'nenhum' || !record.customerPaymentStatus ? 'selected' : ''}>Nao pago</option>
                        <option value="50" ${record.customerPaymentStatus === '50' ? 'selected' : ''}>50%</option>
                        <option value="100" ${record.customerPaymentStatus === '100' ? 'selected' : ''}>100%</option>
                    </select>
                </label>
                <label class="record-inline-field">
                    Status
                    <select data-inline-status="${record.id}">
                        <option value="orcamento" ${record.status === 'orcamento' ? 'selected' : ''}>Orcamento</option>
                        <option value="pedido-fechado" ${record.status === 'pedido-fechado' ? 'selected' : ''}>Pedido fechado</option>
                        <option value="em-producao" ${record.status === 'em-producao' ? 'selected' : ''}>Em producao</option>
                        <option value="pronto-entregar" ${record.status === 'pronto-entregar' ? 'selected' : ''}>Pronto para entregar</option>
                        <option value="entregue" ${record.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                    </select>
                </label>
            </div>
            <div class="item-actions">
                <button type="button" data-edit-record="${record.id}">Editar</button>
                <button type="button" data-delete-record="${record.id}">Apagar</button>
            </div>
        </div>
    `).join('');

    elements.recordsList.querySelectorAll('[data-inline-payment]').forEach((select) => {
        select.onchange = () => {
            const recordId = select.getAttribute('data-inline-payment');
            const record = state.records.find((item) => item.id === recordId);
            if (!record) return;
            const paymentValue = select.value;
            let receivedAmount = 0;
            if (paymentValue === '50') {
                receivedAmount = record.quote?.depositAmount || Number(record.quote?.total || 0) / 2;
            } else if (paymentValue === '100') {
                receivedAmount = Number(record.quote?.total || 0);
            }
            applyQuickUpdate(recordId, {
                customerPaymentStatus: paymentValue,
                receivedAmount
            });
        };
    });

    elements.recordsList.querySelectorAll('[data-inline-status]').forEach((select) => {
        select.onchange = () => {
            const recordId = select.getAttribute('data-inline-status');
            applyQuickUpdate(recordId, {
                status: select.value
            });
        };
    });

    elements.recordsList.querySelectorAll('[data-delete-record]').forEach((button) => {
        button.onclick = (event) => {
            event.preventDefault();
            const recordId = button.getAttribute('data-delete-record');
            state.deletedRecords[recordId] = new Date().toISOString();
            persistDeletedRecords();
            state.records = state.records.filter((item) => item.id !== recordId);
            persistRecords();
            renderRecords();
            renderDashboard();
        };
    });
}

function renderDashboard() {
    const projectedRevenue = state.records.reduce((sum, item) => sum + item.quote.total, 0);
    const projectedProfit = state.records.reduce((sum, item) => sum + item.profit, 0);
    const receivedRevenue = state.records.reduce((sum, item) => sum + (Number(item.receivedAmount) || 0), 0);
    const realizedProfit = state.records.reduce((sum, item) => sum + (isFullyPaid(item) ? item.profit : 0), 0);
    const customerPending = state.records.reduce((sum, item) => sum + item.customerPendingAmount, 0);
    const supplierPending = state.records.reduce((sum, item) => sum + item.supplierPendingAmount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    const followUps = state.records.filter((item) => item.nextFollowUpAt && item.nextFollowUpAt <= today);
    const todayRecords = state.records.filter((item) => String(item.updatedAt || item.createdAt).slice(0, 10) === today);
    const monthRecords = state.records.filter((item) => String(item.updatedAt || item.createdAt).slice(0, 7) === currentMonth);
    const todayRevenue = todayRecords.reduce((sum, item) => sum + (Number(item.receivedAmount) || 0), 0);
    const todayProfit = todayRecords.reduce((sum, item) => sum + (isFullyPaid(item) ? item.profit : 0), 0);
    const monthRevenue = monthRecords.reduce((sum, item) => sum + (Number(item.receivedAmount) || 0), 0);
    const monthProfit = monthRecords.reduce((sum, item) => sum + (isFullyPaid(item) ? item.profit : 0), 0);

    elements.metricRevenue.textContent = money(receivedRevenue);
    elements.metricProfit.textContent = money(realizedProfit);
    elements.metricCustomerPending.textContent = money(customerPending);
    elements.metricSupplierPending.textContent = money(supplierPending);
    elements.metricOrders.textContent = money(projectedRevenue);
    elements.metricAverage.textContent = money(projectedProfit);
    elements.metricMargin.textContent = String(state.records.length);
    elements.metricFollowUp.textContent = String(followUps.length);
    elements.metricTodayRevenue.textContent = money(todayRevenue);
    elements.metricTodayProfit.textContent = money(todayProfit);
    elements.metricMonthRevenue.textContent = money(monthRevenue);
    elements.metricMonthProfit.textContent = money(monthProfit);

    const productMap = {};
    state.records.forEach((record) => {
        record.quote.items.forEach((item) => {
            if (!productMap[item.modelKey]) {
                productMap[item.modelKey] = { quantity: 0, revenue: 0, supplierCost: 0, profit: 0 };
            }
            productMap[item.modelKey].quantity += item.quantity;
            productMap[item.modelKey].revenue += item.subtotal;
            productMap[item.modelKey].supplierCost += item.supplierSubtotal || 0;
            productMap[item.modelKey].profit += (item.subtotal - (item.supplierSubtotal || 0));
        });
    });
    const topProducts = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6);
    elements.topProducts.innerHTML = topProducts.length
        ? topProducts.map(([name, stats]) => `<div class="item"><strong>${name}</strong><div class="meta">${stats.quantity} un | ${money(stats.revenue)}</div></div>`).join('')
        : '<div class="item"><strong>Sem produtos</strong><div class="meta">Salve registros para gerar ranking.</div></div>';
    const topProfitProducts = Object.entries(productMap).sort((a, b) => b[1].profit - a[1].profit).slice(0, 6);
    elements.profitByProduct.innerHTML = topProfitProducts.length
        ? topProfitProducts.map(([name, stats]) => `<div class="item"><strong>${name}</strong><div class="meta">Lucro ${money(stats.profit)} | Receita ${money(stats.revenue)}</div></div>`).join('')
        : '<div class="item"><strong>Sem lucro por produto</strong><div class="meta">Quando salvar pedidos, este ranking aparece aqui.</div></div>';

    const balances = state.records
        .filter((item) => item.customerPendingAmount > 0)
        .sort((a, b) => b.customerPendingAmount - a.customerPendingAmount)
        .slice(0, 6);
    elements.customerBalances.innerHTML = balances.length
        ? balances.map((item) => `<div class="item"><strong>${item.customerName}</strong><div class="meta">Receber ${money(item.customerPendingAmount)} | Status ${item.status}</div></div>`).join('')
        : '<div class="item"><strong>Sem cobranca pendente</strong><div class="meta">Os saldos de clientes aparecem aqui.</div></div>';

    const productionPaid50 = state.records
        .filter((item) => item.status !== 'entregue' && item.status !== 'pronto-entregar' && item.customerPaymentStatus === '50')
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
        .slice(0, 10);
    elements.productionPaid50Orders.innerHTML = productionPaid50.length
        ? productionPaid50.map((item) => `
            <div class="item">
                <strong>${item.customerName}</strong>
                <div class="meta">${item.status} | Pago 50% | Recebido ${money(item.receivedAmount || 0)}</div>
                <div class="meta">Falta receber ${money(item.customerPendingAmount)} | Venda ${money(item.quote.total)}</div>
            </div>
        `).join('')
        : '<div class="item"><strong>Sem pedidos com 50%</strong><div class="meta">Os pedidos com entrada paga aparecem aqui.</div></div>';

    const productionPaid100 = state.records
        .filter((item) => item.status !== 'entregue' && item.status !== 'pronto-entregar' && item.customerPaymentStatus === '100')
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
        .slice(0, 10);
    elements.productionPaid100Orders.innerHTML = productionPaid100.length
        ? productionPaid100.map((item) => `
            <div class="item">
                <strong>${item.customerName}</strong>
                <div class="meta">${item.status} | Pago 100% | Recebido ${money(item.receivedAmount || 0)}</div>
                <div class="meta">Venda ${money(item.quote.total)} | Fornecedor ${item.supplierPaid ? 'pago' : 'pendente'}</div>
            </div>
        `).join('')
        : '<div class="item"><strong>Sem pedidos com 100%</strong><div class="meta">Os pedidos totalmente pagos aparecem aqui.</div></div>';

    const readyToDeliver = state.records
        .filter((item) => item.status === 'pronto-entregar')
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
        .slice(0, 10);
    elements.readyToDeliverOrders.innerHTML = readyToDeliver.length
        ? readyToDeliver.map((item) => `
            <div class="item">
                <strong>${item.customerName}</strong>
                <div class="meta">${getPaymentLabel(item)} | Recebido ${money(item.receivedAmount || 0)}</div>
                <div class="meta">Pronto para entrega | Venda ${money(item.quote.total)}</div>
            </div>
        `).join('')
        : '<div class="item"><strong>Nada pronto para entregar</strong><div class="meta">Os pedidos finalizados aparecem aqui.</div></div>';

    const customerMap = {};
    state.records.forEach((record) => {
        if (!customerMap[record.customerName]) {
            customerMap[record.customerName] = { orders: 0, revenue: 0, profit: 0 };
        }
        customerMap[record.customerName].orders += 1;
        customerMap[record.customerName].revenue += record.quote.total;
        customerMap[record.customerName].profit += record.profit;
    });
    const topCustomers = Object.entries(customerMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 6);
    elements.topCustomers.innerHTML = topCustomers.length
        ? topCustomers.map(([name, stats]) => `<div class="item"><strong>${name}</strong><div class="meta">${stats.orders} pedidos | ${money(stats.revenue)}</div></div>`).join('')
        : '<div class="item"><strong>Sem clientes ainda</strong><div class="meta">Quando salvar pedidos, o ranking aparece aqui.</div></div>';
    const topProfitCustomers = Object.entries(customerMap)
        .sort((a, b) => b[1].profit - a[1].profit)
        .slice(0, 6);
    elements.profitByCustomer.innerHTML = topProfitCustomers.length
        ? topProfitCustomers.map(([name, stats]) => `<div class="item"><strong>${name}</strong><div class="meta">Lucro ${money(stats.profit)} | ${stats.orders} pedidos</div></div>`).join('')
        : '<div class="item"><strong>Sem lucro por cliente</strong><div class="meta">Quando salvar pedidos, este ranking aparece aqui.</div></div>';
    const recurring = Object.entries(customerMap)
        .filter(([, stats]) => stats.orders > 1)
        .sort((a, b) => b[1].orders - a[1].orders)
        .slice(0, 8);
    elements.recurringCustomers.innerHTML = recurring.length
        ? recurring.map(([name, stats]) => `<div class="item"><strong>${name}</strong><div class="meta">${stats.orders} pedidos | ${money(stats.revenue)}</div></div>`).join('')
        : '<div class="item"><strong>Sem recorrencia ainda</strong><div class="meta">Clientes com mais de um pedido aparecem aqui.</div></div>';

    const closingLines = [
        `<div class="item"><strong>Fechamento do dia</strong><div class="meta">Vendas ${money(todayRevenue)} | Lucro ${money(todayProfit)} | Pedidos ${todayRecords.length}</div></div>`,
        `<div class="item"><strong>Fechamento do mes</strong><div class="meta">Vendas ${money(monthRevenue)} | Lucro ${money(monthProfit)} | Pedidos ${monthRecords.length}</div></div>`,
        `<div class="item"><strong>Caixa a receber</strong><div class="meta">${money(customerPending)} em aberto dos clientes</div></div>`,
        `<div class="item"><strong>Repasse pendente</strong><div class="meta">${money(supplierPending)} ainda falta pagar ao fornecedor</div></div>`
    ];
    elements.closingSummary.innerHTML = closingLines.join('');
}

function resetEditing() {
    state.editingId = null;
    elements.editingBanner.classList.add('hidden');
    elements.editingBanner.textContent = '';
    elements.cancelEditing.classList.add('hidden');
    elements.saveRecord.textContent = 'Salvar registro';
}

function clearForm() {
    elements.customerName.value = '';
    elements.customerPhone.value = '';
    elements.customModelName.value = '';
    elements.customUnitPrice.value = '';
    elements.quantity.value = '';
    elements.freightValue.value = '';
    elements.freeFreightManaus.checked = false;
    elements.chargeScreenFee.checked = false;
    elements.hasExistingScreen.checked = false;
    elements.supplierCost.value = '';
    elements.autoSupplierCost.value = '';
    elements.receivedAmount.value = '';
    elements.customerPaymentStatus.value = 'nenhum';
    elements.repassedAmount.value = '';
    elements.supplierPaid.checked = false;
    elements.pixKey.value = '';
    elements.supplierName.value = '';
    elements.supplierPhone.value = '';
    elements.notes.value = '';
    elements.nextFollowUpAt.value = '';
    elements.lastContactAt.value = '';
    elements.quoteOutput.textContent = '';
    elements.receiptOutput.textContent = '';
    state.lastQuote = null;
    state.quoteItems = [];
    syncScreenFeeUI();
    renderItems();
}

function loadRecord(id) {
    const record = state.records.find((item) => item.id === id);
    if (!record) return;
    try {
        const quote = record.quote || {};
        const quoteItems = Array.isArray(quote.items) ? quote.items : [];
        const firstItem = quoteItems[0] || null;

        state.editingId = id;
        switchTab('quote');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        elements.editingBanner.classList.remove('hidden');
        elements.editingBanner.textContent = `Editando ${record.customerName}`;
        elements.cancelEditing.classList.remove('hidden');
        elements.saveRecord.textContent = 'Atualizar registro';

        if (firstItem?.categoryKey && QUOTE_TABLE[firstItem.categoryKey]) {
            elements.category.value = firstItem.categoryKey;
            populateModels();
            if (!firstItem.hasCustomModel && firstItem.modelKey) {
                elements.model.value = firstItem.modelKey;
            }
        }

        elements.customerName.value = record.customerName || '';
        elements.customerPhone.value = record.customerPhone || '';
        elements.deliveryMode.value = quote.deliveryMode || 'retirada';
        elements.freightValue.value = quote.freight || '';
        elements.freeFreightManaus.checked = Boolean(quote.freeFreightManaus);
        elements.chargeScreenFee.checked = Boolean(quote.chargeScreenFee);
        elements.hasExistingScreen.checked = Boolean(quote.hasExistingScreen);
        syncScreenFeeUI();
        elements.supplierCost.value = record.supplierCost || '';
        elements.autoSupplierCost.value = money(record.autoSupplierCost || 0);
        elements.receivedAmount.value = record.receivedAmount || '';
        elements.customerPaymentStatus.value = record.customerPaymentStatus || 'nenhum';
        elements.repassedAmount.value = record.repassedAmount || '';
        elements.supplierPaid.checked = Boolean(record.supplierPaid);
        elements.paymentMethod.value = record.paymentMethod || 'pix';
        elements.pixKey.value = record.pixKey || '';
        elements.leadSource.value = record.leadSource || 'whatsapp';
        elements.supplierName.value = record.supplierName || '';
        elements.supplierPhone.value = record.supplierPhone || '';
        elements.status.value = record.status || 'orcamento';
        elements.nextFollowUpAt.value = record.nextFollowUpAt || '';
        elements.lastContactAt.value = record.lastContactAt || '';
        elements.notes.value = record.notes || '';
        elements.quoteOutput.textContent = quote.text || '';
        elements.receiptOutput.textContent = record.receiptText || '';
        state.lastQuote = quote;
        state.quoteItems = quoteItems.map((item) => ({
            categoryKey: item.categoryKey,
            categoryLabel: item.categoryLabel,
            modelKey: item.modelKey,
            customModelName: item.hasCustomModel ? item.modelKey : '',
            customUnitPrice: item.hasCustomModel ? item.unitPrice : 0,
            quantity: item.quantity
        }));
        syncDeliveryModeUI();
        syncCustomerPaymentUI();
        renderItems();
    } catch (error) {
        console.error('Falha ao abrir registro para edicao:', error);
        alert('Nao foi possivel abrir esse registro para edicao. Vou corrigir esse caso.');
    }
}

function saveRecord() {
    if (!state.lastQuote) return;

    const supplierCost = Number(elements.supplierCost.value) || state.lastQuote.autoSupplierCost || 0;
    const receivedAmount = Number(elements.receivedAmount.value) || 0;
    const repassedAmount = elements.supplierPaid.checked
        ? supplierCost
        : (Number(elements.repassedAmount.value) || 0);
    const customerPaymentStatus = elements.customerPaymentStatus.value;
    const profit = Number((state.lastQuote.total - supplierCost).toFixed(2));
    const marginPercent = state.lastQuote.total > 0
        ? Number(((profit / state.lastQuote.total) * 100).toFixed(2))
        : 0;
    const receiptText = generateReceiptText();

    const record = {
        id: state.editingId || `kd-mobile-${Date.now()}`,
        createdAt: state.editingId
            ? (state.records.find((item) => item.id === state.editingId)?.createdAt || new Date().toISOString())
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerName: state.lastQuote.customerName,
        customerPhone: state.lastQuote.customerPhone || '',
        status: elements.status.value,
        quote: state.lastQuote,
        supplierCost,
        autoSupplierCost: state.lastQuote.autoSupplierCost,
        manualSupplierCost: supplierCost,
        profit,
        marginPercent,
        depositAmount: state.lastQuote.depositAmount,
        customerPaymentStatus,
        notes: elements.notes.value.trim(),
        receivedAmount,
        paymentMethod: elements.paymentMethod.value,
        pixKey: elements.pixKey.value.trim(),
        receiptNotes: '',
        receiptText,
        leadSource: elements.leadSource.value,
        supplierName: elements.supplierName.value.trim(),
        supplierPhone: normalizePhone(elements.supplierPhone.value),
        repassedAmount,
        supplierPaid: repassedAmount >= supplierCost && supplierCost > 0,
        customerPendingAmount: Number((state.lastQuote.total - receivedAmount).toFixed(2)),
        supplierPendingAmount: Number((supplierCost - repassedAmount).toFixed(2)),
        nextFollowUpAt: elements.nextFollowUpAt.value,
        lastContactAt: elements.lastContactAt.value
    };

    if (state.editingId) {
        state.records = state.records.map((item) => item.id === state.editingId ? record : item);
    } else {
        state.records.push(record);
    }
    delete state.deletedRecords[record.id];
    persistDeletedRecords();

    persistRecords();
    renderRecords();
    renderDashboard();
    loadRecord(record.id);
}

function exportJson() {
    const blob = new Blob([JSON.stringify(state.records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kd-comercial-mobile-records.json';
    anchor.click();
    URL.revokeObjectURL(url);
}

async function importJson(file) {
    if (!file) return;
    const text = await file.text();
    const incoming = JSON.parse(text);
    if (!Array.isArray(incoming)) return;
    state.records = incoming.map(recalculateRecord);
    incoming.forEach((record) => {
        if (record?.id) delete state.deletedRecords[record.id];
    });
    persistDeletedRecords();
    persistRecords();
    renderRecords();
    renderDashboard();
    renderBackupStatus();
}

function sendCurrentQuoteWhatsapp() {
    if (!state.lastQuote?.text) return;
    openWhatsApp(elements.customerPhone.value || state.lastQuote.customerPhone, state.lastQuote.text);
}

function sendSupplierWhatsapp() {
    const quote = state.lastQuote;
    if (!quote) return;

    const supplierPhone = normalizePhone(elements.supplierPhone.value);
    const customerName = quote.customerName || 'Cliente';
    const deliveryText = quote.deliveryMode === 'retirada' ? 'Retirada pelo cliente' : 'Entregar conforme combinado';
    const observations = elements.notes.value.trim();

    const message = [
        'KD Embalagens',
        'Pedido para producao',
        `Cliente final: ${customerName}`,
        '',
        'ITENS',
        ...quote.items.map((item, index) => `${index + 1}. ${item.modelKey} | ${item.quantity} un`),
        '',
        `Entrega: ${deliveryText}`,
        observations ? `Observacoes: ${observations}` : '',
        '',
        'Produzir conforme pedido acima.'
    ].filter(Boolean).join('\n');

    openWhatsApp(supplierPhone, message);
}

function sendChargeWhatsapp() {
    const quote = state.lastQuote;
    if (!quote) return;
    const supplierCost = Number(elements.supplierCost.value) || quote.autoSupplierCost || 0;
    const receivedAmount = Number(elements.receivedAmount.value) || 0;
    const pending = Number((quote.total - receivedAmount).toFixed(2));
    if (pending <= 0) return;
    const message = [
        `Ola, ${quote.customerName}.`,
        `Passando para lembrar do saldo em aberto do seu pedido na KD Embalagens.`,
        `Valor pendente: ${money(pending)}`,
        '',
        elements.pixKey.value.trim() ? `Chave Pix: ${elements.pixKey.value.trim()}` : 'Se quiser, ja posso te passar a chave Pix e finalizar isso agora.'
    ].join('\n');
    openWhatsApp(elements.customerPhone.value || quote.customerPhone, message);
}

function generateReceiptText() {
    const quote = state.lastQuote;
    if (!quote) return '';
    const receivedAmount = Number(elements.receivedAmount.value) || 0;
    if (receivedAmount <= 0) return '';
    const paymentStatus = elements.customerPaymentStatus.value;
    const paymentLabel = paymentStatus === '100'
        ? 'Pagamento integral'
        : paymentStatus === '50'
            ? 'Pagamento de 50% de entrada'
            : 'Pagamento parcial';
    return [
        'KD Embalagens',
        'Recibo de pagamento',
        `Cliente: ${quote.customerName}`,
        `Tipo de pagamento: ${paymentLabel}`,
        `Valor recebido: ${money(receivedAmount)}`,
        `Forma de pagamento: ${elements.paymentMethod.value}`,
        `Referente ao pedido: ${quote.items.map((item) => item.modelKey).join(', ')}`,
        `Data: ${new Date().toLocaleDateString('pt-BR')}`,
        'Prazo de producao: 7 dias uteis apos confirmacao do pagamento.'
    ].join('\n');
}

function generateReceipt() {
    const text = generateReceiptText();
    elements.receiptOutput.textContent = text || 'Preencha valor recebido para gerar o recibo.';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeFileName(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
}

function formatDateBr(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('pt-BR');
}

function openPdfDocument(title, fileName, bodyHtml) {
    const doc = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #f3f4f6; }
    .sheet { max-width: 820px; margin: 0 auto; background: #ffffff; min-height: 100vh; padding: 32px; box-sizing: border-box; }
    .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 800; letter-spacing: 0.04em; }
    .muted { color: #6b7280; font-size: 13px; }
    .title { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
    .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; margin-top: 18px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
    .value { font-size: 15px; font-weight: 600; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .totals { margin-top: 18px; display: grid; gap: 10px; }
    .total-line { display: flex; justify-content: space-between; font-size: 15px; }
    .grand-total { font-size: 20px; font-weight: 800; border-top: 2px solid #111827; padding-top: 12px; margin-top: 6px; }
    .note { margin-top: 18px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; }
    @media print {
      body { background: #fff; }
      .sheet { max-width: none; min-height: auto; padding: 18px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    ${bodyHtml}
  </div>
  <script>
    document.title = ${JSON.stringify(fileName)};
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    const existingFrame = document.getElementById('pdfPrintFrame');
    if (existingFrame) existingFrame.remove();

    const frame = document.createElement('iframe');
    frame.id = 'pdfPrintFrame';
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    frame.onload = () => {
        try {
            frame.contentWindow.focus();
            frame.contentWindow.print();
        } catch (error) {
            const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        }
    };

    frame.srcdoc = doc;
}

function downloadQuotePdf() {
    const quote = state.lastQuote;
    if (!quote) return;

    const rows = quote.items.map((item) => `
        <tr>
            <td>${escapeHtml(item.modelKey)}</td>
            <td>${item.quantity} un</td>
            <td>${money(item.unitPrice)}</td>
            <td>${money(item.subtotal)}</td>
        </tr>
    `).join('');

    const bodyHtml = `
        <div class="topbar">
            <div>
                <div class="brand">KD EMBALAGENS</div>
                <div class="muted">Embalagens personalizadas em Manaus</div>
            </div>
            <div>
                <div class="title">Orcamento</div>
                <div class="muted">Data: ${formatDateBr()}</div>
            </div>
        </div>

        <div class="card">
            <div class="grid">
                <div>
                    <div class="label">Cliente</div>
                    <div class="value">${escapeHtml(quote.customerName)}</div>
                </div>
                <div>
                    <div class="label">WhatsApp</div>
                    <div class="value">${escapeHtml(quote.customerPhone || '-')}</div>
                </div>
                <div>
                    <div class="label">Entrega</div>
                    <div class="value">${quote.deliveryMode === 'retirada' ? 'Retirada pelo cliente' : 'Entrega'}</div>
                </div>
                <div>
                    <div class="label">Entrada</div>
                    <div class="value">${money(quote.depositAmount)}</div>
                </div>
                <div>
                    <div class="label">Prazo</div>
                    <div class="value">7 dias uteis</div>
                </div>
            </div>
        </div>

        <div class="card">
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantidade</th>
                        <th>Valor unitario</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <div class="totals">
                <div class="total-line"><span>Subtotal</span><strong>${money(quote.items.reduce((sum, item) => sum + item.subtotal, 0))}</strong></div>
                <div class="total-line"><span>Tela/logo</span><strong>${escapeHtml((quote.text.match(/Tela: (.+)/)?.[1]) || 'nao aplicada')}</strong></div>
                <div class="total-line"><span>Frete</span><strong>${escapeHtml((quote.text.match(/Frete: (.+)/)?.[1]) || '-')}</strong></div>
                <div class="total-line grand-total"><span>Total</span><strong>${money(quote.total)}</strong></div>
            </div>
        </div>

        <div class="card">
            <div class="label">Observacao</div>
            <div class="note">Orcamento gerado pela KD Embalagens. Para confirmar o pedido, valide os itens, o valor e a entrada de 50%. Prazo de producao: 7 dias uteis apos confirmacao do pagamento.</div>
        </div>
    `;

    openPdfDocument(
        'Orcamento KD Embalagens',
        `orcamento-kd-${safeFileName(quote.customerName)}.pdf`,
        bodyHtml
    );
}

function downloadReceiptPdf() {
    const quote = state.lastQuote;
    const receivedAmount = Number(elements.receivedAmount.value) || 0;
    if (!quote || receivedAmount <= 0) return;

    const bodyHtml = `
        <div class="topbar">
            <div>
                <div class="brand">KD EMBALAGENS</div>
                <div class="muted">Recibo padronizado</div>
            </div>
            <div>
                <div class="title">Recibo</div>
                <div class="muted">Data: ${formatDateBr()}</div>
            </div>
        </div>

        <div class="card">
            <div class="grid">
                <div>
                    <div class="label">Cliente</div>
                    <div class="value">${escapeHtml(quote.customerName)}</div>
                </div>
                <div>
                    <div class="label">Valor recebido</div>
                    <div class="value">${money(receivedAmount)}</div>
                </div>
                <div>
                    <div class="label">Forma de pagamento</div>
                    <div class="value">${escapeHtml(elements.paymentMethod.value)}</div>
                </div>
                <div>
                    <div class="label">Pedido</div>
                    <div class="value">${escapeHtml(quote.items.map((item) => item.modelKey).join(', '))}</div>
                </div>
                <div>
                    <div class="label">Prazo</div>
                    <div class="value">7 dias uteis</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="label">Declaracao</div>
            <div class="note">Recebemos de ${escapeHtml(quote.customerName)} o valor de ${money(receivedAmount)}, referente ao pedido descrito acima. Prazo de producao: 7 dias uteis apos confirmacao do pagamento.</div>
        </div>
    `;

    openPdfDocument(
        'Recibo KD Embalagens',
        `recibo-kd-${safeFileName(quote.customerName)}.pdf`,
        bodyHtml
    );
}

function switchTab(target) {
    elements.tabs.forEach((button) => button.classList.toggle('active', button.dataset.tabTarget === target));
    elements.panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.tab === target));
}

elements.tabs.forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tabTarget));
});

elements.recordsList.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-record]');
    if (editButton) {
        loadRecord(editButton.dataset.editRecord);
        return;
    }
});

elements.category.addEventListener('change', () => {
    populateModels();
    refreshQuotePreview();
});
elements.deliveryMode.addEventListener('change', () => {
    syncDeliveryModeUI();
    refreshQuotePreview();
});
elements.supplierPaid.addEventListener('change', () => {
    const supplierCost = Number(elements.supplierCost.value) || state.lastQuote?.autoSupplierCost || 0;
    if (elements.supplierPaid.checked && supplierCost > 0) {
        elements.repassedAmount.value = supplierCost.toFixed(2);
    }
});
elements.customerPaymentStatus.addEventListener('change', syncCustomerPaymentUI);
elements.freightValue.addEventListener('input', refreshQuotePreview);
elements.freeFreightManaus.addEventListener('change', refreshQuotePreview);
elements.chargeScreenFee.addEventListener('change', refreshQuotePreview);
elements.hasExistingScreen.addEventListener('change', () => {
    syncScreenFeeUI();
    refreshQuotePreview();
});
elements.customerName.addEventListener('input', refreshQuotePreview);
elements.quantity.addEventListener('input', refreshQuotePreview);
elements.model.addEventListener('change', refreshQuotePreview);
elements.customModelName.addEventListener('input', refreshQuotePreview);
elements.customUnitPrice.addEventListener('input', refreshQuotePreview);

elements.addItem.addEventListener('click', () => {
    const quantity = Number(elements.quantity.value);
    const modelKey = elements.customModelName.value.trim() || elements.model.value;
    if (!quantity || !modelKey) return;

    state.quoteItems.push({
        categoryKey: elements.category.value,
        categoryLabel: QUOTE_TABLE[elements.category.value]?.label || '',
        modelKey: elements.model.value,
        customModelName: elements.customModelName.value.trim(),
        customUnitPrice: Number(elements.customUnitPrice.value),
        quantity
    });
    elements.customModelName.value = '';
    elements.customUnitPrice.value = '';
    elements.quantity.value = '';
    renderItems();
    refreshQuotePreview();
});

elements.clearItems.addEventListener('click', () => {
    state.quoteItems = [];
    renderItems();
    elements.quoteOutput.textContent = '';
    state.lastQuote = null;
});

elements.generateQuote.addEventListener('click', () => {
    const quote = buildQuote();
    if (!quote) {
        elements.quoteOutput.textContent = 'Preencha cliente e itens validos.';
        return;
    }
    state.lastQuote = quote;
    elements.autoSupplierCost.value = money(quote.autoSupplierCost);
    syncCustomerPaymentUI();
    elements.quoteOutput.textContent = quote.text;
});

elements.saveRecord.addEventListener('click', saveRecord);
elements.sendQuoteWhatsapp.addEventListener('click', sendCurrentQuoteWhatsapp);
elements.sendSupplierWhatsapp.addEventListener('click', sendSupplierWhatsapp);
elements.downloadQuotePdf.addEventListener('click', downloadQuotePdf);
elements.sendChargeWhatsapp.addEventListener('click', sendChargeWhatsapp);
elements.generateReceipt.addEventListener('click', generateReceipt);
elements.downloadReceiptPdf.addEventListener('click', downloadReceiptPdf);
elements.importJson.addEventListener('click', () => elements.importJsonFile.click());
elements.importJsonFile.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importJson(file);
    event.target.value = '';
});
elements.exportJson.addEventListener('click', exportJson);
elements.saveSupabaseConfig.addEventListener('click', () => {
    state.supabaseConfig = {
        url: normalizeSupabaseUrl(elements.supabaseUrl.value),
        anonKey: String(elements.supabaseAnonKey.value || '').trim()
    };
    saveSupabaseConfigLocal();
    renderSupabaseConfig();
});
elements.testSupabaseConnection.addEventListener('click', testSupabaseConnection);
elements.syncSupabaseNow.addEventListener('click', () => syncSupabaseNow(true));
elements.restoreBackup.addEventListener('click', () => {
    const restored = restoreFromBackup();
    if (!restored) {
        alert('Nenhum backup local encontrado neste app.');
        renderBackupStatus();
        return;
    }
    renderRecords();
    renderDashboard();
    renderBackupStatus();
    alert('Backup local restaurado com sucesso.');
});
elements.recordSearch.addEventListener('input', (event) => {
    state.recordSearch = event.target.value.trim().toLowerCase();
    renderRecords();
});
elements.recordStatusFilter.addEventListener('change', (event) => {
    state.recordStatusFilter = event.target.value;
    renderRecords();
});
elements.cancelEditing.addEventListener('click', () => {
    resetEditing();
    clearForm();
});
elements.duplicateQuote.addEventListener('click', async () => {
    if (!state.lastQuote?.text) return;
    await navigator.clipboard.writeText(state.lastQuote.text);
});

populateCategories();
syncBackupFromCurrentState();
syncDeliveryModeUI();
syncScreenFeeUI();
renderItems();
renderRecords();
renderDashboard();
renderBackupStatus();
renderSupabaseConfig();
if (isSupabaseConfigured()) {
    setTimeout(() => {
        syncSupabaseNow(false);
    }, 400);
}
