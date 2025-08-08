// Gerenciador de Risco Day Trade - Aplicação Principal
import { ConfigManager } from "./managers/configManager.js";
import { DataService } from "./services/dataService.js";

import * as firebaseUtils from "./services/firebaseUtils.js";
import { SummaryManager } from "./managers/summaryManager.js";

// Inicializa o Firebase
class DayTradeManager {
  constructor() {
    this.userId = firebaseUtils.getUserId();
    this.config = {
      aporteInicial: 0,
      riscoDiario: 0,
      riscoMensal: 0,
      percentualTrade: 0,
      taxaWdo: 0,
      taxaWin: 0,
      taxaBit: 0,
      deposito: 0,
      saque: 0,
    };
    this.userName = "";
    this.historicoTaxas = [];
    this.lancamentos = [];
    this.currentMonth = new Date().getMonth() + 1;
    this.currentYear = new Date().getFullYear();

    this.configManager = new ConfigManager(
      this.userId,
      this.config,
      firebaseUtils
    );
    this.dataService = new DataService(this.userId);
    this.summaryManager = new SummaryManager(
      this.lancamentos,
      this.config,
      firebaseUtils
    );
    // this.chartManager = new ChartManager(
    //   this.lancamentos,
    //   this.config,
    //   firebaseUtils
    // ); // Adicione este construtor para a classe de gráficos

  }

  async init() {
    try {
      document.getElementById("user-id").textContent = this.userId;
      await this.loadConfig(); // <-- CORREÇÃO: Chamada correta para carregar e exibir a config.
      this.historicoTaxas = await this.dataService.carregarHistoricoTaxas();
      await this.carregarTaxasMaisRecentes();
      this.userName = await this.dataService.loadUserName();

      // Carrega os lançamentos
      this.lancamentos = await this.dataService.loadLancamentos(
        this.currentYear
      );
      this.reordenarLancamentos();

      // CORREÇÃO: Atualiza as listas de lançamentos nas classes de gerenciamento
      this.summaryManager.lancamentos = this.lancamentos;
      //this.chartManager.lancamentos = this.lancamentos;

      this.setupEventListeners();
      this.updateUserNameDisplay();
      this.calculateValues();
      this.updateUI();
      this.updateMonthSelector();
      firebaseUtils.showNotification(
        "Aplicação carregada com sucesso!",
        "success"
      );
    } catch (error) {
      console.error("Erro ao inicializar:", error);
      firebaseUtils.showNotification("Erro ao carregar dados", "error");
    }
  }

