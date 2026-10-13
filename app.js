import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBaWecdNirD3l18YfjtPlSvtbY_7mFtJHw",
  authDomain: "spend-8651b.firebaseapp.com",
  databaseURL: "https://spend-8651b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "spend-8651b",
  storageBucket: "spend-8651b.firebasestorage.app",
  messagingSenderId: "405604312654",
  appId: "1:405604312654:web:b068122c9f220734fbc51f",
  measurementId: "G-PCDJC8PQ9S"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

const defaultCategoryData = {
  "水電瓦斯": [
    { name: "電費", amount: 1700 },
    { name: "水費", amount: 241 },
    { name: "瓦斯費", amount: 0 }
  ],
  "租房": [
    { name: "房租", amount: 0 },
    { name: "房屋押金", amount: 0 }
  ],
  "稅": [
    { name: "4月 貨車牌照稅", amount: 10000 },
    { name: "4月 轎車牌照稅 (殘障補助免繳)", amount: 0 },
    { name: "5月 房屋稅 (廣興/頂湳免繳)", amount: 0 },
    { name: "7月 貨車燃料稅", amount: 4800 },
    { name: "7月 轎車汽車燃料稅 (三姑姑)", amount: 6180 },
    { name: "7月 舊家機車燃料稅", amount: 450 },
    { name: "11月 地價稅 (頂湳/廣興)", amount: 8590 }
  ],
  "保險": [
    { name: "3月 轎車保險 (3/31到期)", amount: 7871 },
    { name: "12月 舊家機車保險", amount: 1533 }
  ],
  "爸生活": [
    { name: "手機費", amount: 599 },
    { name: "第四台", amount: 1620 }
  ],
  "三姑姑生活": [
    { name: "三姑姑生活雜項", amount: 0 }
  ],
  "其他自訂": [
    { name: "自訂項目", amount: 0 }
  ]
};

const defaultShortcuts = [
  { text: '電費', amount: 1700 },
  { text: '水費', amount: 241 },
  { text: '房租', amount: 0 },
  { text: '第四台', amount: 1620 },
  { text: '手機費', amount: 599 }
];

const defaultDeadlines = [
  ...[2, 4, 6, 8, 10, 12].flatMap(m => [
    { id: `default-elec-${m}`, month: m, text: '水電瓦斯 - 電費', amount: 1700 },
    { id: `default-water-${m}`, month: m, text: '水電瓦斯 - 水費', amount: 241 }
  ]),
  ...[3, 6, 9, 12].map(m => (
    { id: `default-catv-${m}`, month: m, text: '爸生活 - 第四台', amount: 1620 }
  )),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
    { id: `default-phone-${m}`, month: m, text: '爸生活 - 手機費', amount: 599 }
  )),
  { id: 'default-1', month: 3, text: '保險 - 轎車保險', amount: 7871 },
  { id: 'default-2', month: 4, text: '稅 - 貨車牌照稅', amount: 10000 },
  { id: 'default-3', month: 7, text: '稅 - 舊家機車燃料稅', amount: 450 },
  { id: 'default-4', month: 7, text: '稅 - 轎車汽車燃料稅', amount: 6180 },
  { id: 'default-5', month: 7, text: '稅 - 貨車燃料稅', amount: 4800 },
  { id: 'default-6', month: 11, text: '稅 - 頂湳與廣興地價稅', amount: 8590 },
  { id: 'default-7', month: 12, text: '保險 - 舊家機車保險', amount: 1533 }
];

let categoryData = JSON.parse(localStorage.getItem('sister_category_data')) || defaultCategoryData;
let deadlines = JSON.parse(localStorage.getItem('sister_deadlines')) || defaultDeadlines;
let shortcuts = JSON.parse(localStorage.getItem('sister_shortcuts')) || defaultShortcuts;
let expenses = JSON.parse(localStorage.getItem('sister_expenses')) || [];
let paidRecords = JSON.parse(localStorage.getItem('sister_paid_records')) || {};

