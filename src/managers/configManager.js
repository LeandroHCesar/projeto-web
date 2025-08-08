// managers/configManager.js
import { db, showNotification } from "../services/firebaseUtils.js";

export class ConfigManager {
  constructor(userId, config) {
    this.userId = userId;
    this.config = config;
  }

  async saveConfig() {
    try {
      const configRef = db
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

      showNotification("Configurações salvas com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      showNotification("Erro ao salvar configurações", "error");
    }
  }

  async loadConfig() {
    try {
      const configRef = db
        .collection("users")
        .doc(this.userId)
        .collection("config");

      const doc = await configRef.doc("settings").get();

      if (doc.exists) {
        const data = doc.data();
        this.config.aporteInicial = data.aporteInicial || 0;
        this.config.riscoDiario = data.riscoDiario || 0;
        this.config.riscoMensal = data.riscoMensal || 0;
        this.config.percentualTrade = data.percentualTrade || 0;
        this.config.taxaWdo = data.taxaWdo || 0;
        this.config.taxaWin = data.taxaWin || 0;
        this.config.taxaBit = data.taxaBit || 0;
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      showNotification("Erro ao carregar configurações", "error");
    }
  }
}
