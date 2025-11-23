const fs = require('fs').promises;
const path = require('path');

class DataModelDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.dataModelsFile = path.join(this.dataDir, 'datamodels.json');
  }

  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });

      try {
        await fs.access(this.dataModelsFile);
      } catch {
        await fs.writeFile(this.dataModelsFile, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('[DataModelDatabase] Initialization error:', error);
    }
  }

  async loadDataModels() {
    await this.initialize();
    try {
      const data = await fs.readFile(this.dataModelsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[DataModelDatabase] Load error:', error);
      return [];
    }
  }

  async saveDataModel(dataModel) {
    await this.initialize();
    const dataModels = await this.loadDataModels();

    // Auto-generate ID if missing
    if (!dataModel.id) {
      dataModel.id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const existingIndex = dataModels.findIndex(dm => dm.id === dataModel.id);

    if (existingIndex >= 0) {
      dataModels[existingIndex] = {
        ...dataModel,
        updatedAt: new Date().toISOString()
      };
    } else {
      dataModels.push({
        ...dataModel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    await fs.writeFile(this.dataModelsFile, JSON.stringify(dataModels, null, 2));
    return dataModels[existingIndex >= 0 ? existingIndex : dataModels.length - 1];
  }

  async saveDataModels(dataModelsArray) {
    await this.initialize();
    const results = [];

    for (const dataModel of dataModelsArray) {
      const saved = await this.saveDataModel(dataModel);
      results.push(saved);
    }

    return results;
  }

  async getDataModel(id) {
    const dataModels = await this.loadDataModels();
    return dataModels.find(dm => dm.id === id);
  }

  async getDataModelByName(name) {
    const dataModels = await this.loadDataModels();
    return dataModels.find(dm => dm.name === name);
  }

  async getDataModelsByWorkflow(workflowId) {
    const dataModels = await this.loadDataModels();
    return dataModels.filter(dm => dm.workflowId === workflowId);
  }

  async deleteDataModel(id) {
    await this.initialize();
    const dataModels = await this.loadDataModels();
    const filtered = dataModels.filter(dm => dm.id !== id);

    await fs.writeFile(this.dataModelsFile, JSON.stringify(filtered, null, 2));
    return { success: true, deletedId: id };
  }

  async deleteDataModelsByWorkflow(workflowId) {
    await this.initialize();
    const dataModels = await this.loadDataModels();
    const filtered = dataModels.filter(dm => dm.workflowId !== workflowId);

    await fs.writeFile(this.dataModelsFile, JSON.stringify(filtered, null, 2));
    return { success: true, workflowId };
  }
}

const dataModelDatabase = new DataModelDatabase();
module.exports = dataModelDatabase;