let chartPayer = null;
let chartCategory = null;
let chartSubcategory = null;

// 將 window 函式綁定以供 HTML onclick 調用
window.toggleSidebar = toggleSidebar;
window.switchTab = switchTab;
window.handleCategoryChange = handleCategoryChange;
window.handleSubcategoryChange = handleSubcategoryChange;
window.addNewCategory = addNewCategory;
window.addNewSubcategory = addNewSubcategory;
window.resetCategoriesToDefault = resetCategoriesToDefault;
window.editCategoryName = editCategoryName;
window.deleteCategory = deleteCategory;
window.editSubcategory = editSubcategory;
window.deleteSubcategory = deleteSubcategory;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEditedExpense = saveEditedExpense;
window.deleteExpense = deleteExpense;
window.handleStatsRangeChange = handleStatsRangeChange;
window.renderStats = renderStats;
window.toggleDeadlinePaid = toggleDeadlinePaid;
window.deleteDeadline = deleteDeadline;
window.loginWithGoogle = loginWithGoogle;
window.logoutGoogle = logoutGoogle;

document.addEventListener('DOMContentLoaded', () => {
  initSelectOptions();
  setCurrentDate();

  // 監聽 Auth 狀態
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAuthUI(user);
    listenToFirebaseData();
  });

  document.getElementById('expense-form').addEventListener('submit', handleAddExpense);
  document.getElementById('view-month').addEventListener('change', renderDeadlines);
  document.getElementById('toggle-all-months-btn').addEventListener('click', toggleAllMonthsView);
  document.getElementById('add-custom-deadline-btn').addEventListener('click', handleAddCustomDeadline);
  document.getElementById('history-filter-month').addEventListener('change', renderHistory);
});

// Auth 登入與登出邏輯
function loginWithGoogle() {
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("登入成功:", result.user);
    })
    .catch((error) => {
      console.error("登入失敗:", error);
      alert("Google 登入失敗: " + error.message);
    });
}

function logoutGoogle() {
  signOut(auth).then(() => {
    alert("已成功登出");
  }).catch((error) => {
    console.error("登出錯誤:", error);
  });
}

function updateAuthUI(user) {
  const loginBtn = document.getElementById('btn-google-login');
  const logoutBtn = document.getElementById('btn-google-logout');
  const userInfo = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

  if (user) {
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    userAvatar.src = user.photoURL || '';
    userName.textContent = user.displayName || user.email;
  } else {
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    userInfo.classList.add('hidden');
    userAvatar.src = '';
    userName.textContent = '';
  }
}

// Firebase 即時資料監聽與同步
function listenToFirebaseData() {
  const dbPath = currentUser ? `users/${currentUser.uid}` : 'appData';
  const dataRef = ref(db, dbPath);

  onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      categoryData = data.categoryData || defaultCategoryData;
      deadlines = data.deadlines || defaultDeadlines;
      shortcuts = data.shortcuts || defaultShortcuts;
      expenses = data.expenses || [];
      paidRecords = data.paidRecords || {};

      localStorage.setItem('sister_category_data', JSON.stringify(categoryData));
      localStorage.setItem('sister_deadlines', JSON.stringify(deadlines));
      localStorage.setItem('sister_shortcuts', JSON.stringify(shortcuts));
      localStorage.setItem('sister_expenses', JSON.stringify(expenses));
      localStorage.setItem('sister_paid_records', JSON.stringify(paidRecords));
    } else {
      saveData();
    }

    initCategories();
    renderShortcuts();
    renderDeadlines();
    renderHistory();
    renderStats();
  });
}

function saveData() {
  localStorage.setItem('sister_category_data', JSON.stringify(categoryData));
  localStorage.setItem('sister_deadlines', JSON.stringify(deadlines));
  localStorage.setItem('sister_shortcuts', JSON.stringify(shortcuts));
  localStorage.setItem('sister_expenses', JSON.stringify(expenses));
  localStorage.setItem('sister_paid_records', JSON.stringify(paidRecords));

  const dbPath = currentUser ? `users/${currentUser.uid}` : 'appData';

  set(ref(db, dbPath), {
    categoryData,
    deadlines,
    shortcuts,
    expenses,
    paidRecords
  }).catch(err => console.error("Firebase 寫入失敗:", err));
}