  setupEventListeners() {
    document.getElementById("aporte-inicial").addEventListener("input", (e) => {
      this.config.aporteInicial = parseFloat(e.target.value) || 0;
      this.calculateValues();
    });
    document.getElementById("risco-diario").addEventListener("input", (e) => {
      this.config.riscoDiario = parseFloat(e.target.value) || 0;
      this.calculateValues();
    });
    document.getElementById("risco-mensal").addEventListener("input", (e) => {
      this.config.riscoMensal = parseFloat(e.target.value) || 0;
      this.calculateValues();
    });
    document
      .getElementById("percentual-trade")
      .addEventListener("input", (e) => {
        this.config.percentualTrade = parseFloat(e.target.value) || 0;
        this.calculateValues();
      });
    document.getElementById("taxa-wdo").addEventListener("input", (e) => {
      this.config.taxaWdo = parseFloat(e.target.value) || 0;
      this.calculateValues();
    });
    document.getElementById("taxa-win").addEventListener("input", (e) => {
      this.config.taxaWin = parseFloat(e.target.value) || 0;
      this.calculateValues();
    });
    document.getElementById("taxa-bit").addEventListener("input", (e) => {
      this.config.taxaBit = parseFloat(e.target.value) || 0;
      this.calculateValues();
    });
    document.getElementById("deposito").addEventListener("input", (e) => {
      this.config.deposito = parseFloat(e.target.value) || 0;
      this.calculateValues(); // <--- CORRIGIDO: Adicionado para atualizar o saldo
    });
    document.getElementById("saque").addEventListener("input", (e) => {
      this.config.saque = parseFloat(e.target.value) || 0;
      this.calculateValues(); // <--- CORRIGIDO: Adicionado para atualizar o saldo
    });
    document.getElementById("salvar-config").addEventListener("click", () => {
      this.configManager.saveConfig();
    });
    document
      .getElementById("executar-operacao")
      .addEventListener("click", () => {
        this.executarOperacao();
      });
    document
      .getElementById("adicionar-lancamento")
      .addEventListener("click", () => {
        this.salvarLancamento();
      });
    const hoje = new Date();
    const dataLocal =
      hoje.getFullYear() +
      "-" +
      String(hoje.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(hoje.getDate()).padStart(2, "0");
    document.getElementById("data").value = dataLocal;
    document
      .getElementById("month-selector")
      .addEventListener("change", async (e) => {
        this.currentMonth = parseInt(e.target.value);
        // Apenas renderiza a UI com o novo filtro, sem recarregar do banco
        this.updateUI();
        this.calculateValues();
      });
    document.getElementById("tipo-wdo").addEventListener("change", () => {
      document.getElementById("quantidade-win").value = "";
      this.calcularValorLiquido();
    });
    document.getElementById("tipo-win").addEventListener("change", () => {
      document.getElementById("quantidade-wdo").value = "";
      this.calcularValorLiquido();
    });
    document.getElementById("tipo-bit").addEventListener("change", () => {
      document.getElementById("quantidade-bit").value = "";
      this.calcularValorLiquido();
    });
    document.getElementById("quantidade-wdo").addEventListener("input", () => {
      this.calcularValorLiquido();
    });
    document.getElementById("quantidade-win").addEventListener("input", () => {
      this.calcularValorLiquido();
    });

    document.getElementById("quantidade-bit").addEventListener("input", () => {
      this.calcularValorLiquido();
    });
    document.getElementById("resultado").addEventListener("input", () => {
      this.calcularValorLiquido();
    });
    document.getElementById("data").addEventListener("change", () => {
      this.calcularValorLiquido();
    });
    document.getElementById("salvar-taxas").addEventListener("click", () => {
      this.salvarTaxasAtuais();
    });

    // Adiciona o evento de clique para editar o nome do usuário
    document.getElementById("user-name-display").addEventListener("click", () => {
      this.editUserName();
    });
  }

  async salvarTaxasAtuais() {
    const hoje = new Date();
    const dataAtual = hoje.toISOString().split("T")[0]; // YYYY-MM-DD

    // Verificar se já existe uma entrada para hoje
    const entradaExistente = this.historicoTaxas.find(
      (entrada) => entrada.data === dataAtual
    );

    const taxasAtuais = {
      data: dataAtual,
      taxaWdo: this.config.taxaWdo,
      taxaWin: this.config.taxaWin,
      taxaBit: this.config.taxaBit,
      createdAt: new Date(),
    };

    try {
      if (entradaExistente) {
        // Atualizar entrada existente
        await firebaseUtils.db
          .collection("users")
          .doc(this.userId)
          .collection("historicoTaxas")
          .doc(entradaExistente.id)
          .update(taxasAtuais);

        // Atualizar local
        const index = this.historicoTaxas.findIndex(
          (entrada) => entrada.id === entradaExistente.id
        );
        this.historicoTaxas[index] = { ...entradaExistente, ...taxasAtuais };
      } else {
        // Criar nova entrada
        const docRef = await firebaseUtils.db
          .collection("users")
          .doc(this.userId)
          .collection("historicoTaxas")
          .add(taxasAtuais);

        // Adicionar à lista local
        this.historicoTaxas.push({
          id: docRef.id,
          ...taxasAtuais,
        });
      }

      firebaseUtils.showNotification("Taxas salvas com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar taxas:", error);
      firebaseUtils.showNotification("Erro ao salvar taxas", "error");
    }
  }

  async carregarHistoricoTaxas() {
    try {
      const snapshot = await firebaseUtils.db
        .collection("users")
        .doc(this.userId)
        .collection("historicoTaxas")
        .orderBy("data", "desc")
        .get();

      this.historicoTaxas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Histórico de taxas carregado:", this.historicoTaxas);
    } catch (error) {
      console.error("Erro ao carregar histórico de taxas:", error);
    }
  }

  obterTaxasPorData(data) {
    // Buscar a entrada mais recente até a data especificada
    const entradaTaxa = this.historicoTaxas
      .filter((entrada) => entrada.data <= data)
      .sort((a, b) => new Date(b.data) - new Date(a.data))[0];

    if (entradaTaxa) {
      return {
        taxaWdo: entradaTaxa.taxaWdo || 0,
        taxaWin: entradaTaxa.taxaWin || 0,
        taxaBit: entradaTaxa.taxaBit || 0, // A correção está aqui
      };
    }

    // Retornar taxas atuais se não encontrar histórico
    return {
      taxaWdo: this.config.taxaWdo,
      taxaWin: this.config.taxaWin,
      taxaBit: this.config.taxaBit,
    };
  }

  async carregarTaxasMaisRecentes() {
    if (this.historicoTaxas.length > 0) {
      // Ordenar por data e pegar a mais recente
      const taxasMaisRecentes = this.historicoTaxas.sort(
        (a, b) => new Date(b.data) - new Date(a.data)
      )[0];

      // Atualizar config com as taxas mais recentes
      this.config.taxaWdo = taxasMaisRecentes.taxaWdo;
      this.config.taxaWin = taxasMaisRecentes.taxaWin;
      this.config.taxaBit = taxasMaisRecentes.taxaBit;

      // Atualizar inputs
      document.getElementById("taxa-wdo").value = this.config.taxaWdo;
      document.getElementById("taxa-win").value = this.config.taxaWin;
      document.getElementById("taxa-bit").value = this.config.taxaBit;
    }
  }

  calcularValorLiquido() {
    const resultadoBruto =
      parseFloat(document.getElementById("resultado").value) || 0;
    const isWdo = document.getElementById("tipo-wdo").checked;
    const isWin = document.getElementById("tipo-win").checked;
    const isBit = document.getElementById("tipo-bit").checked;
    const dataSelecionada = document.getElementById("data").value;

    let quantidadeContratos = 0;
    let taxaContrato = 0;

    // Obter taxas da data selecionada (ou atuais se não houver histórico)
    const taxasData = this.obterTaxasPorData(dataSelecionada);

    if (isWdo) {
      quantidadeContratos =
        parseInt(document.getElementById("quantidade-wdo").value) || 0;
      taxaContrato = taxasData.taxaWdo;
    } else if (isWin) {
      quantidadeContratos =
        parseInt(document.getElementById("quantidade-win").value) || 0;
      taxaContrato = taxasData.taxaWin;
    } else if (isBit) {
      quantidadeContratos =
        parseInt(document.getElementById("quantidade-bit").value) || 0;
      taxaContrato = taxasData.taxaBit;
    }

    const custoContratos = quantidadeContratos * taxaContrato;
    const valorLiquido = resultadoBruto - custoContratos;

    return valorLiquido;
  }

  calculateValues() {
    // Calculando o total dos lançamentos (trades, depósitos e saques)
    const totalLancamentos = this.lancamentos.reduce((acc, lancamento) => {
      if (lancamento.tipo === "deposito") {
        return acc + lancamento.resultado;
      } else if (lancamento.tipo === "saque") {
        return acc + lancamento.resultado; // Saques já são armazenados como valores negativos
      } else {
        return acc + (lancamento.valorLiquido || 0);
      }
    }, 0);

    const saldoTotal = this.config.aporteInicial + totalLancamentos;
    const valorPermitido = (saldoTotal * this.config.percentualTrade) / 100;

    // Atualizar displays
    document.getElementById("saldo-atual").textContent =
      firebaseUtils.formatCurrency(saldoTotal);
    document.getElementById("valor-permitido").textContent =
      firebaseUtils.formatCurrency(valorPermitido);

    // Aplicar classes de cor ao saldo atual
    const saldoElement = document.getElementById("saldo-atual");
    saldoElement.className =
      "display-value " + (saldoTotal >= 0 ? "positive" : "negative");

    // Aplicar classes de cor ao valor permitido
    const valorElement = document.getElementById("valor-permitido");
    const percentualPermitido = (valorPermitido / saldoTotal) * 100;

    let classeCor = "negative";
    if (percentualPermitido < 3) {
      classeCor = "positive";
    } else if (percentualPermitido <= 6) {
      classeCor = "warning";
    } else {
      classeCor = "negative";
    }

    valorElement.className = "display-value " + classeCor;
  }

  getMonthNumber(monthName) {
    const months = {
      janeiro: 1,
      fevereiro: 2,
      marco: 3,
      abril: 4,
      maio: 5,
      junho: 6,
      julho: 7,
      agosto: 8,
      setembro: 9,
      outubro: 10,
      novembro: 11,
      dezembro: 12,
    };
    return months[monthName] || 1;
  }

  getMonthName(monthNumber) {
    const months = [
      "",
      "janeiro",
      "fevereiro",
      "marco",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];
    return months[monthNumber] || "janeiro";
  }

  // Função para editar nome do usuário
  editUserName() {
    const currentName = this.userName || "Trader";
    const newName = prompt("Digite seu nome:", currentName);

    // Salva apenas se o nome for válido e diferente do atual
    if (newName && newName.trim() !== "" && newName.trim() !== currentName) {
      this.userName = newName.trim();
      this.dataService.saveUserName(this.userName); // <-- CORREÇÃO: Chama o DataService
      this.updateUserNameDisplay();
      firebaseUtils.showNotification("Nome atualizado com sucesso!", "success");
    }
  }

  // Função para atualizar exibição do nome
  updateUserNameDisplay() {
    const displayElement = document.getElementById("user-name-display");
    if (displayElement) {
      displayElement.textContent = this.userName || "Trader - ";
    }
  }

  async saveConfig() {
    try {
      const configRef = firebaseUtils.db
        .collection("users")
        .doc(this.userId)
        .collection("config");

      await configRef.doc("settings").set({
        aporteInicial: this.config.aporteInicial,
        riscoDiario: this.config.riscoDiario,
        riscoMensal: this.config.riscoMensal,
        percentualTrade: this.config.percentualTrade,
        taxaWdo: this.config.taxaWdo,
        taxaWin: this.config.taxaWin,
        taxaBit: this.config.taxaBit,
        updatedAt: new Date(),
      });

      firebaseUtils.showNotification(
        "Configurações salvas com sucesso!",
        "success"
      );
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      firebaseUtils.showNotification("Erro ao salvar configurações", "error");
    }
  }

  async loadConfig() {
    try {
      const configRef = firebaseUtils.db
        .collection("users")
        .doc(this.userId)
        .collection("config");
      const doc = await configRef.doc("settings").get();

      if (doc.exists) {
        const data = doc.data();
        this.config = {
          aporteInicial: data.aporteInicial || 0,
          riscoDiario: data.riscoDiario || 0,
          riscoMensal: data.riscoMensal || 0,
          percentualTrade: data.percentualTrade || 0,
          taxaWdo: data.taxaWdo || 0,
          taxaWin: data.taxaWin || 0,
          taxaBit: data.taxaBit || 0,
        };

        // Atualizar inputs
        document.getElementById("aporte-inicial").value =
          this.config.aporteInicial;
        document.getElementById("risco-diario").value = this.config.riscoDiario;
        document.getElementById("risco-mensal").value = this.config.riscoMensal;
        document.getElementById("percentual-trade").value =
          this.config.percentualTrade;
        document.getElementById("taxa-wdo").value = this.config.taxaWdo;
        document.getElementById("taxa-win").value = this.config.taxaWin;
        document.getElementById("taxa-bit").value = this.config.taxaBit;
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      // Usar valores padrão se houver erro
    }
  }

  async salvarLancamento() {
    const data = document.getElementById("data").value;
    const resultado = parseFloat(document.getElementById("resultado").value);

    if (!data) {
      firebaseUtils.showNotification(
        "Por favor, selecione uma data",
        "warning"
      );
      return;
    }

    // Verificar se a data não é futura (usando data local)
    const dataSelecionada = new Date(data + "T00:00:00");
    const hoje = new Date();
    const hojeLocal = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate()
    );

    if (dataSelecionada > hojeLocal) {
      firebaseUtils.showNotification(
        "Não é permitido adicionar lançamentos com data futura",
        "error"
      );
      return;
    }

    if (!firebaseUtils.isValidNumber(resultado)) {
      firebaseUtils.showNotification(
        "Por favor, insira um resultado válido",
        "warning"
      );
      return;
    }

    // Verificar se pelo menos um tipo foi selecionado
    const isWdo = document.getElementById("tipo-wdo").checked;
    const isWin = document.getElementById("tipo-win").checked;
    const isBit = document.getElementById("tipo-bit").checked;

    if (!isWdo && !isWin && !isBit) {
      firebaseUtils.showNotification(
        "Por favor, selecione WDO ou WIN ou BIT",
        "warning"
      );
      return;
    }

    // Verificar se a quantidade de contratos foi preenchida
    let quantidadeContratos = 0;
    let taxaContrato = 0;

    if (isWdo) {
      quantidadeContratos =
        parseInt(document.getElementById("quantidade-wdo").value) || 0;
      taxaContrato = parseFloat(document.getElementById("taxa-wdo").value) || 0;
    } else if (isWin) {
      quantidadeContratos =
        parseInt(document.getElementById("quantidade-win").value) || 0;
      taxaContrato = parseFloat(document.getElementById("taxa-win").value) || 0;
    } else if (isBit) {
      quantidadeContratos =
        parseInt(document.getElementById("quantidade-bit").value) || 0;
      taxaContrato = parseFloat(document.getElementById("taxa-bit").value) || 0;
    }

    if (quantidadeContratos <= 0) {
      firebaseUtils.showNotification(
        "Por favor, insira a quantidade de contratos",
        "warning"
      );
      return;
    }

    if (taxaContrato <= 0) {
      firebaseUtils.showNotification(
        "Por favor, insira o valor da taxa do contrato",
        "warning"
      );
      return;
    }

    try {
      const valorLiquido = this.calcularValorLiquido();

      // Obter taxas da data do lançamento
      const taxasData = this.obterTaxasPorData(data);

      // Extrair mês e ano da data do lançamento de forma segura
      const [yearFromData, monthFromData] = data.split("-").map(Number);

      // Extrair mês da data do lançamento
      const lancamento = {
        data: data,
        resultado: resultado, // Valor bruto
        valorLiquido: valorLiquido, // Valor líquido
        tipo: "trade",
        subtipo: isWdo ? "WDO" : isWin ? "WIN" : "BIT",
        quantidadeContratos: quantidadeContratos,
        taxaContrato: isWdo
          ? taxasData.taxaWdo
          : isWin
          ? taxasData.taxaWin
          : taxasData.taxaBit,
        createdAt: new Date(),
        month: monthFromData,
        year: yearFromData,
      };

      // Salvar no Firebase
      const lancamentoRef = firebaseUtils.db
        .collection("users")
        .doc(this.userId)
        .collection("lancamentos");

      if (this.lancamentoEditandoId) {
        // MODO EDIÇÃO: Atualiza o lançamento existente
        await lancamentoRef.doc(this.lancamentoEditandoId).update(lancamento);
        const index = this.lancamentos.findIndex(
          (l) => l.id === this.lancamentoEditandoId
        );
        if (index !== -1) {
          this.lancamentos[index] = { id: this.lancamentoEditandoId, ...lancamento };
        }
        firebaseUtils.showNotification("Lançamento atualizado com sucesso!", "success");
        this.lancamentoEditandoId = null; // Reseta o modo de edição
      } else {
        // MODO ADIÇÃO: Cria um novo lançamento
        const docRef = await lancamentoRef.add(lancamento);
        lancamento.id = docRef.id;
        this.lancamentos.push(lancamento);
        firebaseUtils.showNotification("Lançamento adicionado com sucesso!", "success");
      }

      // Reordenar lista
      this.reordenarLancamentos();

      // Atualizar lista usada pelo resumo
      this.summaryManager.lancamentos = this.lancamentos;

      // Limpar campos do formulário
      document.getElementById("resultado").value = "";
      document.getElementById("quantidade-wdo").value = "";
      document.getElementById("quantidade-win").value = "";
      document.getElementById("quantidade-bit").value = "";

      // Resetar a data para o dia atual, conforme solicitado
      const hoje = new Date();
      const dataLocal =
        hoje.getFullYear() +
        "-" +
        String(hoje.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(hoje.getDate()).padStart(2, "0");
      document.getElementById("data").value = dataLocal;

      // Resetar radio buttons para o padrão (WDO marcado)
      document.getElementById("tipo-wdo").checked = true;
      document.getElementById("tipo-win").checked = false;
      document.getElementById("tipo-bit").checked = false;

      // Resetar botão para o modo "Adicionar"
      const botao = document.getElementById("adicionar-lancamento");
      botao.innerHTML = '<i class="fas fa-plus"></i> Adicionar Lançamento';
      botao.classList.remove("btn-warning");
      botao.classList.add("btn-primary");

      // Atualizar interface
      this.updateUI();
      this.calculateValues();
    } catch (error) {
      console.error("Erro ao adicionar lançamento:", error);
      firebaseUtils.showNotification("Erro ao adicionar lançamento", "error");
    }
  }

  async deleteLancamento(lancamentoId) {
    const confirmacao = confirm("Tem certeza que deseja remover este lançamento?");
    if (!confirmacao) {
      return; // Se o usuário clicar em "Cancelar", a função para aqui.
    }

    try {
      await firebaseUtils.db
        .collection("users")
        .doc(this.userId)
        .collection("lancamentos")
        .doc(lancamentoId)
        .delete();

      // Remover da lista local
      this.lancamentos = this.lancamentos.filter((l) => l.id !== lancamentoId);

      // Atualizar lista usada pelo resumo
      this.summaryManager.lancamentos = this.lancamentos;

      // Reordenar lista
      this.reordenarLancamentos();

      this.updateUI();
      this.calculateValues();

      firebaseUtils.showNotification(
        "Lançamento removido com sucesso!",
        "success"
      );
    } catch (error) {
      console.error("Erro ao deletar lançamento:", error);
      firebaseUtils.showNotification("Erro ao remover lançamento", "error");
    }
  }

  editarLancamento(id) {
    const lancamento = this.lancamentos.find((l) => l.id === id);
    if (!lancamento) {
      firebaseUtils.showNotification("Lançamento não encontrado.", "error");
      return;
    }

    // Preencher os campos do formulário com os dados do lançamento
    document.getElementById("data").value = lancamento.data;
    document.getElementById("resultado").value = lancamento.resultado;
    document.getElementById("quantidade-wdo").value = "";
    document.getElementById("quantidade-win").value = "";
    document.getElementById("quantidade-bit").value = "";

    const subtipo = lancamento.subtipo?.toLowerCase();
    if (subtipo === "wdo") {
      document.getElementById("tipo-wdo").checked = true;
      document.getElementById("quantidade-wdo").value = lancamento.quantidadeContratos || 0;
    } else if (subtipo === "win") {
      document.getElementById("tipo-win").checked = true;
      document.getElementById("quantidade-win").value = lancamento.quantidadeContratos || 0;
    } else if (subtipo === "bit") {
      document.getElementById("tipo-bit").checked = true;
      document.getElementById("quantidade-bit").value = lancamento.quantidadeContratos || 0;
    }

    // Ativar modo de edição
    this.lancamentoEditandoId = id;

    // Mudar a aparência e texto do botão
    const botao = document.getElementById("adicionar-lancamento");
    botao.innerHTML = '<i class="fas fa-save"></i> Salvar Lançamento';
    botao.classList.add("btn-warning"); // Adiciona a cor de "aviso"
    botao.classList.remove("btn-primary");

    firebaseUtils.showNotification("Modo de edição ativado.", "info");
  }

  reordenarLancamentos() {
    // Ordenar por data (decrescente) e depois por hora de criação (decrescente)
    this.lancamentos.sort((a, b) => {
      // Primeiro compara a data
      const dataA = new Date(a.data);
      const dataB = new Date(b.data);

      if (dataA.getTime() !== dataB.getTime()) {
        return dataB.getTime() - dataA.getTime(); // Decrescente
      }

      // Se a data for igual, compara pela hora de criação
      const horaA = a.createdAt.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt);
      const horaB = b.createdAt.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt);

      return horaB.getTime() - horaA.getTime(); // Decrescente
    });
  }

