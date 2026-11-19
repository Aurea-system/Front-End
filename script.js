
"use strict";

const CATEGORIAS = {
  Receita: ["Salário", "Freelance", "Investimentos", "Vendas", "Outras receitas"],
  Despesa: ["Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Educação", "Contas", "Compras", "Outras despesas"]
};

const CHAVE = "aurea-dados";
const $ = (id) => document.getElementById(id);

let movimentacoes = [];
let metas = [];
let orcamentos = {};
let proximoId = 1;
let proximaMetaId = 1;
let editandoId = null;
let editandoMetaId = null;

function hoje() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mesAtual() {
  return hoje().slice(0, 7);
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function dataBR(data) {
  if (!data) return "Sem prazo";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function mesBR(mes) {
  const [ano, numeroMes] = mes.split("-");
  const data = new Date(Number(ano), Number(numeroMes) - 1, 1);
  return data.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric"
  });
}

function lerNumero(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({
      movimentacoes,
      metas,
      orcamentos,
      proximoId,
      proximaMetaId
    }));
  } catch (erro) {
    console.error("Não foi possível salvar os dados.", erro);
    alert("Não foi possível salvar. Verifique o espaço disponível no navegador.");
  }
}

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}");

    movimentacoes = Array.isArray(salvo.movimentacoes)
      ? salvo.movimentacoes.filter((m) =>
          m &&
          Number.isFinite(Number(m.id)) &&
          typeof m.descricao === "string" &&
          Number.isFinite(Number(m.valor)) &&
          ["Receita", "Despesa"].includes(m.tipo) &&
          typeof m.data === "string" &&
          typeof m.categoria === "string"
        ).map((m) => ({ ...m, id: Number(m.id), valor: Number(m.valor) }))
      : [];

    metas = Array.isArray(salvo.metas)
      ? salvo.metas.filter((m) =>
          m &&
          Number.isFinite(Number(m.id)) &&
          typeof m.nome === "string" &&
          Number.isFinite(Number(m.alvo)) &&
          Number.isFinite(Number(m.atual)) &&
          Number(m.alvo) > 0 &&
          Number(m.atual) >= 0
        ).map((m) => ({
          ...m,
          id: Number(m.id),
          alvo: Number(m.alvo),
          atual: Number(m.atual)
        }))
      : [];

    orcamentos = salvo.orcamentos && typeof salvo.orcamentos === "object"
      ? salvo.orcamentos
      : {};

    proximoId = Math.max(
      Number(salvo.proximoId) || 1,
      ...movimentacoes.map((m) => m.id + 1),
      1
    );

    proximaMetaId = Math.max(
      Number(salvo.proximaMetaId) || 1,
      ...metas.map((m) => m.id + 1),
      1
    );
  } catch (erro) {
    console.error("Erro ao carregar os dados.", erro);
    movimentacoes = [];
    metas = [];
    orcamentos = {};
  }
}

function criarOpcoes(select, textoInicial, valores, selecionado = "") {
  select.replaceChildren();
  select.add(new Option(textoInicial, ""));

  valores.forEach((valor) => {
    select.add(new Option(valor, valor));
  });

  select.value = selecionado;
}

