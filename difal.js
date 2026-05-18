/* Utilidades de formatação */
function parseBRL(str) {
  if (!str) return NaN;
  // aceita "1.234,56" ou "1234.56" ou "1234,56"
  const cleaned = str.trim().replace(/\s/g, '');
  // formato brasileiro: ponto como milhar, vírgula como decimal
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // formato americano ou inteiro simples
  return parseFloat(cleaned.replace(',', '.'));
}

function formatBRL(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPct(n) {
  return (n * 100).toFixed(2).replace('.', ',') + ' %';
}

/* Leitura de alíquota: dropdown tem prioridade; manual sobrescreve se preenchido */
function getAliquota(selectId, manualId) {
  const manual = document.getElementById(manualId).value.trim();
  if (manual !== '') {
    const v = parseBRL(manual);
    if (isNaN(v) || v <= 0 || v >= 100) return NaN;
    return v / 100;
  }
  const sel = document.getElementById(selectId).value;
  if (sel === '') return NaN;
  return parseFloat(sel);
}

function calcular() {
  // --- leitura ---
  const vOper = parseBRL(document.getElementById('vOper').value);
  const alqInterna = getAliquota('alqInterna', 'alqInternaManual');
  const alqInter = getAliquota('alqInterestadual', 'alqInterestadualManual');

  const icmsOrigemRaw = document.getElementById('icmsOrigem').value.trim();
  let icmsOrigem;
  if (icmsOrigemRaw === '') {
    icmsOrigem = null; // será calculado automaticamente
  } else {
    icmsOrigem = parseBRL(icmsOrigemRaw);
  }

  // --- validação ---
  const erros = [];
  if (isNaN(vOper) || vOper <= 0) erros.push('Informe um valor de operação válido.');
  if (isNaN(alqInterna)) erros.push('Selecione ou informe a alíquota interna.');
  if (isNaN(alqInter)) erros.push('Selecione ou informe a alíquota interestadual.');
  if (icmsOrigem !== null && (isNaN(icmsOrigem) || icmsOrigem < 0)) erros.push('ICMS origem inválido.');
  if (!isNaN(alqInter) && !isNaN(alqInterna) && alqInter >= alqInterna) {
    erros.push('A alíquota interestadual deve ser menor que a alíquota interna para gerar DIFAL positivo.');
  }

  if (erros.length) {
    alert(erros.join('\n'));
    return;
  }

  // --- cálculo ---
  if (icmsOrigem === null) {
    icmsOrigem = vOper * alqInter;
  }

  // Base de cálculo por dentro
  const bc = (vOper - icmsOrigem) / (1 - alqInterna);

  // ICMS interno do destino
  const icmsInterno = bc * alqInterna;

  // ICMS interestadual (pago pelo remetente)
  const icmsInter = vOper * alqInter;

  // DIFAL
  const difal = icmsInterno - icmsInter;

  // --- exibição ---
  document.getElementById('r-vOper').textContent = formatBRL(vOper);
  document.getElementById('r-icmsOrigem').textContent = formatBRL(icmsOrigem);
  document.getElementById('r-bc').textContent = formatBRL(bc);
  document.getElementById('r-icmsInterno').textContent = formatBRL(icmsInterno);
  document.getElementById('r-icmsInter').textContent = formatBRL(icmsInter);
  document.getElementById('r-difal').textContent = formatBRL(difal < 0 ? 0 : difal);

  document.getElementById('r-alqs').textContent =
    `ALQ interna MT: ${formatPct(alqInterna)} | ALQ interestadual: ${formatPct(alqInter)}`;

  document.getElementById('resultado').classList.remove('hidden');
  document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });
}

function limpar() {
  ['vOper', 'alqInternaManual', 'alqInterestadualManual', 'icmsOrigem'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('alqInterna').value = '';
  document.getElementById('alqInterestadual').value = '';
  document.getElementById('resultado').classList.add('hidden');
  document.getElementById('vOper').focus();
}

/* Permite pressionar Enter para calcular */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') calcular();
});