  updateMonthSelector() {
    const monthSelector = document.getElementById("month-selector");
    if (monthSelector) {
      // Mantém o mês atual selecionado
      monthSelector.value = this.currentMonth;

      // Atualiza o mês "selected" dinamicamente
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;

      // Remove 'selected' de todos os options
      Array.from(monthSelector.options).forEach((option) => {
        option.removeAttribute("selected");
      });

      // Marca o mês atual como selected
      const optionAtual = monthSelector.querySelector(
        `option[value="${mesAtual}"]`
      );
      if (optionAtual) {
        optionAtual.setAttribute("selected", "selected");
      }
    }
  }

  updateUI() {
    // Atualizar resumo do mês (correto)
    this.summaryManager.updateMonthlySummary(
      this.currentMonth,
      this.currentYear
    );
    // Atualizar gráficos
    this.updateCharts();

    const listaElement = document.getElementById("lista-lancamentos");
    listaElement.innerHTML = "";

    // Filtrar lançamentos por mês se não for "Todos os Meses"
    let lancamentosParaExibir = this.lancamentos;
    if (this.currentMonth !== 0) {
      lancamentosParaExibir = this.lancamentos.filter(
        (l) => l.month === this.currentMonth && l.year === this.currentYear
      );
    }

    if (lancamentosParaExibir.length === 0) {
      listaElement.innerHTML =
        '<p style="color: #6b7280; text-align: center; font-style: italic;">Nenhum lançamento para este mês.</p>';
    } else {
      lancamentosParaExibir.forEach((lancamento) => {
        const lancamentoElement = document.createElement("div");
        lancamentoElement.className = "lancamento-item";

        const isPositive = lancamento.resultado >= 0;
        const valorClass = isPositive ? "positive" : "negative";

        // Determinar o tipo de lançamento
        let tipoTexto = "Trade";
        let tipoIcon = "fas fa-chart-line";

        if (lancamento.tipo === "deposito") {
          tipoTexto = "Depósito";
          tipoIcon = "fas fa-arrow-up";
        } else if (lancamento.tipo === "saque") {
          tipoTexto = "Saque";
          tipoIcon = "fas fa-arrow-down";
        } else if (lancamento.tipo === "trade" && lancamento.subtipo) {
          tipoTexto = `Trade ${lancamento.subtipo}`;
          tipoIcon = "fas fa-chart-line";
        }

        // Determinar se deve mostrar valor líquido (apenas para trades)
        const mostrarValorLiquido =
          lancamento.tipo === "trade" && lancamento.valorLiquido !== undefined;
        const valorLiquidoClass =
          mostrarValorLiquido && lancamento.valorLiquido >= 0
            ? "positive"
            : "negative";

        lancamentoElement.innerHTML = `
            <div class="lancamento-info">
              <div class="lancamento-data">
                <i class="${tipoIcon}"></i>
                ${firebaseUtils.formatDate(lancamento.data)} - ${tipoTexto}
                ${
                  lancamento.quantidadeContratos
                    ? `(${lancamento.quantidadeContratos} contr.)`
                    : ""
                }
              </div>
              <div class="lancamento-valores">
                <div class="lancamento-valor bruto ${valorClass}">
                  Bruto: ${firebaseUtils.formatCurrency(lancamento.resultado)}
                </div>
                ${
                  mostrarValorLiquido
                    ? `
                <div class="lancamento-valor liquido ${valorLiquidoClass}">
                  Líquido: ${firebaseUtils.formatCurrency(
                    lancamento.valorLiquido
                  )}
                </div>
                `
                    : ""
                }
              </div>
            </div>
            <div class="lancamento-actions">
              <button class="btn-delete" onclick="dayTradeManager.deleteLancamento('${
                lancamento.id
              }')">
                <i class="fas fa-trash"></i>
              </button>
              <button class="btn-edit" onclick="dayTradeManager.editarLancamento('${lancamento.id}')">
                <i class="fas fa-pencil-alt"></i>
              </button>
            </div>
        `;

        listaElement.appendChild(lancamentoElement);
      });
    }
  }

