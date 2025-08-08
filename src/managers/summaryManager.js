// managers/summaryManager.js

export class SummaryManager {
  constructor(lancamentos, config, firebaseUtils) {
    this.lancamentos = lancamentos;
    this.config = config;
    this.firebaseUtils = firebaseUtils;
  }

  updateMonthlySummary(currentMonth, currentYear) {
    // Filtrar lançamentos por mês e ano
    const lancamentosFiltrados = this.lancamentos.filter(
      (l) =>
        currentMonth === 0 ||
        (l.month === currentMonth && l.year === currentYear)
    );

    // Filtrar apenas trades (excluindo depósitos e saques)
    const trades = lancamentosFiltrados.filter((l) => l.tipo === "trade");

    const totalTrades = trades.length;

    const tradesPositivos = trades.filter((l) => l.valorLiquido > 0).length;
    const taxaSucesso =
      totalTrades > 0 ? (tradesPositivos / totalTrades) * 100 : 0;

    const ganhoPerda = trades.reduce(
      (total, l) => total + (l.valorLiquido || 0),
      0
    );

    const valores = trades.map((l) => l.valorLiquido ?? 0);

    const ganhos = valores.filter((v) => v > 0);
    const perdas = valores.filter((v) => v < 0);

    const maiorGanho = ganhos.length > 0 ? Math.max(...ganhos) : 0;
    const maiorPerda = perdas.length > 0 ? Math.min(...perdas) : 0;

    const mediaTrade =
      totalTrades > 0
        ? trades.reduce((sum, l) => sum + (l.valorLiquido || 0), 0) /
          totalTrades
        : 0;

    // Atualizar valores no DOM
    document.getElementById("ganho-perda-mes").textContent =
      this.firebaseUtils.formatCurrency(ganhoPerda);
    document.getElementById("total-trades").textContent = totalTrades;
    document.getElementById(
      "taxa-sucesso"
    ).textContent = `${taxaSucesso.toFixed(1)}%`;
    document.getElementById("maior-ganho").textContent =
      this.firebaseUtils.formatCurrency(maiorGanho);
    document.getElementById("maior-perda").textContent =
      this.firebaseUtils.formatCurrency(maiorPerda);
    document.getElementById("media-trade").textContent =
      this.firebaseUtils.formatCurrency(mediaTrade);

    // Aplicar classes de cor
    const ganhoElement = document.getElementById("ganho-perda-mes");
    ganhoElement.className =
      "display-value " + (ganhoPerda >= 0 ? "positive" : "negative");

    const maiorGanhoElement = document.getElementById("maior-ganho");
    maiorGanhoElement.className = "display-value positive";

    const maiorPerdaElement = document.getElementById("maior-perda");
    maiorPerdaElement.className = "display-value negative";

    // Mostrar/ocultar mensagem de dados vazios (apenas para trades)
    const mensagemElement = document.getElementById("mensagem-sem-dados");
    mensagemElement.style.display = totalTrades === 0 ? "block" : "none";
  }

  // Funções de cálculo que serão usadas por outras partes do código
  getTotalGanhoPerdaSemFiltro() {
    return this.lancamentos.reduce(
      (acc, curr) => acc + (curr.valorLiquido || 0),
      0
    );
  }
}