function mostrarTela(nome) {
  const tela = $(nome);
  if (!tela) return;

  document.querySelectorAll(".tela").forEach((item) => {
    item.classList.toggle("ativa", item.id === nome);
  });

  document.querySelectorAll(".nav").forEach((botao) => {
    const ativo = botao.dataset.tela === nome;
    botao.classList.toggle("ativo", ativo);

    if (ativo) {
      botao.setAttribute("aria-current", "page");
    } else {
      botao.removeAttribute("aria-current");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
  renderizar();

  if (nome === "cadastro" && !editandoId) {
    $("data").value = hoje();
  }
}

function avisar(texto, erro = false) {
  $("mensagem").textContent = texto;
  $("mensagem").classList.toggle("erro", erro);
}

function avisarMeta(texto, erro = false) {
  $("meta-mensagem").textContent = texto;
  $("meta-mensagem").classList.toggle("erro", erro);
}

function limparFormulario() {
  editandoId = null;
  $("form").reset();
  $("data").value = hoje();

  criarOpcoes(
    $("categoria"),
    "Escolha primeiro o tipo",
    []
  );

  $("ajuda").textContent = "Escolha primeiro o tipo de movimentação.";
  $("form-titulo").textContent = "Nova movimentação";
  $("salvar").textContent = "Salvar movimentação";
  avisar("");
}

function somar(tipo, lista = movimentacoes) {
  return lista
    .filter((m) => m.tipo === tipo)
    .reduce((total, m) => total + m.valor, 0);
}

function totalPorCategoria(lista, tipo = "Despesa") {
  const totais = {};

  lista
    .filter((m) => m.tipo === tipo)
    .forEach((m) => {
      totais[m.categoria] = (totais[m.categoria] || 0) + m.valor;
    });

  return Object.entries(totais)
    .sort((a, b) => b[1] - a[1]);
}

function atualizarFiltroCategoria() {
  const filtro = $("filtro-categoria");
  const selecionada = filtro.value;

  const usadas = [...new Set(movimentacoes.map((m) => m.categoria))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  criarOpcoes(
    filtro,
    "Todas as categorias",
    usadas,
    usadas.includes(selecionada) ? selecionada : ""
  );

  filtro.options[0].value = "Todas";
  filtro.value = usadas.includes(selecionada) ? selecionada : "Todas";
}

const ORDENS = {
  recentes: (a, b) => b.data.localeCompare(a.data) || b.id - a.id,
  antigas: (a, b) => a.data.localeCompare(b.data) || a.id - b.id,
  maior: (a, b) => b.valor - a.valor,
  menor: (a, b) => a.valor - b.valor
};

function obterMovimentacoesFiltradas() {
  const busca = $("busca").value.trim().toLocaleLowerCase("pt-BR");
  const tipo = $("filtro-tipo").value;
  const categoria = $("filtro-categoria").value;
  const mes = $("filtro-mes").value;
  const ordem = $("ordem").value;

  return movimentacoes
    .filter((m) =>
      (!busca || m.descricao.toLocaleLowerCase("pt-BR").includes(busca)) &&
      (tipo === "Todos" || m.tipo === tipo) &&
      (categoria === "Todas" || m.categoria === categoria) &&
      (!mes || m.data.startsWith(mes))
    )
    .sort(ORDENS[ordem] || ORDENS.recentes);
}

/* Gráficos em barras, sem bibliotecas externas */

function desenharBarras(elemento, dados, mensagemVazia, opcoes = {}) {
  elemento.replaceChildren();

  if (!dados.length) {
    const mensagem = document.createElement("p");
    mensagem.className = "vazia";
    mensagem.textContent = mensagemVazia;
    elemento.appendChild(mensagem);
    return;
  }

  const maximo = Math.max(...dados.map((item) => item[1]), 0.01);
  const total = dados.reduce((soma, item) => soma + item[1], 0);

  dados.forEach(([nome, valor]) => {
    const linha = document.createElement("div");
    linha.className = "barra-linha";

    const info = document.createElement("div");
    info.className = "barra-info";

    const titulo = document.createElement("span");
    titulo.textContent = nome;

    const numero = document.createElement("strong");
    numero.textContent = moeda(valor);

    if (opcoes.percentuais && total > 0) {
      const percentual = document.createElement("small");
      percentual.textContent = `${Math.round(valor / total * 100)}%`;
      numero.appendChild(percentual);
    }

    info.append(titulo, numero);

    const trilho = document.createElement("div");
    trilho.className = "trilho";

    const preenchido = document.createElement("div");
    preenchido.className = "preenchido";
    preenchido.style.width = `${Math.min(valor / maximo * 100, 100)}%`;

    if (opcoes.cor) {
      preenchido.classList.add(opcoes.cor);
    }

    trilho.appendChild(preenchido);
    linha.append(info, trilho);
    elemento.appendChild(linha);
  });
}

/* PAINEL */

function renderizarPainel() {
  atualizarFiltroCategoria();

  const lista = obterMovimentacoesFiltradas();
  const corpo = $("lista");
  corpo.replaceChildren();

  $("vazia").hidden = lista.length > 0;
  $("contador").textContent =
    `${lista.length} ${lista.length === 1 ? "movimentação encontrada" : "movimentações encontradas"}`;

  lista.forEach((m) => {
    const linha = corpo.insertRow();

    const descricao = linha.insertCell();
    descricao.textContent = m.descricao;
    descricao.title = m.descricao;

    linha.insertCell().textContent = m.categoria;
    linha.insertCell().textContent = dataBR(m.data);

    const tipo = linha.insertCell();
    const etiqueta = document.createElement("span");
    etiqueta.className = `tipo ${m.tipo.toLowerCase()}`;
    etiqueta.textContent = m.tipo;
    tipo.appendChild(etiqueta);

    const valor = linha.insertCell();
    valor.className = m.tipo.toLowerCase();
    valor.textContent = `${m.tipo === "Receita" ? "+" : "−"} ${moeda(m.valor)}`;

    const acoes = linha.insertCell();

    const editar = document.createElement("button");
    editar.className = "editar";
    editar.textContent = "Editar";
    editar.dataset.editar = m.id;
    editar.setAttribute("aria-label", `Editar ${m.descricao}`);

    const excluir = document.createElement("button");
    excluir.className = "excluir";
    excluir.textContent = "Excluir";
    excluir.dataset.excluir = m.id;
    excluir.setAttribute("aria-label", `Excluir ${m.descricao}`);

    acoes.append(editar, document.createTextNode(" "), excluir);
  });

  const receitas = somar("Receita", lista);
  const despesas = somar("Despesa", lista);

  $("receitas-total").textContent = moeda(receitas);
  $("despesas-total").textContent = moeda(despesas);
  $("saldo-total").textContent = moeda(receitas - despesas);

  desenharBarras(
    $("barras-painel"),
    totalPorCategoria(lista),
    "Nenhuma despesa encontrada com os filtros atuais.",
    { percentuais: true }
  );
}

/* METAS FINANCEIRAS */

function abrirFormularioMeta(meta = null) {
  editandoMetaId = meta ? meta.id : null;

  $("meta-form").reset();
  $("meta-atual").value = meta ? meta.atual : 0;
  $("meta-nome").value = meta ? meta.nome : "";
  $("meta-alvo").value = meta ? meta.alvo : "";
  $("meta-prazo").value = meta ? meta.prazo || "" : "";
  $("meta-form-titulo").textContent = meta ? "Editar meta" : "Criar uma meta";
  $("meta-salvar").textContent = meta ? "Salvar alterações" : "Salvar meta";
  avisarMeta("");

  $("meta-form-card").hidden = false;
  $("meta-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  $("meta-nome").focus();
}

function renderizarMetas() {
  $("metas-total").textContent = metas.length;

  $("metas-guardado").textContent = moeda(
    metas.reduce((total, meta) => total + meta.atual, 0)
  );

  $("metas-alvo").textContent = moeda(
    metas.reduce((total, meta) => total + meta.alvo, 0)
  );

  const lista = $("metas-lista");
  lista.replaceChildren();
  $("metas-vazia").hidden = metas.length > 0;

  [...metas]
    .sort((a, b) => {
      const concluiuA = a.atual >= a.alvo;
      const concluiuB = b.atual >= b.alvo;
      return Number(concluiuA) - Number(concluiuB);
    })
    .forEach((meta) => {
      const percentual = Math.min(meta.atual / meta.alvo * 100, 100);
      const concluida = meta.atual >= meta.alvo;

      const card = document.createElement("article");
      card.className = "meta-card";

      const topo = document.createElement("div");
      topo.className = "meta-card-topo";

      const texto = document.createElement("div");
      const nome = document.createElement("h3");
      nome.textContent = meta.nome;

      const prazo = document.createElement("p");
      prazo.className = "meta-prazo";

      if (concluida) {
        prazo.textContent = "Parabéns! Você alcançou esta meta.";
      } else if (meta.prazo) {
        const dias = Math.ceil(
          (new Date(`${meta.prazo}T12:00:00`) - new Date(`${hoje()}T12:00:00`))
          / 86400000
        );

        prazo.textContent = dias < 0
          ? `Prazo encerrado em ${dataBR(meta.prazo)}`
          : `Prazo: ${dataBR(meta.prazo)} · ${dias} ${dias === 1 ? "dia restante" : "dias restantes"}`;
      } else {
        prazo.textContent = "Prazo não definido";
      }

      texto.append(nome, prazo);

      if (concluida) {
        const status = document.createElement("span");
        status.className = "meta-concluida";
        status.textContent = "Concluída ✓";
        topo.append(texto, status);
      } else {
        topo.appendChild(texto);
      }

      const percentualEl = document.createElement("div");
      percentualEl.className = "meta-percentual";
      percentualEl.textContent = `${Math.round(percentual)}%`;

      const trilho = document.createElement("div");
      trilho.className = "trilho";

      const preenchido = document.createElement("div");
      preenchido.className = "preenchido";
      preenchido.style.width = `${percentual}%`;

      if (concluida) {
        preenchido.classList.add("dourado-barra");
      }

      trilho.appendChild(preenchido);

      const valores = document.createElement("div");
      valores.className = "meta-valores";

      const guardado = document.createElement("span");
      guardado.textContent = "Guardado ";

      const valorAtual = document.createElement("strong");
      valorAtual.textContent = moeda(meta.atual);
      guardado.appendChild(valorAtual);

      const alvo = document.createElement("span");
      alvo.textContent = "Objetivo ";

      const valorAlvo = document.createElement("strong");
      valorAlvo.textContent = moeda(meta.alvo);
      alvo.appendChild(valorAlvo);

      valores.append(guardado, alvo);

      const restante = document.createElement("p");
      restante.className = "subtexto";
      restante.textContent = concluida
        ? "Objetivo financeiro alcançado."
        : `Faltam ${moeda(meta.alvo - meta.atual)} para alcançar seu objetivo.`;

      const acoes = document.createElement("div");
      acoes.className = "meta-acoes";

      const aporte = document.createElement("button");
      aporte.className = "botao-principal";
      aporte.textContent = "+ Adicionar valor";
      aporte.dataset.aporte = meta.id;
      aporte.disabled = concluida;

      const editar = document.createElement("button");
      editar.className = "botao-secundario";
      editar.textContent = "Editar";
      editar.dataset.editarMeta = meta.id;

      const excluir = document.createElement("button");
      excluir.className = "botao-texto";
      excluir.textContent = "Excluir";
      excluir.dataset.excluirMeta = meta.id;

      acoes.append(aporte, editar, excluir);
      card.append(topo, percentualEl, trilho, valores, restante, acoes);
      lista.appendChild(card);
    });
}

function adicionarAporte(id) {
  const meta = metas.find((item) => item.id === id);
  if (!meta || meta.atual >= meta.alvo) return;

  const resposta = prompt(
    `Quanto deseja adicionar à meta "${meta.nome}"?\nValor restante: ${moeda(meta.alvo - meta.atual)}`
  );

  if (resposta === null) return;

  const valor = lerNumero(resposta.trim().replace(",", "."));

  if (!Number.isFinite(valor) || valor <= 0) {
    alert("Digite um valor válido maior que zero.");
    return;
  }

  meta.atual = Math.round((meta.atual + valor) * 100) / 100;
  salvar();
  renderizarMetas();

  if (meta.atual >= meta.alvo) {
    alert(`Parabéns! Você alcançou a meta "${meta.nome}".`);
  }
}

/* RELATÓRIOS */

function movimentacoesDoRelatorio() {
  const mes = $("rel-mes").value;
  return mes
    ? movimentacoes.filter((m) => m.data.startsWith(mes))
    : [...movimentacoes];
}

function renderizarRelatorios() {
  const lista = movimentacoesDoRelatorio();
  const despesas = lista.filter((m) => m.tipo === "Despesa");
  const receitas = somar("Receita", lista);
  const totalDespesas = somar("Despesa", lista);

  const maior = despesas.reduce(
    (atual, item) => !atual || item.valor > atual.valor ? item : atual,
    null
  );

  $("rel-maior").textContent = maior ? moeda(maior.valor) : "R$ 0,00";
  $("rel-maior-desc").textContent = maior
    ? maior.descricao
    : "Nenhuma despesa neste período";

  $("rel-media").textContent = moeda(
    despesas.length ? totalDespesas / despesas.length : 0
  );

  $("rel-economia").textContent = receitas > 0
    ? `${Math.round(((receitas - totalDespesas) / receitas) * 100)}%`
    : "—";

  const meses = {};

  movimentacoes.forEach((m) => {
    const chave = m.data.slice(0, 7);
    if (!meses[chave]) meses[chave] = { receita: 0, despesa: 0 };

    meses[chave][m.tipo === "Receita" ? "receita" : "despesa"] += m.valor;
  });

  let chaves = Object.keys(meses).sort().reverse();

  if ($("rel-mes").value) {
    chaves = chaves.filter((mes) => mes === $("rel-mes").value);
  }

  const corpo = $("lista-meses");
  corpo.replaceChildren();
  $("meses-vazio").hidden = chaves.length > 0;

  chaves.forEach((mes) => {
    const dados = meses[mes];
    const saldo = dados.receita - dados.despesa;
    const linha = corpo.insertRow();

    linha.insertCell().textContent = mesBR(mes);

    const receitaCelula = linha.insertCell();
    receitaCelula.className = "receita";
    receitaCelula.textContent = moeda(dados.receita);

    const despesaCelula = linha.insertCell();
    despesaCelula.className = "despesa";
    despesaCelula.textContent = moeda(dados.despesa);

    const saldoCelula = linha.insertCell();
    saldoCelula.className = saldo >= 0 ? "receita" : "despesa";
    saldoCelula.textContent = moeda(saldo);
  });

  const mesesComparacao = chaves.slice().reverse().slice(-6);
  const comparacao = [];

  mesesComparacao.forEach((mes) => {
    comparacao.push([`${mesBR(mes)} · Receitas`, meses[mes].receita]);
    comparacao.push([`${mesBR(mes)} · Despesas`, meses[mes].despesa]);
  });

  desenharBarras(
    $("barras-comparacao"),
    comparacao,
    "Cadastre movimentações para comparar receitas e despesas.",
    { cor: "dourado-barra" }
  );

  desenharBarras(
    $("barras-despesas"),
    totalPorCategoria(lista, "Despesa"),
    "Nenhuma despesa registrada neste período.",
    { percentuais: true, cor: "despesa-barra" }
  );

  desenharBarras(
    $("barras-receitas"),
    totalPorCategoria(lista, "Receita"),
    "Nenhuma receita registrada neste período.",
    { percentuais: true }
  );
}

/* ORÇAMENTOS */

function renderizarOrcamentos() {
  if (!$("orc-mes").value) $("orc-mes").value = mesAtual();

  const mes = $("orc-mes").value;

  const gastos = Object.fromEntries(
    totalPorCategoria(
      movimentacoes.filter((m) => m.data.startsWith(mes)),
      "Despesa"
    )
  );

  const lista = $("orc-lista");
  lista.replaceChildren();

  let limiteTotal = 0;
  let gastoComLimite = 0;

  CATEGORIAS.Despesa.forEach((categoria) => {
    const gasto = gastos[categoria] || 0;
    const limite = Number(orcamentos[categoria]) || 0;

    limiteTotal += limite;
    if (limite > 0) gastoComLimite += gasto;

    const percentual = limite ? gasto / limite * 100 : 0;
    const estado = !limite
      ? ""
      : percentual > 100
        ? "estourou"
        : percentual >= 80
          ? "atencao"
          : "";

    const item = document.createElement("div");
    item.className = "orc-linha";

    const topo = document.createElement("div");
    topo.className = "orc-topo";

    const nome = document.createElement("strong");
    nome.textContent = categoria;

    const label = document.createElement("label");
    label.className = "orc-campo";
    label.textContent = "Limite mensal (R$)";

    const campo = document.createElement("input");
    campo.type = "number";
    campo.min = "0";
    campo.step = "0.01";
    campo.placeholder = "Sem limite";
    campo.setAttribute("aria-label", `Limite mensal para ${categoria}`);
    campo.value = limite || "";

    campo.addEventListener("change", () => {
      const valor = lerNumero(campo.value || "0");

      if (!Number.isFinite(valor) || valor < 0) {
        alert("Informe um limite válido.");
        campo.value = limite || "";
        return;
      }

      if (valor > 0) {
        orcamentos[categoria] = valor;
      } else {
        delete orcamentos[categoria];
      }

      salvar();
      renderizarOrcamentos();
    });

    label.appendChild(campo);
    topo.append(nome, label);

    const trilho = document.createElement("div");
    trilho.className = "trilho";

    const preenchido = document.createElement("div");
    preenchido.className = `preenchido ${estado}`;
    preenchido.style.width = `${limite ? Math.min(percentual, 100) : 0}%`;
    trilho.appendChild(preenchido);

    const detalhe = document.createElement("small");

    if (!limite) {
      detalhe.textContent = `${moeda(gasto)} gastos · Defina um limite para acompanhar.`;
    } else if (percentual > 100) {
      detalhe.textContent = `${moeda(gasto)} gastos · Limite ultrapassado em ${moeda(gasto - limite)}.`;
    } else {
      detalhe.textContent = `${moeda(gasto)} gastos · Restam ${moeda(limite - gasto)} (${Math.round(percentual)}% utilizado).`;
    }

    item.append(topo, trilho, detalhe);
    lista.appendChild(item);
  });

  $("orc-resumo").textContent = limiteTotal
    ? `Limites definidos: ${moeda(limiteTotal)} · Gastos nas categorias com limite: ${moeda(gastoComLimite)}`
    : "Defina limites por categoria para acompanhar seus gastos.";
}

/* EXPORTAÇÃO CSV */

function exportarCSV() {
  const lista = movimentacoesDoRelatorio();

  if (!lista.length) {
    alert("Não há movimentações para exportar neste período.");
    return;
  }

  const linhas = [
    ["Data", "Descrição", "Categoria", "Tipo", "Valor"],
    ...lista
      .slice()
      .sort(ORDENS.recentes)
      .map((m) => [
        dataBR(m.data),
        m.descricao,
        m.categoria,
        m.tipo,
        m.valor.toFixed(2).replace(".", ",")
      ])
  ];

  const csv = linhas
    .map((linha) =>
      linha.map((valor) =>
        `"${String(valor).replace(/"/g, '""')}"`
      ).join(";")
    )
    .join("\r\n");

  const arquivo = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = `aurea-relatorio-${hoje()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ATUALIZAÇÃO GERAL */

function renderizar() {
  renderizarPainel();
  renderizarMetas();
  renderizarRelatorios();
  renderizarOrcamentos();
}

/* EVENTOS: NAVEGAÇÃO */

document.querySelectorAll("[data-tela]").forEach((botao) => {
  botao.addEventListener("click", () => {
    const destino = botao.dataset.tela;

    if (destino === "cadastro" && !editandoId) {
      limparFormulario();
    }

    mostrarTela(destino);
  });
});

/* EVENTOS: MOVIMENTAÇÕES */

$("tipo").addEventListener("change", () => {
  const tipo = $("tipo").value;

  criarOpcoes(
    $("categoria"),
    "Selecione uma categoria",
    CATEGORIAS[tipo] || []
  );

  $("ajuda").textContent = tipo
    ? "Selecione a categoria que representa a movimentação."
    : "Escolha primeiro o tipo de movimentação.";
});

$("form").addEventListener("reset", () => {
  setTimeout(() => {
    editandoId = null;
    $("data").value = hoje();
    $("form-titulo").textContent = "Nova movimentação";
    $("salvar").textContent = "Salvar movimentação";
    criarOpcoes($("categoria"), "Escolha primeiro o tipo", []);
    $("ajuda").textContent = "Escolha primeiro o tipo de movimentação.";
    avisar("");
  }, 0);
});

$("form").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const dados = {
    descricao: $("descricao").value.trim(),
    valor: lerNumero($("valor").value),
    data: $("data").value,
    tipo: $("tipo").value,
    categoria: $("categoria").value
  };

  if (
    !dados.descricao ||
    !Number.isFinite(dados.valor) ||
    dados.valor <= 0 ||
    !dados.data ||
    !dados.tipo ||
    !dados.categoria ||
    !CATEGORIAS[dados.tipo]?.includes(dados.categoria)
  ) {
    avisar("Preencha todos os campos corretamente.", true);
    return;
  }

  const editou = editandoId !== null;

  if (editou) {
    movimentacoes = movimentacoes.map((m) =>
      m.id === editandoId ? { ...m, ...dados } : m
    );
  } else {
    movimentacoes.push({ id: proximoId++, ...dados });
  }

  salvar();
  limparFormulario();
  renderizar();
  mostrarTela("painel");

  // Mensagem breve depois de voltar ao painel.
  $("contador").textContent = editou
    ? "Movimentação atualizada com sucesso."
    : "Movimentação cadastrada com sucesso.";
});

["busca", "filtro-tipo", "filtro-mes", "ordem"].forEach((id) => {
  $(id).addEventListener("input", renderizarPainel);
});

$("filtro-categoria").addEventListener("change", renderizarPainel);

$("limpar-filtros").addEventListener("click", () => {
  $("busca").value = "";
  $("filtro-tipo").value = "Todos";
  $("filtro-categoria").value = "Todas";
  $("filtro-mes").value = "";
  $("ordem").value = "recentes";
  renderizarPainel();
});

$("lista").addEventListener("click", (evento) => {
  const editar = evento.target.closest("[data-editar]");

  if (editar) {
    const meta = movimentacoes.find((m) => m.id === Number(editar.dataset.editar));
    if (!meta) return;

    limparFormulario();

    editandoId = meta.id;
    $("tipo").value = meta.tipo;

    criarOpcoes(
      $("categoria"),
      "Selecione uma categoria",
      CATEGORIAS[meta.tipo],
      meta.categoria
    );

    $("descricao").value = meta.descricao;
    $("valor").value = meta.valor;
    $("data").value = meta.data;
    $("ajuda").textContent = "Selecione a categoria que representa a movimentação.";
    $("form-titulo").textContent = "Editar movimentação";
    $("salvar").textContent = "Salvar alterações";

    mostrarTela("cadastro");
    return;
  }

  const excluir = evento.target.closest("[data-excluir]");
  if (!excluir) return;

  const id = Number(excluir.dataset.excluir);
  const item = movimentacoes.find((m) => m.id === id);

  if (!item || !confirm(`Deseja excluir a movimentação "${item.descricao}"?`)) return;

  movimentacoes = movimentacoes.filter((m) => m.id !== id);
  salvar();
  renderizar();
});

/* EVENTOS: METAS */

$("nova-meta").addEventListener("click", () => abrirFormularioMeta());

$("meta-cancelar").addEventListener("click", () => {
  $("meta-form-card").hidden = true;
  editandoMetaId = null;
  $("meta-form").reset();
  avisarMeta("");
});

$("meta-form").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nome = $("meta-nome").value.trim();
  const alvo = lerNumero($("meta-alvo").value);
  const atual = lerNumero($("meta-atual").value);
  const prazo = $("meta-prazo").value;

  if (
    !nome ||
    !Number.isFinite(alvo) ||
    alvo <= 0 ||
    !Number.isFinite(atual) ||
    atual < 0
  ) {
    avisarMeta("Informe um nome e valores válidos.", true);
    return;
  }

  if (prazo && prazo < hoje()) {
    const confirmarPrazo = confirm(
      "O prazo escolhido já passou. Deseja manter essa data?"
    );
    if (!confirmarPrazo) return;
  }

  const dados = { nome, alvo, atual, prazo };

  if (editandoMetaId !== null) {
    metas = metas.map((m) =>
      m.id === editandoMetaId ? { ...m, ...dados } : m
    );
  } else {
    metas.push({ id: proximaMetaId++, ...dados });
  }

  salvar();
  $("meta-form-card").hidden = true;
  editandoMetaId = null;
  $("meta-form").reset();
  renderizar();
});

$("metas-lista").addEventListener("click", (evento) => {
  const botaoAporte = evento.target.closest("[data-aporte]");

  if (botaoAporte) {
    adicionarAporte(Number(botaoAporte.dataset.aporte));
    return;
  }

  const botaoEditar = evento.target.closest("[data-editar-meta]");

  if (botaoEditar) {
    const meta = metas.find((m) => m.id === Number(botaoEditar.dataset.editarMeta));
    if (meta) abrirFormularioMeta(meta);
    return;
  }

  const botaoExcluir = evento.target.closest("[data-excluir-meta]");
  if (!botaoExcluir) return;

  const id = Number(botaoExcluir.dataset.excluirMeta);
  const meta = metas.find((m) => m.id === id);

  if (!meta || !confirm(`Deseja excluir a meta "${meta.nome}"?`)) return;

  metas = metas.filter((m) => m.id !== id);

  if (editandoMetaId === id) {
    editandoMetaId = null;
    $("meta-form-card").hidden = true;
  }

  salvar();
  renderizarMetas();
});

/* EVENTOS: RELATÓRIOS E ORÇAMENTOS */

$("rel-mes").value = mesAtual();
$("rel-mes").addEventListener("change", renderizarRelatorios);

$("rel-todos").addEventListener("click", () => {
  $("rel-mes").value = "";
  renderizarRelatorios();
});

$("btn-csv").addEventListener("click", exportarCSV);
$("orc-mes").value = mesAtual();
$("orc-mes").addEventListener("change", renderizarOrcamentos);

$("btn-apagar").addEventListener("click", () => {
  if (
    !movimentacoes.length &&
    !metas.length &&
    !Object.keys(orcamentos).length
  ) {
    alert("Não existem dados para apagar.");
    return;
  }

  const confirmar = confirm(
    "Apagar todas as movimentações, metas e limites de orçamento? Essa ação não pode ser desfeita."
  );

  if (!confirmar) return;

  movimentacoes = [];
  metas = [];
  orcamentos = {};
  proximoId = 1;
  proximaMetaId = 1;
  editandoId = null;
  editandoMetaId = null;

  salvar();
  limparFormulario();
  $("meta-form").reset();
  $("meta-form-card").hidden = true;
  renderizar();

  alert("Os dados locais do Áurea foram apagados.");
});

/* INICIALIZAÇÃO */

carregar();
$("data").value = hoje();
$("rel-mes").value = mesAtual();
$("orc-mes").value = mesAtual();
renderizar();