  async executarOperacao() {
    const deposito = parseFloat(document.getElementById("deposito").value) || 0;
    const saque = parseFloat(document.getElementById("saque").value) || 0;
    if (deposito === 0 && saque === 0) {
      firebaseUtils.showNotification(
        "Por favor, insira um valor para depósito ou saque",
        "warning"
      );
      return;
    }
    if (deposito > 0 && saque > 0) {
      firebaseUtils.showNotification(
        "Não é possível fazer depósito e saque simultaneamente",
        "error"
      );
      return;
    }
    try {
      let valor = 0;
      let tipo = "";
      if (deposito > 0) {
        valor = deposito;
        tipo = "deposito";
      } else if (saque > 0) {
        valor = -saque; // Saque como valor negativo
        tipo = "saque";
      }
      // Criar lançamento para a operação
      const hoje = new Date();
      // Usar toLocaleDateString para garantir a data local
      const dataLocal = hoje
        .toLocaleDateString("pt-BR")
        .split("/")
        .reverse()
        .join("-");
      // Extrair mês da data da operação
      const [yearFromData, monthFromData, dayFromData] = dataLocal
        .split("-")
        .map(Number);
      const lancamento = {
        data: dataLocal,
        resultado: valor,
        tipo: tipo,
        createdAt: new Date(),
        month: monthFromData,
        year: yearFromData,
      };
      // Salvar no Firebase como lançamento
      const lancamentoRef = firebaseUtils.db
        .collection("users")
        .doc(this.userId)
        .collection("lancamentos");
      const docRef = await lancamentoRef.add(lancamento);
      // Adicionar à lista local
      lancamento.id = docRef.id;
      this.lancamentos.push(lancamento);
      // Reordenar lista
      this.reordenarLancamentos();
      // Limpar campos
      document.getElementById("deposito").value = "";
      document.getElementById("saque").value = "";
      this.config.deposito = 0;
      this.config.saque = 0;
      // Atualizar interface
      this.updateUI();
      this.calculateValues();
      const mensagem =
        tipo === "deposito"
          ? `Depósito de ${firebaseUtils.formatCurrency(
              deposito
            )} realizado com sucesso!`
          : `Saque de ${firebaseUtils.formatCurrency(
              saque
            )} realizado com sucesso!`;
      firebaseUtils.showNotification(mensagem, "success");
    } catch (error) {
      console.error("Erro ao executar operação:", error);
      firebaseUtils.showNotification("Erro ao executar operação", "error");
    }
  }

