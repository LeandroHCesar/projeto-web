// services/dataService.js
import { db, showNotification } from "./firebaseUtils.js";

export class DataService {
  constructor(userId) {
    this.userId = userId;
  }

  async loadLancamentos(year) {
    try {
      const lancamentosRef = db
        .collection("users")
        .doc(this.userId)
        .collection("lancamentos");

      // Carrega todos os lançamentos do ano especificado
      const query = lancamentosRef.where("year", "==", year);

      const snapshot = await query.get();

      const lancamentos = [];
      snapshot.forEach((doc) =>
        lancamentos.push({
        id: doc.id,
        ...doc.data(),
      }));
      return lancamentos;
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      showNotification("Erro ao carregar lançamentos", "error");
      return [];
    }
  }

  async addLancamento(lancamento) {
    try {
      await db
        .collection("users")
        .doc(this.userId)
        .collection("lancamentos")
        .add(lancamento);
      showNotification("Lançamento adicionado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao adicionar lançamento:", error);
      showNotification("Erro ao adicionar lançamento", "error");
    }
  }

  async deleteLancamento(lancamentoId) {
    try {
      await db
        .collection("users")
        .doc(this.userId)
        .collection("lancamentos")
        .doc(lancamentoId)
        .delete();
      showNotification("Lançamento deletado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao deletar lançamento:", error);
      showNotification("Erro ao deletar lançamento", "error");
    }
  }

  async salvarTaxasAtuais(taxas) {
    try {
      await db
        .collection("users")
        .doc(this.userId)
        .collection("historicoTaxas")
        .add(taxas);
      showNotification("Taxas salvas com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar taxas:", error);
      showNotification("Erro ao salvar taxas", "error");
    }
  }

  async carregarHistoricoTaxas() {
    try {
      const taxasRef = db
        .collection("users")
        .doc(this.userId)
        .collection("historicoTaxas");
      const querySnapshot = await taxasRef.get();
      const taxas = querySnapshot.docs.map((doc) => doc.data());
      return taxas;
    } catch (error) {
      console.error("Erro ao carregar taxas:", error);
      showNotification("Erro ao carregar taxas", "error");
      return [];
    }
  }

  async loadUserName() {
    try {
      const userRef = db.collection("users").doc(this.userId);
      const doc = await userRef.get();
      if (doc.exists) {
        return doc.data().userName || "";
      }
      return "";
    } catch (error) {
      console.error("Erro ao carregar nome do usuário:", error);
      return "";
    }
  }
}
