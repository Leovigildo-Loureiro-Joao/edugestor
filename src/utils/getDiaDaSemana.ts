// Função para obter dia da semana a partir da data
export const getDiaSemanaFromDate = (dateString: string): string => {
  const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const date = new Date(dateString);
  return dias[date.getDay()];
};
