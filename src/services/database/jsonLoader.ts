interface JsonData {
  alunos: any[];
  turmas: any[];
  transacoes: any[];
  propinas: any[];
  cursos: any[];
  instituicao: any[];
}

class JsonDataLoader {
  private cache: JsonData | null = null;

  async loadAllData(): Promise<JsonData> {
    if (this.cache) return this.cache;

    try {
      // ✅ Importação dinâmica dos JSONs
      const [alunos, turmas, transacoes, propinas, cursos, instituicao] = await Promise.all([
        import('../../data/mock/alunos.json'), 
        import('../../data/mock/turmas.json'),
        import('../../data/mock/transacoes.json'),
        import('../../data/mock/propinas.json'),
        import('../../data/mock/cursos.json'),
        import('../../data/mock/instituicao.json')
      ]);

      this.cache = {
        alunos: alunos.default,
        turmas: turmas.default,
        transacoes: transacoes.default,
        propinas: propinas.default,
        cursos: cursos.default,
        instituicao: instituicao.default
      };

      return this.cache;
    } catch (error) {
      console.error('❌ Erro ao carregar dados JSON:', error);
      throw error;
    }
  }

  async getAlunos() {
    const data = await this.loadAllData();
    return data.alunos;
  }

  async getTurmas() {
    const data = await this.loadAllData();
    return data.turmas;
  }

  async getTransacoes() {
    const data = await this.loadAllData();
    return data.transacoes;
  }

  async getPropinas() {
    const data = await this.loadAllData();
    return data.propinas;
  }

  async getCursos() {
    const data = await this.loadAllData();
    return data.cursos;
  }

  async getInstituicao() {
    const data = await this.loadAllData();
    return data.instituicao;
  }
}

export const jsonLoader = new JsonDataLoader();