function saveCategoryData() {
  saveData();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('toggle-sidebar-btn');

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  } else {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (toggleBtn) {
      toggleBtn.textContent = isCollapsed ? '▶' : '◀';
    }
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  document.getElementById(`nav-${tabName}`).classList.add('active');

  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  }

  if (tabName === 'history') renderHistory();
  if (tabName === 'stats') renderStats();
}

function initCategories() {
  const catSelect = document.getElementById('exp-category');
  const targetCatSelect = document.getElementById('target-category-select');

  catSelect.innerHTML = '';
  targetCatSelect.innerHTML = '';

  Object.keys(categoryData).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);

    const opt2 = document.createElement('option');
    opt2.value = cat;
    opt2.textContent = cat;
    targetCatSelect.appendChild(opt2);
  });

  handleCategoryChange();
  renderCategoryTree();
}

function handleCategoryChange() {
  const catSelect = document.getElementById('exp-category');
  const subSelect = document.getElementById('exp-subcategory');
  const customTitleGroup = document.getElementById('custom-title-group');

  const selectedCat = catSelect.value;
  const items = categoryData[selectedCat] || [];

  subSelect.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    opt.textContent = item.name;
    opt.dataset.amount = item.amount;
    subSelect.appendChild(opt);
  });

  if (selectedCat === "其他自訂") {
    customTitleGroup.classList.remove('hidden');
  } else {
    customTitleGroup.classList.add('hidden');
  }

  handleSubcategoryChange();
}

function handleSubcategoryChange() {
  const subSelect = document.getElementById('exp-subcategory');
  const amountInput = document.getElementById('exp-amount');

  const selectedOpt = subSelect.options[subSelect.selectedIndex];
  if (selectedOpt && selectedOpt.dataset.amount !== undefined) {
    amountInput.value = selectedOpt.dataset.amount;
  }
}

function renderCategoryTree() {
  const container = document.getElementById('category-tree-container');
  container.innerHTML = '';

  Object.keys(categoryData).forEach(cat => {
    const catGroup = document.createElement('div');
    catGroup.className = 'tree-category-group';

    const catHeader = document.createElement('div');
    catHeader.className = 'tree-category-header';
    catHeader.innerHTML = `
      <span class="cat-title">📂 <strong>${cat}</strong></span>
      <div class="tree-btn-group">
        <button class="btn-edit-sm" onclick="editCategoryName('${cat}')">修改</button>
        <button class="btn-del-sm" onclick="deleteCategory('${cat}')">刪除</button>
      </div>
    `;
    catGroup.appendChild(catHeader);

    const subUl = document.createElement('ul');
    subUl.className = 'tree-subcategory-list';

    categoryData[cat].forEach((sub, idx) => {
      const subLi = document.createElement('li');
      subLi.className = 'tree-subcategory-item';
      subLi.innerHTML = `
        <span class="subcat-title">↳ ${sub.name} <small>($${sub.amount.toLocaleString()})</small></span>
        <div class="tree-btn-group">
          <button class="btn-edit-sm" onclick="editSubcategory('${cat}', ${idx})">修改</button>
          <button class="btn-del-sm" onclick="deleteSubcategory('${cat}', ${idx})">刪除</button>
        </div>
      `;
      subUl.appendChild(subLi);
    });

    catGroup.appendChild(subUl);
    container.appendChild(catGroup);
  });
}

function editCategoryName(oldName) {
  const newName = prompt(`修改大類「${oldName}」的名稱：`, oldName);
  if (!newName || newName.trim() === '' || newName === oldName) return;

  const trimmed = newName.trim();
  if (categoryData[trimmed]) {
    alert('已有相同的分類名稱！');
    return;
  }

  categoryData[trimmed] = categoryData[oldName];
  delete categoryData[oldName];
  saveCategoryData();
  initCategories();
}