  updateCharts() {
    // Destruir gráficos existentes antes de recriar
    if (this.balanceChart) {
      this.balanceChart.destroy();
      this.balanceChart = null;
    }
    if (this.distributionChart) {
      this.distributionChart.destroy();
      this.distributionChart = null;
    }
    if (this.distributionChart2) {
      this.distributionChart2.destroy();
      this.distributionChart2 = null;
    }

    this.createBalanceChart();
    this.createDistributionChart();
    this.createDistributionChart2();
  }

  createBalanceChart() {
    const ctx = document.getElementById("balance-chart");
    if (!ctx) return;

    // Destruir gráfico existente se houver
    if (this.balanceChart) {
      this.balanceChart.destroy();
    }

    // Filtrar lançamentos por mês se não for "Todos os Meses"
    let lancamentosParaGrafico = this.lancamentos;
    if (this.currentMonth !== 0) {
      lancamentosParaGrafico = this.lancamentos.filter(
        (l) => l.month === this.currentMonth && l.year === this.currentYear
      );
    }

    if (lancamentosParaGrafico.length === 0) {
      ctx.style.display = "none";
      ctx.parentElement.style.setProperty("--show-message", "block");
      return;
    }

    ctx.style.display = "block";
    ctx.parentElement.style.setProperty("--show-message", "none");

    // Ordenar por data
    const sortedLancamentos = [...lancamentosParaGrafico].sort(
      (a, b) => new Date(a.data) - new Date(b.data)
    );

    // Agrupar lançamentos por data
    const lancamentosPorData = {};
    sortedLancamentos.forEach((l) => {
      if (!lancamentosPorData[l.data]) {
        lancamentosPorData[l.data] = 0;
      }
      lancamentosPorData[l.data] += l.resultado;
    });

    // Obter saldo anterior ao mês selecionado
    let saldoAcumulado = this.config.aporteInicial;
    if (this.currentMonth !== 0) {
      const saldoAnterior = this.lancamentos
        .filter(
          (l) =>
            l.year < this.currentYear ||
            (l.year === this.currentYear && l.month < this.currentMonth)
        )
        .reduce((total, l) => total + l.resultado, 0);

      saldoAcumulado += saldoAnterior;
    }

    const datasOrdenadas = Object.keys(lancamentosPorData).sort();
    const labels = [];
    const data = [];

    // Adiciona o saldo inicial como primeiro ponto (do mês)
    labels.push(firebaseUtils.formatDate(datasOrdenadas[0]));
    data.push(saldoAcumulado);

    // Soma acumulada por data
    datasOrdenadas.forEach((dataKey) => {
      saldoAcumulado += lancamentosPorData[dataKey];
      labels.push(firebaseUtils.formatDate(dataKey));
      data.push(saldoAcumulado);
    });

    this.balanceChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Saldo (R$)",
            data: data,
            borderColor: "#4a9eff",
            backgroundColor: "rgba(74, 158, 255, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#ffffff",
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#9ca3af",
            },
            grid: {
              color: "#374151",
            },
          },
          y: {
            ticks: {
              color: "#9ca3af",
              callback: function (value) {
                return "R$ " + value.toFixed(2);
              },
            },
            grid: {
              color: "#374151",
            },
          },
        },
      },
    });
  }

  createDistributionChart() {
    const ctx = document.getElementById("distribution-chart");
    if (!ctx) return;

    // Destruir gráfico existente se houver
    if (this.distributionChart) {
      this.distributionChart.destroy();
    }

    // Filtrar lançamentos por mês se não for "Todos os Meses"
    let lancamentosParaGrafico = this.lancamentos;
    if (this.currentMonth !== 0) {
      lancamentosParaGrafico = this.lancamentos.filter(
        (l) => l.month === this.currentMonth
      );
    }

    // Filtrar apenas trades (excluindo depósitos e saques)
    const trades = lancamentosParaGrafico.filter(
      (l) => !l.tipo || l.tipo === "trade"
    );

    if (trades.length === 0) {
      ctx.style.display = "none";
      ctx.parentElement.style.setProperty("--show-message", "block");
      return;
    }

    ctx.style.display = "block";
    ctx.parentElement.style.setProperty("--show-message", "none");

    // Separar trades positivos e negativos
    const tradesPositivos = trades.filter((l) => l.resultado > 0);
    const tradesNegativos = trades.filter((l) => l.resultado < 0);

    const data = [
      {
        label: "Trades Positivos",
        value: tradesPositivos.length,
        color: "#10b981",
      },
      {
        label: "Trades Negativos",
        value: tradesNegativos.length,
        color: "#ef4444",
      },
    ];

    // Calcular taxa de sucesso
    const taxaSucesso =
      trades.length > 0 ? (tradesPositivos.length / trades.length) * 100 : 0;

    this.distributionChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => d.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Taxa de Sucesso Mensal: ${taxaSucesso.toFixed(1)}%`,
            color: "#ffffff",
            font: {
              size: 14,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          legend: {
            position: "bottom",
            labels: {
              color: "#ffffff",
              padding: 20,
              usePointStyle: true,
            },
          },
        },
      },
    });
  }

  // Novo método para o segundo gráfico de distribuição (acumulado total)
  createDistributionChart2() {
    const ctx = document.getElementById("distribution-chart-2");
    if (!ctx) return;

    // Destruir gráfico existente se houver
    if (this.distributionChart2) {
      this.distributionChart2.destroy();
    }

    // Usar TODOS os lançamentos (sem filtro de mês)
    const lancamentosParaGrafico = this.lancamentos;

    // Filtrar apenas trades (excluindo depósitos e saques)
    const trades = lancamentosParaGrafico.filter(
      (l) => !l.tipo || l.tipo === "trade"
    );

    if (trades.length === 0) {
      ctx.style.display = "none";
      ctx.parentElement.style.setProperty("--show-message", "block");
      return;
    }

    ctx.style.display = "block";
    ctx.parentElement.style.setProperty("--show-message", "none");

    // Separar trades positivos e negativos
    const tradesPositivos = trades.filter((l) => l.resultado > 0);
    const tradesNegativos = trades.filter((l) => l.resultado < 0);

    const data = [
      {
        label: "Trades Positivos",
        value: tradesPositivos.length,
        color: "#10b981",
      },
      {
        label: "Trades Negativos",
        value: tradesNegativos.length,
        color: "#ef4444",
      },
    ];

    // Calcular taxa de sucesso total
    const taxaSucessoTotal =
      trades.length > 0 ? (tradesPositivos.length / trades.length) * 100 : 0;

    // Calcular valor total acumulado
    const valorTotalAcumulado = trades.reduce((total, trade) => {
      const valor =
        trade.valorLiquido !== undefined ? trade.valorLiquido : trade.resultado;
      return total + valor;
    }, 0);

    this.distributionChart2 = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => d.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Taxa de Sucesso Total: ${taxaSucessoTotal.toFixed(1)}%`,
            color: "#ffffff",
            font: {
              size: 14,
              weight: "bold",
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          legend: {
            position: "bottom",
            labels: {
              color: "#ffffff",
              padding: 20,
              usePointStyle: true,
            },
          },
        },
      },
    });
  }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  // Verificar se o Firebase está disponível
  if (typeof firebase === "undefined") {
    console.error("Firebase não está carregado!");
    firebaseUtils.showNotification(
      "Erro: Firebase não está disponível",
      "error"
    );
    return;
  }

  // Inicializar o gerenciador
  (async () => {
    window.dayTradeManager = new DayTradeManager();
    // Chama o init e espera ele terminar antes de fazer qualquer outra coisa.
    await window.dayTradeManager.init();
  })();
});
