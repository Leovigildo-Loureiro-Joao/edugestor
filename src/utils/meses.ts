export const mesesUtils = {
  // Converter nome completo para abreviado
  paraAbreviado(mesCompleto: string): string {
    const conversao: { [key: string]: string } = {
      'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar',
      'Abril': 'Abr', 'Maio': 'Mai', 'Junho': 'Jun',
       'Setembro': 'Set',
      'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez'
    };
    return conversao[mesCompleto] || mesCompleto.substring(0, 3);
  },

  // Converter abreviado para nome completo
  paraCompleto(mesAbreviado: string): string {
    const conversao: { [key: string]: string } = {
      'Jan': 'Janeiro', 'Fev': 'Fevereiro', 'Mar': 'Março',
      'Abr': 'Abril', 'Mai': 'Maio', 'Jun': 'Junho',
      'Set': 'Setembro',
      'Out': 'Outubro', 'Nov': 'Novembro', 'Dez': 'Dezembro'
    };
    return conversao[mesAbreviado] || mesAbreviado;
  }
};