function deleteCategory(catName) {
  if (confirm(`確定要刪除大類「${catName}」及其底下的所有細項嗎？`)) {
    delete categoryData[catName];
    saveCategoryData();
    initCategories();
  }
}

function editSubcategory(catName, idx) {
  const currentSub = categoryData[catName][idx];
  const newName = prompt(`修改細項名稱：`, currentSub.name);
  if (newName === null) return;

  const newAmountStr = prompt(`修改預設金額：`, currentSub.amount);
  if (newAmountStr === null) return;

  const trimmedName = newName.trim() || currentSub.name;
  const newAmount = parseFloat(newAmountStr) >= 0 ? parseFloat(newAmountStr) : currentSub.amount;

  categoryData[catName][idx] = { name: trimmedName, amount: newAmount };
  saveCategoryData();
  initCategories();
}

function deleteSubcategory(catName, idx) {
  const subName = categoryData[catName][idx].name;
  if (confirm(`確定要刪除細項「${subName}」嗎？`)) {
    categoryData[catName].splice(idx, 1);
    saveCategoryData();
    initCategories();
  }
}

function resetCategoriesToDefault() {
  if (confirm('確定要重設分類為預設值嗎？這會覆蓋所有自訂分類。')) {
    categoryData = JSON.parse(JSON.stringify(defaultCategoryData));
    saveCategoryData();
    initCategories();
  }
}

function addNewCategory() {
  const input = document.getElementById('new-cat-name');
  const catName = input.value.trim();

  if (!catName) {
    alert('請輸入大類名稱！');
    return;
  }

  if (categoryData[catName]) {
    alert('此大類名稱已存在！');
    return;
  }

  categoryData[catName] = [];
  saveCategoryData();
  initCategories();
  input.value = '';
}

function addNewSubcategory() {
  const targetCat = document.getElementById('target-category-select').value;
  const nameInput = document.getElementById('new-subcat-name');
  const amountInput = document.getElementById('new-subcat-amount');

  const subName = nameInput.value.trim();
  const subAmount = parseFloat(amountInput.value) || 0;

  if (!subName) {
    alert('請輸入細項名稱！');
    return;
  }

  if (!categoryData[targetCat]) {
    categoryData[targetCat] = [];
  }

  categoryData[targetCat].push({ name: subName, amount: subAmount });
  saveCategoryData();
  initCategories();

  nameInput.value = '';
  amountInput.value = '';
}

function setCurrentDate() {
  const today = new Date();
  const dateInput = document.getElementById('exp-date');
  if (dateInput) {
    dateInput.value = today.toISOString().split('T')[0];
  }
  
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  document.getElementById('view-month').value = currentMonth;
  document.getElementById('custom-month').value = currentMonth;
  document.getElementById('history-filter-month').value = currentMonth;

  document.getElementById('stats-year-select').value = currentYear;
  document.getElementById('stats-month-select').value = currentMonth;
  document.getElementById('stats-year-only-select').value = currentYear;

  const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  document.getElementById('stats-start-date').value = firstDay;
  document.getElementById('stats-end-date').value = today.toISOString().split('T')[0];
}

