// Budget Planner Lite – no build tools, runs from index.html
const KEY = 'budgetPlannerLiteV1';

const $ = (sel) => document.querySelector(sel);
const $tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);

const state = {
  income: 0,
  fixed: [], // [{name, amount}]
  variable: [] // [{name, amount}]
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(state, data);
  } catch(e){ console.warn('load failed', e); }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  render();
}

function currency(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function addItem(listName, name, amount) {
  if (!name || isNaN(amount) || Number(amount) < 0) return;
  state[listName].push({ name: name.trim(), amount: Number(amount) });
  save();
}

function editItem(listName, idx) {
  const item = state[listName][idx];
  const newName = prompt('Name', item.name);
  if (newName === null) return;
  const newAmt = prompt('Amount', item.amount);
  if (newAmt === null) return;
  const val = Number(newAmt);
  if (isNaN(val) || val < 0) return alert('Enter a valid non‑negative number.');
  state[listName][idx] = { name: newName.trim(), amount: val };
  save();
}

function deleteItem(listName, idx) {
  state[listName].splice(idx, 1);
  save();
}

function bindList(listName, ul) {
  ul.innerHTML = '';
  state[listName].forEach((it, idx) => {
    const li = $tpl('listItemTpl');
    li.querySelector('.name').textContent = it.name;
    li.querySelector('.amount').textContent = currency(it.amount);
    li.querySelector('.edit').addEventListener('click', () => editItem(listName, idx));
    li.querySelector('.delete').addEventListener('click', () => deleteItem(listName, idx));
    ul.appendChild(li);
  });
}

let chart;
function drawChart(income, fixed, variable) {
  const ctx = document.getElementById('pie').getContext('2d');
  const total = fixed + variable;
  const leftover = Math.max(income - total, 0);
  const data = [fixed, variable, leftover];
  const labels = ['Fixed', 'Variable', 'Leftover'];
  if (chart) { chart.destroy(); }
  chart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data }] },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${currency(ctx.parsed)}` } }
      }
    }
  });
}

function render() {
  // Lists
  bindList('fixed', $('#fixedList'));
  bindList('variable', $('#varList'));

  // Income field
  $('#income').value = state.income || '';

  // Summary
  const sumFixed = state.fixed.reduce((a,b)=>a+b.amount,0);
  const sumVar = state.variable.reduce((a,b)=>a+b.amount,0);
  const total = sumFixed + sumVar;
  const leftover = (state.income || 0) - total;
  const rate = (state.income > 0) ? (leftover / state.income) * 100 : 0;

  $('#sumIncome').textContent = currency(state.income);
  $('#sumFixed').textContent  = currency(sumFixed);
  $('#sumVar').textContent    = currency(sumVar);
  $('#sumTotal').textContent  = currency(total);
  $('#sumLeftover').textContent = currency(leftover);
  $('#sumRate').textContent   = `${rate.toFixed(1)}%`;

  drawChart(state.income || 0, sumFixed, sumVar);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'budget-data.json';
  a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 5000);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!('income' in data && 'fixed' in data && 'variable' in data)) throw new Error('Invalid file');
      Object.assign(state, data);
      save();
    } catch(e){ alert('Invalid JSON file.'); }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!confirm('This will clear all data saved in this browser. Continue?')) return;
  state.income = 0;
  state.fixed = [];
  state.variable = [];
  save();
}

function main() {
  load();
  render();

  $('#saveIncome').addEventListener('click', () => {
    const v = Number($('#income').value);
    if (isNaN(v) || v < 0) return alert('Enter a valid non‑negative number.');
    state.income = v;
    save();
  });

  $('#addFixed').addEventListener('click', () => {
    addItem('fixed', $('#fxName').value, $('#fxAmt').value);
    $('#fxName').value=''; $('#fxAmt').value='';
  });
  $('#addVar').addEventListener('click', () => {
    addItem('variable', $('#varName').value, $('#varAmt').value);
    $('#varName').value=''; $('#varAmt').value='';
  });

  $('#exportBtn').addEventListener('click', exportData);
  $('#importInput').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  $('#resetBtn').addEventListener('click', resetAll);
}
main();