function initSelectOptions() {
  const currentYear = new Date().getFullYear();

  const yearSelects = ['stats-year-select', 'stats-year-only-select'];
  yearSelects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '';
    for (let y = currentYear - 3; y <= currentYear + 3; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = `${y} 年`;
      select.appendChild(opt);
    }
  });

  const monthSelects = ['view-month', 'custom-month', 'history-filter-month', 'stats-month-select'];
  monthSelects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = id.includes('history') ? '<option value="all">全部月份</option>' : '';

    for (let i = 1; i <= 12; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${i} 月`;
      select.appendChild(opt);
    }
  });
}

function handleAddExpense(e) {
  e.preventDefault();

  const date = document.getElementById('exp-date').value;
  const category = document.getElementById('exp-category').value;
  const subcategory = document.getElementById('exp-subcategory').value;
  const customTitle = document.getElementById('exp-custom-title').value.trim();
  let amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  const payer = document.getElementById('exp-payer').value;

  let title = category === "其他自訂" ? (customTitle || "自訂項目") : `${category} - ${subcategory}`;

  if (amount < 0) {
    alert('金額不可小於 0！');
    return;
  }

  // 若選擇姊妹分攤，將金額除以 2
  if (payer === '姊妹分攤') {
    amount = amount / 2;
  }

  const newExpense = {
    id: Date.now().toString(),
    date,
    category,
    subcategory,
    title,
    amount,
    payer
  };

  expenses.push(newExpense);
  saveData();

  alert('新增支出成功！');
  document.getElementById('exp-custom-title').value = '';

  renderHistory();
  renderStats();
}

function renderHistory() {
  const monthFilter = document.getElementById('history-filter-month').value;
  const tbody = document.getElementById('history-list-body');
  tbody.innerHTML = '';

  let filtered = expenses;
  if (monthFilter !== 'all') {
    const targetMonth = parseInt(monthFilter);
    filtered = expenses.filter(item => {
      const m = new Date(item.date).getMonth() + 1;
      return m === targetMonth;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg" style="text-align:center;">尚無支出紀錄</td></tr>';
    return;
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  filtered.forEach(item => {
    let badgeClass = 'badge-p1';
    if (item.payer === '妹妹') badgeClass = 'badge-p2';
    else if (item.payer === '爸') badgeClass = 'badge-dad';
    else if (item.payer === '大姑姑') badgeClass = 'badge-big-aunt';
    else if (item.payer === '三姑姑') badgeClass = 'badge-third-aunt';
    else if (item.payer === '姊妹分攤') badgeClass = 'badge-split';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.date}</td>
      <td>${item.title}</td>
      <td>NT$ ${item.amount.toLocaleString()}</td>
      <td><span class="badge ${badgeClass}">${item.payer}</span></td>
      <td>
        <div class="action-btn-group">
          <button class="btn-edit-sm" onclick="openEditModal('${item.id}')">修改</button>
          <button class="btn-danger-sm" onclick="deleteExpense('${item.id}')">刪除</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEditModal(id) {
  const target = expenses.find(i => i.id === id);
  if (!target) return;

  document.getElementById('edit-exp-id').value = target.id;
  document.getElementById('edit-exp-date').value = target.date;
  document.getElementById('edit-exp-title').value = target.title;
  // 若原本是姊妹分攤，編輯時若要呈現原始輸入金額可視需求調整，此處直接顯示紀錄金額
  document.getElementById('edit-exp-amount').value = target.amount;
  document.getElementById('edit-exp-payer').value = target.payer;

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

function saveEditedExpense() {
  const id = document.getElementById('edit-exp-id').value;
  const date = document.getElementById('edit-exp-date').value;
  const title = document.getElementById('edit-exp-title').value.trim();
  let amount = parseFloat(document.getElementById('edit-exp-amount').value) || 0;
  const payer = document.getElementById('edit-exp-payer').value;

  if (!title) {
    alert('項目名稱不能為空！');
    return;
  }

  if (payer === '姊妹分攤') {
    amount = amount / 2;
  }

  const index = expenses.findIndex(i => i.id === id);
  if (index !== -1) {
    expenses[index] = {
      ...expenses[index],
      date,
      title,
      amount,
      payer
    };

    saveData();
    closeEditModal();
    renderHistory();
    renderStats();
  }
}

function deleteExpense(id) {
  if (confirm('確定要刪除這筆紀錄嗎？')) {
    expenses = expenses.filter(item => item.id !== id);
    saveData();
    renderHistory();
    renderStats();
  }
}

function handleStatsRangeChange() {
  const type = document.querySelector('input[name="stats-type"]:checked').value;
  
  document.getElementById('stats-range-month').classList.add('hidden');
  document.getElementById('stats-range-year').classList.add('hidden');
  document.getElementById('stats-range-custom').classList.add('hidden');

  if (type === 'month') {
    document.getElementById('stats-range-month').classList.remove('hidden');
  } else if (type === 'year') {
    document.getElementById('stats-range-year').classList.remove('hidden');
  } else if (type === 'custom') {
    document.getElementById('stats-range-custom').classList.remove('hidden');
  }

  renderStats();
}

function renderStats() {
  const type = document.querySelector('input[name="stats-type"]:checked').value;
  let filtered = [];

  if (type === 'month') {
    const year = parseInt(document.getElementById('stats-year-select').value);
    const month = parseInt(document.getElementById('stats-month-select').value);
    filtered = expenses.filter(item => {
      const d = new Date(item.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });
  } else if (type === 'year') {
    const year = parseInt(document.getElementById('stats-year-only-select').value);
    filtered = expenses.filter(item => {
      const d = new Date(item.date);
      return d.getFullYear() === year;
    });
  } else if (type === 'custom') {
    const start = document.getElementById('stats-start-date').value;
    const end = document.getElementById('stats-end-date').value;
    if (start && end) {
      filtered = expenses.filter(item => item.date >= start && item.date <= end);
    }
  }

  const total = filtered.reduce((sum, item) => sum + item.amount, 0);
  const sister1Paid = filtered.filter(i => i.payer === '姊姊').reduce((sum, i) => sum + i.amount, 0);
  const sister2Paid = filtered.filter(i => i.payer === '妹妹').reduce((sum, i) => sum + i.amount, 0);
  const dadPaid = filtered.filter(i => i.payer === '爸').reduce((sum, i) => sum + i.amount, 0);
  const bigAuntPaid = filtered.filter(i => i.payer === '大姑姑').reduce((sum, i) => sum + i.amount, 0);
  const thirdAuntPaid = filtered.filter(i => i.payer === '三姑姑').reduce((sum, i) => sum + i.amount, 0);
  const sistersSplitPaid = filtered.filter(i => i.payer === '姊妹分攤').reduce((sum, i) => sum + i.amount, 0);

  document.getElementById('stat-total-amount').textContent = `NT$ ${total.toLocaleString()}`;
  document.getElementById('stat-sister1-amount').textContent = `NT$ ${sister1Paid.toLocaleString()}`;
  document.getElementById('stat-sister2-amount').textContent = `NT$ ${sister2Paid.toLocaleString()}`;
  document.getElementById('stat-dad-amount').textContent = `NT$ ${dadPaid.toLocaleString()}`;
  document.getElementById('stat-big-aunt-amount').textContent = `NT$ ${bigAuntPaid.toLocaleString()}`;
  document.getElementById('stat-third-aunt-amount').textContent = `NT$ ${thirdAuntPaid.toLocaleString()}`;
  document.getElementById('stat-sisters-split-amount').textContent = `NT$ ${sistersSplitPaid.toLocaleString()}`;

  const settlementText = document.getElementById('settlement-result-text');
  const avg = total / 2;
  const diff = sister1Paid - avg;

  if (total === 0) {
    settlementText.textContent = '此範圍內尚無支出資料。';
  } else if (diff === 0) {
    settlementText.textContent = '🎉 雙方支付金額完全相同，不需補找！';
  } else if (diff > 0) {
    settlementText.textContent = `👉 妹妹 需要給 姊姊 NT$ ${Math.abs(diff).toLocaleString()} 元`;
  } else {
    settlementText.textContent = `👉 姊姊 需要給 妹妹 NT$ ${Math.abs(diff).toLocaleString()} 元`;
  }

  renderPayerChart(filtered);
  renderCategoryChart(filtered);
  renderSubcategoryChart(filtered);
}

function getCommonChartOptions() {
  const isMobile = window.innerWidth <= 768;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: isMobile ? 10 : 12,
          padding: isMobile ? 8 : 10,
          font: {
            size: isMobile ? 11 : 12
          }
        }
      }
    }
  };
}

function renderPayerChart(data) {
  const ctx = document.getElementById('payerChart').getContext('2d');
  const sister1 = data.filter(i => i.payer === '姊姊').reduce((s, i) => s + i.amount, 0);
  const sister2 = data.filter(i => i.payer === '妹妹').reduce((s, i) => s + i.amount, 0);
  const dad = data.filter(i => i.payer === '爸').reduce((s, i) => s + i.amount, 0);
  const bigAunt = data.filter(i => i.payer === '大姑姑').reduce((s, i) => s + i.amount, 0);
  const thirdAunt = data.filter(i => i.payer === '三姑姑').reduce((s, i) => s + i.amount, 0);
  const sistersSplit = data.filter(i => i.payer === '姊妹分攤').reduce((s, i) => s + i.amount, 0);

  if (chartPayer) chartPayer.destroy();

  chartPayer = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['姊姊', '妹妹', '爸', '大姑姑', '三姑姑', '姊妹分攤'],
      datasets: [{
        data: [sister1, sister2, dad, bigAunt, thirdAunt, sistersSplit],
        backgroundColor: ['#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#64748b']
      }]
    },
    options: getCommonChartOptions()
  });
}

function renderCategoryChart(data) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  const catMap = {};

  data.forEach(item => {
    const cat = item.category || '其他';
    catMap[cat] = (catMap[cat] || 0) + item.amount;
  });

  const labels = Object.keys(catMap);
  const values = Object.values(catMap);

  if (chartCategory) chartCategory.destroy();

  chartCategory = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b']
      }]
    },
    options: getCommonChartOptions()
  });
}

function renderSubcategoryChart(data) {
  const ctx = document.getElementById('subcategoryChart').getContext('2d');
  const subMap = {};

  data.forEach(item => {
    const label = item.title || '其他細項';
    subMap[label] = (subMap[label] || 0) + item.amount;
  });

  const labels = Object.keys(subMap);
  const values = Object.values(subMap);

  if (chartSubcategory) chartSubcategory.destroy();

  chartSubcategory = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', 
          '#22d3ee', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'
        ]
      }]
    },
    options: getCommonChartOptions()
  });
}

function renderShortcuts() {
  const container = document.getElementById('quick-btn-container');
  container.innerHTML = '';

  shortcuts.forEach(sc => {
    const btn = document.createElement('button');
    btn.className = 'btn-shortcut';
    btn.textContent = `${sc.text} ($${sc.amount})`;
    btn.onclick = () => fillCustomForm(sc.text, sc.amount);
    container.appendChild(btn);
  });
}

function fillCustomForm(text, amount) {
  document.getElementById('custom-title').value = text;
  document.getElementById('custom-amount').value = amount;
}

function handleAddCustomDeadline() {
  const month = parseInt(document.getElementById('custom-month').value);
  const titleInput = document.getElementById('custom-title');
  const amountInput = document.getElementById('custom-amount');
  const saveShortcutCheckbox = document.getElementById('save-as-shortcut');

  const text = titleInput.value.trim();
  const amount = parseFloat(amountInput.value) || 0;

  if (!text) {
    alert('請輸入項目名稱！');
    return;
  }

  deadlines.push({
    id: Date.now().toString(),
    month,
    text,
    amount
  });

  if (saveShortcutCheckbox.checked) {
    if (!shortcuts.some(sc => sc.text === text)) {
      shortcuts.push({ text, amount });
    }
  }

  saveData();

  titleInput.value = '';
  amountInput.value = '';
  saveShortcutCheckbox.checked = false;
}

function toggleDeadlinePaid(id, month) {
  const currentYear = new Date().getFullYear();
  const key = `${currentYear}-${month}`;

  if (!paidRecords[key]) {
    paidRecords[key] = [];
  }

  const index = paidRecords[key].indexOf(id);
  if (index > -1) {
    paidRecords[key].splice(index, 1);
  } else {
    paidRecords[key].push(id);
  }

  saveData();
}

function deleteDeadline(id) {
  if (confirm('確定要永久刪除此應繳項目嗎？（這會影響所有月份的預設呈現）')) {
    deadlines = deadlines.filter(item => item.id !== id);
    Object.keys(paidRecords).forEach(k => {
      paidRecords[k] = paidRecords[k].filter(item => item !== id);
    });
    saveData();
  }
}

function renderDeadlines() {
  const selectedMonth = parseInt(document.getElementById('view-month').value);
  const currentYear = new Date().getFullYear();
  const key = `${currentYear}-${selectedMonth}`;
  const currentPaidList = paidRecords[key] || [];

  const monthItems = deadlines.filter(item => item.month === selectedMonth);
  const totalAmount = monthItems.reduce((sum, item) => sum + item.amount, 0);

  document.getElementById('single-month-title').textContent = 
    `📅 ${selectedMonth} 月份應繳總計：NT$ ${totalAmount.toLocaleString()}`;

  const singleList = document.getElementById('single-deadline-list');
  singleList.innerHTML = '';

  if (monthItems.length === 0) {
    singleList.innerHTML = '<li class="empty-msg">本月暫無應繳項目</li>';
  } else {
    monthItems.forEach(item => {
      const isPaid = currentPaidList.includes(item.id);
      const li = document.createElement('li');
      li.className = `deadline-item ${isPaid ? 'is-paid' : ''}`;
      li.innerHTML = `
        <span class="deadline-text">
          <strong>${item.text}</strong> - NT$ ${item.amount.toLocaleString()}
        </span>
        <div class="action-btn-group">
          <button class="${isPaid ? 'btn-paid-done' : 'btn-paid-toggle'}" onclick="toggleDeadlinePaid('${item.id}', ${selectedMonth})">
            ${isPaid ? '✓ 已繳 (點擊恢復)' : '標示已繳'}
          </button>
          <button class="btn-del-icon" title="永久刪除項目" onclick="deleteDeadline('${item.id}')">✕</button>
        </div>
      `;
      singleList.appendChild(li);
    });
  }

  const allMonthsContainer = document.getElementById('all-months-view');
  allMonthsContainer.innerHTML = '';

  for (let m = 1; m <= 12; m++) {
    const mKey = `${currentYear}-${m}`;
    const mPaidList = paidRecords[mKey] || [];
    const items = deadlines.filter(item => item.month === m);
    const mTotal = items.reduce((sum, item) => sum + item.amount, 0);

    const details = document.createElement('details');
    details.className = 'month-accordion-item';

    let itemsHtml = items.map(item => {
      const isPaid = mPaidList.includes(item.id);
      return `
        <div class="month-card-item ${isPaid ? 'is-paid' : ''}">
          <span class="deadline-text">${item.text} ($${item.amount.toLocaleString()})</span>
          <div class="action-btn-group">
            <button class="${isPaid ? 'btn-paid-done' : 'btn-paid-toggle'}" onclick="toggleDeadlinePaid('${item.id}', ${m})">
              ${isPaid ? '✓ 已繳' : '標示已繳'}
            </button>
            <button class="btn-del-icon" onclick="deleteDeadline('${item.id}')">✕</button>
          </div>
        </div>
      `;
    }).join('');

    if (items.length === 0) itemsHtml = '<div class="empty-sub-msg">無應繳項目</div>';

    details.innerHTML = `
      <summary class="month-accordion-header">
        <span>📅 <strong>${m} 月份</strong></span>
        <span class="month-accordion-total">NT$ ${mTotal.toLocaleString()}</span>
      </summary>
      <div class="month-accordion-body">
        ${itemsHtml}
      </div>
    `;

    allMonthsContainer.appendChild(details);
  }
}

function toggleAllMonthsView() {
  const allView = document.getElementById('all-months-view');
  const btn = document.getElementById('toggle-all-months-btn');

  if (allView.classList.contains('hidden')) {
    allView.classList.remove('hidden');
    btn.textContent = '收合所有月份';
  } else {
    allView.classList.add('hidden');
    btn.textContent = '展開所有月份';
  }
}
